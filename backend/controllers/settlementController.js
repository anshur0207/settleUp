const prisma = require('../utils/prisma');

const settlePayment = async (req, res, next) => {
  try {
    const { payee, amount, groupId, note, referenceId } = req.body;
    if (!payee || !amount) {
      return res.status(400).json({ message: 'Payee and amount are required' });
    }

    let createdSettlements = [];

    if (groupId) {
      const settlement = await prisma.settlement.create({
        data: {
          payerId: req.user.id,
          payeeId: payee,
          groupId: groupId,
          amount: Number(amount),
          currency: req.user.currency || 'INR',
          note: note || '',
          referenceId: referenceId || '',
          status: 'completed',
        }
      });
      createdSettlements.push(settlement);
    } else {
      const expenses = await prisma.expense.findMany({
        where: {
          OR: [
            { paidById: payee, splits: { some: { userId: req.user.id } } },
            { paidById: req.user.id, splits: { some: { userId: payee } } }
          ]
        },
        include: { splits: true }
      });

      const groupBalances = {}; 
      expenses.forEach(exp => {
        const gId = exp.groupId || 'nongroup';
        groupBalances[gId] = groupBalances[gId] || 0;
        
        if (exp.paidById === payee) {
          const mySplit = exp.splits.find(s => s.userId === req.user.id);
          if (mySplit) groupBalances[gId] += (mySplit.owed || mySplit.amount || 0);
        } else if (exp.paidById === req.user.id) {
          const theirSplit = exp.splits.find(s => s.userId === payee);
          if (theirSplit) groupBalances[gId] -= (theirSplit.owed || theirSplit.amount || 0);
        }
      });

      const existingSettlements = await prisma.settlement.findMany({
        where: {
          OR: [
            { payerId: req.user.id, payeeId: payee },
            { payerId: payee, payeeId: req.user.id }
          ]
        }
      });

      existingSettlements.forEach(settlement => {
        const gId = settlement.groupId || 'nongroup';
        groupBalances[gId] = groupBalances[gId] || 0;
        
        if (settlement.payerId === req.user.id) {
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
          
          const s = await prisma.settlement.create({
            data: {
              payerId: req.user.id,
              payeeId: payee,
              groupId: gId === 'nongroup' ? null : gId,
              amount: Number(settleAmount.toFixed(2)),
              currency: req.user.currency || 'INR',
              note: note || '',
              referenceId: referenceId || '',
              status: 'completed',
            }
          });
          createdSettlements.push(s);
        }
      }

      if (remainingAmount > 0.01 || createdSettlements.length === 0) {
          const s = await prisma.settlement.create({
            data: {
              payerId: req.user.id,
              payeeId: payee,
              groupId: null,
              amount: Number(remainingAmount.toFixed(2)),
              currency: req.user.currency || 'INR',
              note: note || '',
              referenceId: referenceId || '',
              status: 'completed',
            }
          });
          createdSettlements.push(s);
      }
    }

    if (createdSettlements.length > 0) {
      await prisma.notification.create({ 
        data: {
          userId: payee, 
          type: 'settlement', 
          title: 'Payment received', 
          message: `${req.user.name} settled ₹${amount}`, 
          meta: { settlement: createdSettlements[0].id, group: groupId } 
        }
      });
    }

    res.status(201).json({ settlements: createdSettlements });
  } catch (error) {
    next(error);
  }
};

const getSettlements = async (req, res, next) => {
  try {
    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [{ payerId: req.user.id }, { payeeId: req.user.id }]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        payer: { select: { id: true, name: true, avatar: true } },
        payee: { select: { id: true, name: true, avatar: true } }
      }
    });
    res.json({ settlements });
  } catch (error) {
    next(error);
  }
};

module.exports = { settlePayment, getSettlements };
