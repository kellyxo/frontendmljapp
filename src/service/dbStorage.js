// src/services/dbStorage.js

const DB_NAME = 'MemoryLaneDB';
const DB_VERSION = 1;
const ENTRIES_STORE = 'journalEntries';
const PENDING_STORE = 'pendingOperations';

// Initialize the database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Called when the database needs to be created/upgraded
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        // Store for journal entries
        db.createObjectStore(ENTRIES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        // Store for operations that need to be synced
        db.createObjectStore(PENDING_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

// Save all entries to local storage
export const saveEntries = async (entries) => {
  try {
    const db = await initDB();
    const tx = db.transaction(ENTRIES_STORE, 'readwrite');
    const store = tx.objectStore(ENTRIES_STORE);
    
    // Clear existing entries first
    store.clear();
    
    // Add all entries
    entries.forEach(entry => {
      store.add(entry);
    });
    
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error saving entries to IndexedDB:', error);
    return false;
  }
};

// Get all entries from local storage
export const getEntries = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(ENTRIES_STORE, 'readonly');
    const store = tx.objectStore(ENTRIES_STORE);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (error) {
    console.error('Error getting entries from IndexedDB:', error);
    return [];
  }
};

// Add a new pending operation to be synced later
export const addPendingOperation = async (operation) => {
  try {
    const db = await initDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    
    // Add the operation to the pending store
    store.add({
      ...operation,
      timestamp: new Date().toISOString()
    });
    
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error adding pending operation:', error);
    return false;
  }
};

// Get all pending operations
export const getPendingOperations = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const store = tx.objectStore(PENDING_STORE);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (error) {
    console.error('Error getting pending operations:', error);
    return [];
  }
};

// Delete a specific pending operation after it's been processed
export const deletePendingOperation = async (id) => {
  try {
    const db = await initDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    store.delete(id);
    
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error deleting pending operation:', error);
    return false;
  }
};