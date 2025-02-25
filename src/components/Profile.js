import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8080/japp';

const Profile = ({ currentUser, handleLogout }) => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword) {
      setMessage('Please enter a new password');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.patch(
        `${API_URL}/changePassword${currentUser}`, 
        null, 
        { params: { newPasswoord: newPassword } }
      );

      if (response.status === 200) {
        setMessage('Password changed successfully!');
        setNewPassword('');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.delete(`${API_URL}/delete`, {
        data: { username: currentUser }
      });

      if (response.status === 200) {
        handleLogout();
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage('Failed to delete account. Please try again.');
      setDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h1 className="mb-4">Profile Settings <i className="flower-icon">🌸</i></h1>
      
      {message && (
        <div 
          className={`message ${message.includes('success') ? 'success' : 'error'}`}
          style={{ 
            color: message.includes('success') ? 'green' : 'red', 
            marginBottom: '20px',
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: message.includes('success') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
          }}
        >
          {message}
        </div>
      )}
      
      <div className="profile-section">
        <h2>Account Information <i className="flower-icon">🌷</i></h2>
        <p><strong>Username:</strong> {currentUser}</p>
      </div>
      
      <div className="profile-section" style={{ marginTop: '30px' }}>
        <h2>Change Password <i className="flower-icon">🌼</i></h2>
        <div className="form-group">
          <input 
            type="password" 
            className="form-control"
            placeholder="New Password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button 
          className={`btn-primary bounce ${loading ? 'disabled' : ''}`}
          onClick={handleChangePassword}
          disabled={loading}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
      
      <div className="profile-section" style={{ marginTop: '30px' }}>
        <h2>Danger Zone <i className="flower-icon">🌺</i></h2>
        <button 
          className={`btn-danger bounce ${loading ? 'disabled' : ''}`}
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {deleteConfirm 
            ? 'Click again to confirm deletion' 
            : loading 
              ? 'Deleting...' 
              : 'Delete Account'
          }
        </button>
        <p className="text-muted" style={{ marginTop: '10px' }}>
          This action is permanent and will delete all your entries.
        </p>
      </div>
      
      <div className="profile-section" style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          className="btn-primary"
          onClick={() => navigate('/journal')}
        >
          Back to Journal
        </button>
        <button 
          className="btn-tertiary"
          onClick={handleLogout}
          style={{ 
            marginLeft: '15px', 
            backgroundColor: 'transparent',
            color: 'var(--primary-color)',
            border: '2px solid var(--primary-color)'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;