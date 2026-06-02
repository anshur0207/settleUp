const prisma = require('../utils/prisma');

/**
 * Single endpoint that returns all dashboard data in parallel DB queries.
 * Replaces 5 separate API calls: groups, expenses, settlements, notifications, friend requests.
 */
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fire all queries in parallel — single network roundtrip per query but all concurrent
    const [
      groupMemberships,
      expenses,
      settlements,
      unreadCount,
      friendRequests
    ] = await Promise.all([
      // Groups with lightweight data
      prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              _count: { select: { expenses: true } }
            }
          }
        }
      }),

      // Recent expenses
      prisma.expense.findMany({
        where: {
          OR: [
            { createdById: userId },
            { splits: { some: { userId } } }
          ]
        },
        orderBy: { date: 'desc' },
        include: {
          paidBy: { select: { id: true, name: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
          group: { select: { id: true, name: true, icon: true } }
        }
      }),

      // Settlements
      prisma.settlement.findMany({
        where: {
          OR: [{ payerId: userId }, { payeeId: userId }]
        },
        orderBy: { createdAt: 'desc' },
        include: {
          payer: { select: { id: true, name: true, avatar: true } },
          payee: { select: { id: true, name: true, avatar: true } }
        }
      }),

      // Unread notification count (just the count, not all notifications)
      prisma.notification.count({
        where: { userId, read: false }
      }),

      // Pending friend requests
      prisma.friendRequest.findMany({
        where: { receiverId: userId, status: 'pending' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      })
    ]);

    // Build groups with balances efficiently
    const groupIds = groupMemberships.map(m => m.group.id);
    let groupBalanceMap = {};

    if (groupIds.length > 0) {
      const [userSplits, userPaidExpenses, userSettlements] = await Promise.all([
        prisma.expenseSplit.findMany({
          where: { userId, expense: { groupId: { in: groupIds } } },
          select: { owed: true, expense: { select: { groupId: true } } }
        }),
        prisma.expense.findMany({
          where: { paidById: userId, groupId: { in: groupIds } },
          select: { groupId: true, amount: true }
        }),
        prisma.settlement.findMany({
          where: {
            groupId: { in: groupIds },
            status: 'completed',
            OR: [{ payerId: userId }, { payeeId: userId }]
          },
          select: { groupId: true, payerId: true, payeeId: true, amount: true }
        })
      ]);

      groupIds.forEach(id => { groupBalanceMap[id] = 0; });

      userSplits.forEach(split => {
        const gId = split.expense.groupId;
        if (gId) groupBalanceMap[gId] -= (split.owed || 0);
      });

      userPaidExpenses.forEach(exp => {
        if (exp.groupId) groupBalanceMap[exp.groupId] += exp.amount;
      });

      userSettlements.forEach(s => {
        const gId = s.groupId;
        if (!gId) return;
        if (s.payerId === userId) groupBalanceMap[gId] += s.amount;
        else if (s.payeeId === userId) groupBalanceMap[gId] -= s.amount;
      });
    }

    const groups = groupMemberships.map(membership => {
      const group = membership.group;
      const balance = groupBalanceMap[group.id] || 0;
      return {
        ...group,
        members: group.members.map(m => m.user),
        expenseCount: group._count.expenses,
        balance,
        positive: balance >= 0,
      };
    });

    res.json({
      groups,
      expenses,
      settlements,
      unreadNotificationCount: unreadCount,
      friendRequests
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
