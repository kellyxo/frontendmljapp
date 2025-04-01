import React, { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from 'axios';
import { toast } from 'react-toastify'; // Import toast

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
            const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
            const token = await getToken(messaging, { vapidKey });
            
            if (token) {
              console.log("Token received:", token);
              
              // Register FCM token with your backend
              registerTokenWithBackend(token);
              
              // Set up message handler for foreground notifications
              onMessage(messaging, (payload) => {
                console.log('Message received:', payload);
                if (document.visibilityState === 'visible') {
                  showForegroundNotification(payload);
                }
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
      
      // Use toast notification since it works on mobile
      toast.info(
        <div>
          <div style={{ fontWeight: 'bold' }}>{notification.title || 'New Notification'}</div>
          <div>{notification.body || ''}</div>
        </div>, 
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          // You can customize toast appearance to match your app's style
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-color)'
          }
        }
      );
    };
    
    initializeFirebaseMessaging();
  }, [currentUser, app]);
  
  return null; // This component doesn't render anything
};

export default FirebaseNotifications;
