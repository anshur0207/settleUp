const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createExpense, updateExpense, deleteExpense, getExpenses, getExpense } = require('../controllers/expenseController');

const router = express.Router();
router.use(protect);
router.get('/', getExpenses);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
