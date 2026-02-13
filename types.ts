
export enum Currency {
  TRY = 'TRY',
  USD = 'USD'
}

export enum InvestmentType {
  PARTICIPATION = 'Participation Account',
  SUKUK = 'Sukuk (Lease Certificate)',
  GOLD = 'Gold Account',
  REAL_ESTATE = 'Real Estate Fund'
}

export enum TransactionType {
  USER_DEPOSIT = 'USER_DEPOSIT',
  BANK_PROFIT = 'BANK_PROFIT',
  WITHDRAWAL = 'WITHDRAWAL',
  MIXED = 'MIXED'
}

export interface Account {
  id: string;
  bankName: string;
  currency: Currency;
  investmentType: InvestmentType;
  startDate: string;
  maturityPeriod: number; // in months
  riskLevel: 'Low' | 'Medium' | 'High';
  currentBalance: number;
  initialCapital: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  previousBalance: number;
  currentBalance: number;
  userDeposit: number;
  withdrawal: number;
  calculatedProfit: number;
  profitPercentage: number;
  type: TransactionType;
}

export interface DashboardStats {
  totalCapital: { [key in Currency]: number };
  totalProfit: { [key in Currency]: number };
  bestPerformer: Account | null;
  worstPerformer: Account | null;
}
