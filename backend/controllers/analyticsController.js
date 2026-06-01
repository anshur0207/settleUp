const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');

const areIdsEqual = (a, b) => {
  if (!a || !b) return false;
  if (typeof a.equals === 'function') return a.equals(b);
  if (typeof b.equals === 'function') return b.equals(a);
  return String(a) === String(b);
};

const formatMonthLabel = (date) => date.toLocaleString('en-US', { month: 'short' });

const buildMonthBuckets = (monthsCount) => {
  const today = new Date();
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      label: formatMonthLabel(date),
    });
  }
  return months;
};

const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId }).select('name description icon category members expenses createdAt').lean();

    const paidExpenses = await Expense.find({ paidBy: userId }).populate('group', 'name').lean();
    const splitExpenses = await Expense.find({ 'splits.user': userId }).populate('group', 'name').lean();

    const totalSpent = paidExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const monthlySpent = paidExpenses
      .filter((expense) => new Date(expense.date) >= currentMonthStart)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const prevMonthSpent = paidExpenses
      .filter((expense) => {
        const date = new Date(expense.date);
        return date >= prevMonthStart && date <= prevMonthEnd;
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const monthlyGrowth = prevMonthSpent === 0
      ? (monthlySpent > 0 ? 100 : 0)
      : Number((((monthlySpent - prevMonthSpent) / prevMonthSpent) * 100).toFixed(2));

    const settlements = await Settlement.find({
      $or: [{ payer: userId }, { payee: userId }]
    }).lean();

    const amountsByFriend = {};

    let youAreOwed = 0;
    let youOwe = 0;

    if (paidExpenses.length > 0 || splitExpenses.length > 0) {
      paidExpenses.forEach((expense) => {
        (expense.splits || []).forEach((split) => {
          const splitUserId = split.user?._id || split.user;
          if (!areIdsEqual(splitUserId, userId)) {
            const splitUserStr = String(splitUserId);
            const amount = Number(split.owed ?? split.amount ?? 0);
            amountsByFriend[splitUserStr] = (amountsByFriend[splitUserStr] ?? 0) + amount;
          }
        });
      });

      splitExpenses.forEach((expense) => {
        const paidById = expense.paidBy?._id || expense.paidBy;
        if (areIdsEqual(paidById, userId)) return;
        
        const mySplit = (expense.splits || []).find((split) => areIdsEqual(split.user, userId));
        if (mySplit) {
          const paidByStr = String(paidById);
          const amount = Number(mySplit.owed ?? mySplit.amount ?? 0);
          amountsByFriend[paidByStr] = (amountsByFriend[paidByStr] ?? 0) - amount;
        }
      });

      settlements.forEach((settlement) => {
        const payerId = settlement.payer?._id || settlement.payer;
        const payeeId = settlement.payee?._id || settlement.payee;
        const amount = Number(settlement.amount ?? 0);

        if (areIdsEqual(payerId, userId)) {
          const payeeStr = String(payeeId);
          amountsByFriend[payeeStr] = (amountsByFriend[payeeStr] ?? 0) + amount;
        } else if (areIdsEqual(payeeId, userId)) {
          const payerStr = String(payerId);
          amountsByFriend[payerStr] = (amountsByFriend[payerStr] ?? 0) - amount;
        }
      });

      Object.values(amountsByFriend).forEach((val) => {
        if (val >= 0) {
          youAreOwed += val;
        } else {
          youOwe += Math.abs(val);
        }
      });
    }

    const categoryMap = paidExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Others';
      acc[category] = (acc[category] || 0) + (expense.amount || 0);
      return acc;
    }, {});

    const categoryItems = Object.entries(categoryMap)
      .map(([title, amount]) => ({ title, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const categories = categoryItems.map((item) => ({
      title: item.title,
      amount: `₹${item.amount.toLocaleString()}`,
      percentage: totalSpent > 0 ? `${Math.round((item.amount / totalSpent) * 100)}%` : '0%',
    }));

    const monthBuckets = buildMonthBuckets(7);
    const monthlyData = monthBuckets.map((bucket) => {
      const value = paidExpenses
        .filter((expense) => {
          const date = new Date(expense.date);
          return date >= bucket.start && date <= bucket.end;
        })
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
      return {
        month: bucket.label,
        value,
      };
    });

    const groupAmounts = paidExpenses.reduce((acc, expense) => {
      const groupId = expense.group?._id?.toString();
      if (!groupId) return acc;
      acc[groupId] = (acc[groupId] || 0) + (expense.amount || 0);
      return acc;
    }, {});

    const topGroups = groups
      .map((group) => ({
        name: group.name,
        amount: `₹${(groupAmounts[group._id.toString()] || 0).toLocaleString()}`,
        members: `${group.members?.length || 0} Members`,
        spent: groupAmounts[group._id.toString()] || 0,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 3)
      .map(({ spent, ...rest }) => rest);

    const groupList = groups.map((group) => ({
      id: group._id,
      name: group.name,
      description: group.description,
      category: group.category,
      memberCount: group.members?.length || 0,
    }));

    res.json({
      groups: groupList,
      totalSpent: Number(totalSpent.toFixed(2)),
      monthlySpent: Number(monthlySpent.toFixed(2)),
      youAreOwed: Number(youAreOwed.toFixed(2)),
      youOwe: Number(youOwe.toFixed(2)),
      monthlyGrowth,
      categories,
      monthlyData,
      topGroups,
      groupCount: groupList.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
