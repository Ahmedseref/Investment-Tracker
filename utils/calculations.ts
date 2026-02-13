
import { Transaction, TransactionType } from '../types';

/**
 * Robust ID generator that works in non-HTTPS environments
 */
export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  
  // Fallback for non-secure contexts
  return 'idx-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

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
  try {
    const validCurrency = (currency && currency.length === 3) ? currency.toUpperCase() : 'TRY';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  } catch (e) {
    return `${(amount || 0).toFixed(2)} ${currency || 'TRY'}`;
  }
};
