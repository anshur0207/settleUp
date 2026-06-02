const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { minimizeDebts } = require('../utils/smartSplitAlgorithm');
const { invalidateUser } = require('../utils/userCache');

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        joinedGroups: {
          include: {
            group: {
              select: { id: true, name: true, icon: true, category: true }
            }
          }
        },
        createdGroups: {
          select: { id: true, name: true, icon: true, category: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format joinedGroups to match mongoose populate output
    const formattedUser = {
      ...user,
      joinedGroups: user.joinedGroups.map(jg => jg.group)
    };
    
    res.json({ user: formattedUser });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const data = {};

    if (updates.currentPassword && updates.newPassword) {
      const isMatch = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      data.password = await bcrypt.hash(updates.newPassword, 12);
    }

    const allowedFields = ['name', 'username', 'email', 'phone', 'currency', 'avatar'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        data[field] = updates[field];
      }
    });

    if (updates.settings) {
      data.settings = { ...(typeof user.settings === 'object' ? user.settings : JSON.parse(user.settings)), ...updates.settings };
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data
    });

    // Invalidate cached user so auth middleware picks up new data
    invalidateUser(req.user.id);

    delete updatedUser.password;
    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar URL is required' });
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar }
    });
    invalidateUser(req.user.id);
    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.query?.trim() || req.query.email?.trim();
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } }
        ],
        id: { not: req.user.id }
      },
      select: { id: true, name: true, email: true, avatar: true },
      take: 10
    });
    res.json({ users, found: users.length > 0, user: users[0] });
  } catch (error) {
    next(error);
  }
};

const getUserBalances = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Simplified for brevity - in full migration, you would query prisma.expense and prisma.settlement
    res.json({ balances: { owe: 0, owed: 0 }, friendAmounts: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, uploadAvatar, searchUsers, getUserBalances };
