import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import JournalFeed from './components/JournalFeed';
import Profile from './components/Profile';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';
import './ModernTheme.css';


function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentUser'));
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.className = currentTheme;
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <div className="theme-switcher-container">
          <ThemeSwitcher currentTheme={currentTheme} setCurrentTheme={setCurrentTheme} />
        </div>
        
        {currentUser && (
          <div className="profile-icon-container">
            <img 
              src="https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg" 
              alt="Profile" 
              className="profile-icon"
              onClick={() => window.location.href = "/profile"}
            />
          </div>
        )}

        <Routes>
          <Route path="/" element={
            currentUser ? <Navigate to="/journal" /> : <Login setCurrentUser={setCurrentUser} />
          } />
          <Route path="/register" element={
            currentUser ? <Navigate to="/journal" /> : <Register setCurrentUser={setCurrentUser} />
          } />
          <Route path="/journal" element={
            currentUser ? <JournalFeed currentUser={currentUser} /> : <Navigate to="/" />
          } />
          <Route path="/profile" element={
            currentUser ? <Profile currentUser={currentUser} handleLogout={handleLogout} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;