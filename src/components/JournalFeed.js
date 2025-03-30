import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://mljapp.onrender.com/japp';
const DB_NAME = 'MemoryLaneDB';
const DB_VERSION = 1;
const ENTRIES_STORE = 'journalEntries';
const PENDING_STORE = 'pendingOperations';

const JournalFeed = ({ currentUser }) => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    textEntry: '',
    imageFile: null,
    publicStatus: false // Added for public/private toggle
  });
  const [loading, setLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Initialize IndexedDB
  const initDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
          db.createObjectStore(ENTRIES_STORE, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
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

  // Save entries to IndexedDB
  const saveEntriesToLocal = async (entries) => {
    try {
      const db = await initDB();
      const tx = db.transaction(ENTRIES_STORE, 'readwrite');
      const store = tx.objectStore(ENTRIES_STORE);
      
      // Clear existing entries first
      store.clear();
      
      // Add all entries
      for (const entry of entries) {
        store.add(entry);
      }
      
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error saving entries to IndexedDB:', error);
      return false;
    }
  };

  // Get entries from IndexedDB
  const getLocalEntries = async () => {
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

  // Add a pending operation to be synced later
  const addPendingOperation = async (operation) => {
    try {
      const db = await initDB();
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      const store = tx.objectStore(PENDING_STORE);
      
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

  // Request background sync
  const requestSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-journal-entries');
        return true;
      } catch (error) {
        console.error('Error registering for sync:', error);
        return false;
      }
    }
    return false;
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setMessage('You are back online. Syncing your entries...');
      requestSync();
      fetchEntries();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setMessage('You are offline. Changes will be saved locally and synced when you reconnect.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch journal entries when component mounts
  useEffect(() => {
    fetchEntries();
  }, [currentUser]);

  const fetchEntries = async () => {
    setEntryLoading(true);
    try {
      if (navigator.onLine) {
        // Online: fetch from server
        const response = await axios.get(`${API_URL}/entries/${currentUser}`);
        if (response.data && response.data.length > 0) {
          const sortedEntries = response.data.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          
          // Save to IndexedDB for offline use
          await saveEntriesToLocal(sortedEntries);
          setEntries(sortedEntries);
        } else {
          setEntries([]);
          await saveEntriesToLocal([]);
        }
      } else {
        // Offline: fetch from IndexedDB
        const localEntries = await getLocalEntries();
        const sortedEntries = localEntries.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      
      // On error, try local entries
      const localEntries = await getLocalEntries();
      const sortedEntries = localEntries.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setEntries(sortedEntries);
      
      if (error.response && error.response.status === 204) {
        // No content is returned, set entries to empty array
        setEntries([]);
      }
    } finally {
      setEntryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewEntry({
      ...newEntry,
      textEntry: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setNewEntry({
      ...newEntry,
      imageFile: e.target.files[0]
    });
  };

  const togglePublicStatus = () => {
    setNewEntry({
      ...newEntry,
      publicStatus: !newEntry.publicStatus
    });
  };

  // Updated function to use the correct API endpoint
  const handleToggleEntryPublicStatus = async (entryId, currentStatus) => {
    try {
      // Find the current entry
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;
      
      // Create DTO with updated public status
      const journalEntryDTO = {
        id: entry.id,
        textEntry: entry.textEntry,
        imageUrl: entry.imageUrl,
        createdAt: entry.createdAt,
        username: currentUser,
        publicStatus: !currentStatus
      };
      
      // Call the correct API endpoint
      await axios.put(`${API_URL}/entry/status`, journalEntryDTO);
      
      // Update local state
      setEntries(prevEntries => 
        prevEntries.map(entry => 
          entry.id === entryId 
            ? { ...entry, publicStatus: !currentStatus } 
            : entry
        )
      );
      
      // Update selected entry if it's the one being modified
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry({ ...selectedEntry, publicStatus: !currentStatus });
      }
      
      setMessage(`Entry is now ${!currentStatus ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error toggling public status:', error);
      setMessage('Failed to update entry status. Please try again.');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (navigator.onLine) {
        // Online: delete from server
        await axios.delete(`${API_URL}/entries/${entryId}`);
        closeModal();
        fetchEntries();
        setMessage('Entry deleted successfully!');
      } else {
        // Offline: queue for deletion when back online
        
        // If it's a local entry (never synced)
        if (entryId.startsWith('local_')) {
          // Just remove from local storage
          const localEntries = await getLocalEntries();
          const filteredEntries = localEntries.filter(entry => entry.id !== entryId);
          await saveEntriesToLocal(filteredEntries);
        } else {
          // For server entries, queue deletion for later
          await addPendingOperation({
            type: 'DELETE',
            url: `${API_URL}/entries/${entryId}`
          });
          
          // Also update local entries
          const localEntries = await getLocalEntries();
          const filteredEntries = localEntries.filter(entry => entry.id !== entryId);
          await saveEntriesToLocal(filteredEntries);
        }
        
        // Request sync for when we're back online
        await requestSync();
        
        closeModal();
        setMessage('Entry marked for deletion. Will be removed from server when online.');
        
        // Update UI immediately
        setEntries(entries.filter(entry => entry.id !== entryId));
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setMessage('Failed to delete entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const entryData = {
      textEntry: newEntry.textEntry,
      username: currentUser,
      createdAt: new Date().toISOString(),
      publicStatus: newEntry.publicStatus // Include public status
    };
    
    const formData = new FormData();
    formData.append('entryData', new Blob([JSON.stringify(entryData)], {
      type: "application/json"
    }));

    if (newEntry.imageFile) {
      formData.append('file', newEntry.imageFile);
    }

    try {
      if (navigator.onLine) {
        // Online: create on server
        const response = await axios.post(`${API_URL}/create`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 200) {
          setMessage('Entry created successfully!');
          setNewEntry({ textEntry: '', imageFile: null, publicStatus: false });
          // Refresh entries
          fetchEntries();
        }
      } else {
        // Offline: store locally and queue for later sync
        
        // Generate temporary ID for local entry
        const tempId = `local_${Date.now()}`;
        
        // Create a local entry object
        const localEntry = {
          id: tempId,
          textEntry: newEntry.textEntry,
          username: currentUser,
          createdAt: new Date().toISOString(),
          publicStatus: newEntry.publicStatus,
          isPending: true
        };
        
        // If there's an image, create a local URL to display it
        if (newEntry.imageFile) {
          localEntry.localImageUrl = URL.createObjectURL(newEntry.imageFile);
        }
        
        // Save to local storage
        const currentEntries = await getLocalEntries();
        await saveEntriesToLocal([localEntry, ...currentEntries]);
        
        // Queue for sync later
        await addPendingOperation({
          type: 'CREATE',
          url: `${API_URL}/create`,
          data: entryData,
          image: newEntry.imageFile
        });
        
        // Request sync when back online
        await requestSync();
        
        setMessage('Entry saved locally. Will sync when you reconnect.');
        setNewEntry({ textEntry: '', imageFile: null, publicStatus: false });
        
        // Update UI immediately
        setEntries([localEntry, ...entries]);
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      setMessage('Failed to create entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEntryModal = (entry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <div className="container fade-in">
      {isOffline && (
        <div style={{
          backgroundColor: 'rgba(255, 87, 34, 0.1)',
          border: '1px solid #FF5722',
          borderRadius: '5px',
          padding: '10px',
          marginBottom: '15px',
          color: '#D84315',
          textAlign: 'center'
        }}>
          You are currently offline. Your changes will be saved locally and synced when you reconnect.
        </div>
      )}
    
      <h1 className="mb-4">Memory Lane <i className="flower-icon">🌸</i></h1>
      
      {/* Create Entry Form */}
      <div className="journal-form-container">
        <h2>Create Journal Entry <i className="flower-icon">🌻</i></h2>
        {message && (
          <div 
            className={message.includes('success') || message.includes('locally') ? 'success-message' : 'error-message'}
            style={{ 
              color: message.includes('success') || message.includes('locally') ? 'green' : 'red', 
              marginBottom: '15px',
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: message.includes('success') || message.includes('locally') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
            }}
          >
            {message}
          </div>
        )}
        <form onSubmit={handleCreateEntry}>
          <div className="form-group">
            <textarea
              className="form-control"
              placeholder="Write your journal entry..."
              value={newEntry.textEntry}
              onChange={handleInputChange}
              rows="3"
              required
            />
          </div>
          <div className="form-group form-file">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="form-control"
            />
          </div>
          
          {/* Public/Private Toggle */}
          <div className="form-group" style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <label className="toggle-label" style={{ 
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <div className="toggle-switch" style={{
                position: 'relative',
                display: 'inline-block',
                width: '40px',
                height: '20px',
                backgroundColor: newEntry.publicStatus ? 'var(--primary-color)' : '#ccc',
                borderRadius: '20px',
                transition: 'all 0.3s',
                marginRight: '10px'
              }}>
                <div className="toggle-knob" style={{
                  position: 'absolute',
                  top: '2px',
                  left: newEntry.publicStatus ? '22px' : '2px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'all 0.3s'
                }}></div>
              </div>
              <input 
                type="checkbox" 
                checked={newEntry.publicStatus} 
                onChange={togglePublicStatus} 
                style={{ display: 'none' }}
              />
              Make this entry public
            </label>
          </div>
          
          <button 
            type="submit" 
            className={`btn-primary bounce ${loading ? 'disabled' : ''}`}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Entry'}
          </button>
        </form>
      </div>
      
      {/* Journal Feed */}
      <div className="journal-feed-container" style={{ marginTop: '30px' }}>
        <h2>Journal Feed <i className="flower-icon">🌹</i></h2>
        
        {entryLoading ? (
          <p className="text-center">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-center">No journal entries yet. Start by creating one!</p>
        ) : (
          <div className="journal-entries">
            {entries.map((entry, index) => (
              <div key={entry.id || index} className="journal-entry" onClick={() => openEntryModal(entry)}>
                {/* Show pending sync indicator for offline entries */}
                {entry.isPending && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    color: '#E65100'
                  }}>
                    Pending
                  </div>
                )}
                
                {/* Use localImageUrl for offline-created entries */}
                {entry.localImageUrl &&(
                  <img 
                    src={entry.localImageUrl} 
                    alt="Journal Entry" 
                    className="journal-image"
                  />
                )}
                
                {entry.imageUrl && entry.imageUrl.trim() !== "" && !entry.localImageUrl &&(
                  <img 
                    src={entry.imageUrl} 
                    alt="Journal Entry" 
                    className="journal-image"
                  />
                )}
                
                <p className="journal-text">{entry.textEntry}</p>
                <p className="text-muted">
                  Created on: {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal for Viewing Entries */}
      {modalVisible && selectedEntry && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            
            {selectedEntry.localImageUrl && (
              <img 
                src={selectedEntry.localImageUrl} 
                alt="Journal Entry" 
                style={{ width: '100%', borderRadius: '10px', marginBottom: '15px' }}
              />
            )}
            
            {selectedEntry.imageUrl && selectedEntry.imageUrl.trim() !== "" && !selectedEntry.localImageUrl && (
              <img 
                src={selectedEntry.imageUrl} 
                alt="Journal Entry" 
                style={{ width: '100%', borderRadius: '10px', marginBottom: '15px' }}
              />
            )}
            
            <p style={{ fontSize: '18px', marginBottom: '15px' }}>{selectedEntry.textEntry}</p>
            <p className="text-muted">
              Created on: {new Date(selectedEntry.createdAt).toLocaleDateString()}
            </p>
            
            {/* Public/Private Status Toggle */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <button
                onClick={() => handleToggleEntryPublicStatus(selectedEntry.id, selectedEntry.publicStatus)}
                className={selectedEntry.publicStatus ? 'btn-danger' : 'btn-primary'}
                style={{ marginRight: '10px' }}
                disabled={loading || selectedEntry.isPending}
              >
                {selectedEntry.publicStatus ? 'Make Private' : 'Make Public'}
              </button>
              
              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className='btn-danger'
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
            
            {/* Show pending status in modal if applicable */}
            {selectedEntry.isPending && (
              <p style={{ 
                color: '#E65100', 
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                padding: '5px 10px',
                borderRadius: '5px',
                marginBottom: '15px'
              }}>
                This entry is pending synchronization and will be uploaded when you reconnect.
              </p>
            )}
          </div>
        </div>
      )}
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default JournalFeed;