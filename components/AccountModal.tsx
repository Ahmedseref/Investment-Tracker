
import React, { useState } from 'react';
import { Account, Currency, InvestmentType } from '../types';
import { generateId } from '../utils/calculations';

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
      id: generateId(),
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">New Account</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Ethical Investment Setup</p>
        </div>

        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Albaraka, Kuveyt Turk" className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value={Currency.TRY}>TRY</option>
                <option value={Currency.USD}>USD</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Risk Profile</label>
              <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as 'Low' | 'Medium' | 'High')} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Initial Capital</label>
            <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700">Open Account</button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
