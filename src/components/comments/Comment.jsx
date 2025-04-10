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

  useEffect(() => {
    fetchComments();
  }, [journalEntryId]);

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
          rating: 'g',
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
          rating: 'g',
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
      await axios.post(`${API_URL}/comments/gif`, {  // Fixed API URL
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

  return (
    <div className="comments-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: onClose ? 'pointer' : 'default',
    }} onClick={onClose ? () => onClose() : undefined}>
      <div className="comments-content container" 
        style={{ 
          cursor: 'default',
          maxHeight: '90vh',  // Limit height to prevent overflow
          overflowY: 'auto',  // Make the entire content area scrollable if needed
          padding: '20px'
        }}
        onClick={(e) => e.stopPropagation()}>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="close"
            style={{ position: 'absolute', top: '15px', right: '15px' }}
          >
            <X />
          </button>
        )}

        <h3>Comments</h3>
        
        <div className="comment-input">
          <form onSubmit={handleAddComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="form-control"
              rows={3}
            />
            
            <div className="comment-actions">
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="btn-primary"
              >
                Post
              </button>
              
              <button
                type="button"
                onClick={() => setShowGifSelector(!showGifSelector)}
                className="btn-primary"
              >
                {showGifSelector ? 'Cancel GIF' : 'Add GIF'}
              </button>
            </div>
          </form>
        </div>
        
        {/* GIF Selector */}
        {showGifSelector && (
          <div className="giphy-selector" style={{
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Darker background
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <form onSubmit={(e) => searchGifs(e, true)} className="search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search GIFs..."
                className="form-control"
              />
              <button
                type="submit"
                className="btn-primary"
              >
                Search
              </button>
            </form>
            
            <div 
              ref={gifContainerRef}
              className="grid-container" 
              style={{ 
                height: '300px', // Fixed height to ensure scrolling happens inside
                overflowY: 'auto', // Allow vertical scrolling
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', // Larger grid cells
                gap: '10px',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)'
              }}
            >
              {gifs.map((gif, index) => (
                <div 
                  key={`${gif.id}-${index}`}
                  onClick={() => handleGifSelected(gif.images.fixed_height.url)}
                  className="journal-entry"
                  style={{
                    cursor: 'pointer',
                    padding: '8px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '8px',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '140px' // Fixed height for consistent grid
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img
                    src={gif.images.fixed_height.url} // Using larger image
                    alt={gif.title}
                    loading="lazy"
                    style={{ 
                      maxHeight: '130px', 
                      maxWidth: '100%',
                      objectFit: 'contain' // Maintain aspect ratio
                    }}
                  />
                </div>
              ))}
              
              {loadingGifs && (
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '10px' 
                }}>
                  Loading more GIFs...
                </div>
              )}
            </div>
            
            <div className="text-muted text-center" style={{marginTop: '10px'}}>
              Powered by GIPHY
            </div>
          </div>
        )}
        
        {/* Comments List */}
        <div className="comment-container" style={{
            backgroundColor: 'var(--card-bg)',
            marginTop: '20px',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 0 10px var(--shadow-color)'
        }}>
          {loading ? (
            <div className="text-center fade-in">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center fade-in">No comments yet. Be the first to comment!</div>
          ) : (
            <div className="fade-in">
              {comments.map((comment, index) => (
                <div key={`${comment.id}-${index}`} className="comment-item" style={{backgroundColor: 'var(--card-bg'}}>
                  <div className="comment-header">
                    <img
                      src={comment.user?.pfpUrl || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"}
                      alt="Profile"
                      className="avatar"
                    />
                    <div>
                      <span className="username">
                        {comment.user?.username || 'Anonymous'}
                      </span>
                      <span className="timestamp" style={{fontSize: '0.8rem'}}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
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
                          transition: 'transform 0.3s',
                          margin: '10px 0'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="comment-content">
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
  );
};

export default Comment;