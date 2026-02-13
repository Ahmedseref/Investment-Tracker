
import React, { useState } from 'react';
import { Account, Currency, InvestmentType } from '../types';

interface AccountModalProps {
  onClose: () => void;
  onSave: (account: Account) => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ onClose, onSave }) => {
  const [bankName, setBankName] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TRY);
  const [investmentType, setInvestmentType] = useState<InvestmentType>(InvestmentType.PARTICIPATION);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityPeriod, setMaturityPeriod] = useState(12);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Low');

  const handleSave = () => {
    if (!bankName.trim()) {
      alert("Please enter a bank name.");
      return;
    }

    const newAccount: Account = {
      id: crypto.randomUUID(),
      bankName,
      currency,
      investmentType,
      startDate,
      maturityPeriod,
      riskLevel,
      currentBalance: initialCapital,
      initialCapital: initialCapital
    };

    onSave(newAccount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">Register New Account</h3>
          <p className="text-sm text-slate-500">Add a new bank or fund to your tracking portfolio.</p>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
            <input 
              type="text" 
              value={bankName} 
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Kuveyt Turk, Albaraka"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value={Currency.TRY}>Turkish Lira (TRY)</option>
                <option value={Currency.USD}>US Dollar (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Investment Type</label>
              <select 
                value={investmentType} 
                onChange={(e) => setInvestmentType(e.target.value as InvestmentType)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {Object.values(InvestmentType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maturity (Months)</label>
              <input 
                type="number" 
                value={maturityPeriod} 
                onChange={(e) => setMaturityPeriod(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Capital</label>
              <input 
                type="number" 
                value={initialCapital} 
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Risk Profile</label>
              <select 
                value={riskLevel} 
                onChange={(e) => setRiskLevel(e.target.value as 'Low' | 'Medium' | 'High')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
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
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
