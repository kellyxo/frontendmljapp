import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { X } from 'react-bootstrap-icons';

// Replace with hardcoded API key for testing
const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY;
const API_URL = 'https://mljapp.onrender.com/japp';

const Comment = ({ journalEntryId, currentUsername, onClose }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showGifSelector, setShowGifSelector] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const gifContainerRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const modalRef = useRef(null);

  // Focus handling for better accessibility and user experience
  useEffect(() => {
    const textareaElement = document.querySelector('textarea.form-control');
    if (textareaElement) {
      setTimeout(() => textareaElement.focus(), 100);
    }
  }, []);

  useEffect(() => {
    fetchComments();
    
    // Add touch event for mobile to close when touching outside
    const handleTouchOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && onClose) {
        onClose();
      }
    };
    
    document.addEventListener('touchstart', handleTouchOutside);
    return () => document.removeEventListener('touchstart', handleTouchOutside);
  }, [journalEntryId, onClose]);

  // Fetch comments for the journal entry
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/comments/entry/${journalEntryId}`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a text comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      const response = await axios.post(`${API_URL}/comments/text`, {
        username: currentUsername,
        journalEntryId,
        content: newComment
      });
      
      if (response.data) {
        setComments([response.data, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Fetch trending GIFs with API key directly in URL
  const fetchTrendingGifs = async (resetGifs = true) => {
    setLoadingGifs(true);
    try {
      const offset = resetGifs ? 0 : page * 20;
      const response = await axios.get(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}`, {
        params: {
          limit: 20,
          rating: 'r',
          offset: offset
        }
      });
      
      const newGifs = response.data.data;
      setGifs(resetGifs ? newGifs : [...gifs, ...newGifs]);
      setHasMore(newGifs.length === 20);
      if (resetGifs) {
        setPage(0);
      } else {
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
    } finally {
      setLoadingGifs(false);
    }
  };

  // Search for GIFs with API key directly in URL
  const searchGifs = async (e, resetGifs = true) => {
    if (e) e.preventDefault();
    
    if (!searchTerm.trim()) {
      fetchTrendingGifs(resetGifs);
      return;
    }

    setLoadingGifs(true);
    try {
      const offset = resetGifs ? 0 : page * 20;
      const response = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}`, {
        params: {
          q: searchTerm,
          limit: 20,
          rating: 'r',
          offset: offset
        }
      });
      
      const newGifs = response.data.data;
      setGifs(resetGifs ? newGifs : [...gifs, ...newGifs]);
      setHasMore(newGifs.length === 20);
      if (resetGifs) {
        setPage(0);
      } else {
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoadingGifs(false);
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!gifContainerRef.current || loadingGifs || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gifContainerRef.current;
    
    // When user scrolls to bottom with some buffer (50px)
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (searchTerm.trim()) {
        searchGifs(null, false);
      } else {
        fetchTrendingGifs(false);
      }
    }
  }, [loadingGifs, hasMore, searchTerm, page]);

  // Set up scroll listener for infinite scroll
  useEffect(() => {
    const currentRef = gifContainerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  // Load trending GIFs when GIF selector is shown
  useEffect(() => {
    if (showGifSelector) {
      fetchTrendingGifs(true);
    }
  }, [showGifSelector]);

  // Add a GIF comment
  const handleGifSelected = async (gifUrl) => {
    try {
      await axios.post(`${API_URL}/comments/gif`, {
        username: currentUsername,
        journalEntryId,
        gifUrl
      });
      
      // Refresh comments to see the new GIF
      fetchComments();
      setShowGifSelector(false);
    } catch (error) {
      console.error('Error adding GIF comment:', error);
    }
  };

  // Animation for modal entry
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.style.opacity = 0;
      setTimeout(() => {
        if (modalRef.current) modalRef.current.style.opacity = 1;
      }, 50);
    }
  }, []);

  return (
    <div className="comments-modal" 
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'opacity 0.2s ease-in-out',
      }} 
      onClick={onClose ? () => onClose() : undefined}
    >
      {/* Modal Content */}
      <div className="comments-content container" 
        style={{ 
          cursor: 'default',
          maxHeight: '90vh',
          width: '90%', // Set a width for better mobile view
          maxWidth: '800px', // Maximum width for desktop
          backgroundColor: 'var(--background-color)',
          borderRadius: '12px',
          position: 'relative', // For absolute positioning inside
          display: 'flex',
          flexDirection: 'column', // Stack children vertically
          overflow: 'hidden', // Prevent content overflow
          animation: 'modalFadeIn 0.3s forwards',
        }}
        onClick={(e) => e.stopPropagation()}>
        
        {/* Fixed header with X button */}
        <div style={{
          padding: '35px 15px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--background-color, #fff)',
          zIndex: 10,
        }}>
          <h3 style={{ margin: 0 }}>Comments</h3>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="close"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%', 
                width: '38px',
                height: '38px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X />
            </button>
          )}
        </div>
        
        {/* Scrollable content area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 20px 20px',
        }}>
          {/* Comment input area - always visible */}
          <div className="comment-input" style={{ 
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--card-bg)',
            zIndex: 5,
            padding: '15px',
            margin: '0 -15px 15px -15px',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="form-control"
                rows={3}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '15px',
                  minHeight: '80px',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
              
              <div className="comment-actions" style={{
                display: 'flex',
                gap: '10px',
                marginTop: '10px'
              }}>
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                    opacity: newComment.trim() ? 1 : 0.7
                  }}
                >
                  Post
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowGifSelector(!showGifSelector)}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: showGifSelector ? 'var(--danger-color, #dc3545)' : 'var(--secondary-color, #6c757d)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {showGifSelector ? 'Cancel GIF' : 'Add GIF'}
                </button>
              </div>
            </form>
          </div>
         
          {/* GIF Selector */}
          {showGifSelector && (
            <div className="giphy-selector" style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <form onSubmit={(e) => searchGifs(e, true)} className="search-container" style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '15px'
              }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search GIFs..."
                  className="form-control"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '15px'
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary-color, #007bff)',
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Search
                </button>
              </form>
              
              {/* GIF grid with its own scrolling */}
              <div 
                ref={gifContainerRef}
                className="grid-container" 
                style={{ 
                  height: '300px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: 'var(--background-color',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                {gifs.length === 0 && !loadingGifs ? (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    padding: '20px',
                    color: '#666'
                  }}>
                    {searchTerm ? 'No GIFs found. Try a different search term.' : 'Loading trending GIFs...'}
                  </div>
                ) : (
                  gifs.map((gif, index) => (
                    <div 
                      key={`${gif.id}-${index}`}
                      onClick={() => handleGifSelected(gif.images.fixed_height.url)}
                      className="gif-item"
                      style={{
                        cursor: 'pointer',
                        padding: '4px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '8px',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    >
                      <img
                        src={gif.images.fixed_height.url}
                        alt={gif.title}
                        loading="lazy"
                        style={{ 
                          maxHeight: '95px', 
                          maxWidth: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  ))
                )}
                
                {loadingGifs && (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    padding: '10px',
                    color: '#666'
                  }}>
                    Loading more GIFs...
                  </div>
                )}
              </div>
              
              <div className="text-muted text-center" style={{marginTop: '10px', fontSize: '0.8rem', color: '#999'}}>
                Powered by GIPHY
              </div>
            </div>
          )}
          
          {/* Comments List with its own scrollable container */}
          <div 
            ref={commentsContainerRef}
            className="comment-container" 
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '15px',
              boxShadow: '0 0 10px var(--shadow-color, rgba(0,0,0,0.1))',
              marginTop: '10px',
              maxHeight: showGifSelector ? '300px' : '60vh',
              overflowY: 'auto'
            }}
          >
            {loading ? (
              <div style={{ 
                textAlign: 'center',
                padding: '20px',
                color: '#666'
              }}>
                <div className="loading-spinner" style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(0,0,0,0.1)',
                  borderRadius: '50%',
                  borderTopColor: 'var(--primary-color, #007bff)',
                  animation: 'spin 1s linear infinite',
                  marginRight: '10px'
                }}></div>
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '30px 20px',
                color: '#666' 
              }}>
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div>
                {comments.map((comment, index) => (
                  <div 
                    key={`${comment.id}-${index}`} 
                    className="comment-item" 
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '15px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      borderLeft: '3px solid transparent',
                      transition: 'border-left-color 0.3s',
                      borderLeftColor: comment.user?.username === currentUsername ? 'var(--primary-color, rgba(231, 76, 60, 0.6))' : 'transparent'
                    }}
                  >
                    <div className="comment-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <img
                        src={comment.user?.pfpUrl || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"}
                        alt="Profile"
                        className="avatar"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          marginRight: '10px',
                          objectFit: 'cover',
                          border: comment.user?.username === currentUsername ? '2px solid var(--primary-color, rgba(231, 76, 60, 0.6))' : 'none'
                        }}
                      />
                      <div>
                        <div className="username" style={{
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          color: comment.user?.username === currentUsername ? 'var(--primary-color, #e74c3c)' : 'inherit'
                        }}>
                          {comment.user?.username || 'Anonymous'}
                        </div>
                        <div className="timestamp" style={{
                          fontSize: '0.8rem',
                          color: '#777'
                        }}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {comment.gifUrl ? (
                      <div className="comment-gif">
                        <img
                          src={comment.gifUrl}
                          alt="GIF"
                          className="gif-image"
                          style={{ 
                            maxWidth: '100%',
                            borderRadius: '8px',
                            margin: '10px 0'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="comment-content" style={{
                        padding: '5px 0',
                        wordBreak: 'break-word',
                        lineHeight: '1.5',
                        fontSize: '15px'
                      }}>
                        {comment.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes modalFadeIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Comment;