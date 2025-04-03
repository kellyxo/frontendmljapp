import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EntryCard from "./EntryCard"; // Import our reusable component
import { toast } from 'react-toastify';

const API_URL = 'https://mljapp.onrender.com/japp';
const DB_NAME = 'MemoryLaneDB';
const DB_VERSION = 1;
const ENTRIES_STORE = 'journalEntries';
const PENDING_STORE = 'pendingOperations';

const JournalFeed = ({ currentUser  }) => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    textEntry: '',
    imageFile: null,
    publicStatus: false
  });
  const [loading, setLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [menuVisibleId, setMenuVisibleId] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(
    "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"
);
  
  const getUserProfilePic = (entry) => {
    // First try to use the userPfp field directly from the entry
    return entry.userPfp || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"
  };
  // Toggle card expansion
  const toggleExpand = (entryId) => {
    if (expandedEntryId === entryId) {
      setExpandedEntryId(null); // Collapse
    } else {
      setExpandedEntryId(entryId); // Expand
    }
  };

  // Format date for better display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

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
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/getUser/${currentUser}`);
        if (response.data?.pfpUrl) {
          setUserProfilePic(response.data.pfpUrl);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuVisibleId !== null) {
        setMenuVisibleId(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuVisibleId]);

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
        if (response.status === 200 && response.data && response.data.length > 0) {
          const sortedEntries = response.data.map(entry => ({
            ...entry,
            userPfp: userProfilePic // Add the profile pic to each entry
          })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
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

  // Handle toggling entry public status
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
      
      // Call the API endpoint
      await axios.put(`${API_URL}/entry/status`, journalEntryDTO);
      
      // Update local state
      setEntries(prevEntries => 
        prevEntries.map(entry => 
          entry.id === entryId 
            ? { ...entry, publicStatus: !currentStatus } 
            : entry
        )
      );
      
      toast.success(`Entry is now ${!currentStatus ? 'public' : 'private'}`, { autoClose: 2000 });
    } catch (error) {
      console.error('Error toggling public status:', error);
      toast.error('Failed to update entry status. Please try again.', { autoClose: 3000 });
    }
  };

  const handleDeleteEntry = async (entryId) => {
    setLoading(true);
    
    try {
      if (navigator.onLine) {
        // Online: delete from server
        await axios.delete(`${API_URL}/entries/${entryId}`);
        fetchEntries();
        toast.success('Entry deleted successfully!', { autoClose: 2000 });
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
        
        toast.info('Entry marked for deletion. Will be removed from server when online.', { autoClose: 3000 });
        
        // Update UI immediately
        setEntries(entries.filter(entry => entry.id !== entryId));
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry. Please try again.', { autoClose: 3000 });
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
      publicStatus: newEntry.publicStatus
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
          toast.success('Entry created successfully!', { autoClose: 2000 });
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
        
        toast.info('Entry saved locally. Will sync when you reconnect.', { autoClose: 3000 });
        setNewEntry({ textEntry: '', imageFile: null, publicStatus: false });
        
        // Update UI immediately
        setEntries([localEntry, ...entries]);
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry. Please try again.', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
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
          <div className="loading-container" style={{ textAlign: 'center', padding: '20px' }}>
            <div className="loading-spinner" style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 15px auto',
              border: '4px solid rgba(var(--primary-color-rgb), 0.3)',
              borderRadius: '50%',
              borderTop: '4px solid var(--primary-color)',
              animation: 'spin 1s linear infinite'
            }}></div>
            Loading entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-feed" style={{ textAlign: 'center', padding: '20px' }}>
            <p>No journal entries yet. Start by creating one!</p>
          </div>
        ) : (
          <div className="card-feed">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                currentUser={currentUser}
                isPublicFeed={false}
                expandedEntryId={expandedEntryId}
                menuVisibleId={menuVisibleId}
                toggleExpand={toggleExpand}
                setMenuVisibleId={setMenuVisibleId}
                handleDeleteEntry={handleDeleteEntry} 
                handleToggleStatus={handleToggleEntryPublicStatus}
                getUserProfilePic={getUserProfilePic}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default JournalFeed;