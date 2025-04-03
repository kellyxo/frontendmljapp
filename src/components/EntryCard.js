import React from 'react';
import { HeartFill, Globe, LockFill, ThreeDots, TrashFill } from 'react-bootstrap-icons';

// Reusable EntryCard component that can be used in both JournalFeed and PublicFeed
const EntryCard = ({ 
  entry, 
  currentUser,
  isPublicFeed,
  expandedEntryId,
  menuVisibleId,
  toggleExpand,
  setMenuVisibleId,
  handleLike,
  makeEntryPrivate,
  handleDeleteEntry,
  getUserProfilePic,
  handleToggleStatus,
  formatDate 
}) => {
  const isExpanded = expandedEntryId === entry.id;
  const isOwner = entry.username === currentUser;
  
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
              {isOwner && (
                <>
                  {/* Toggle private/public status */}
                  <div 
                    onClick={() => {
                      if (isPublicFeed) {
                        makeEntryPrivate(entry.id);
                      } else {
                        handleToggleStatus(entry.id, entry.publicStatus);
                      }
                      setMenuVisibleId(null);
                    }}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(var(--primary-color-rgb), 0.1)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {entry.publicStatus ? 
                      <>
                        <LockFill style={{ marginRight: '8px' }} /> Make Private
                      </> : 
                      <>
                        <Globe style={{ marginRight: '8px' }} /> Make Public
                      </>
                    }
                  </div>
                  
                  {/* Delete option - only in JournalFeed */}
                  {!isPublicFeed && (
                    <div 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
                          handleDeleteEntry(entry.id);
                        }
                        setMenuVisibleId(null);
                      }}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(var(--primary-color-rgb), 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#e74c3c'
                      }}
                    >
                      <TrashFill style={{ marginRight: '8px' }} /> Delete
                    </div>
                  )}
                </>
              )}
              
              {/* Cancel option always present */}
              <div 
                onClick={() => setMenuVisibleId(null)}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
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
        {(entry.imageUrl || entry.localImageUrl) && (
          <div style={{ position: 'relative' }}>
            <img 
              src={entry.localImageUrl || entry.imageUrl} 
              alt="Journal Entry" 
              style={{ 
                width: '100%', 
                maxHeight: isExpanded ? '900px' : '300px',
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
          {/* Like button - only shown in PublicFeed */}
          {isPublicFeed && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLike(entry.id);
              }}
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
          )}
          
          {/* Pending indicator for JournalFeed */}
          {!isPublicFeed && entry.isPending && (
            <span style={{
              fontSize: '0.8rem',
              backgroundColor: 'rgba(255, 152, 0, 0.2)',
              color: '#E65100',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              Pending
            </span>
          )}
        </div>
      </div>
      
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

export default EntryCard;