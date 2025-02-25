import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://mljapp.onrender.com/japp';

const Login = ({ setCurrentUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await axios.post(`${API_URL}/login`, {
        username: formData.username,
        password: formData.password
      });

      if (response.status === 200) {
        setCurrentUser(formData.username);
        console.log("Login successful");
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