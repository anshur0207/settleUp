const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, uploadAvatar, searchUsers, getSuggestedUsers } = require('../controllers/userController');

const router = express.Router();
router.use(protect);
router.get('/search', searchUsers);
router.get('/suggested', getSuggestedUsers);
router.get('/me', getProfile);
router.put('/me', updateProfile);
router.post('/me/avatar', uploadAvatar);

module.exports = router;
