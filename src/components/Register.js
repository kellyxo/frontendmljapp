import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMessaging, getToken } from "firebase/messaging";

const API_URL = 'https://mljapp.onrender.com/japp';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fcmToken: '' // Add fcmToken to form data
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
            const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY
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
      const response = await axios.post(`${API_URL}/create/User`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fcmToken: formData.fcmToken // Send FCM token to backend
      });

      if (response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h1 className="mb-4">Memory Lane <i className="flower-icon">🌸</i></h1>
      <h2>Register <i className="flower-icon">🌺</i></h2>
      
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {success && (
        <div className="success-message" style={{ color: 'green', marginBottom: '15px' }}>
          Registration successful! Redirecting to login...
        </div>
      )}
      
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
            type="email"
            className="form-control"
            name="email"
            placeholder="Email"
            value={formData.email}
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
          disabled={loading || success}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/" className="btn-link">
          Already have an account? Login here
        </Link>
      </div>
    </div>
  );
};

export default Register;