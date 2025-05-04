import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { HeartFill, Globe, LockFill, ThreeDots ,ChatLeft} from 'react-bootstrap-icons';
import ThemeSwitcher from './ThemeSwitcher';
import Comment from './comments/Comment';
import SOTD from './Spotify/SOTD';
import { ChevronDown } from 'react-bootstrap-icons';
import PullToRefresh from 'react-pull-to-refresh';



const API_URL = 'https://mljapp.onrender.com/japp';

const PublicFeed = ({ currentUser }) => {
  const [publicEntries, setPublicEntries] = useState([]);
  const [friendsEntries, setFriendsEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [friends, setFriends] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const[menuVisibleId, setMenuVisibleId] = useState(null);
  const [canRefresh, setCanRefresh] = useState(true);


  
  // Helper function to get a user's profile picture
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
  
  const toggleExpand = (entryId) => {
    if (expandedEntryId === entryId) {
      setExpandedEntryId(null); // Collapse
    } else {
      setExpandedEntryId(entryId); // Expand
    }
  };
  

  useEffect(() => {
    fetchFriends();
    // fetchPublicEntries() will be called after fetchFriends completes
  }, [currentUser]);
  /**
   * 
   * @returns promise for refresh component
   */
  const handleRefresh = async () => {
    if(!canRefresh){
      toast.info('Please wait to refresh');
      return;
    }

    setCanRefresh(false);
    await fetchFriends();
    toast.success("Feed updated")

    setTimeout(() => {
      setCanRefresh(true)
    }, 9000) // 5 secs 
  }


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
        await fetchFriendsEntries();
        
        // Then fetch public entries from non-friends
        fetchPublicEntries();
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      // If we can't get friends, still try to get public entries
      fetchPublicEntries();
    }
  };
  useEffect(() => {
    // Function to close menu when clicking outside
    const handleClickOutside = () => {
      if (menuVisibleId !== null) {
        setMenuVisibleId(null);
      }
    };
    
    // Add event listener when component mounts
    document.addEventListener('click', handleClickOutside);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuVisibleId]);
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
        publicStatus: entry.publicStatus
      };
  
      const response = await axios.put(`${API_URL}/like/entry/${currentUser}`, journalEntryDTO);
  
      setPublicEntries(prevEntries => 
        prevEntries.map(e => e.id === entryId ? { ...e, likeCount: response.data.likeCount } : e)
      );
      
      setFriendsEntries(prevEntries => 
        prevEntries.map(e => e.id === entryId ? { ...e, likeCount: response.data.likeCount } : e)
      );
  
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
      };
      
      await axios.put(`${API_URL}/entry/status`, journalEntryDTO);
      
      // Remove from displayed entries
      setPublicEntries(prevEntries => 
        prevEntries.filter(e => e.id !== entryId)
      );
      
      setFriendsEntries(prevEntries => 
        prevEntries.filter(e => e.id !== entryId)
      );
      
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
  const fetchFriendsEntries = async () => {
    try {
      const response = await axios.get(`${API_URL}/entriesPublic/friends/${currentUser}`);
      if (response.status === 200) {
        const sortedEntries = response.data.sort((a,b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
          );
        setFriendsEntries(sortedEntries);
      } else {
        setFriendsEntries([]);
      }
    } catch (error) {
      console.error('Error fetching friends entries:', error);
      setFriendsEntries([]);
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
  // new method for now to roll out new feed type
  const allFriendsAndOwnEntries = () => {
    const combinedEntries = [
      ...friendsEntries,
      ...publicEntries.filter(entry => entry.username === currentUser)
    ];
  
    // Remove duplicates by entry ID
    const uniqueEntries = Array.from(
      new Map(combinedEntries.map(entry => [entry.id, entry])).values()
    );
  
    // Sort by most recent first
    return uniqueEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  const EntryCard = ({ entry }) => {
    const isExpanded = expandedEntryId === entry.id;
    const isOwner = entry.username === currentUser;
    const[showComments, setShowComments] = useState(false)
    const entryCardRef = useRef(null);

    const isEntryTooSmallForComments = () => {
      if (!entryCardRef.current) return false;
      
      // Check if the entry card is smaller than a certain threshold (e.g., 300px)
      const cardHeight = entryCardRef.current.offsetHeight;
      return cardHeight < 300; // Adjust this threshold as needed
    };

    
    return (
      <div 
        className="entry-card" 
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px var(--shadow-color)',
          marginBottom: '20px',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          transform: isExpanded ? 'translateY(-5px)' : 'translateY(0)',
          boxShadow: isExpanded ? '0 8px 16px var(--shadow-color)' : '0 2px 8px var(--shadow-color)'
        }}
      >
        {/* Card Header */}
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(var(--primary-color-rgb), 0.1)'
        }}>
          <img 
            src={getUserProfilePic(entry)} 
            alt="Profile" 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              marginRight: '12px',
              objectFit: 'contain'
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>
              {entry.username}
              {entry.username === currentUser && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  backgroundColor: 'var(--primary-color)', 
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  marginLeft: '8px'
                }}>
                  You
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {formatDate(entry.createdAt)}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {entry.publicStatus ? 
              <Globe style={{ marginRight: '8px', opacity: 0.7 }} /> : 
              <LockFill style={{ marginRight: '8px', opacity: 0.7 }} />
            }
            <ThreeDots  
              onClick={(e) => {
                e.stopPropagation();
                setMenuVisibleId(menuVisibleId === entry.id ? null : entry.id);
              }}
              style={{ cursor: 'pointer', opacity: 0.7, padding: "5px" }} 
            />
            
            {/* Three dots menu */}
            {menuVisibleId === entry.id && (
              <div 
                style={{
                  position: 'absolute',
                  top: '25px',
                  right: '0',
                  border: '1px solid #eee',
                  background: "var(--card-bg)",
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  width: '150px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {entry.username === currentUser && (
                  <div 
                    onClick={() => {
                      makeEntryPrivate(entry.id);
                      setMenuVisibleId(null);
                    }}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    Make Private
                  </div>
                )}
                
                <div 
                  onClick={() => setMenuVisibleId(null)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </div>
              </div>
            )}
          </div>
        </div>
  
        {/* Card Content */}
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => toggleExpand(entry.id)}
        >
          {/* Image if available */}
          {entry.imageUrl && entry.imageUrl.trim() !== "" && (
            <div style={{ position: 'relative' }}>
              <img 
                src={entry.imageUrl} 
                alt="Journal Entry" 
                style={{ 
                  width: '100%', 
                  maxHeight: isExpanded ? '900x' : '300px',
                  objectFit: 'cover',
                  transition: 'max-height 0.3s ease'
                }}
              />
            </div>
          )}
          
          {/* Text Content */}
          <div style={{ padding: '16px' }}>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {isExpanded ? 
                entry.textEntry : 
                (entry.textEntry.length > 150 ? 
                  `${entry.textEntry.substring(0, 150)}...` : 
                  entry.textEntry)
              }
            </p>
            
            {!isExpanded && entry.textEntry.length > 150 && (
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  padding: '8px 0',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(entry.id);
                }}
              >
                Read more
              </button>
            )}
          </div>
        </div>
        
        {/* Card Footer */}
        <div style={{ 
          padding: '12px 16px',
          borderTop: '1px solid rgba(var(--primary-color-rgb), 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => handleLike(entry.id)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--primary-color)',
                fontWeight: 'bold',
                padding: '8px 12px',
                borderRadius: '8px',
                marginRight: '8px'
              }}
            >
              <HeartFill style={{ marginRight: '6px', color: '#FF6B6B' }} />
              {entry.likeCount || 0}
            </button>
            <button  onClick={() => setShowComments(true)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--primary-color)',
                fontWeight: 'bold',
                padding: '8px 12px',
                borderRadius: '8px',
                marginRight: '8px'
              }}
            > 
            <ChatLeft style={{ marginRight: '6px', color: '#FF6B6B' }} />
            </button>
          </div>
        </div>
      
        {showComments && (
          <Comment 
            journalEntryId={entry.id} 
            currentUsername={currentUser} 
            isSotd={false}
            inContainer={isEntryTooSmallForComments}
            onClose={() => setShowComments(false)} 

          />
        )}
        {/* Expanded area for when a card is expanded */}
        {isExpanded && (
          <div style={{ 
            padding: '0 16px 16px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ 
              fontSize: '0.9rem', 
              padding: '12px',
              backgroundColor: 'rgba(var(--primary-color-rgb), 0.05)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <span onClick={() => toggleExpand(entry.id)} style={{ cursor: 'pointer' }}>
                Click anywhere to collapse
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <PullToRefresh onRefresh={handleRefresh}
    icon={<ChevronDown className="custom-arrow-icon" />}>
    <div className="container fade-in">
      <h1 className="mb-4">Public Feed <i className="flower-icon">📝</i></h1>
      <div className="sotd-wrapper" style={{ marginBottom: '30px' }}>
        <SOTD currentUser={currentUser}/>
      </div>

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
        <div className="card-feed">
          {friendsEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
      
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
    </PullToRefresh>

  );
};

export default PublicFeed;