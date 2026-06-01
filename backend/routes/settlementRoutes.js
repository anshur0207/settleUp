const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { settlePayment, getSettlements } = require('../controllers/settlementController');

const router = express.Router();
router.use(protect);
router.get('/', getSettlements);
router.post('/', settlePayment);

module.exports = router;
