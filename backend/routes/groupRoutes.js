const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const strictLimiter = require('../middleware/strictLimiter');
const { createGroup, updateGroup, deleteGroup, getGroup, getGroups, addMember, removeMember, exportGroupData, getSmartSplitSuggestions, toggleSmartSplit } = require('../controllers/groupController');

const router = express.Router();
router.use(protect);
router.get('/', getGroups);
router.get('/:id', getGroup);
router.post('/', strictLimiter, createGroup);
router.put('/:id', strictLimiter, updateGroup);
router.delete('/:id', strictLimiter, deleteGroup);
router.post('/:id/members', strictLimiter, addMember);
router.delete('/:id/members/:memberId', strictLimiter, removeMember);
router.get('/:id/export', exportGroupData);
router.get('/:id/smart-split', getSmartSplitSuggestions);
router.post('/:id/smart-split/toggle', toggleSmartSplit);

module.exports = router;
