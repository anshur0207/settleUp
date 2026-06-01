const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const syncPendingGroupInvites = async (user) => {
  const email = user.email.toLowerCase().trim();
  const groups = await Group.find({ 'pendingMembers.email': email });
  let hasUpdates = false;

  for (const group of groups) {
    const pendingInvite = group.pendingMembers.find((pending) => pending.email === email && pending.status === 'pending');
    if (!pendingInvite) continue;

    if (!group.members.some((memberId) => memberId.equals(user._id))) {
      group.members.push(user._id);
      hasUpdates = true;
    }

    group.pendingMembers = group.pendingMembers.map((pending) => {
      if (pending.email !== email) return pending;
      pending.status = 'accepted';
      pending.user = user._id;
      pending.name = pending.name || user.name;
      return pending;
    });

    await group.save();

    user.joinedGroups = user.joinedGroups || [];
    if (!user.joinedGroups.some((groupId) => groupId.equals(group._id))) {
      user.joinedGroups.push(group._id);
      hasUpdates = true;
    }

    await Notification.create({
      user: user._id,
      type: 'group_invite_accepted',
      title: `You joined ${group.name}`,
      message: `You were added to ${group.name} after signing up.`,
      meta: { group: group._id },
    });
  }

  if (hasUpdates) {
    await user.save();
  }
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, currency: currency || 'INR' });
    await syncPendingGroupInvites(user);
    const token = createToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar } });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await syncPendingGroupInvites(user);
    const token = createToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar } });
  } catch (error) {
    next(error);
  }
};

const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Refresh token missing' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const newToken = createToken(user._id);
    res.json({ token: newToken });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  // In a production app, integrate email provider here.
  res.json({ message: `If ${email} exists, you will receive reset instructions.` });
};

module.exports = { registerUser, loginUser, logoutUser, refreshToken, forgotPassword };
