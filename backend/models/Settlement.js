const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  note: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
}, { timestamps: true });

settlementSchema.index({ payer: 1, payee: 1, group: 1, createdAt: -1 });
module.exports = mongoose.model('Settlement', settlementSchema);
