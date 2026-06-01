const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paid: { type: Number, default: 0 },
  owed: { type: Number, default: 0 },
  share: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
  adjustment: { type: Number, default: 0 },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  splitType: { type: String, default: 'equal' },
  splits: [splitSchema],
  notes: { type: String, default: '' },
  category: { type: String, default: 'Others' },
  tags: [{ type: String }],
  billUrl: { type: String, default: '' },
  settled: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

expenseSchema.index({ createdBy: 1, group: 1, date: -1 });
expenseSchema.index({ group: 1 });
module.exports = mongoose.model('Expense', expenseSchema);
