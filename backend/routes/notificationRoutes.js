const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, markRead, markAllRead, deleteNotification, clearAllNotifications } = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);
router.get('/', getNotifications);
router.post('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.delete('/clear-all', clearAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;
