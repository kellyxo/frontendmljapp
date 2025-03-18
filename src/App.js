import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import JournalFeed from './components/JournalFeed';
import Profile from './components/Profile';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';
import './ModernTheme.css';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXejjWN4iBlaHeu-aFR4avlYclIeGB_T4",
  authDomain: "memory-lane-1efeb.firebaseapp.com",
  projectId: "memory-lane-1efeb",
  storageBucket: "memory-lane-1efeb.firebasestorage.app",
  messagingSenderId: "497823584629",
  appId: "1:497823584629:web:14f14faa4e02548eb7833c",
  measurementId: "G-F6Z2TT2K3T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


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