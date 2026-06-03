const express = require('express');
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  resetUserPassword,
  getAllGroups,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes must go through both protect and protectAdmin middlewares
router.use(protect);
router.use(protectAdmin);

router.get('/users', getAllUsers);
router.post('/users/:userId/reset-password', resetUserPassword);

router.get('/groups', getAllGroups);
router.post('/groups/:groupId/members', addGroupMember);
router.delete('/groups/:groupId/members/:userId', removeGroupMember);
router.delete('/groups/:groupId', deleteGroup);

module.exports = router;
