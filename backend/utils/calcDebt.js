const simplifyDebts = (balances) => {
  const entries = Object.entries(balances).map(([user, amount]) => ({ user, amount: Number(amount) }));
  const debtList = [];
  const creditors = entries.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = entries.filter((item) => item.amount < 0).sort((a, b) => a.amount - b.amount);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settlement = Math.min(creditor.amount, Math.abs(debtor.amount));
    if (settlement > 0) {
      debtList.push({ from: debtor.user, to: creditor.user, amount: Number(settlement.toFixed(2)) });
    }
    debtor.amount += settlement;
    creditor.amount -= settlement;

    if (Math.abs(debtor.amount) < 0.01) i += 1;
    if (Math.abs(creditor.amount) < 0.01) j += 1;
  }

  return debtList;
};

const buildExpenseSplits = ({ amount, splitType, participants, paidBy }) => {
  if (!participants || participants.length === 0) {
    return [{ user: paidBy, paid: amount, owed: 0, share: 1, percent: 100 }];
  }

  const total = Number(amount);
  const splitCount = participants.length;
  const splits = participants.map((participant) => ({
    user: participant.user,
    paid: Number(participant.paid) || 0,
    owed: 0,
    share: Number(participant.share) || 0,
    percent: Number(participant.percent) || 0,
    adjustment: Number(participant.adjustment) || 0,
  }));

  if (splitType === 'exact' || splitType === 'unequal') {
    splits.forEach((item) => {
      item.owed = Number(item.paid || 0) === total ? 0 : Number(item.share || item.owed || 0);
      item.owed = Number(item.owed.toFixed(2));
    });
  } else if (splitType === 'percentage') {
    splits.forEach((item) => {
      item.owed = Number(((item.percent || 0) / 100) * total).toFixed(2);
      item.owed = Number(item.owed);
    });
  } else if (splitType === 'shares') {
    const totalShares = splits.reduce((sum, item) => sum + (item.share || 0), 0) || splitCount;
    splits.forEach((item) => {
      const share = item.share || 1;
      item.owed = Number(((share / totalShares) * total).toFixed(2));
    });
  } else if (splitType === 'adjustment') {
    const equal = Number((total / splitCount).toFixed(2));
    let remainder = Number((total - (equal * splitCount)).toFixed(2));
    
    splits.forEach((item) => {
      item.owed = equal + item.adjustment;
    });
    
    if (remainder !== 0) {
      splits[0].owed += remainder;
    }
  } else {
    const equal = Number((total / splitCount).toFixed(2));
    splits.forEach((item) => {
      item.owed = equal;
    });
    const remainder = Number((total - equal * splitCount).toFixed(2));
    if (remainder !== 0) {
      splits[0].owed += remainder;
    }
  }

  splits.forEach((item) => {
    if (item.user.toString() === paidBy.toString()) {
      item.paid = Number(item.paid || total);
    }
  });

  return splits;
};

module.exports = { simplifyDebts, buildExpenseSplits };
