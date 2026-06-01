const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const Settlement = require('../models/Settlement');
const xlsx = require('xlsx');
const { minimizeDebts } = require('../utils/smartSplitAlgorithm');

const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate('members', 'name avatar');
    const groupIds = groups.map((group) => group._id);
    const expenses = await Expense.find({ group: { $in: groupIds } });
    const settlements = await Settlement.find({ group: { $in: groupIds }, status: 'completed' });

    const expensesByGroup = expenses.reduce((acc, expense) => {
      const groupId = expense.group?.toString();
      if (!groupId) return acc;
      acc[groupId] = acc[groupId] || [];
      acc[groupId].push(expense);
      return acc;
    }, {});

    const settlementsByGroup = settlements.reduce((acc, settlement) => {
      const groupId = settlement.group?.toString();
      if (!groupId) return acc;
      acc[groupId] = acc[groupId] || [];
      acc[groupId].push(settlement);
      return acc;
    }, {});

    const enrichedGroups = groups.map((group) => {
      const groupExpenses = expensesByGroup[group._id.toString()] || [];
      const groupSettlements = settlementsByGroup[group._id.toString()] || [];
      
      let balance = groupExpenses.reduce((sum, expense) => {
        const userSplit = expense.splits?.find((split) => split.user.equals(req.user._id));
        const owed = userSplit?.owed || 0;
        const paid = expense.paidBy.equals(req.user._id) ? expense.amount : 0;
        return sum + paid - owed;
      }, 0);

      groupSettlements.forEach(settlement => {
        if (settlement.payer.equals(req.user._id)) {
          balance += settlement.amount;
        } else if (settlement.payee.equals(req.user._id)) {
          balance -= settlement.amount;
        }
      });

      return {
        ...group.toObject(),
        expenseCount: groupExpenses.length,
        balance,
        positive: balance >= 0,
      };
    });

    res.json({ groups: enrichedGroups });
  } catch (error) {
    next(error);
  }
};

const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name avatar email')
      .populate('pendingMembers.user', 'name avatar email')
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'name avatar email' },
          { path: 'createdBy', select: 'name' },
        ],
      });

    if (!group || !group.members.some((member) => member._id.equals(req.user._id))) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }
    
    const settlements = await Settlement.find({ group: group._id, status: 'completed' });
    res.json({ group, settlements });
  } catch (error) {
    next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, description, category, icon } = req.body;
    const group = await Group.create({
      name,
      description: description || '',
      category: category || 'Others',
      icon: icon || '🏍️',
      members: [req.user._id],
      admins: [req.user._id],
    });
    const user = await User.findById(req.user._id);
    user.createdGroups.push(group._id);
    user.joinedGroups.push(group._id);
    await user.save();
    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some(id => id.equals(req.user._id))) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admins.some((id) => id.equals(req.user._id));
    
    if (!isAdmin) {
      // Non-admins can only update description
      if (req.body.description !== undefined) {
        group.description = req.body.description;
      }
      // Ignore other fields silently or throw error, let's just ignore them to be safe
    } else {
      Object.assign(group, req.body);
    }
    
    await group.save();
    res.json({ group });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!group.admins.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Must be admin to delete group' });
    }
    await group.deleteOne();
    await User.updateMany({ joinedGroups: group._id }, { $pull: { joinedGroups: group._id, createdGroups: group._id } });
    await Expense.deleteMany({ group: group._id });
    await Settlement.deleteMany({ group: group._id });
    
    res.json({ message: 'Group and all associated expenses and settlements deleted' });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (group.pendingMembers.some((pending) => pending.email === email && pending.status === 'pending')) {
      return res.status(400).json({ message: 'Invitation already pending for this email' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && group.members.some((member) => member.equals(existingUser._id))) {
      return res.status(400).json({ message: 'User already in group' });
    }

    if (existingUser) {
      group.members.push(existingUser._id);
      group.pendingMembers = group.pendingMembers.filter((pending) => pending.email !== email);
      await group.save();

      existingUser.joinedGroups = existingUser.joinedGroups || [];
      if (!existingUser.joinedGroups.some((groupId) => groupId.equals(group._id))) {
        existingUser.joinedGroups.push(group._id);
        await existingUser.save();
      }

      await Notification.create({
        user: existingUser._id,
        type: 'group_added',
        title: `Added to ${group.name}`,
        message: `${req.user.name} added you to the group ${group.name}.`,
        meta: { group: group._id },
      });

      return res.json({ group });
    }

    const pendingEntry = {
      email,
      invitedBy: req.user._id,
    };

    group.pendingMembers.push(pendingEntry);
    await group.save();

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some(id => id.equals(req.user._id))) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const memberId = req.params.memberId;
    const isSelf = req.user._id.equals(memberId);
    const isAdmin = group.admins.some((id) => id.equals(req.user._id));

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Must be admin to remove other members' });
    }

    group.members = group.members.filter((id) => !id.equals(memberId));
    group.admins = group.admins.filter((id) => !id.equals(memberId));

    if (group.members.length > 0 && group.admins.length === 0) {
      group.admins.push(group.members[0]);
    }

    await group.save();
    await User.findByIdAndUpdate(memberId, { $pull: { joinedGroups: group._id } });
    
    res.json({ message: 'Member removed', group });
  } catch (error) {
    next(error);
  }
};

const exportGroupData = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const expenses = await Expense.find({ group: group._id })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1 });

    const exportData = expenses.map(expense => {
      const splitDetails = expense.splits.map(split => {
        const userName = split.user?.name || 'Unknown';
        const owedAmount = split.owed ?? split.amount ?? 0;
        return `${userName} owes ${owedAmount}`;
      }).join('; ');

      return {
        Date: new Date(expense.date).toLocaleDateString(),
        'Expense Title': expense.title || '',
        Category: expense.category || '',
        'Paid By': expense.paidBy?.name || 'Unknown',
        'Total Amount (INR)': expense.amount,
        'Split Details': splitDetails
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`export-${group.name.replace(/\s+/g, '_')}.xlsx`);
    return res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

const getSmartSplitSuggestions = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name avatar email');
    if (!group || !group.members.some(member => member._id.equals(req.user._id))) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expenses = await Expense.find({ group: group._id });
    const settlements = await Settlement.find({ group: group._id, status: 'completed' });

    const rawDebts = {};
    const netBalances = {};

    expenses.forEach(expense => {
      const paidBy = expense.paidBy.toString();
      expense.splits.forEach(split => {
        const user = split.user.toString();
        const owed = split.owed ?? split.amount ?? 0;
        if (user !== paidBy && owed > 0) {
          const key = `${user}_${paidBy}`;
          rawDebts[key] = (rawDebts[key] || 0) + owed;
        }
        netBalances[user] = (netBalances[user] || 0) - owed;
      });
      netBalances[paidBy] = (netBalances[paidBy] || 0) + expense.amount;
    });

    settlements.forEach(settlement => {
      const payer = settlement.payer.toString();
      const payee = settlement.payee.toString();
      const key = `${payer}_${payee}`;
      if (rawDebts[key]) {
        rawDebts[key] -= settlement.amount;
      } else {
        const reverseKey = `${payee}_${payer}`;
        rawDebts[reverseKey] = (rawDebts[reverseKey] || 0) - settlement.amount;
      }
      
      netBalances[payer] = (netBalances[payer] || 0) + settlement.amount;
      netBalances[payee] = (netBalances[payee] || 0) - settlement.amount;
    });

    let originalCount = 0;
    Object.values(rawDebts).forEach(amount => {
      if (Math.abs(amount) > 0.01) originalCount++;
    });

    const optimized = minimizeDebts(netBalances);
    
    const userMap = {};
    group.members.forEach(m => { userMap[m._id.toString()] = m; });

    const optimizedSettlements = optimized.map(t => ({
      from: userMap[t.from] || { _id: t.from, name: 'Unknown' },
      to: userMap[t.to] || { _id: t.to, name: 'Unknown' },
      amount: t.amount
    }));

    res.json({
      originalCount,
      optimizedCount: optimized.length,
      savedCount: originalCount - optimized.length,
      optimizedSettlements
    });
  } catch (error) {
    next(error);
  }
};

const toggleSmartSplit = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some(member => member._id.equals(req.user._id))) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.settings) {
      group.settings = {};
    }
    group.settings.smartSplit = req.body.enabled;
    await group.save();

    res.json({ message: 'Smart Split updated successfully', group });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  getGroups,
  addMember,
  removeMember,
  exportGroupData,
  getSmartSplitSuggestions,
  toggleSmartSplit,
};
