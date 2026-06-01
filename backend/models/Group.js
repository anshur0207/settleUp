const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Others' },
  icon: { type: String, default: '🏍️' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
  pendingMembers: [
    {
      email: { type: String, lowercase: true, trim: true, required: true },
      name: { type: String, default: '' },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      invitedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    },
  ],
  settings: {
    currency: { type: String, default: 'INR' },
    smartSplit: { type: Boolean, default: false },
  },
}, { timestamps: true });

groupSchema.index({ name: 1 });
module.exports = mongoose.model('Group', groupSchema);
