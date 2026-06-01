const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createGroup, updateGroup, deleteGroup, getGroup, getGroups, addMember, removeMember, exportGroupData, getSmartSplitSuggestions, toggleSmartSplit } = require('../controllers/groupController');

const router = express.Router();
router.use(protect);
router.get('/', getGroups);
router.get('/:id', getGroup);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.get('/:id/export', exportGroupData);
router.get('/:id/smart-split', getSmartSplitSuggestions);
router.post('/:id/smart-split/toggle', toggleSmartSplit);

module.exports = router;
