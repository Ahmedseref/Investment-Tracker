
import React from 'react';
import { Account } from '../types';

interface DeleteConfirmationModalProps {
  account: Account;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ account, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Account?</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-slate-700">{account.bankName}</span>? 
            This will permanently remove all associated transaction history. This action cannot be undone.
          </p>
        </div>

        <div className="p-6 bg-slate-50 flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
          >
            Yes, Delete Account
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
