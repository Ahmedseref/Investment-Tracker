
import { Account, Transaction } from '../types';

const DB_NAME = 'BarakaInvestDB_v2';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (accounts: Account[], transactions: Transaction[]) => {
  const db = await initDB();
  const tx = db.transaction(['accounts', 'transactions'], 'readwrite');
  
  const accStore = tx.objectStore('accounts');
  const txStore = tx.objectStore('transactions');

  // We clear and rewrite because the arrays in state are the "source of truth"
  // Note: IndexedDB clear() and add() within a single transaction is atomic.
  accStore.clear();
  txStore.clear();

  accounts.forEach(acc => {
    if (acc && acc.id) accStore.add(acc);
  });
  
  transactions.forEach(t => {
    if (t && t.id) txStore.add(t);
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const loadData = async (): Promise<{ accounts: Account[], transactions: Transaction[] }> => {
  const db = await initDB();
  
  const getStoreData = <T>(storeName: string): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const accounts = await getStoreData<Account>('accounts');
  const transactions = await getStoreData<Transaction>('transactions');
  
  return { accounts, transactions };
};

export const clearDatabase = async () => {
  const db = await initDB();
  const tx = db.transaction(['accounts', 'transactions'], 'readwrite');
  tx.objectStore('accounts').clear();
  tx.objectStore('transactions').clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
  });
};
