const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

const getAllGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
};

const addGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: user.id },
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User is already in this group' });
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role: 'member',
      },
    });

    res.json({ message: 'User added to group successfully' });
  } catch (error) {
    next(error);
  }
};

const removeGroupMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;

    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!member) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    res.json({ message: 'User removed from group successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Deleting the group will cascade delete all expenses, splits, and members
    await prisma.group.delete({
      where: { id: groupId }
    });

    res.json({ message: 'Group and all associated expenses deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  resetUserPassword,
  getAllGroups,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
};
