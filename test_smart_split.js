const { minimizeDebts } = require('./backend/utils/smartSplitAlgorithm.js');

const balances = {
  'A': -500,
  'B': 0,
  'C': 500
};

const result = minimizeDebts(balances);
console.log('Result 1 (A->C 500):', result);

const balances2 = {
  'A': -500,
  'B': -500,
  'C': 1000
};

const result2 = minimizeDebts(balances2);
console.log('Result 2 (A->C 500, B->C 500):', result2);

const balances3 = {
  'A': 500,
  'B': 500,
  'C': -1000
};

const result3 = minimizeDebts(balances3);
console.log('Result 3 (C->A 500, C->B 500):', result3);
