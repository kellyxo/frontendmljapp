import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://mljapp.onrender.com/japp';

const JournalFeed = ({ currentUser }) => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    textEntry: '',
    imageFile: null
  });
  const [loading, setLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch journal entries when component mounts
  useEffect(() => {
    fetchEntries();
  }, [currentUser]);

  const fetchEntries = async () => {
    setEntryLoading(true);
    try {
      const response = await axios.get(`${API_URL}/entries/${currentUser}`);
      if (response.data && response.data.length > 0) {
        const sortedEntries = response.data.sort((a,b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setEntries(sortedEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
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
  const handleDeleteEntry = async (entryId)  => {
    setLoading(true)
    if(!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")){
      return;
    }
    try{
      await axios.delete(`${API_URL}/entries/${entryId}`);
      closeModal();
      fetchEntries();
    }
    catch (error) {
    console.error('Error deleting entry:', error);
    // Show error message
  } finally {
    setLoading(false);
  }
  }
  const handleCreateEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('entryData', new Blob([JSON.stringify({
      textEntry: newEntry.textEntry,
      username: currentUser,
      createdAt: new Date().toISOString()
    })], {
      type: "application/json"
    }));

    if (newEntry.imageFile) {
      formData.append('file', newEntry.imageFile);
    }

    try {
      const response = await axios.post(`${API_URL}/create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200) {
        setMessage('Entry created successfully!');
        setNewEntry({ textEntry: '', imageFile: null });
        // Refresh entries
        fetchEntries();
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
      <h1 className="mb-4">Memory Lane <i className="flower-icon">🌸</i></h1>
      
      {/* Create Entry Form */}
      <div className="journal-form-container">
        <h2>Create Journal Entry <i className="flower-icon">🌻</i></h2>
        {message && (
          <div 
            className={message.includes('success') ? 'success-message' : 'error-message'}
            style={{ 
              color: message.includes('success') ? 'green' : 'red', 
              marginBottom: '15px',
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: message.includes('success') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
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
              <div key={index} className="journal-entry" onClick={() => openEntryModal(entry)}>
                {entry.imageUrl && (
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
            {selectedEntry.imageUrl && (
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
            <button
            onClick={() => handleDeleteEntry(selectedEntry.id)}
            className='btn-danger'
            > Delete Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalFeed;