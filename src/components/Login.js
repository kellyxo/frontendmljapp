import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getMessaging, getToken } from "firebase/messaging";

const API_URL = 'https://mljapp.onrender.com/japp';

const Login = ({ setCurrentUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fcmToken: '' // Add fcmToken to form data
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get FCM token on component mount
  useEffect(() => {
    const getFCMToken = async () => {
      try {
        if (typeof window !== 'undefined' && window.Notification) {
          // Request notification permission
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            // Get FCM token from Firebase
            const messaging = getMessaging();
            const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY; // Replace with your actual VAPID key
            
            const token = await getToken(messaging, { vapidKey });
            if (token) {
              console.log("FCM Token obtained:", token);
              setFormData(prev => ({ ...prev, fcmToken: token }));
            } else {
              console.log("No FCM token available");
            }
          }
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
      }
    };

    getFCMToken();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Include FCM token in login request
      const response = await axios.post(`${API_URL}/login`, {
        username: formData.username,
        password: formData.password,
        fcmToken: formData.fcmToken // Send FCM token to backend
      });
      
      if (response.status === 200) {
        localStorage.setItem('authToken', response.data.token);
        setCurrentUser(formData.username);
        console.log("Login successful with FCM token registration");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h1 className="mb-4">Memory Lane <i className="flower-icon">🌸</i></h1>
      <h2>Login <i className="flower-icon">🌼</i></h2>
      
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            className="form-control"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button 
          type="submit" 
          className={`btn-primary bounce ${loading ? 'disabled' : ''}`} 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/register" className="btn-link">
          Don't have an account? Register here
        </Link>
      </div>
    </div>
  );
};

export default Login;