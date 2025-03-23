import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  
  // Helper function to get a user's profile picture
  const getUserProfilePic = (username) => {
    if (userProfiles[username] && userProfiles[username].pfpUrl) {
      return userProfiles[username].pfpUrl;
    }
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

  // Fetch public entries from all users
  const fetchPublicEntries = async () => {
    setLoading(true);
    try {
      // Get all users (or we could limit this in the future)
      const usersResponse = await axios.get(`${API_URL}/allusers`);
      
      if (usersResponse.status === 200) {
        const allUsers = usersResponse.data;
        let allPublicEntries = [];
        
        // Filter out the current user from the list
        const otherUsers = allUsers.filter(user => user.username !== currentUser);
        
        // For each user, fetch their entries
        for (const user of otherUsers) {
          try {
            // Skip users who are friends (we'll handle them in fetchFriendsEntries)
            if (friends.includes(user.username)) continue;
            
            const entriesResponse = await axios.get(`${API_URL}/entries/${user.username}`);
            if (entriesResponse.status === 200) {
              // Filter only public entries
              const publicEntriesOnly = entriesResponse.data.filter(entry => entry.publicStatus);
              
              // Add username to each entry for display
              const entriesWithUsername = publicEntriesOnly.map(entry => ({
                ...entry,
                username: user.username
              }));
              
              allPublicEntries = [...allPublicEntries, ...entriesWithUsername];
            }
          } catch (error) {
            console.error(`Error fetching entries for ${user.username}:`, error);
            // Continue with next user on error
          }
        }
        
        // Sort by date
        const sortedEntries = allPublicEntries.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        setPublicEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error fetching public entries:', error);
      setError('Failed to load public entries.');
      setPublicEntries([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch entries from friends
  const fetchFriendsEntries = async (friendsList) => {
    setLoading(true);
    try {
      let allFriendsEntries = [];
      
      // Also get the current user's public entries
      try {
        const currentUserResponse = await axios.get(`${API_URL}/entries/${currentUser}`);
        if (currentUserResponse.status === 200) {
          // Filter only public entries
          const publicEntriesOnly = currentUserResponse.data.filter(entry => entry.publicStatus);
          
          // Add username to each entry for display
          const entriesWithUsername = publicEntriesOnly.map(entry => ({
            ...entry,
            username: currentUser
          }));
          
          allFriendsEntries = [...allFriendsEntries, ...entriesWithUsername];
        }
      } catch (error) {
        console.error(`Error fetching entries for current user:`, error);
      }
      
      // For each friend, fetch their public entries
      for (const friend of friendsList) {
        try {
          const response = await axios.get(`${API_URL}/entries/${friend}`);
          if (response.status === 200) {
            // Filter only public entries
            const publicEntriesOnly = response.data.filter(entry => entry.publicStatus);
            
            // Add friend's username to each entry for display
            const entriesWithUsername = publicEntriesOnly.map(entry => ({
              ...entry,
              username: friend
            }));
            
            allFriendsEntries = [...allFriendsEntries, ...entriesWithUsername];
          }
        } catch (error) {
          console.error(`Error fetching entries for ${friend}:`, error);
        }
      }
      
      // Sort by date
      const sortedEntries = allFriendsEntries.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setFriendsEntries(sortedEntries);
    } catch (error) {
      console.error('Error fetching friends entries:', error);
      setError('Failed to load friends\' entries.');
    } finally {
      setLoading(false);
    }
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
              
              {entry.imageUrl && (
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
                src={getUserProfilePic(selectedEntry.username)} 
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
            
            {selectedEntry.imageUrl && (
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
                style={{ padding: '5px 10px' }}

              >
                ❤️ Like ({selectedEntry.likeCount  || 0 })
              </button>
              
              {selectedEntry.username === currentUser && (
                <button
                  className="btn-danger"
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