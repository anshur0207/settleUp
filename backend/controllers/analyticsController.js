const prisma = require('../utils/prisma');

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
    const userId = req.user.id;
    
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: true,
            expenses: true
          }
        }
      }
    });

    const groups = groupMemberships.map(m => m.group);

    const paidExpenses = await prisma.expense.findMany({
      where: { paidById: userId },
      include: { group: true, splits: true }
    });

    const splitExpenses = await prisma.expense.findMany({
      where: { splits: { some: { userId } } },
      include: { group: true, splits: true }
    });

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

    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [{ payerId: userId }, { payeeId: userId }]
      }
    });

    const amountsByFriend = {};

    let youAreOwed = 0;
    let youOwe = 0;

    if (paidExpenses.length > 0 || splitExpenses.length > 0) {
      paidExpenses.forEach((expense) => {
        (expense.splits || []).forEach((split) => {
          const splitUserId = split.userId;
          if (splitUserId !== userId) {
            const amount = Number(split.owed ?? split.amount ?? 0);
            amountsByFriend[splitUserId] = (amountsByFriend[splitUserId] ?? 0) + amount;
          }
        });
      });

      splitExpenses.forEach((expense) => {
        const paidById = expense.paidById;
        if (paidById === userId) return;
        
        const mySplit = (expense.splits || []).find((split) => split.userId === userId);
        if (mySplit) {
          const amount = Number(mySplit.owed ?? mySplit.amount ?? 0);
          amountsByFriend[paidById] = (amountsByFriend[paidById] ?? 0) - amount;
        }
      });

      settlements.forEach((settlement) => {
        const payerId = settlement.payerId;
        const payeeId = settlement.payeeId;
        const amount = Number(settlement.amount ?? 0);

        if (payerId === userId) {
          amountsByFriend[payeeId] = (amountsByFriend[payeeId] ?? 0) + amount;
        } else if (payeeId === userId) {
          amountsByFriend[payerId] = (amountsByFriend[payerId] ?? 0) - amount;
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
      const groupId = expense.groupId;
      if (!groupId) return acc;
      acc[groupId] = (acc[groupId] || 0) + (expense.amount || 0);
      return acc;
    }, {});

    const topGroups = groups
      .map((group) => ({
        name: group.name,
        amount: `₹${(groupAmounts[group.id] || 0).toLocaleString()}`,
        members: `${group.members?.length || 0} Members`,
        spent: groupAmounts[group.id] || 0,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 3)
      .map(({ spent, ...rest }) => rest);

    const groupList = groups.map((group) => ({
      id: group.id,
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
