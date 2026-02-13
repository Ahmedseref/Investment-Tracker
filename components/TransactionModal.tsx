
import React, { useState } from 'react';
import { Account, Transaction, TransactionType } from '../types';
import { calculateProfitStats } from '../utils/calculations';

interface TransactionModalProps {
  account: Account;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ account, onClose, onSave }) => {
  const [newBalance, setNewBalance] = useState<number>(account.currentBalance);
  const [userDeposit, setUserDeposit] = useState<number>(0);
  const [withdrawal, setWithdrawal] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    const stats = calculateProfitStats(account.currentBalance, newBalance, userDeposit, withdrawal);

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: account.id,
      date,
      previousBalance: account.currentBalance,
      currentBalance: newBalance,
      userDeposit,
      withdrawal,
      calculatedProfit: stats.profitAmount,
      profitPercentage: stats.profitPercentage,
      type: stats.type
    };

    onSave(newTransaction);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">New Balance Entry</h3>
          <p className="text-sm text-slate-500">{account.bankName} - {account.currency}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Current Balance</label>
            <input 
              type="number" 
              value={newBalance} 
              onChange={(e) => setNewBalance(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">Previous: {account.currentBalance}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">Manual Deposit</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={userDeposit} 
                onChange={(e) => setUserDeposit(Number(e.target.value))}
                className="w-full px-4 py-2 border border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">Withdrawal</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={withdrawal} 
                onChange={(e) => setWithdrawal(Number(e.target.value))}
                className="w-full px-4 py-2 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Auto-Detected Profit:</span>
              <span className={`font-semibold ${newBalance - account.currentBalance - userDeposit + withdrawal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(newBalance - account.currentBalance - userDeposit + withdrawal).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-lg shadow-emerald-200 font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
