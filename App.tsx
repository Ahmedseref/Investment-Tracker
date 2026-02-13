
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { Account, Transaction, Currency, InvestmentType, TransactionType } from './types';
import { calculateProfitStats, formatCurrency, generateId } from './utils/calculations';
import { exportToCSV } from './utils/csvHelper';
import { loadData, saveData, clearDatabase } from './services/db';
import TransactionModal from './components/TransactionModal';
import AccountModal from './components/AccountModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import ImportWizard from './components/ImportWizard';
import { getInvestmentInsights } from './services/geminiService';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

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
  }
];

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const hasHydrated = useRef(false);
  
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadData();
        if (data && data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          setTransactions(data.transactions || []);
        } else {
          setAccounts(INITIAL_ACCOUNTS);
          setTransactions([]);
        }
      } catch (e) {
        console.error("Critical: Database could not be initialized", e);
        setAccounts(INITIAL_ACCOUNTS);
      } finally {
        hasHydrated.current = true;
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  // Sync to Database
  useEffect(() => {
    if (hasHydrated.current && !isInitializing) {
      saveData(accounts, transactions).catch(err => {
        console.error("Auto-save failed:", err);
      });
    }
  }, [accounts, transactions, isInitializing]);

  const healTransactionChain = (allTransactions: Transaction[], affectedAccountId: string, allAccounts: Account[]): { healedTxs: Transaction[], updatedAccounts: Account[] } => {
    const account = allAccounts.find(a => a.id === affectedAccountId);
    if (!account) return { healedTxs: allTransactions, updatedAccounts: allAccounts };

    const otherTxs = allTransactions.filter(t => t.accountId !== affectedAccountId);
    const accTxs = allTransactions
      .filter(t => t.accountId === affectedAccountId)
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    let runningBalance = account.initialCapital || 0;
    const healedAccTxs = accTxs.map(tx => {
      const stats = calculateProfitStats(runningBalance, tx.currentBalance, tx.userDeposit, tx.withdrawal);
      const updatedTx: Transaction = {
        ...tx,
        previousBalance: runningBalance,
        calculatedProfit: stats.profitAmount,
        profitPercentage: stats.profitPercentage,
        type: stats.type
      };
      runningBalance = tx.currentBalance;
      return updatedTx;
    });

    const finalBalance = healedAccTxs.length > 0 ? healedAccTxs[healedAccTxs.length - 1].currentBalance : account.initialCapital;
    const updatedAccounts = allAccounts.map(a => a.id === affectedAccountId ? { ...a, currentBalance: finalBalance } : a);

    return {
      healedTxs: [...otherTxs, ...healedAccTxs],
      updatedAccounts
    };
  };

  const handleSaveTransaction = (tx: Transaction) => {
    let newTransactionsList: Transaction[];
    if (editingTransaction) {
      newTransactionsList = transactions.map(t => t.id === tx.id ? tx : t);
    } else {
      newTransactionsList = [...transactions, tx];
    }

    const { healedTxs, updatedAccounts } = healTransactionChain(newTransactionsList, tx.accountId, accounts);
    setTransactions(healedTxs);
    setAccounts(updatedAccounts);
    setIsTxModalOpen(false);
    setEditingTransaction(null);
  };

  const confirmDeleteTransaction = () => {
    if (!txToDelete) return;
    const remainingTxs = transactions.filter(t => t.id !== txToDelete.id);
    const { healedTxs, updatedAccounts } = healTransactionChain(remainingTxs, txToDelete.accountId, accounts);
    setTransactions(healedTxs);
    setAccounts(updatedAccounts);
    setTxToDelete(null);
  };

  const handleEditClick = (tx: Transaction) => {
    const acc = accounts.find(a => a.id === tx.accountId);
    if (acc) {
      setActiveAccount(acc);
      setEditingTransaction(tx);
      setIsTxModalOpen(true);
    }
  };

  const handleSaveAccount = (newAcc: Account) => {
    setAccounts(prev => [...prev, newAcc]);
    setIsAccModalOpen(false);
  };

  const handleImport = (newAccounts: Account[], newTransactions: Transaction[]) => {
    if (!newAccounts || newAccounts.length === 0) return;
    setAccounts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const uniqueNew = newAccounts.filter(a => a && a.id && !existingIds.has(a.id));
      return [...prev, ...uniqueNew];
    });
    setTransactions(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const uniqueNew = newTransactions.filter(t => t && t.id && !existingIds.has(t.id));
      return [...prev, ...uniqueNew];
    });
  };

  const handleReset = async () => {
    if (confirm("Reset everything? Your custom data will be lost.")) {
      await clearDatabase();
      hasHydrated.current = false;
      window.location.reload();
    }
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
      const currencyKey = (acc.currency in totals) ? acc.currency : Currency.TRY;
      totals[currencyKey].capital += (acc.initialCapital || 0);
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      totals[currencyKey].profit += accTxs.reduce((sum, t) => sum + (t.calculatedProfit || 0), 0);
    });
    return totals;
  }, [accounts, transactions]);

  // --- ANALYSIS DATA ---

  const allocationByBank = useMemo(() => {
    return accounts.map(acc => ({
      name: acc.bankName,
      value: acc.currentBalance,
      currency: acc.currency
    }));
  }, [accounts]);

  const allocationByType = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(acc => {
      map[acc.investmentType] = (map[acc.investmentType] || 0) + acc.currentBalance;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  const cumulativeProfitData = useMemo(() => {
    const sortedDates = Array.from(new Set(transactions.map(t => t.date))).sort();
    let runningTotalTRY = 0;
    let runningTotalUSD = 0;
    
    return sortedDates.map(date => {
      const dayTxs = transactions.filter(t => t.date === date);
      dayTxs.forEach(t => {
        const acc = accounts.find(a => a.id === t.accountId);
        if (acc?.currency === Currency.TRY) runningTotalTRY += t.calculatedProfit;
        if (acc?.currency === Currency.USD) runningTotalUSD += t.calculatedProfit;
      });
      return {
        date,
        'Profit (TRY)': Number(runningTotalTRY.toFixed(2)),
        'Profit (USD)': Number(runningTotalUSD.toFixed(2))
      };
    });
  }, [transactions, accounts]);

  const riskDistributionData = useMemo(() => {
    const map: Record<string, number> = { 'Low': 0, 'Medium': 0, 'High': 0 };
    accounts.forEach(acc => {
      map[acc.riskLevel] += acc.currentBalance;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 animate-pulse font-medium">Initializing Baraka Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-100">B</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600">BarakaInvest</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(accounts, transactions)} className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-all" title="Export CSV"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={() => setIsImportWizardOpen(true)} className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-all" title="Import CSV"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={fetchInsights} className="ml-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
              {loadingInsights ? 'Analyzing...' : 'AI Insights'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-emerald-200 transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Total TRY Capital</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(stats[Currency.TRY].capital, 'TRY')}</h3>
            <p className="text-xs font-bold text-emerald-600 mt-2">+{formatCurrency(stats[Currency.TRY].profit, 'TRY')} Profit</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-200 transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Total USD Capital</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(stats[Currency.USD].capital, 'USD')}</h3>
            <p className="text-xs font-bold text-emerald-600 mt-2">+{formatCurrency(stats[Currency.USD].profit, 'USD')} Profit</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Accounts Active</p>
            <h3 className="text-2xl font-black text-slate-900">{accounts.length}</h3>
            <p className="text-xs text-slate-500 mt-2">Diversified Portfolios</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Last Entry</p>
            <h3 className="text-lg font-black text-slate-900">{transactions.length > 0 ? transactions[transactions.length-1].date : 'N/A'}</h3>
            <p className="text-xs text-slate-500 mt-2">System Synced</p>
          </div>
        </div>

        {insights && (
          <div className="bg-white border-l-4 border-indigo-500 p-8 rounded-2xl shadow-sm animate-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z"/></svg>
               </div>
               <h4 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Ethical AI Advisor</h4>
             </div>
             <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none prose-indigo">{insights}</div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`px-8 py-4 font-bold text-sm transition-all ${activeTab === 'overview' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Portfolio Overview
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`px-8 py-4 font-bold text-sm transition-all ${activeTab === 'analytics' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Advanced Intelligence
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Growth Trajectory</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeProfitData}>
                        <defs>
                          <linearGradient id="colorProfitTRY" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfitUSD" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#cbd5e1" />
                        <YAxis tick={{fontSize: 10}} stroke="#cbd5e1" />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                        <Legend iconType="circle" />
                        <Area type="monotone" dataKey="Profit (TRY)" stroke="#10b981" fillOpacity={1} fill="url(#colorProfitTRY)" strokeWidth={3} />
                        <Area type="monotone" dataKey="Profit (USD)" stroke="#6366f1" fillOpacity={1} fill="url(#colorProfitUSD)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Bank Concentration</h3>
                  <div className="h-[350px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationByBank}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {allocationByBank.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val, 'USD')} />
                        <Legend verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Asset Class Diversification</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationByType}
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          dataKey="value"
                        >
                          {allocationByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Capital Risk Distribution</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#cbd5e1" />
                        <YAxis stroke="#cbd5e1" />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                          {riskDistributionData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'Low' ? '#10b981' : entry.name === 'Medium' ? '#f59e0b' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Your Portfolios</h3>
              <p className="text-slate-500 text-sm">Individual account performance and growth tracking</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts.map(acc => {
              const accProfit = transactions.filter(t => t.accountId === acc.id).reduce((s, t) => s + (t.calculatedProfit || 0), 0);
              const roi = acc.initialCapital > 0 ? (accProfit / acc.initialCapital) * 100 : 0;
              return (
                <div key={acc.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative group hover:shadow-xl hover:border-emerald-200 transition-all duration-300">
                  <button onClick={() => setAccountToDelete(acc)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">{acc.currency}</span>
                      <h4 className="text-xl font-black text-slate-800 mt-3">{acc.bankName}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1">{acc.investmentType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(acc.currentBalance, acc.currency)}</p>
                      <p className={`text-xs font-black ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'} flex items-center justify-end gap-1`}>
                        {roi >= 0 ? '▲' : '▼'} {roi.toFixed(2)}% ROI
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Initial</p>
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(acc.initialCapital, acc.currency)}</p>
                    </div>
                    <div className="flex-1 bg-emerald-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Net Profit</p>
                      <p className="text-sm font-bold text-emerald-700">+{formatCurrency(accProfit, acc.currency)}</p>
                    </div>
                  </div>
                  <button onClick={() => { setActiveAccount(acc); setEditingTransaction(null); setIsTxModalOpen(true); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-100 hover:bg-emerald-600 transition-all hover:-translate-y-1">Add Balance Entry</button>
                </div>
              );
            })}
            <button onClick={() => setIsAccModalOpen(true)} className="border-4 border-dashed border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-300 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-400 transition-all min-h-[300px] group">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="font-black uppercase tracking-widest text-xs">Add Account</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Transaction Records</h3>
            <span className="text-[10px] bg-slate-200 px-3 py-1 rounded-full font-black text-slate-500 uppercase">Chronological History</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                <tr>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Account</th>
                  <th className="px-8 py-5">Balance</th>
                  <th className="px-8 py-5">Profit Contrib.</th>
                  <th className="px-8 py-5 text-right pr-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const isEditing = editingTransaction?.id === tx.id;
                  return (
                    <tr key={tx.id} className={`transition-all ${isEditing ? 'bg-emerald-50' : 'hover:bg-slate-50/80 group'}`}>
                      <td className="px-8 py-6 font-bold text-slate-500">{tx.date}</td>
                      <td className="px-8 py-6 font-black text-slate-800">{acc?.bankName || 'Unknown'}</td>
                      <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(tx.currentBalance, acc?.currency || 'TRY')}</td>
                      <td className={`px-8 py-6 font-black ${tx.calculatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.calculatedProfit > 0 ? '▲ ' : tx.calculatedProfit < 0 ? '▼ ' : ''}
                        {formatCurrency(tx.calculatedProfit, acc?.currency || 'TRY')}
                      </td>
                      <td className="px-8 py-6 text-right pr-10 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(tx)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit Entry"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        <button onClick={() => setTxToDelete(tx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Entry"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isTxModalOpen && activeAccount && (
        <TransactionModal account={activeAccount} onClose={() => { setIsTxModalOpen(false); setEditingTransaction(null); }} onSave={handleSaveTransaction} editTransaction={editingTransaction || undefined} />
      )}
      {isAccModalOpen && <AccountModal onClose={() => setIsAccModalOpen(false)} onSave={handleSaveAccount} />}
      {isImportWizardOpen && <ImportWizard onClose={() => setIsImportWizardOpen(false)} onImport={handleImport} />}
      {accountToDelete && <DeleteConfirmationModal account={accountToDelete} onClose={() => setAccountToDelete(null)} onConfirm={confirmDeleteAccount} />}
      
      {txToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Delete Record?</h3>
              <p className="text-slate-500 text-sm">Are you sure you want to delete this historical entry? Subsequent profit calculations will be automatically adjusted.</p>
            </div>
            <div className="p-6 bg-slate-50 flex flex-col gap-3">
              <button onClick={confirmDeleteTransaction} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Yes, Delete Record</button>
              <button onClick={() => setTxToDelete(null)} className="w-full py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-16 opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">
        <p>BarakaInvest &copy; 2024 • Ethical Intelligence • <button onClick={handleReset} className="underline hover:text-red-500">System Wipe</button></p>
      </footer>
    </div>
  );
};

export default App;
