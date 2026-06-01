const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  createdGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  joinedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest' }],
  settings: {
    darkMode: { type: Boolean, default: false },
    quickAdd: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    twoFactor: { type: Boolean, default: false },
    mobileAlerts: { type: Boolean, default: true },
  },
}, { timestamps: true });

userSchema.index({ email: 1 });
module.exports = mongoose.model('User', userSchema);
