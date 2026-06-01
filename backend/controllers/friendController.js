const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');

const sendFriendRequest = async (req, res, next) => {
  try {
    const { email, message } = req.body;
    const sender = req.user;
    const receiver = await User.findOne({ email: email.toLowerCase().trim() });
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (receiver._id.equals(sender._id)) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }
    const existingRequest = await FriendRequest.findOne({ sender: sender._id, receiver: receiver._id });
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    if (sender.friends.includes(receiver._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }
    const request = await FriendRequest.create({ sender: sender._id, receiver: receiver._id, message: message || '' });
    receiver.friendRequests.push(request._id);
    await receiver.save();
    await Notification.create({ user: receiver._id, type: 'friend_request', title: 'New friend request', message: `${sender.name} sent you a friend request.`, meta: { sender: sender._id } });
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const respondFriendRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await FriendRequest.findById(req.params.id);
    if (!request || !request.receiver.equals(req.user._id)) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    request.status = status;
    await request.save();
    if (status === 'accepted') {
      const sender = await User.findById(request.sender);
      const receiver = await User.findById(request.receiver);
      if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);
      if (!receiver.friends.includes(sender._id)) receiver.friends.push(sender._id);
      await sender.save();
      await receiver.save();
      await Notification.create({ user: sender._id, type: 'friend_accept', title: 'Friend request accepted', message: `${receiver.name} accepted your request.`, meta: { receiver: receiver._id } });
    }
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }
    user.friends = user.friends.filter((id) => !id.equals(friend._id));
    friend.friends = friend.friends.filter((id) => !id.equals(user._id));
    await user.save();
    await friend.save();
    res.json({ message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email avatar currency');
    res.json({ friends: user.friends || [] });
  } catch (error) {
    next(error);
  }
};

const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user._id, status: 'pending' }).populate('sender', 'name email avatar');
    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendFriendRequest, respondFriendRequest, removeFriend, getFriends, getFriendRequests };
