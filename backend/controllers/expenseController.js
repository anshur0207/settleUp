const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const { buildExpenseSplits } = require('../utils/calcDebt');

const areIdsEqual = (a, b) => {
  if (a && typeof a.equals === 'function') return a.equals(b);
  if (b && typeof b.equals === 'function') return b.equals(a);
  return String(a) === String(b);
};

const createExpense = async (req, res, next) => {
  try {
    const { title, amount, currency, paidBy, groupId, splitType, participants, notes, category, tags, billUrl, date } = req.body;
    const splitPayload = buildExpenseSplits({ amount, splitType, participants, paidBy });
    const expense = await Expense.create({
      title,
      amount,
      currency: currency || req.user.currency || 'INR',
      paidBy,
      createdBy: req.user._id,
      group: groupId,
      splitType: splitType || 'equal',
      splits: splitPayload,
      notes: notes || '',
      category: category || 'Others',
      tags: tags || [],
      billUrl: billUrl || '',
      date: date ? new Date(date) : new Date(),
    });
    if (groupId) {
      const group = await Group.findById(groupId);
      if (group && !group.expenses.includes(expense._id)) {
        group.expenses.push(expense._id);
        await group.save();
      }
    }
    const recipients = splitPayload.filter((item) => !areIdsEqual(item.user, req.user._id)).map((item) => item.user);
    await Promise.all(recipients.map((userId) => Notification.create({ user: userId, type: 'expense_added', title: 'New expense added', message: `${req.user.name} added ${title} for ${amount}`, meta: { expense: expense._id, group: groupId } })));
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (!expense.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this expense' });
    }
    const { title, amount, currency, paidBy, splitType, participants, notes, category, tags, billUrl, date } = req.body;
    Object.assign(expense, { title, amount, currency, paidBy, splitType, notes, category, tags, billUrl, date: date ? new Date(date) : expense.date });
    if (participants) {
      expense.splits = buildExpenseSplits({ amount, splitType, participants, paidBy });
    }
    await expense.save();
    res.json({ expense });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (!expense.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (expense.group) {
      await Group.findByIdAndUpdate(expense.group, { $pull: { expenses: expense._id } });
    }

    // Delete existing notifications for this expense
    await Notification.deleteMany({ 'meta.expense': expense._id, type: 'expense_added' });

    // Notify participants about deletion
    const recipients = expense.splits
      .filter((split) => !areIdsEqual(split.user, req.user._id))
      .map((split) => split.user);
      
    if (recipients.length > 0) {
      await Promise.all(recipients.map((userId) => 
        Notification.create({ 
          user: userId, 
          type: 'expense_deleted',
          title: 'Expense Deleted', 
          message: `${req.user.name} deleted the expense "${expense.title}".`, 
          meta: { group: expense.group } 
        })
      ));
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { groupId, search } = req.query;
    const query = { $or: [{ createdBy: req.user._id }, { 'splits.user': req.user._id }] };
    if (groupId) query.group = groupId;
    if (search) query.title = { $regex: search, $options: 'i' };
    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .limit(80)
      .populate('paidBy', 'name avatar')
      .populate({ path: 'splits.user', select: 'name avatar email' })
      .populate('group', 'name icon');
    res.json({ expenses });
  } catch (error) {
    next(error);
  }
};

const getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name avatar')
      .populate('group', 'name icon')
      .populate({ path: 'splits.user', select: 'name email' });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    const involved = expense.splits.some((split) => areIdsEqual(split.user, req.user._id)) || expense.createdBy.equals(req.user._id);
    if (!involved) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ expense });
  } catch (error) {
    next(error);
  }
};

module.exports = { createExpense, updateExpense, deleteExpense, getExpenses, getExpense };
