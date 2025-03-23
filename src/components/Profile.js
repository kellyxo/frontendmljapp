import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://mljapp.onrender.com/japp';

const Profile = ({ currentUser, handleLogout, updateProfilePic }) => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [userProfile, setUserProfile] = useState({
    username: currentUser,
    email: '',
    pfpUrl: ''
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching profile for user:", currentUser);
        if (!currentUser) {
          console.error("currentUser is not set. Value:", currentUser);
          return; // Don't make the API call if currentUser isn't available
        }
        
        const response = await axios.get(`${API_URL}/getUser/${currentUser}`);
        
        console.log("Profile response:", response.data);
        
        if (response.status === 200) {
          setUserProfile(response.data);
          if (response.data.pfpUrl) {
            setPreviewUrl(response.data.pfpUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!profileImage) {
      setMessage('Please select an image first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', profileImage);

      const response = await axios.post(
        `${API_URL}/uploadPfp/${currentUser}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.status === 200) {
        setMessage('Profile picture updated successfully!');
        // Update preview with new URL from server
        setPreviewUrl(response.data);
        
        // Update userProfile state with new pfpUrl
        setUserProfile({
          ...userProfile,
          pfpUrl: response.data
        });
        
        // Update profile pic in parent component using the passed function
        updateProfilePic(response.data);
        
        // Clear the file input
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessage('Failed to upload profile picture. Please try again.');
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
      
      {/* Profile Picture Section */}
      <div className="profile-section" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div className="profile-picture-container" style={{ 
          position: 'relative',
          width: '150px',
          height: '150px',
          marginBottom: '15px'
        }}>
          <img 
            src={previewUrl || userProfile.pfpUrl || "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"} 
            alt="Profile" 
            style={{ 
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--primary-color)'
            }}
          />
          <label htmlFor="profile-upload" style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px var(--shadow-color)',
            fontSize: '22px'
          }}>
            <span>+</span>
          </label>
          <input 
            type="file" 
            id="profile-upload" 
            accept="image/*" 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
          />
        </div>
        
        {profileImage && (
          <button 
            className="btn-primary"
            onClick={handleUploadProfilePicture}
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            {loading ? 'Uploading...' : 'Save New Profile Picture'}
          </button>
        )}
        
        <p style={{ marginTop: '10px', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Click the + button to change your profile picture
        </p>
      </div>
      
      <div className="profile-section">
        <h2>Account Information <i className="flower-icon">🌷</i></h2>
        <p><strong>Username:</strong> {userProfile.username}</p>
        {userProfile.email && <p><strong>Email:</strong> {userProfile.email}</p>}
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
          
        <div className="profile-section" style={{ marginTop: '30px' }}>
          <button 
            className={`btn-primary bounce ${loading ? 'disabled' : ''}`}
            onClick={handleLogout}
            disabled={loading}
          >
            Log out
          </button>
        </div>
      </div>
      
      <div style={{ height: '70px' }}></div> {/* Space for bottom navigation */}
    </div>
  );
};

export default Profile;