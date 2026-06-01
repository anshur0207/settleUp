const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { minimizeDebts } = require('../utils/smartSplitAlgorithm');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('joinedGroups', 'name icon category').populate('createdGroups', 'name icon category');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (updates.currentPassword && updates.newPassword) {
      const isMatch = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = await bcrypt.hash(updates.newPassword, 12);
    }

    const allowedFields = ['name', 'username', 'email', 'phone', 'currency', 'avatar', 'settings'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'settings') {
          user.settings = { ...user.settings, ...updates.settings };
        } else {
          user[field] = updates[field];
        }
      }
    });

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ user: safeUser });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar URL is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.avatar = avatar;
    await user.save();
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const email = req.query.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email query is required' });
    }
    const users = await User.find({ email: { $regex: email, $options: 'i' } })
      .select('name email avatar')
      .limit(10);
    res.json({ users: users.filter((u) => !u._id.equals(req.user._id)) });
  } catch (error) {
    next(error);
  }
};

const getUserBalances = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const groups = await Group.find({ members: req.user._id });
    
    const groupIds = groups.map(g => g._id);
    const expenses = await Expense.find({
      $or: [
        { group: { $in: groupIds } },
        { createdBy: req.user._id },
        { 'splits.user': req.user._id },
      ]
    });
    const settlements = await Settlement.find({
      $or: [
        { group: { $in: groupIds } },
        { payer: req.user._id },
        { payee: req.user._id },
      ],
      status: 'completed'
    });

    const friendAmounts = {};

    const smartSplitGroups = new Set(groups.filter(g => g.settings?.smartSplit).map(g => String(g._id)));

    const dataByGroup = {};
    const noGroupData = { expenses: [], settlements: [] };

    expenses.forEach(e => {
      const gId = e.group ? String(e.group) : null;
      if (gId) {
        dataByGroup[gId] = dataByGroup[gId] || { expenses: [], settlements: [] };
        dataByGroup[gId].expenses.push(e);
      } else {
        noGroupData.expenses.push(e);
      }
    });
    settlements.forEach(s => {
      const gId = s.group ? String(s.group) : null;
      if (gId) {
        dataByGroup[gId] = dataByGroup[gId] || { expenses: [], settlements: [] };
        dataByGroup[gId].settlements.push(s);
      } else {
        noGroupData.settlements.push(s);
      }
    });

    const applyRawDebts = (expList, setList) => {
      expList.forEach(expense => {
        const paidById = String(expense.paidBy._id || expense.paidBy);
        const splitForUser = expense.splits?.find(s => String(s.user._id || s.user) === userId);
        
        if (paidById === userId) {
          expense.splits.forEach(split => {
            const splitUserId = String(split.user._id || split.user);
            if (splitUserId !== userId) {
              const amount = Number(split.owed ?? split.amount ?? 0);
              friendAmounts[splitUserId] = (friendAmounts[splitUserId] || 0) + amount;
            }
          });
        } else if (splitForUser) {
          const amount = Number(splitForUser.owed ?? splitForUser.amount ?? 0);
          friendAmounts[paidById] = (friendAmounts[paidById] || 0) - amount;
        }
      });

      setList.forEach(settlement => {
        const payerId = String(settlement.payer._id || settlement.payer);
        const payeeId = String(settlement.payee._id || settlement.payee);
        const amount = Number(settlement.amount ?? 0);
        
        if (payerId === userId) {
          friendAmounts[payeeId] = (friendAmounts[payeeId] || 0) + amount;
        } else if (payeeId === userId) {
          friendAmounts[payerId] = (friendAmounts[payerId] || 0) - amount;
        }
      });
    };

    applyRawDebts(noGroupData.expenses, noGroupData.settlements);

    for (const [gId, data] of Object.entries(dataByGroup)) {
      if (smartSplitGroups.has(gId)) {
        const netBalances = {};
        data.expenses.forEach(expense => {
          const paidById = String(expense.paidBy._id || expense.paidBy);
          expense.splits.forEach(split => {
            const uId = String(split.user._id || split.user);
            const owed = Number(split.owed ?? split.amount ?? 0);
            if (uId !== paidById && owed > 0) {
              netBalances[uId] = (netBalances[uId] || 0) - owed;
              netBalances[paidById] = (netBalances[paidById] || 0) + owed;
            }
          });
        });

        data.settlements.forEach(settlement => {
          const payerId = String(settlement.payer._id || settlement.payer);
          const payeeId = String(settlement.payee._id || settlement.payee);
          const amount = Number(settlement.amount ?? 0);
          netBalances[payerId] = (netBalances[payerId] || 0) + amount;
          netBalances[payeeId] = (netBalances[payeeId] || 0) - amount;
        });

        const optimized = minimizeDebts(netBalances);
        optimized.forEach(t => {
          if (t.from === userId) {
            friendAmounts[t.to] = (friendAmounts[t.to] || 0) - t.amount;
          } else if (t.to === userId) {
            friendAmounts[t.from] = (friendAmounts[t.from] || 0) + t.amount;
          }
        });

      } else {
        applyRawDebts(data.expenses, data.settlements);
      }
    }

    Object.keys(friendAmounts).forEach(k => {
      if (Math.abs(friendAmounts[k]) < 0.01) delete friendAmounts[k];
    });

    const totals = Object.values(friendAmounts).reduce((acc, amount) => {
      if (amount > 0) acc.owed += amount;
      else acc.owe += Math.abs(amount);
      return acc;
    }, { owe: 0, owed: 0 });

    res.json({ balances: totals, friendAmounts });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, uploadAvatar, searchUsers, getUserBalances };
