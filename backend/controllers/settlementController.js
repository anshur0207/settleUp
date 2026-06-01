const Settlement = require('../models/Settlement');
const Notification = require('../models/Notification');
const Expense = require('../models/Expense');

const settlePayment = async (req, res, next) => {
  try {
    const { payee, amount, groupId, note, referenceId } = req.body;
    if (!payee || !amount) {
      return res.status(400).json({ message: 'Payee and amount are required' });
    }

    let createdSettlements = [];

    if (groupId) {
      const settlement = await Settlement.create({
        payer: req.user._id,
        payee,
        group: groupId,
        amount: Number(amount),
        currency: req.user.currency || 'INR',
        note: note || '',
        referenceId: referenceId || '',
        status: 'completed',
      });
      createdSettlements.push(settlement);
    } else {
      const expenses = await Expense.find({
        $or: [
          { paidBy: payee, 'splits.user': req.user._id },
          { paidBy: req.user._id, 'splits.user': payee }
        ]
      });

      const groupBalances = {}; 
      expenses.forEach(exp => {
        const gId = exp.group ? exp.group.toString() : 'nongroup';
        groupBalances[gId] = groupBalances[gId] || 0;
        
        if (exp.paidBy.equals(payee)) {
          const mySplit = exp.splits.find(s => s.user.equals(req.user._id));
          if (mySplit) groupBalances[gId] += (mySplit.owed || mySplit.amount || 0);
        } else if (exp.paidBy.equals(req.user._id)) {
          const theirSplit = exp.splits.find(s => s.user.equals(payee));
          if (theirSplit) groupBalances[gId] -= (theirSplit.owed || theirSplit.amount || 0);
        }
      });

      const existingSettlements = await Settlement.find({
        $or: [
          { payer: req.user._id, payee: payee },
          { payer: payee, payee: req.user._id }
        ]
      });

      existingSettlements.forEach(settlement => {
        const gId = settlement.group ? settlement.group.toString() : 'nongroup';
        groupBalances[gId] = groupBalances[gId] || 0;
        
        if (settlement.payer.equals(req.user._id)) {
          groupBalances[gId] -= settlement.amount; 
        } else {
          groupBalances[gId] += settlement.amount; 
        }
      });

      let remainingAmount = Number(amount);

      for (const [gId, debt] of Object.entries(groupBalances)) {
        if (debt > 0.01 && remainingAmount > 0.01) {
          const settleAmount = Math.min(debt, remainingAmount);
          remainingAmount -= settleAmount;
          
          const s = await Settlement.create({
            payer: req.user._id,
            payee,
            group: gId === 'nongroup' ? null : gId,
            amount: Number(settleAmount.toFixed(2)),
            currency: req.user.currency || 'INR',
            note: note || '',
            referenceId: referenceId || '',
            status: 'completed',
          });
          createdSettlements.push(s);
        }
      }

      if (remainingAmount > 0.01 || createdSettlements.length === 0) {
          const s = await Settlement.create({
            payer: req.user._id,
            payee,
            group: null,
            amount: Number(remainingAmount.toFixed(2)),
            currency: req.user.currency || 'INR',
            note: note || '',
            referenceId: referenceId || '',
            status: 'completed',
          });
          createdSettlements.push(s);
      }
    }

    await Notification.create({ 
      user: payee, 
      type: 'settlement', 
      title: 'Payment received', 
      message: `${req.user.name} settled ₹${amount}`, 
      meta: { settlement: createdSettlements[0]._id, group: groupId } 
    });

    res.status(201).json({ settlements: createdSettlements });
  } catch (error) {
    next(error);
  }
};

const getSettlements = async (req, res, next) => {
  try {
    const settlements = await Settlement.find({ $or: [{ payer: req.user._id }, { payee: req.user._id }] }).sort({ createdAt: -1 }).populate('payer payee', 'name avatar');
    res.json({ settlements });
  } catch (error) {
    next(error);
  }
};

module.exports = { settlePayment, getSettlements };
