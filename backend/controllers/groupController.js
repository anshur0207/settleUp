const prisma = require('../utils/prisma');
const xlsx = require('xlsx');
const { minimizeDebts } = require('../utils/smartSplitAlgorithm');

const getGroups = async (req, res, next) => {
  try {
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            expenses: {
              include: {
                splits: true
              }
            },
            settlements: {
              where: { status: 'completed' }
            }
          }
        }
      }
    });

    const enrichedGroups = groupMemberships.map((membership) => {
      const group = membership.group;
      const groupExpenses = group.expenses;
      const groupSettlements = group.settlements;
      
      let balance = groupExpenses.reduce((sum, expense) => {
        const userSplit = expense.splits?.find((split) => split.userId === req.user.id);
        const owed = userSplit?.owed || 0;
        const paid = expense.paidById === req.user.id ? expense.amount : 0;
        return sum + paid - owed;
      }, 0);

      groupSettlements.forEach(settlement => {
        if (settlement.payerId === req.user.id) {
          balance += settlement.amount;
        } else if (settlement.payeeId === req.user.id) {
          balance -= settlement.amount;
        }
      });

      return {
        ...group,
        members: group.members.map(m => m.user),
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
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        pendingMembers: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, avatar: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            splits: true
          }
        }
      }
    });

    if (!group || !group.members.some((member) => member.userId === req.user.id)) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    const formattedGroup = {
      ...group,
      members: group.members.map(m => m.user),
      admins: group.members.filter(m => m.role === 'admin').map(m => m.userId),
    };
    
    const settlements = await prisma.settlement.findMany({ where: { groupId: group.id, status: 'completed' } });
    res.json({ group: formattedGroup, settlements });
  } catch (error) {
    next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, description, category, icon } = req.body;
    const group = await prisma.group.create({
      data: {
        name,
        description: description || '',
        category: category || 'Others',
        icon: icon || '🏍️',
        creatorId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'admin'
          }
        }
      }
    });

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user.id } }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const isAdmin = membership.role === 'admin';
    const data = {};
    
    if (!isAdmin) {
      if (req.body.description !== undefined) {
        data.description = req.body.description;
      }
    } else {
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.category !== undefined) data.category = req.body.category;
      if (req.body.icon !== undefined) data.icon = req.body.icon;
    }
    
    const group = await prisma.group.update({
      where: { id: req.params.id },
      data
    });
    
    res.json({ group });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user.id } }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (membership.role !== 'admin') {
      return res.status(403).json({ message: 'Must be admin to delete group' });
    }
    
    await prisma.group.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Group and all associated expenses and settlements deleted' });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
      include: { group: true }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingPending = await prisma.groupPendingMember.findUnique({
      where: { groupId_email: { groupId, email } }
    });

    if (existingPending && existingPending.status === 'pending') {
      return res.status(400).json({ message: 'Invitation already pending for this email' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const isAlreadyMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: existingUser.id } }
      });
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: 'User already in group' });
      }
      
      await prisma.groupMember.create({
        data: { groupId, userId: existingUser.id, role: 'member' }
      });

      if (existingPending) {
        await prisma.groupPendingMember.delete({ where: { id: existingPending.id } });
      }

      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          type: 'group_added',
          title: `Added to ${membership.group.name}`,
          message: `${req.user.name} added you to the group ${membership.group.name}.`,
          meta: { group: groupId },
        }
      });

      return res.json({ group: membership.group });
    }

    await prisma.groupPendingMember.upsert({
      where: { groupId_email: { groupId, email } },
      update: { status: 'pending', invitedById: req.user.id },
      create: { groupId, email, status: 'pending', invitedById: req.user.id }
    });

    res.json({ group: membership.group });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    
    const requesterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } }
    });

    if (!requesterMembership) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const isSelf = req.user.id === memberId;
    const isAdmin = requesterMembership.role === 'admin';

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Must be admin to remove other members' });
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: memberId } }
    });
    
    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

const exportGroupData = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
      include: { group: true }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { name: true, email: true } },
        splits: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { date: 'desc' }
    });

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
    res.attachment(`export-${membership.group.name.replace(/\s+/g, '_')}.xlsx`);
    return res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

const getSmartSplitSuggestions = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        expenses: { include: { splits: true } },
        settlements: { where: { status: 'completed' } }
      }
    });
    
    if (!group || !group.members.some(member => member.userId === req.user.id)) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const rawDebts = {};
    const netBalances = {};

    group.expenses.forEach(expense => {
      const paidBy = expense.paidById;
      expense.splits.forEach(split => {
        const user = split.userId;
        const owed = split.owed ?? split.amount ?? 0;
        if (user !== paidBy && owed > 0) {
          const key = `${user}_${paidBy}`;
          rawDebts[key] = (rawDebts[key] || 0) + owed;
        }
        netBalances[user] = (netBalances[user] || 0) - owed;
      });
      netBalances[paidBy] = (netBalances[paidBy] || 0) + expense.amount;
    });

    group.settlements.forEach(settlement => {
      const payer = settlement.payerId;
      const payee = settlement.payeeId;
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
    group.members.forEach(m => { userMap[m.userId] = m.user; });

    const optimizedSettlements = optimized.map(t => ({
      from: userMap[t.from] || { id: t.from, name: 'Unknown' },
      to: userMap[t.to] || { id: t.to, name: 'Unknown' },
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
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: { members: true }
    });
    
    if (!group || !group.members.some(member => member.userId === req.user.id)) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const settings = typeof group.settings === 'object' ? group.settings : JSON.parse(group.settings);
    settings.smartSplit = req.body.enabled;
    
    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: { settings }
    });

    res.json({ message: 'Smart Split updated successfully', group: updatedGroup });
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
