import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://mljapp.onrender.com/japp';

const NotificationsPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      
      // Setup interval to check for new notifications
      const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/${currentUser}`);
      
      if (response.status === 200) {
        // Sort notifications by date, newest first
        const sortedNotifications = response.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNotifications(sortedNotifications);
        
        // Check if there are any unread notifications
        const hasUnreadNotifications = sortedNotifications.some(notification => !notification.read);
        setHasUnread(hasUnreadNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      
      // Update notification in the state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.notificationId === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/${currentUser}/read/all`);
      
      // Update all notifications in the state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      setHasUnread(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      
      // Remove from state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.notificationId !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  // Handle notification click based on type
  const handleNotificationClick = (notification) => {
    // Mark as read first
    markAsRead(notification.notificationId);
    
    // Navigate based on notification type
    if (notification.type === 'FRIEND_REQUEST' && notification.friendship) {
      navigate('/friends');
    } else if (notification.type === 'MESSAGE' && notification.chat) {
      navigate('/chat');
    } else if (notification.type === 'JOURNAL' && notification.journalEntry) {
      navigate('/public-feed');
    }
  };
  
  return (
    <div className="container fade-in">
      <h1 className="mb-4">Notifications <i className="flower-icon">🔔</i></h1>
      
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
      
      <div className="notifications-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2>{notifications.length} Notifications</h2>
        {hasUnread && (
          <button 
            className="btn-primary"
            onClick={markAllAsRead}
            style={{ padding: '5px 10px', fontSize: '14px' }}
          >
            Mark All as Read
          </button>
        )}
      </div>
      
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
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-notifications" style={{ textAlign: 'center', padding: '20px' }}>
          <p>You don't have any notifications yet.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div 
              key={notification.notificationId} 
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              style={{
                backgroundColor: notification.read ? 'var(--card-bg)' : 'rgba(var(--primary-color-rgb), 0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '10px',
                position: 'relative',
                cursor: 'pointer',
                boxShadow: '0 2px 4px var(--shadow-color)'
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <div className="notification-message" style={{ marginBottom: '5px' }}>
                  {notification.contentMessage}
                </div>
                <div className="notification-time" style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-color)',
                  opacity: 0.7
                }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
              
              <button 
                className="delete-notification"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.notificationId);
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-color)',
                  opacity: 0.5,
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ×
              </button>
              
              {!notification.read && (
                <div className="unread-indicator" style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)'
                }} />
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default NotificationsPage;