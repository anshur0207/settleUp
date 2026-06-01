const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { sendFriendRequest, respondFriendRequest, removeFriend, getFriends, getFriendRequests } = require('../controllers/friendController');

const router = express.Router();
router.use(protect);
router.get('/', getFriends);
router.get('/requests', getFriendRequests);
router.post('/request', sendFriendRequest);
router.post('/request/:id/respond', respondFriendRequest);
router.delete('/:id', removeFriend);

module.exports = router;
