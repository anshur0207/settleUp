const prisma = require('../utils/prisma');
const { buildExpenseSplits } = require('../utils/calcDebt');

const createExpense = async (req, res, next) => {
  try {
    const { title, amount, currency, paidBy, groupId, splitType, participants, notes, category, tags, billUrl, date } = req.body;
    
    // We expect splitPayload to have { userId, paid, owed, share, percent, adjustment }
    const splitPayload = buildExpenseSplits({ amount, splitType, participants, paidBy });
    
    const expense = await prisma.expense.create({
      data: {
        title,
        amount,
        currency: currency || req.user.currency || 'INR',
        paidById: paidBy,
        createdById: req.user.id,
        groupId: groupId || null,
        splitType: splitType || 'equal',
        notes: notes || '',
        category: category || 'Others',
        tags: tags || [],
        billUrl: billUrl || '',
        date: date ? new Date(date) : new Date(),
        splits: {
          create: splitPayload.map(split => ({
            userId: split.user || split.userId,
            paid: split.paid || 0,
            owed: split.owed || 0,
            share: split.share || 0,
            percent: split.percent || 0,
            adjustment: split.adjustment || 0
          }))
        }
      },
      include: { splits: true }
    });

    const recipients = splitPayload
      .filter((item) => (item.user || item.userId) !== req.user.id)
      .map((item) => item.user || item.userId);
      
    if (recipients.length > 0) {
      await Promise.all(recipients.map((userId) => prisma.notification.create({
        data: {
          userId,
          type: 'expense_added',
          title: 'New expense added',
          message: `${req.user.name} added ${title} for ${amount}`,
          meta: { expense: expense.id, group: groupId }
        }
      })));
    }
    
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { splits: true }
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (expense.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this expense' });
    }
    
    const { title, amount, currency, paidBy, splitType, participants, notes, category, tags, billUrl, date } = req.body;
    
    let splitsData = undefined;
    if (participants) {
      const splitPayload = buildExpenseSplits({ amount, splitType, participants, paidBy });
      splitsData = {
        deleteMany: {}, // delete old splits
        create: splitPayload.map(split => ({
          userId: split.user || split.userId,
          paid: split.paid || 0,
          owed: split.owed || 0,
          share: split.share || 0,
          percent: split.percent || 0,
          adjustment: split.adjustment || 0
        }))
      };
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        title, amount, currency,
        paidById: paidBy,
        splitType, notes, category, tags, billUrl,
        date: date ? new Date(date) : expense.date,
        splits: splitsData
      },
      include: { splits: true }
    });
    
    res.json({ expense: updatedExpense });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { splits: true }
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (expense.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete existing notifications (requires native query or finding first since JSON filtering is tricky)
    // For now we'll just delete the expense, cascade should handle splits if defined.

    const recipients = expense.splits
      .filter((split) => split.userId !== req.user.id)
      .map((split) => split.userId);
      
    if (recipients.length > 0) {
      await Promise.all(recipients.map((userId) => 
        prisma.notification.create({ 
          data: {
            userId, 
            type: 'expense_deleted',
            title: 'Expense Deleted', 
            message: `${req.user.name} deleted the expense "${expense.title}".`, 
            meta: { group: expense.groupId } 
          }
        })
      ));
    }

    await prisma.expense.delete({ where: { id: expense.id } });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { groupId, search } = req.query;
    
    const where = {
      OR: [
        { createdById: req.user.id },
        { splits: { some: { userId: req.user.id } } }
      ]
    };
    
    if (groupId) where.groupId = groupId;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 80,
      include: {
        paidBy: { select: { id: true, name: true, avatar: true } },
        splits: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        group: { select: { id: true, name: true, icon: true } }
      }
    });
    
    res.json({ expenses });
  } catch (error) {
    next(error);
  }
};

const getExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        paidBy: { select: { id: true, name: true, avatar: true } },
        group: { select: { id: true, name: true, icon: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const involved = expense.splits.some((split) => split.userId === req.user.id) || expense.createdById === req.user.id;
    if (!involved) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ expense });
  } catch (error) {
    next(error);
  }
};

module.exports = { createExpense, updateExpense, deleteExpense, getExpenses, getExpense };
