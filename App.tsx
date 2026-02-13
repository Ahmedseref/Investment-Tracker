
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend 
} from 'recharts';
import { Account, Transaction, Currency, InvestmentType, TransactionType } from './types';
import { calculateProfitStats, formatCurrency } from './utils/calculations';
import TransactionModal from './components/TransactionModal';
import AccountModal from './components/AccountModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { getInvestmentInsights } from './services/geminiService';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: '1',
    bankName: 'Kuveyt Turk',
    currency: Currency.TRY,
    investmentType: InvestmentType.PARTICIPATION,
    startDate: '2024-01-01',
    maturityPeriod: 12,
    riskLevel: 'Low',
    currentBalance: 150000,
    initialCapital: 100000
  },
  {
    id: '2',
    bankName: 'Albaraka',
    currency: Currency.USD,
    investmentType: InvestmentType.SUKUK,
    startDate: '2024-02-15',
    maturityPeriod: 6,
    riskLevel: 'Medium',
    currentBalance: 12500,
    initialCapital: 10000
  }
];

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('bi_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('bi_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    localStorage.setItem('bi_accounts', JSON.stringify(accounts));
    localStorage.setItem('bi_transactions', JSON.stringify(transactions));
  }, [accounts, transactions]);

  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions(prev => [...prev, newTx]);
    setAccounts(prev => prev.map(acc => 
      acc.id === newTx.accountId 
        ? { ...acc, currentBalance: newTx.currentBalance }
        : acc
    ));
    setIsTxModalOpen(false);
  };

  const handleSaveAccount = (newAcc: Account) => {
    setAccounts(prev => [...prev, newAcc]);
    setIsAccModalOpen(false);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      setAccounts(prev => prev.filter(acc => acc.id !== accountToDelete.id));
      setTransactions(prev => prev.filter(tx => tx.accountId !== accountToDelete.id));
      setAccountToDelete(null);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const text = await getInvestmentInsights(accounts, transactions);
    setInsights(text || '');
    setLoadingInsights(false);
  };

  const stats = useMemo(() => {
    const totals = {
      [Currency.TRY]: { capital: 0, profit: 0 },
      [Currency.USD]: { capital: 0, profit: 0 }
    };

    accounts.forEach(acc => {
      totals[acc.currency].capital += acc.initialCapital;
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      const totalAccProfit = accTxs.reduce((sum, t) => sum + t.calculatedProfit, 0);
      totals[acc.currency].profit += totalAccProfit;
    });

    return totals;
  }, [accounts, transactions]);

  // Transformed data for multi-series performance chart (Profit % over time per account)
  const comparisonChartData = useMemo(() => {
    const dates = Array.from(new Set(transactions.map(t => t.date))).sort();
    return dates.map(date => {
      const entry: any = { date };
      accounts.forEach(acc => {
        // Find the most recent transaction for this account on or before this date
        const txsOnDate = transactions.filter(t => t.accountId === acc.id && t.date === date);
        if (txsOnDate.length > 0) {
          // If multiple transactions on same day, take the average or the last one
          entry[acc.bankName] = txsOnDate[txsOnDate.length - 1].profitPercentage;
        }
      });
      return entry;
    });
  }, [transactions, accounts]);

  const barChartData = useMemo(() => {
    return accounts.map(acc => {
      const accProfit = transactions.filter(t => t.accountId === acc.id).reduce((s, t) => s + t.calculatedProfit, 0);
      const roi = acc.initialCapital > 0 ? (accProfit / acc.initialCapital) * 100 : 0;
      return {
        name: acc.bankName,
        roi: Number(roi.toFixed(2)),
        profit: accProfit,
        currency: acc.currency
      };
    });
  }, [accounts, transactions]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-100">
              B
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600">
              BarakaInvest
            </h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={fetchInsights}
              className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              {loadingInsights ? 'Analyzing...' : 'AI Insights'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Capital (TRY)</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats[Currency.TRY].capital, 'TRY')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Profit (TRY)</p>
            <h3 className="text-2xl font-bold text-emerald-600">+{formatCurrency(stats[Currency.TRY].profit, 'TRY')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Capital (USD)</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats[Currency.USD].capital, 'USD')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Profit (USD)</p>
            <h3 className="text-2xl font-bold text-emerald-600">+{formatCurrency(stats[Currency.USD].profit, 'USD')}</h3>
          </div>
        </div>

        {insights && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <h4 className="flex items-center gap-2 font-bold text-indigo-900 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI Financial Advisor Insights
              </h4>
              <div className="prose prose-indigo prose-sm max-w-none text-indigo-800">
                {insights.split('\n').map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Individual Performance Comparison Line Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800">Performance Comparison (Profit %)</h3>
                <p className="text-xs text-slate-400">Comparing individual account growth percentages over time</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 10}} 
                    stroke="#94a3b8" 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  />
                  <YAxis 
                    tick={{fontSize: 10}} 
                    stroke="#94a3b8" 
                    label={{ value: 'Profit %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Profit']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  {accounts.map((acc, index) => (
                    <Line 
                      key={acc.id}
                      type="monotone" 
                      dataKey={acc.bankName} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2 }} 
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROI % Comparison Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2">Efficiency (ROI %)</h3>
            <p className="text-xs text-slate-400 mb-6">Which account gives the best return relative to its size?</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{fontSize: 10}} stroke="#94a3b8" unit="%" />
                  <YAxis type="category" dataKey="name" tick={{fontSize: 10}} stroke="#94a3b8" width={80} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                    formatter={(value: any, name: string) => name === 'roi' ? [`${value}%`, 'ROI'] : [formatCurrency(value, ''), 'Profit']}
                  />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]} barSize={32}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Your Portfolios</h3>
              <p className="text-slate-500">Monitor and update your participation accounts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts.map(acc => {
              const accProfit = transactions.filter(t => t.accountId === acc.id).reduce((s, t) => s + t.calculatedProfit, 0);
              const roi = acc.initialCapital > 0 ? (accProfit / acc.initialCapital) * 100 : 0;

              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col relative group/card">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToDelete(acc);
                    }}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 bg-white/50 backdrop-blur-sm rounded-lg opacity-0 group-hover/card:opacity-100 transition-all z-20"
                    aria-label="Delete Account"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          acc.currency === Currency.USD ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {acc.currency}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800 mt-1">{acc.bankName}</h4>
                        <p className="text-xs text-slate-400">{acc.investmentType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(acc.currentBalance, acc.currency)}</p>
                        <p className={`text-xs font-semibold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {roi.toFixed(2)}% Lifetime ROI
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 py-4 border-y border-slate-50">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Initial Capital</span>
                        <span className="font-medium">{formatCurrency(acc.initialCapital, acc.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Bank Profit</span>
                        <span className="font-bold text-emerald-600">+{formatCurrency(accProfit, acc.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Risk Profile</span>
                        <span className={`font-medium ${
                          acc.riskLevel === 'Low' ? 'text-emerald-500' : acc.riskLevel === 'Medium' ? 'text-amber-500' : 'text-red-500'
                        }`}>{acc.riskLevel}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setActiveAccount(acc);
                      setIsTxModalOpen(true);
                    }}
                    className="w-full bg-slate-50 hover:bg-emerald-600 hover:text-white py-3 transition-all font-semibold text-slate-600 border-t"
                  >
                    Update Balance
                  </button>
                </div>
              );
            })}
            
            <button 
              className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all p-6 flex flex-col items-center justify-center min-h-[250px] group"
              onClick={() => setIsAccModalOpen(true)}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 mb-4 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </div>
              <p className="font-bold text-slate-500 group-hover:text-emerald-700">Add New Account</p>
              <p className="text-xs text-slate-400">Expand your portfolio</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Balance Change</th>
                  <th className="px-6 py-4">Calculated Profit</th>
                  <th className="px-6 py-4 text-right">ROI %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length > 0 ? (
                  transactions.slice().reverse().map(tx => {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-6 py-4 font-medium text-slate-600">{tx.date}</td>
                        <td className="px-6 py-4">{acc ? `${acc.bankName} (${acc.currency})` : 'Deleted Account'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.type === TransactionType.BANK_PROFIT ? 'bg-emerald-100 text-emerald-700' : 
                            tx.type === TransactionType.USER_DEPOSIT ? 'bg-blue-100 text-blue-700' :
                            tx.type === TransactionType.WITHDRAWAL ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          {tx.currentBalance - tx.previousBalance >= 0 ? '+' : ''}
                          {formatCurrency(tx.currentBalance - tx.previousBalance, acc?.currency || 'TRY')}
                        </td>
                        <td className={`px-6 py-4 font-bold ${tx.calculatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(tx.calculatedProfit, acc?.currency || 'TRY')}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {tx.profitPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No transactions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isTxModalOpen && activeAccount && (
        <TransactionModal 
          account={activeAccount}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleAddTransaction}
        />
      )}

      {isAccModalOpen && (
        <AccountModal 
          onClose={() => setIsAccModalOpen(false)}
          onSave={handleSaveAccount}
        />
      )}

      {accountToDelete && (
        <DeleteConfirmationModal 
          account={accountToDelete}
          onClose={() => setAccountToDelete(null)}
          onConfirm={confirmDeleteAccount}
        />
      )}

      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 text-center space-y-2">
        <p className="text-slate-400 text-sm">BarakaInvest &copy; 2024 - Ethical Investment Tracking for the Digital Age</p>
        <p className="text-slate-300 text-xs italic">Designed for Islamic Profit-Sharing Principles (No Fixed Interest)</p>
      </footer>
    </div>
  );
};

export default App;
