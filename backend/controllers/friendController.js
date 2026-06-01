const prisma = require('../utils/prisma');

const sendFriendRequest = async (req, res, next) => {
  try {
    const { email, message } = req.body;
    const sender = req.user;
    
    const receiver = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { friends: true }
    });
    
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (receiver.id === sender.id) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }
    
    const existingRequest = await prisma.friendRequest.findFirst({
      where: { senderId: sender.id, receiverId: receiver.id }
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    if (receiver.friends.some(f => f.id === sender.id)) {
      return res.status(400).json({ message: 'Already friends' });
    }
    
    const request = await prisma.friendRequest.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        message: message || ''
      }
    });
    
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        type: 'friend_request',
        title: 'New friend request',
        message: `${sender.name || 'Someone'} sent you a friend request.`,
        meta: { sender: sender.id }
      }
    });
    
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const respondFriendRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await prisma.friendRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request || request.receiverId !== req.user.id) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: request.id },
      data: { status }
    });
    
    if (status === 'accepted') {
      // Connect both sides of the relation
      await prisma.user.update({
        where: { id: request.senderId },
        data: { friends: { connect: { id: request.receiverId } } }
      });
      await prisma.user.update({
        where: { id: request.receiverId },
        data: { friends: { connect: { id: request.senderId } } }
      });
      
      const receiver = await prisma.user.findUnique({ where: { id: request.receiverId } });
      
      await prisma.notification.create({
        data: {
          userId: request.senderId,
          type: 'friend_accept',
          title: 'Friend request accepted',
          message: `${receiver.name} accepted your request.`,
          meta: { receiver: receiver.id }
        }
      });
    }
    res.json({ request: updatedRequest });
  } catch (error) {
    next(error);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { friends: { disconnect: { id: friendId } } }
    });
    
    await prisma.user.update({
      where: { id: friendId },
      data: { friends: { disconnect: { id: req.user.id } } }
    });
    
    res.json({ message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        friends: {
          select: { id: true, name: true, email: true, avatar: true, currency: true }
        }
      }
    });
    
    res.json({ friends: user?.friends || [] });
  } catch (error) {
    next(error);
  }
};

const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.user.id, status: 'pending' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendFriendRequest, respondFriendRequest, removeFriend, getFriends, getFriendRequests };
