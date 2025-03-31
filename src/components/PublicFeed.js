import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { HeartFill } from 'react-bootstrap-icons';

const API_URL = 'https://mljapp.onrender.com/japp';

const PublicFeed = ({ currentUser }) => {
  const [publicEntries, setPublicEntries] = useState([]);
  const [friendsEntries, setFriendsEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  
  // Updated helper function to get a user's profile picture
  // Now primarily using the userPfp field from the entry if available
  const getUserProfilePic = (entry) => {
    // First try to use the userPfp field directly from the entry
    if (entry && entry.userPfp) {
      return entry.userPfp;
    }
    
    // Fall back to the userProfiles cache if needed
    if (entry && entry.username && userProfiles[entry.username] && userProfiles[entry.username].pfpUrl) {
      return userProfiles[entry.username].pfpUrl;
    }
    
    // Default image as last resort
    return "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg";
  };

  useEffect(() => {
    fetchFriends();
    // fetchPublicEntries() will be called after fetchFriends completes
  }, [currentUser]);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API_URL}/friends/${currentUser}/all`);
      if (response.status === 200) {
        setFriends(response.data);
        
        // Get all user profiles
        try {
          const usersResponse = await axios.get(`${API_URL}/allusers`);
          if (usersResponse.status === 200) {
            const profileLookup = {};
            usersResponse.data.forEach(user => {
              profileLookup[user.username] = user;
            });
            setUserProfiles(profileLookup);
          }
        } catch (error) {
          console.error('Error fetching user profiles:', error);
        }
        
        // After getting friends, fetch their entries
        await fetchFriendsEntries(response.data);
        
        // Then fetch public entries from non-friends
        fetchPublicEntries();
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      // If we can't get friends, still try to get public entries
      fetchPublicEntries();
    }
  };

  // Handle like 
  const handleLike = async (entryId) => {
    try {
      const entry = publicEntries.find(e => e.id === entryId) || 
                   friendsEntries.find(e => e.id === entryId);
      if (!entry) return;
  
      const journalEntryDTO = {
        id: entry.id,
        textEntry: entry.textEntry,
        imageUrl: entry.imageUrl,
        createdAt: entry.createdAt,
        username: currentUser,
        publicStatus: entry.publicStatus,
        // userPfp: entry.userPfp // Include the userPfp field
      };
  
      const response = await axios.put(`${API_URL}/like/entry/${currentUser}`, journalEntryDTO);
  
      setPublicEntries(prevEntries => 
        prevEntries.map(e => e.id === entryId ? { ...e, likeCount: response.data.likeCount } : e)
      );
      
      setFriendsEntries(prevEntries => 
        prevEntries.map(e => e.id === entryId ? { ...e, likeCount: response.data.likeCount } : e)
      );
  
      // If a modal is open, update the selected entry
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry({
          ...selectedEntry,
          likeCount: response.data.likeCount
        });
      }
      
      toast.success('Liked entry!', { autoClose: 2000 });
    } catch (error) {
      console.error('Error liking entry:', error);
      toast.error('Could not like the entry. Please try again.', {
        autoClose: 3000 // close after 3 secs
      });
    }
  };

  // Make entry private
  const makeEntryPrivate = async (entryId) => {
    try {
      const entry = publicEntries.find(e => e.id === entryId) || 
                   friendsEntries.find(e => e.id === entryId);
      if (!entry) return;
      
      const journalEntryDTO = {
        id: entry.id,
        textEntry: entry.textEntry,
        imageUrl: entry.imageUrl,
        createdAt: entry.createdAt,
        username: currentUser,
        publicStatus: false, // Set to private
        // userPfp: entry.userPfp // Include the userPfp field
      };
      
      await axios.put(`${API_URL}/entry/status`, journalEntryDTO);
      
      // Remove from displayed entries
      setPublicEntries(prevEntries => 
        prevEntries.filter(e => e.id !== entryId)
      );
      
      setFriendsEntries(prevEntries => 
        prevEntries.filter(e => e.id !== entryId)
      );
      
      closeModal();
      toast.success('Entry is now private', { autoClose: 2000 });
    } catch (error) {
      console.error('Error making entry private:', error);
      toast.error('Could not update entry. Please try again.', {
        autoClose: 3000
      });
    }
  };

  // Fetch public entries from all users
  const fetchPublicEntries = async () => {
    setLoading(true);
    try{
      const response = await axios.get(`${API_URL}/entriesPublic/all`);

      if(response.status === 200){
        const sortedEntries = response.data.sort((a,b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPublicEntries(sortedEntries);
      }
    } catch(error) {
      console.log("Error fetching public entries:", error);
      setError('Failed to load public entries.');
      setPublicEntries([]);
    } finally{
      setLoading(false);
    }
  };

  // Fetch entries from friends
  const fetchFriendsEntries = async (friendsList) => {
    const friendsEntries = publicEntries.filter(entry =>
      friendsList.includes(entry.username) || entry.username === currentUser
    );
    setFriendsEntries(friendsEntries);
  };

  // Combine public and friends entries, removing duplicates
  const allEntries = () => {
    const combinedEntries = [...publicEntries, ...friendsEntries];
    
    // Remove duplicates by using id as key
    const uniqueEntries = Array.from(
      new Map(combinedEntries.map(entry => [entry.id, entry])).values()
    );
    
    // Sort by date
    return uniqueEntries.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  const openEntryModal = (entry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
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
  
  return (
    <div className="container fade-in">
      <h1 className="mb-4">Public Feed <i className="flower-icon">📝</i></h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '15px',
          padding: '8px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)'
        }}>
          {error}
        </div>
      )}
      
      {loading ? (
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
      ) : allEntries().length === 0 ? (
        <div className="empty-feed" style={{ textAlign: 'center', padding: '20px' }}>
          <p>No public entries available. Add friends or make your entries public to see content here!</p>
        </div>
      ) : (
        <div className="public-entries">
          {allEntries().map((entry) => (
            <div 
              key={entry.id} 
              className="journal-entry" 
              onClick={() => openEntryModal(entry)}
              style={{
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              {/* Author badge */}
              <div className="entry-author" style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: entry.username === currentUser 
                  ? 'var(--primary-color)' 
                  : 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '15px',
                fontSize: '0.8rem'
              }}>
                {entry.username === currentUser ? 'You' : entry.username}
              </div>
              
              {entry.imageUrl && entry.imageUrl.trim() !== "" && (
                <img 
                  src={entry.imageUrl} 
                  alt="Journal Entry" 
                  style={{ 
                    width: '100%', 
                    maxHeight: '300px',
                    objectFit: 'cover',
                    borderRadius: '10px' 
                  }}
                />
              )}
              
              <p className="entry-text" style={{ 
                marginTop: entry.imageUrl ? '15px' : '0',
                fontSize: '1rem'
              }}>
                {entry.textEntry.length > 150 
                  ? `${entry.textEntry.substring(0, 150)}...` 
                  : entry.textEntry}
              </p>
              
              <div className="entry-footer" style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-color)',
                opacity: 0.7,
                fontSize: '0.9rem',
                marginTop: '10px'
              }}>
                <span>{formatDate(entry.createdAt)}</span>
                <span style={{ fontStyle: 'italic' }}>
                  {entry.likeCount || 0} {entry.likeCount === 1 ? 'like' : 'likes'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal for Viewing Entries */}
      {modalVisible && selectedEntry && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            
            <div className="entry-author-header" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <img 
                src={getUserProfilePic(selectedEntry)} 
                alt="Profile" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
              />
              <h3 style={{ margin: 0 }}>
                {selectedEntry.username}
              </h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.7 }}>
                {formatDate(selectedEntry.createdAt)}
              </span>
            </div>
            
            {selectedEntry.imageUrl && selectedEntry.imageUrl.trim() !== "" && (
              <img 
                src={selectedEntry.imageUrl} 
                alt="Journal Entry" 
                style={{ width: '100%', borderRadius: '10px', marginBottom: '15px' }}
              />
            )}
            
            <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>{selectedEntry.textEntry}</p>
            
            <div style={{ 
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button 
                className="btn-primary"
                onClick={() => handleLike(selectedEntry.id)}
                style={{ padding: '5px 10px' }}
              >
                <HeartFill color="red" size={16} /> 
                {selectedEntry.likeCount || 0}
              </button>
              
              {selectedEntry.username === currentUser && (
                <button
                  className="btn-danger"
                  onClick={() => makeEntryPrivate(selectedEntry.id)}
                  style={{ padding: '5px 10px' }}
                >
                  Make Private
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicFeed;