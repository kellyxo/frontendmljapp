import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://mljapp.onrender.com/japp';

const Friends = ({ currentUser }) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});

  // Helper function to extract the correct username from a friend DTO
  const extractUsername = (friendDTO) => {
    // If username1 is the current user, return username2
    if (friendDTO.username1 === currentUser) {
      return friendDTO.username2;
    }
    // Otherwise, return username1
    return friendDTO.username1;
  };

  // Fetch all friends
  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API_URL}/friends/${currentUser}/all`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        // Extract usernames from friend DTOs
        const friendUsernames = response.data
          .map(extractUsername)
          .filter(username => username); // Remove any undefined or null usernames

        setFriends(friendUsernames);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setMessage('Failed to load friends.');
    }
  };

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/friends/requests/${currentUser}`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        // Extract usernames from friend request DTOs
        const requestUsernames = response.data
          .map(request => request.username1)
          .filter(username => username && username !== currentUser);

        setFriendRequests(requestUsernames);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setMessage('Failed to load friend requests.');
    }
  };

  // Fetch all users for search
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/allusers`);
      if (response.status === 200) {
        // Filter out current user from results
        const filteredUsers = response.data.filter(user => user.username !== currentUser);
        setAllUsers(filteredUsers);
        
        // Create a lookup object for profile info
        const profileLookup = {};
        response.data.forEach(user => {
          if (user && user.username) {
            profileLookup[user.username] = user;
          }
        });
        setFriendProfiles(profileLookup);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
      fetchAllUsers();
    }
  }, [currentUser]);

  // Search for users
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    const results = allUsers.filter(user => 
      user.username.toLowerCase().includes(searchUsername.toLowerCase())
    );
    setSearchResults(results);
  };

  // Send friend request
  const sendFriendRequest = async (targetUsername) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_URL}/friends/friendRequest`, {
        user1: currentUser,
        user2: targetUsername
      });
      
      if (response.status === 200) {
        setMessage(`Friend request sent to ${targetUsername}!`);
        // Clear search results
        setSearchUsername('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setMessage('Failed to send friend request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestUser) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/friends/acceptRequest`, {
        user1: requestUser,
        user2: currentUser
      });
      
      // Refresh lists
      fetchFriends();
      fetchFriendRequests();
      setMessage('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setMessage('Failed to accept friend request.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel/Reject friend request
  const cancelFriendRequest = async (requestUser) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/friends/cancel/${requestUser}/${currentUser}`);
      
      // Refresh requests
      fetchFriendRequests();
      setMessage('Friend request canceled.');
    } catch (error) {
      console.error('Error canceling friend request:', error);
      setMessage('Failed to cancel friend request.');
    } finally {
      setLoading(false);
    }
  };

  // Remove friend
  const removeFriend = async (friendUsername) => {
    if (!window.confirm(`Are you sure you want to remove ${friendUsername} as a friend?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/friends/${currentUser}/${friendUsername}`);
      
      // Refresh friends list
      fetchFriends();
      setMessage(`${friendUsername} has been removed from your friends.`);
    } catch (error) {
      console.error('Error removing friend:', error);
      setMessage('Failed to remove friend.');
    } finally {
      setLoading(false);
    }
  };

  // Start a chat with friend
  const startChat = async (friendUsername) => {
    try {
      // Check if chat exists first
      const response = await axios.post(`${API_URL}/chat/create`, {
        user1: currentUser,
        user2: friendUsername
      });
      
      if (response.status === 200) {
        // Navigate to chat page
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      // If chat already exists, still navigate to chat page
      if (error.response && error.response.status === 400) {
        navigate('/chat');
      } else {
        setMessage('Failed to start chat. Please try again.');
      }
    }
  };

  // Helper function to get a friend's profile picture
  const getFriendProfilePic = (username) => {
    if (friendProfiles[username] && friendProfiles[username].pfpUrl) {
      return friendProfiles[username].pfpUrl;
    }
    return "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg";
  };

  return (
    <div className="container fade-in">
      <h1 className="mb-4">Friends <i className="flower-icon">👯</i></h1>
      
      {message && (
        <div 
          className={`message ${message.includes('Failed') ? 'error' : 'success'}`}
          style={{ 
            color: message.includes('Failed') ? 'red' : 'green', 
            marginBottom: '15px',
            padding: '8px',
            borderRadius: '5px',
            backgroundColor: message.includes('Failed') ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)'
          }}
        >
          {message}
        </div>
      )}
      
      {/* Search for new friends */}
      <div className="friend-search-section">
        <h2>Find Friends <i className="flower-icon">🔍</i></h2>
        <form onSubmit={handleSearch}>
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
              style={{ minWidth: '80px' }}
            >
              Search
            </button>
          </div>
        </form>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results" style={{ marginTop: '15px' }}>
            <h3>Search Results</h3>
            <div className="friend-list">
              {searchResults.map((user, index) => (
                <div key={index} className="friend-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '10px',
                  boxShadow: '0 2px 5px var(--shadow-color)'
                }}>
                  <div className="friend-info" style={{ display: 'flex', alignItems: 'center' }}>
                    <img 
                      src={user.pfpUrl || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"} 
                      alt="Profile" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                    />
                    <span>{String(user.username || 'Unknown')}</span>
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={() => sendFriendRequest(user.username)}
                    disabled={loading || friends.includes(user.username)}
                    style={{ 
                      padding: '5px 10px', 
                      fontSize: '14px',
                      opacity: friends.includes(user.username) ? 0.5 : 1
                    }}
                  >
                    {friends.includes(user.username) ? 'Already Friends' : 'Add Friend'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Friend Requests Section */}
      {friendRequests.length > 0 && (
        <div className="friend-requests-section" style={{ marginTop: '30px' }}>
          <h2>Friend Requests <i className="flower-icon">📩</i></h2>
          <div className="friend-list">
            {friendRequests.map((requesterUsername, index) => (
              <div key={index} className="friend-item" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '10px',
                boxShadow: '0 2px 5px var(--shadow-color)'
              }}>
                <div className="friend-info" style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={getFriendProfilePic(requesterUsername)} 
                    alt="Profile" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                  />
                  <span>{requesterUsername}</span>
                </div>
                <div className="friend-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-primary"
                    onClick={() => acceptFriendRequest(requesterUsername)}
                    disabled={loading}
                    style={{ padding: '5px 10px', fontSize: '14px' }}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => cancelFriendRequest(requesterUsername)}
                    disabled={loading}
                    style={{ padding: '5px 10px', fontSize: '14px' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Friends List Section */}
      <div className="friends-list-section" style={{ marginTop: '30px' }}>
        <h2>My Friends <i className="flower-icon">💖</i></h2>
        {friends.length === 0 ? (
          <p className="text-center">You don't have any friends yet. Search for users to add friends!</p>
        ) : (
          <div className="friend-list">
            {friends.map((friendUsername, index) => (
              <div key={index} className="friend-item" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '10px',
                boxShadow: '0 2px 5px var(--shadow-color)'
              }}>
                <div className="friend-info" style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={getFriendProfilePic(friendUsername)} 
                    alt="Profile" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                  />
                  <span>{friendUsername}</span>
                </div>
                <div className="friend-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-primary"
                    onClick={() => startChat(friendUsername)}
                    style={{ padding: '5px 10px', fontSize: '14px' }}
                  >
                    Message
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => removeFriend(friendUsername)}
                    disabled={loading}
                    style={{ padding: '5px 10px', fontSize: '14px' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default Friends;
