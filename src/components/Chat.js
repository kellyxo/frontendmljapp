import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://mljapp.onrender.com/japp';
const WS_BASE_URL = 'wss://mljapp.onrender.com/japp/chat';

const Chat = ({ currentUser }) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Robust username extraction with multiple safeguards
  const extractUsername = (friendDTO) => {
    // Validate input completely
    if (!friendDTO || typeof friendDTO !== 'object') {
      console.warn('Invalid friend DTO:', friendDTO);
      return null;
    }

    // Multiple extraction attempts
    const possibleUsernames = [
      friendDTO.username1,
      friendDTO.username2,
      friendDTO.Username1,
      friendDTO.Username2
    ];

    // Find first valid username that isn't the current user
    const validUsername = possibleUsernames.find(
      username => 
        username && 
        typeof username === 'string' && 
        username.trim() !== '' && 
        username !== currentUser
    );

    return validUsername || null;
  };

  // Profile picture retrieval with extensive fallback
  const getFriendProfilePic = (username) => {
    const defaultPic = "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg";
    
    if (!username) return defaultPic;

    try {
      const profile = friendProfiles[username];
      return (profile && profile.pfpUrl) ? profile.pfpUrl : defaultPic;
    } catch (error) {
      console.warn(`Profile pic error for ${username}:`, error);
      return defaultPic;
    }
  };

  // Comprehensive friends fetching
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError('');

        // Fetch friends with comprehensive error handling
        const friendsResponse = await axios.get(`${API_URL}/friends/${currentUser}/all`);
        
        if (friendsResponse.status !== 200 || !Array.isArray(friendsResponse.data)) {
          throw new Error('Invalid friends response');
        }

        // Safe username extraction
        const friendUsernames = friendsResponse.data
          .map(extractUsername)
          .filter(username => 
            username && 
            typeof username === 'string' && 
            username.trim() !== '' && 
            username !== currentUser
          );

        setFriends(friendUsernames);

        // Fetch user profiles
        const usersResponse = await axios.get(`${API_URL}/allusers`);
        if (usersResponse.status === 200) {
          const profileLookup = {};
          usersResponse.data.forEach(user => {
            if (user && user.username) {
              profileLookup[user.username] = user;
            }
          });
          setFriendProfiles(profileLookup);
        }
      } catch (error) {
        console.error('Comprehensive friends fetch error:', error);
        setError('Failed to load friends. Please try again.');
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [currentUser]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // WebSocket connection effect
  useEffect(() => {
    // Close previous connection if exists
    if (socket) {
      socket.close();
      setSocket(null);
      setConnected(false);
    }

    if (!chatId || !selectedFriend) {
      return;
    }

    try {
      // Create new WebSocket connection
      const ws = new WebSocket(`${WS_BASE_URL}/${chatId}/${currentUser}`);
      
      ws.onopen = () => {
        setConnected(true);
        setError('');
      };
      
      ws.onmessage = (event) => {
        try {
          // Try to parse as JSON first
          let jsonData = null;
          try {
            jsonData = JSON.parse(event.data);
            
            // Check if this is a message history array
            if (Array.isArray(jsonData)) {
              const processedMessages = jsonData.map(msg => ({
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                senderUserName: msg.senderUserName || "Unknown",
                content: msg.content || "",
                creationDate: msg.creationDate || new Date().toISOString()
              }));
              
              // Sort by creation date
              processedMessages.sort((a, b) => 
                new Date(a.creationDate) - new Date(b.creationDate)
              );
              
              setMessages(processedMessages);
              return;
            }
          } catch (e) {
            // Not valid JSON, handle as plain text
            console.log("Message not JSON:", e);
          }
          
          // Handle plain text messages
          const message = event.data;
          
          // Ignore system messages
          if (message.includes('Welcome to chat') || message.includes('has joined the chat')) {
            return;
          }
          
          // Parse regular messages (username: content format)
          setMessages(prevMessages => {
            const messageRegex = /([^:]+): (.*)/;
            const match = message.match(messageRegex);
            
            if (match) {
              const [_, sender, content] = match;
              
              // Avoid duplicate messages
              const isDuplicate = prevMessages.some(msg => 
                msg.content === content && 
                msg.senderUserName === sender
              );
              
              if (isDuplicate) {
                return prevMessages;
              }
              
              return [...prevMessages, { 
                senderUserName: sender, 
                content,
                id: `msg-${Date.now()}-${Math.random()}`,
                creationDate: new Date().toISOString()
              }];
            }
            
            // Add as system message if it doesn't match the regex
            return [...prevMessages, { 
              content: message, 
              system: true,
              id: `sys-${Date.now()}-${Math.random()}`,
              creationDate: new Date().toISOString()
            }];
          });
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Chat connection error. Please try again.');
        setConnected(false);
      };
      
      ws.onclose = (event) => {
        setConnected(false);
      };
      
      setSocket(ws);
      
      // Cleanup
      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setError('Failed to establish chat connection.');
    }
  }, [chatId, selectedFriend, currentUser]);

  // Open chat with a friend
  const openChat = async (friendUsername) => {
    if (!friendUsername || typeof friendUsername !== 'string') {
      setError("Invalid friend username.");
      return;
    }
  
    setLoading(true);
    setError('');
    setSelectedFriend(friendUsername);
    setMessages([]);
    
    try {
      // Try to find existing chat
      try {
        const findResponse = await axios.get(`${API_URL}/chat/find`, {
          params: {
            user1: currentUser,
            user2: friendUsername
          }
        });
        
        if (findResponse.status === 200) {
          setChatId(findResponse.data);
          return;
        }
      } catch (findError) {
        // If not found, continue to create
      }
      
      // Create new chat
      const createResponse = await axios.post(`${API_URL}/chat/create`, {
        user1: currentUser,
        user2: friendUsername
      });
      
      if (createResponse.status === 200) {
        setChatId(createResponse.data);
      }
    } catch (error) {
      console.error("Chat creation error:", error);
      setError('Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !connected) {
      return;
    }
    
    const messageContent = newMessage.trim();
    
    try {
      // Send message through WebSocket
      socket.send(messageContent);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message.");
    }
  };

  return (
    <div className="container fade-in" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Chats <i className="flower-icon">💬</i></h1>
      
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
      
      <div className="chat-container" style={{ 
        display: 'flex', 
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        height: window.innerHeight <768 ? 'auto' :'70vh',
        boxShadow: '0 0 15px var(--shadow-color)',
        borderRadius: '15px',
        overflow: 'hidden'
      }}>
        {/* Friends sidebar */}
        <div className="friends-sidebar" style={{ 
          width: window.innerWidth < 768? '100%' : '30%', 
          height: window.innerHeight< 768 ? '30vh': 'auto',
          backgroundColor: 'var(--card-bg)',
          borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--shadow-color)',
          borderBottom: window.innerWidth < 768 ? '1px solid var(--shadow-color)' : 'none',
          overflowY: 'auto'
        }}>
          <h2 style={{ padding: '15px', borderBottom: '1px solid var(--shadow-color)' }}>Friends</h2>
          
          {loading ? (
            <p style={{ padding: '15px', textAlign: 'center' }}>Loading friends...</p>
          ) : friends.length === 0 ? (
            <p style={{ padding: '15px', textAlign: 'center' }}>No friends yet</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {friends.map((friendUsername, index) => (
                <li 
                  key={index} 
                  onClick={() => openChat(friendUsername)}
                  style={{ 
                    padding: '15px',
                    cursor: 'pointer',
                    backgroundColor: selectedFriend === friendUsername 
                      ? 'rgba(var(--primary-color-rgb), 0.1)' 
                      : 'transparent',
                    borderBottom: '1px solid rgba(var(--shadow-color), 0.3)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <img 
                    src={getFriendProfilePic(friendUsername)} 
                    alt="Profile" 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      marginRight: '10px',
                      border: selectedFriend === friendUsername 
                        ? '2px solid var(--primary-color)' 
                        : 'none',
                      objectFit:'cover',
                      objectPosition:'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  {friendUsername}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Chat area */}
        <div className="chat-area" style={{ 
         width: window.innerWidth < 768 ? '100%' : '70%', 
         height: window.innerWidth < 768 ? '60vh' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--background-color)'
        }}>
          {selectedFriend ? (
            <>
              {/* Chat header */}
              <div className="chat-header" style={{ 
                padding: '15px', 
                borderBottom: '1px solid var(--shadow-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <img 
                  src={getFriendProfilePic(selectedFriend)} 
                  alt="Profile" 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' , objectFit:"cover"}}
                />
                <h3 style={{ margin: 0 }}>{selectedFriend}</h3>
                <span style={{ 
                  marginLeft: 'auto',
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%',
                  backgroundColor: connected ? 'green' : 'red',
                  display: 'inline-block'
                }} title={connected ? 'Connected' : 'Disconnected'} />
              </div>
              
              {/* Messages container */}
              <div 
                className="messages-container" 
                ref={chatContainerRef}
                style={{ 
                  flex: 1,
                  overflowY: 'auto',
                  padding: '15px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', margin: 'auto' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto' }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={msg.id || index}
                      className={`message ${msg.senderUserName === currentUser ? 'sent' : 'received'}`}
                      style={{ 
                        alignSelf: msg.senderUserName === currentUser ? 'flex-end' : 'flex-start',
                        backgroundColor: msg.senderUserName === currentUser 
                          ? 'var(--primary-color)' 
                          : 'var(--card-bg)',
                        color: msg.senderUserName === currentUser ? 'white' : 'var(--text-color)',
                        padding: '10px 15px',
                        borderRadius: '18px',
                        maxWidth: '70%',
                        marginBottom: '10px',
                        boxShadow: '0 1px 2px var(--shadow-color)'
                      }}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <form 
                onSubmit={sendMessage}
                style={{ 
                  padding: '15px',
                  borderTop: '1px solid var(--shadow-color)',
                  backgroundColor: 'var(--card-bg)',
                  display: 'flex'
                }}
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={connected ? "Type a message..." : "Connecting..."}
                  disabled={!connected}
                  style={{ 
                    flex: 1,
                    padding: '10px 15px',
                    borderRadius: '25px',
                    border: '1px solid var(--shadow-color)',
                    outline: 'none',
                    marginRight: '10px'
                  }}
                />
                <button 
                  type="submit"
                  disabled={!connected || !newMessage.trim()}
                  className="btn-primary"
                  style={{
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ↑
                </button>
              </form>
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div>
                <h3>Select a friend to start chatting</h3>
                <p>Your conversations will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default Chat;