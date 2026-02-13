
import React, { useState } from 'react';
import { parseImportCSV } from '../utils/csvHelper';
import { Account, Transaction } from '../types';

interface ImportWizardProps {
  onClose: () => void;
  onImport: (accounts: Account[], transactions: Transaction[]) => void;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ accounts: Account[], transactions: Transaction[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setDebugInfo(null);
    
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) {
            setError("The file is empty.");
            return;
          }
          
          const data = parseImportCSV(content);
          
          if (data.accounts.length === 0 && data.transactions.length === 0) {
            setError("Could not find any valid investment data in the file.");
            setDebugInfo("Found 0 accounts and 0 transactions. Ensure your file has the correct headers like ---ACCOUNTS---.");
            setPreviewData(null);
          } else {
            setPreviewData(data);
            setError(null);
            setDebugInfo(null);
          }
        } catch (err) {
          console.error("Import Error:", err);
          setError("An unexpected error occurred while parsing the file.");
          setPreviewData(null);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleConfirm = () => {
    if (previewData) {
      onImport(previewData.accounts, previewData.transactions);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Import Data Wizard</h3>
            <p className="text-xs text-slate-500">Restore your portfolio from a CSV backup</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8">
          {!previewData ? (
            <div className="text-center space-y-6">
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 hover:border-emerald-400 hover:bg-emerald-50 transition-all group relative cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <p className="font-bold text-slate-700">Click to upload or drag & drop</p>
                  <p className="text-sm text-slate-400">Excel / CSV backup files supported</p>
                </div>
              </div>
              
              {error && (
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                  {debugInfo && (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100">{debugInfo}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Validation Successful
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200/50">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Accounts Found</p>
                    <p className="text-3xl font-black text-slate-800">{previewData.accounts.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200/50">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Records Found</p>
                    <p className="text-3xl font-black text-slate-800">{previewData.transactions.length}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/50 rounded-lg text-xs text-emerald-700 font-medium">
                  We found data for: {Array.from(new Set(previewData.accounts.map(a => a.bankName))).join(', ')}
                </div>
                <p className="text-[10px] text-emerald-500 mt-4 text-center uppercase font-bold tracking-widest">
                  Merge into existing local database?
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPreviewData(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Change File
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Import Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;
