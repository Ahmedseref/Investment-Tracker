
import { Account, Transaction, Currency, InvestmentType, TransactionType } from '../types';

// Fallback UUID generator if crypto.randomUUID is not available
const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export const exportToCSV = (accounts: Account[], transactions: Transaction[]) => {
  let csvContent = "---ACCOUNTS---\n";
  csvContent += "ID,Bank Name,Currency,Type,Start Date,Maturity,Risk,Current Balance,Initial Capital\n";
  
  accounts.forEach(acc => {
    csvContent += `${acc.id},"${acc.bankName}",${acc.currency},"${acc.investmentType}",${acc.startDate},${acc.maturityPeriod},${acc.riskLevel},${acc.currentBalance},${acc.initialCapital}\n`;
  });

  csvContent += "\n---TRANSACTIONS---\n";
  csvContent += "ID,Account ID,Date,Prev Balance,Curr Balance,User Deposit,Withdrawal,Profit,Profit %,Type\n";
  
  transactions.forEach(tx => {
    csvContent += `${tx.id},${tx.accountId},${tx.date},${tx.previousBalance},${tx.currentBalance},${tx.userDeposit},${tx.withdrawal},${tx.calculatedProfit},${tx.profitPercentage},${tx.type}\n`;
  });

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `BarakaInvest_Backup_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseImportCSV = (content: string): { accounts: Account[], transactions: Transaction[] } => {
  const normalizedContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];
  
  let currentSection: 'NONE' | 'ACCOUNTS' | 'TRANSACTIONS' = 'NONE';

  lines.forEach(line => {
    const upperLine = line.toUpperCase();
    if (upperLine.includes('---ACCOUNTS---')) {
      currentSection = 'ACCOUNTS';
      return;
    }
    if (upperLine.includes('---TRANSACTIONS---')) {
      currentSection = 'TRANSACTIONS';
      return;
    }
    
    if (line.toLowerCase().startsWith('id,')) return;

    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const cleanParts = parts.map(p => p.trim().replace(/^"|"$/g, ''));

    if (currentSection === 'ACCOUNTS' && cleanParts.length >= 8) {
      // Validate Currency
      let currency = cleanParts[2] as Currency;
      if (!Object.values(Currency).includes(currency)) {
        currency = Currency.TRY; // Default fallback
      }

      accounts.push({
        id: cleanParts[0] || generateId(),
        bankName: cleanParts[1] || 'Unknown Bank',
        currency: currency,
        investmentType: (cleanParts[3] as InvestmentType) || InvestmentType.PARTICIPATION,
        startDate: cleanParts[4] || new Date().toISOString().split('T')[0],
        maturityPeriod: Number(cleanParts[5]) || 0,
        riskLevel: (cleanParts[6] as 'Low' | 'Medium' | 'High') || 'Low',
        currentBalance: Number(cleanParts[7]) || 0,
        initialCapital: Number(cleanParts[8]) || Number(cleanParts[7]) || 0
      });
    } else if (currentSection === 'TRANSACTIONS' && cleanParts.length >= 9) {
      transactions.push({
        id: cleanParts[0] || generateId(),
        accountId: cleanParts[1],
        date: cleanParts[2] || new Date().toISOString().split('T')[0],
        previousBalance: Number(cleanParts[3]) || 0,
        currentBalance: Number(cleanParts[4]) || 0,
        userDeposit: Number(cleanParts[5]) || 0,
        withdrawal: Number(cleanParts[6]) || 0,
        calculatedProfit: Number(cleanParts[7]) || 0,
        profitPercentage: Number(cleanParts[8]) || 0,
        type: (cleanParts[9] as TransactionType) || TransactionType.BANK_PROFIT
      });
    }
  });

  return { accounts, transactions };
};
