const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const strictLimiter = require('../middleware/strictLimiter');
const { createExpense, updateExpense, deleteExpense, getExpenses, getExpense } = require('../controllers/expenseController');

const router = express.Router();
router.use(protect);
router.get('/', getExpenses);
router.get('/:id', getExpense);
router.post('/', strictLimiter, createExpense);
router.put('/:id', strictLimiter, updateExpense);
router.delete('/:id', strictLimiter, deleteExpense);

module.exports = router;
