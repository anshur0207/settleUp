const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const syncPendingGroupInvites = async (user) => {
  const email = user.email.toLowerCase().trim();
  
  const pendingInvites = await prisma.groupPendingMember.findMany({
    where: { email, status: 'pending' },
    include: { group: { include: { members: true } } }
  });
  
  let hasUpdates = false;

  for (const invite of pendingInvites) {
    const isMember = invite.group.members.some(m => m.userId === user.id);
    
    if (!isMember) {
      await prisma.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId: user.id,
          role: 'member'
        }
      });
      hasUpdates = true;
    }

    await prisma.groupPendingMember.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        userId: user.id,
        name: invite.name || user.name
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'group_invite_accepted',
        title: `You joined ${invite.group.name}`,
        message: `You were added to ${invite.group.name} after signing up.`,
        meta: { group: invite.groupId },
      }
    });
  }
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), password: hashed, currency: currency || 'INR' }
    });
    
    await syncPendingGroupInvites(user);
    const token = createToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar } });
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
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await syncPendingGroupInvites(user);
    const token = createToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar } });
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
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const newToken = createToken(user.id);
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
  res.json({ message: `If ${email} exists, you will receive reset instructions.` });
};

module.exports = { registerUser, loginUser, logoutUser, refreshToken, forgotPassword };
