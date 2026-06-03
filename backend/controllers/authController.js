const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      return res.status(400).json({ message: 'Name can only contain alphabets and spaces' });
    }
    if (!/^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters and include a special character' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!email.toLowerCase().trim().endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Only @gmail.com emails are allowed for signup' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ message: 'Email already present' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), password: hashed, currency: currency || 'INR' }
    });
    
    await syncPendingGroupInvites(user);
    const token = createToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(201).json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar, isAdmin: user.isAdmin } });
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
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar, isAdmin: user.isAdmin } });
  } catch (error) {
    next(error);
  }
};

const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
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
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ message: 'Token refreshed successfully' });
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

const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const email = payload.email.toLowerCase().trim();
    
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Only @gmail.com emails are allowed for signup' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const hashed = await bcrypt.hash(Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), 12);
      user = await prisma.user.create({
        data: {
          name: payload.name || 'Google User',
          email: email,
          password: hashed,
          avatar: payload.picture || '',
          currency: 'INR',
        }
      });
      await syncPendingGroupInvites(user);
    } else {
      await syncPendingGroupInvites(user);
    }

    const token = createToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, currency: user.currency, avatar: user.avatar, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    next(error);
  }
};

module.exports = { registerUser, loginUser, logoutUser, refreshToken, forgotPassword, googleAuth };
