
import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../types';
import { calculateProfitStats, generateId, formatCurrency } from '../utils/calculations';

interface TransactionModalProps {
  account: Account;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  editTransaction?: Transaction;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ account, onClose, onSave, editTransaction }) => {
  const [newBalance, setNewBalance] = useState<number>(editTransaction ? editTransaction.currentBalance : account.currentBalance);
  const [userDeposit, setUserDeposit] = useState<number>(editTransaction ? editTransaction.userDeposit : 0);
  const [withdrawal, setWithdrawal] = useState<number>(editTransaction ? editTransaction.withdrawal : 0);
  const [date, setDate] = useState<string>(editTransaction ? editTransaction.date : new Date().toISOString().split('T')[0]);

  // Live calculation for preview
  const liveStats = useMemo(() => {
    // We use the account's current balance if adding new, or the specific prev balance if editing.
    // Note: The actual "healed" previous balance might change after saving if the date is changed.
    const baseBalance = editTransaction ? editTransaction.previousBalance : account.currentBalance;
    return calculateProfitStats(baseBalance, newBalance, userDeposit, withdrawal);
  }, [editTransaction, account.currentBalance, newBalance, userDeposit, withdrawal]);

  const handleSave = () => {
    const baseBalance = editTransaction ? editTransaction.previousBalance : account.currentBalance;
    
    const updatedTransaction: Transaction = {
      id: editTransaction ? editTransaction.id : generateId(),
      accountId: account.id,
      date,
      previousBalance: baseBalance,
      currentBalance: newBalance,
      userDeposit,
      withdrawal,
      calculatedProfit: liveStats.profitAmount,
      profitPercentage: liveStats.profitPercentage,
      type: liveStats.type
    };

    onSave(updatedTransaction);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              {editTransaction ? 'Edit Record' : 'Add Balance Entry'}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
              {account.bankName} • {account.currency}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Record Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold" 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Statement Balance</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={newBalance} 
                  onChange={(e) => setNewBalance(Number(e.target.value))} 
                  className="w-full px-4 py-4 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-2xl font-black" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">{account.currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">New Deposit</label>
                <input 
                  type="number" 
                  value={userDeposit} 
                  onChange={(e) => setUserDeposit(Number(e.target.value))} 
                  placeholder="0.00" 
                  className="w-full px-4 py-3 border border-emerald-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Withdrawal</label>
                <input 
                  type="number" 
                  value={withdrawal} 
                  onChange={(e) => setWithdrawal(Number(e.target.value))} 
                  placeholder="0.00" 
                  className="w-full px-4 py-3 border border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold" 
                />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border transition-all ${liveStats.profitAmount >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Calculated Profit</p>
                <p className={`text-xl font-black ${liveStats.profitAmount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {liveStats.profitAmount >= 0 ? '+' : ''}{formatCurrency(liveStats.profitAmount, account.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Period Yield</p>
                <p className={`text-xl font-black ${liveStats.profitPercentage >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {liveStats.profitPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all hover:-translate-y-1"
          >
            {editTransaction ? 'Update Record' : 'Confirm Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
