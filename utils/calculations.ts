
import { Transaction, TransactionType } from '../types';

/**
 * Calculates profit based on Islamic banking logic:
 * Profit % = ((Current Balance − Previous Balance − External Deposit + External Withdrawal) / Previous Balance) × 100
 */
export const calculateProfitStats = (
  prevBalance: number,
  currBalance: number,
  userDeposit: number = 0,
  withdrawal: number = 0
) => {
  const diff = currBalance - prevBalance;
  const netExternalFlow = userDeposit - withdrawal;
  const profitAmount = diff - netExternalFlow;
  
  // To avoid division by zero or negative base issues
  const base = prevBalance > 0 ? prevBalance : (userDeposit > 0 ? userDeposit : 1);
  const profitPercentage = (profitAmount / base) * 100;

  let type = TransactionType.BANK_PROFIT;
  if (withdrawal > 0) type = TransactionType.WITHDRAWAL;
  else if (userDeposit > 0 && profitAmount > 0) type = TransactionType.MIXED;
  else if (userDeposit > 0) type = TransactionType.USER_DEPOSIT;

  return {
    profitAmount,
    profitPercentage,
    type
  };
};

export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};
