const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String, default: '' },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: Object, default: {} },
}, { timestamps: true });

activityLogSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('ActivityLog', activityLogSchema);
