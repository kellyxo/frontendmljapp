import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  JournalText, 
  Globe, 
  ChatText, 
  People, 
  Bell 
} from 'react-bootstrap-icons';


const API_URL = 'https://mljapp.onrender.com/japp';

const BottomNavigation = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch unread notifications count
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get(`/notifications/${currentUser}/unread/count`);
        if (response.status === 200) {
          setUnreadCount(response.data);
        }
      } catch (error) {
        console.error('Error fetching unread notifications count:', error);
      }
    };
    
    // Fetch immediately
    fetchUnreadCount();
    
    // Then set interval to check periodically
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser]);
  
  // Navigation items
  const navItems = [
    { path: '/journal', icon: JournalText, label: 'Journal' },
    { path: '/public-feed', icon: Globe, label: 'Feed' },
    { path: '/chat', icon: ChatText, label: 'Chat' },
    { path: '/friends', icon: People, label: 'Friends' },
    { path: '/notifications', icon: Bell, label: 'Notifications', count: unreadCount }
  ];
  
  return (
    <div className="bottom-navigation" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: 'var(--card-bg)',
      padding: '10px 0',
      boxShadow: '0 -2px 10px var(--shadow-color)',
      zIndex: 1000
    }}>
      {navItems.map((item) => (
        <div 
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            paddingTop: '5px',
            paddingBottom: '5px',
            flex: 1,
            color: location.pathname === item.path ? 'var(--primary-color)' : 'var(--text-color)',
            opacity: location.pathname === item.path ? 1 : 0.7,
            transition: 'all 0.3s ease'
          }}
        >
          <div className="icon" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
          {React.createElement(item.icon, { size: 24 })}
          </div>
          <div className="label" style={{ fontSize: '0.7rem', textAlign: 'center' }}>
            {item.label}
          </div>
          
          {/* Notification badge */}
          {item.count > 0 && (
            <div style={{
              position: 'absolute',
              top: '0',
              right: '25%',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {item.count > 9 ? '9+' : item.count}
            </div>
          )}
          
          {/* Active indicator */}
          {location.pathname === item.path && (
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)'
            }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default BottomNavigation;