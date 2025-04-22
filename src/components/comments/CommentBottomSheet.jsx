import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, ChevronDown } from 'react-bootstrap-icons';
import { MdGif } from "react-icons/md";


// API key and URL configuration
const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY;
const API_URL = 'https://mljapp.onrender.com/japp';

const CommentBottomSheet = ({ journalEntryId, sotdId, isSotd, currentUsername, onClose , inContainer = false}) => {
  // State management
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showGifSelector, setShowGifSelector] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sheetPosition, setSheetPosition] = useState('closed'); // 'closed', 'half', 'full'
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [dragging, setDragging] = useState(false);
  
  // Refs
  const sheetRef = useRef(null);
  const dragHandleRef = useRef(null);
  const gifContainerRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const inputRef = useRef(null);

  
  // Effect to animate opening when the component mounts
  useEffect(() => {
    // Start closed and then animate to half position
    setTimeout(() => {
      setSheetPosition('half');
    }, 50);
    
    // Handle clicks outside to close
    const handleOutsideClick = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  
  // Focus the comment input when appropriate
  useEffect(() => {
    if (sheetPosition === 'full' && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [sheetPosition]);
  
  // Fetch comments when component mounts or when entry/sotd ID changes
  useEffect(() => {
    fetchComments();
  }, [isSotd ? sotdId : journalEntryId]);
  
  // Fetch comments based on type (journal entry or SOTD)
  const fetchComments = async () => {
    const entryId = isSotd ? sotdId : journalEntryId;
    if (!entryId) return;
    
    try {
      setLoading(true);
      const endpoint = isSotd 
        ? `${API_URL}/comments/sotd/${sotdId}` 
        : `${API_URL}/comments/entry/${journalEntryId}`;
      
      const response = await axios.get(endpoint);
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
      // Choose the appropriate endpoint based on type
      const endpoint = isSotd 
        ? `${API_URL}/comments/sotd/text` 
        : `${API_URL}/comments/text`;
      
      // Prepare the request payload based on type
      const payload = isSotd 
        ? {
            username: currentUsername,
            sotdID: sotdId,
            content: newComment
          }
        : {
            username: currentUsername,
            journalEntryId,
            content: newComment
          };
      
      const response = await axios.post(endpoint, payload);
      
      if (response.data) {
        // For journal entries, the API returns the created comment
        setComments([response.data, ...comments]);
      } else {
        // For SOTD, we might need to refresh the comments
        fetchComments();
      }
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  // Fetch trending GIFs
  const fetchTrendingGifs = async (resetGifs = true) => {
    setLoadingGifs(true);
    try {
      const offset = resetGifs ? 0 : page * 20;
      const response = await axios.get(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}`, {
        params: {
          limit: 20,
          rating: 'pg-13',
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
  
  // Search for GIFs
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
          rating: 'pg-13',
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
  
  // Infinite scroll handler for GIFs
  const handleGifScroll = useCallback(() => {
    if (!gifContainerRef.current || loadingGifs || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gifContainerRef.current;
    
    // When user scrolls to bottom
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (searchTerm.trim()) {
        searchGifs(null, false);
      } else {
        fetchTrendingGifs(false);
      }
    }
  }, [loadingGifs, hasMore, searchTerm, page]);
  
  // Add scroll listener for GIF container
  useEffect(() => {
    const currentRef = gifContainerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleGifScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleGifScroll);
      }
    };
  }, [handleGifScroll]);
  
  // Load trending GIFs when GIF selector is shown
  useEffect(() => {
    if (showGifSelector) {
      fetchTrendingGifs(true);
    }
  }, [showGifSelector]);
  
  // Add a GIF comment
  const handleGifSelected = async (gifUrl) => {
    try {
      // Choose the appropriate endpoint
      const endpoint = isSotd 
        ? `${API_URL}/comments/sotd/gif` 
        : `${API_URL}/comments/gif`;
      
      // Prepare the request payload
      const payload = isSotd 
        ? {
            username: currentUsername,
            sotdID: sotdId,
            gifUrl
          }
        : {
            username: currentUsername,
            journalEntryId,
            gifUrl
          };
      
      await axios.post(endpoint, payload);
      
      // Refresh comments and hide GIF selector
      fetchComments();
      setShowGifSelector(false);
    } catch (error) {
      console.error('Error adding GIF comment:', error);
    }
  };
  
  // Handle dragging of the bottom sheet
  const handleDragStart = (e) => {
    setDragging(true);
    setStartY(e.clientY || (e.touches && e.touches[0].clientY) || 0);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  };
  
  const handleDragMove = (e) => {
    if (!dragging) return;
    
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setCurrentY(clientY);
    
    const deltaY = clientY - startY;
    
    // Apply transform directly for smooth dragging
    if (sheetRef.current) {
     const maxHeight = window.innerHeight * (inContainer ? 0.8 : 0.9); // Maximum height
     const minHeight = inContainer ? 250 : window.innerHeight * 0.3; // Minimum height even when dragging
    //   const maxHeight = window.innerHeight * 0.9; // Maximum height (90% of viewport)
      const currentHeight = sheetRef.current.offsetHeight;
      const newHeight = Math.max(100, Math.min(maxHeight, currentHeight - deltaY));
      
      sheetRef.current.style.height = `${newHeight}px`;
    }
  };
  
  const handleDragEnd = () => {
    setDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    
    if (!sheetRef.current) return;
    
    const deltaY = currentY - startY;
    const currentHeight = sheetRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    // Determine new position based on velocity and current position
    if (deltaY > 100) {
      // Swiping down significantly - close or go to half
      if (sheetPosition === 'half' || currentHeight < viewportHeight * 0.3) {
        handleClose();
      } else {
        setSheetPosition('half');
      }
    } else if (deltaY < -100) {
      // Swiping up significantly - go to full
      setSheetPosition('full');
    } else {
      // Small movement - snap to nearest position
      if (currentHeight > viewportHeight * 0.7) {
        setSheetPosition('full');
      } else if (currentHeight < viewportHeight * 0.3) {
        handleClose();
      } else {
        setSheetPosition('half');
      }
    }
  };
  
  // Handle closing the bottom sheet
  const handleClose = () => {
    setSheetPosition('closed');
    // Add a delay before actually unmounting the component
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  // Toggle sheet position between half and full
  const toggleSheetPosition = () => {
    setSheetPosition(prevPos => prevPos === 'full' ? 'half' : 'full');
  };
  
  // Get sheet transform based on position
  const getSheetStyle = () => {
    const baseStyle = {
      position: inContainer ? 'absolute' : 'fixed', // Use absolute for container-relative
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--background-color, white)',
      borderTopLeftRadius: '16px',
      borderTopRightRadius: '16px',
      boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
      transition: dragging ? 'none' : 'transform 0.3s ease-out, height 0.3s ease-out',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '95vh' // Never take up more than 95% of the viewport
    };
    
    // const containerHeightMod = inContainer ? 0.8 : 1; // 80% height adjustment for container
    const minHeightHalf = inContainer ? 300 : window.innerHeight * 0.4; // At least 300px or 40% of viewport
    const minHeightFull = inContainer ? 400 : window.innerHeight * 0.7; // At least 400px or 70% of viewport
    
    
  switch (sheetPosition) {
    case 'closed':
      return {
        ...baseStyle,
        transform: 'translateY(100%)'
      };
    case 'half':
      return {
        ...baseStyle,
        height: inContainer ? `max(50%, ${minHeightHalf}px)` : `max(50vh, ${minHeightHalf}px)`
      };
    case 'full':
      return {
        ...baseStyle,
        height: inContainer ? `max(80%, ${minHeightFull}px)` : `max(90vh, ${minHeightFull}px)`
      };
    default:
      return baseStyle;
  }
};
  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: inContainer ? 'absolute' : 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          opacity: sheetPosition === 'closed' ? 0 : 0.5,
          transition: 'opacity 0.3s ease',
          pointerEvents: sheetPosition === 'closed' ? 'none' : 'auto'
        }}
        onClick={handleClose}
      />
      
      {/* Comment Bottom Sheet */}
      <div 
        ref={sheetRef}
        style={getSheetStyle()}
      >
        {/* Drag handle */}
        <div 
          ref={dragHandleRef}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            width: '100%',
            height: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'grab',
            padding: '16px 0',
            backgroundColor: 'var(--background-color, white)',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '5px', 
            backgroundColor: 'var(--shadow-color, #ddd)', 
            borderRadius: '3px' 
          }} />
          
          {/* Title and close button */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Comments
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Expand/collapse button */}
        <button
          onClick={toggleSheetPosition}
          style={{
            position: 'absolute',
            top: '12px',
            right: '50px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          }}
        >
          <ChevronDown 
            size={20} 
            style={{ 
              transform: sheetPosition === 'full' ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }} 
          />
        </button>
        
        {/* Comments list */}
        <div 
          ref={commentsContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px'
          }}
        >
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '32px 0' 
            }}>
              <div className="loading-spinner" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(var(--primary-color-rgb, 0, 0, 0), 0.1)',
                borderTopColor: 'var(--primary-color, #000)',
                animation: 'spin 1s infinite linear'
              }} />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '32px 16px',
              color: 'var(--text-color, #666)'
            }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment, index) => (
              <div 
                key={comment.id || index}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--shadow-color, rgba(0,0,0,0.1))'
                }}
              >
                <div style={{ display: 'flex', marginBottom: '8px' }}>
                  <img 
                    src={comment.user?.pfpUrl || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"} 
                    alt="Profile" 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      marginRight: '12px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {comment.user?.username || 'Anonymous'}
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      color: 'var(--text-color, #666)',
                      opacity: 0.7 
                    }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Comment content */}
                {comment.gifUrl ? (
                  <div style={{ 
                    marginLeft: '44px',
                    marginBottom: '8px' 
                  }}>
                    <img 
                      src={comment.gifUrl} 
                      alt="GIF" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '12px'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    marginLeft: '44px',
                    fontSize: '15px',
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {comment.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Comment input area */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--shadow-color, rgba(0,0,0,0.1))',
          backgroundColor: 'var(--card-bg, white)'
        }}>
          {showGifSelector && (
            <div style={{ 
              marginBottom: '12px',
              backgroundColor: 'var(--background-color, #f5f5f5)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <form onSubmit={(e) => searchGifs(e, true)} style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex',
                  gap: '8px'
                }}>
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search GIFs..."
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--shadow-color, #ddd)',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--primary-color, #3897f0)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '0 16px',
                      fontSize: '14px'
                    }}
                  >
                    Search
                  </button>
                </div>
              </form>
              
              <div 
                ref={gifContainerRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  height: '160px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {gifs.map((gif, index) => (
                  <div
                    key={`${gif.id}-${index}`}
                    onClick={() => handleGifSelected(gif.images.fixed_height.url)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'black',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={gif.images.fixed_height_small.url}
                      alt={gif.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      loading="lazy"
                    />
                  </div>
                ))}
                
                {loadingGifs && (
                  <div style={{
                    gridColumn: '1 / span 3',
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '12px'
                  }}>
                    <div className="loading-spinner" style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '3px solid rgba(var(--primary-color-rgb, 0, 0, 0), 0.1)',
                      borderTopColor: 'var(--primary-color, #000)',
                      animation: 'spin 1s infinite linear'
                    }} />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <form 
            onSubmit={handleAddComment}
            style={{ 
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--shadow-color, #ddd)',
              borderRadius: '24px',
              padding: '0 12px',
              backgroundColor: 'var(--background-color, #f5f5f5)'
            }}>
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '12px 0',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color, #000)'
                }}
              />
              
              {/* GIF button */}
              <button
                type="button"
                onClick={() => setShowGifSelector(!showGifSelector)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: showGifSelector ? 'var(--primary-color, #3897f0)' : 'var(--text-color, #000)',
                  opacity: showGifSelector ? 1 : 0.6
                }}
              >
                <MdGif size={20} />
              </button>
            </div>
            
            {/* Post button */}
            <button
              type="submit"
              disabled={!newComment.trim() && !showGifSelector}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: newComment.trim() ? 'var(--primary-color, #3897f0)' : 'var(--shadow-color, #ccc)',
                fontWeight: 'bold',
                padding: '12px',
                cursor: newComment.trim() ? 'pointer' : 'default'
              }}
            >
              Post
            </button>
          </form>
        </div>
      </div>
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default CommentBottomSheet;