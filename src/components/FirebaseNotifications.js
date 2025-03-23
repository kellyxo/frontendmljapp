import React, { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from 'axios';

const API_URL = 'https://mljapp.onrender.com/japp';

// This component handles Firebase Cloud Messaging integration
const FirebaseNotifications = ({ currentUser, app }) => {
  useEffect(() => {
    if (!currentUser) return;
    
    const initializeFirebaseMessaging = async () => {
      try {
        // Check if the browser supports notifications
        if (typeof window === 'undefined' || !window.Notification) {
          console.log("This browser does not support desktop notifications");
          return;
        }
        
        // Initialize Firebase messaging
        const messaging = getMessaging(app);
        
        // Request permission using browser's Notification API
        let permission;
        try {
          permission = await window.Notification.requestPermission();
        } catch (error) {
          // For older browsers that don't support promises
          window.Notification.requestPermission((result) => {
            permission = result;
          });
        }
        
        if (permission === 'granted') {
          console.log("Notification permission granted");
          
          // Get FCM token
          try {
            const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY; // Replace with your actual VAPID key
            const token = await getToken(messaging, { vapidKey });
            
            if (token) {
              console.log("Token received:", token);
              
              // Register FCM token with your backend
              registerTokenWithBackend(token);
              
              // Set up message handler for foreground notifications
              onMessage(messaging, (payload) => {
                console.log('Message received:', payload);
                showForegroundNotification(payload);
              });
            } else {
              console.log("No registration token available");
            }
          } catch (fcmError) {
            console.error("Error getting FCM token:", fcmError);
          }
        } else {
          console.log("Notification permission denied");
        }
      } catch (error) {
        console.error("Error initializing Firebase messaging:", error);
      }
    };
    
    // Register the FCM token with your backend
    const registerTokenWithBackend = async (token) => {
      try {
        await axios.post(`${API_URL}/notifications/token`, null, {
          params: {
            username: currentUser,
            token: token
          }
        });
        console.log("FCM token registered with backend");
      } catch (error) {
        console.error("Error registering FCM token with backend:", error);
      }
    };
    
    // Show notification when app is in foreground
    const showForegroundNotification = (payload) => {
      const { notification } = payload;
      
      if (!notification) return;
      
      // Create and show a custom notification UI element
      // This is needed because browser notifications don't automatically show when app is open
      const notificationElement = document.createElement('div');
      notificationElement.className = 'app-notification';
      notificationElement.innerHTML = `
        <div class="notification-content">
          <h4>${notification.title || 'New Notification'}</h4>
          <p>${notification.body || ''}</p>
        </div>
        <button class="notification-close">×</button>
      `;
      
      // Style the notification
      Object.assign(notificationElement.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--text-color)',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '9999',
        minWidth: '300px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out forwards'
      });
      
      // Add animation keyframes
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
      
      // Add to DOM
      document.body.appendChild(notificationElement);
      
      // Close button handler
      const closeButton = notificationElement.querySelector('.notification-close');
      closeButton.style.position = 'absolute';
      closeButton.style.top = '10px';
      closeButton.style.right = '10px';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = 'var(--text-color)';
      
      closeButton.addEventListener('click', () => {
        notificationElement.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
          document.body.removeChild(notificationElement);
        }, 300);
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        if (document.body.contains(notificationElement)) {
          notificationElement.style.animation = 'slideOut 0.3s ease-in forwards';
          setTimeout(() => {
            if (document.body.contains(notificationElement)) {
              document.body.removeChild(notificationElement);
            }
          }, 300);
        }
      }, 5000);
    };
    
    initializeFirebaseMessaging();
  }, [currentUser, app]);
  
  return null; // This component doesn't render anything
};

export default FirebaseNotifications;