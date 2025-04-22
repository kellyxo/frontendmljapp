import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from "./components/Login";
import Register from "./components/Register";
import JournalFeed from "./components/JournalFeed";
import PublicFeed from "./components/PublicFeed";
import Friends from "./components/Friends";
import Chat from "./components/Chat";
import NotificationsPage from "./components/NotificationsPage"; // Rename this to avoid confusion
import Profile from "./components/Profile";
import ThemeSwitcher from "./components/ThemeSwitcher";
import BottomNavigation from "./components/BottomNavigation";
import FirebaseNotifications from "./components/FirebaseNotifications";
import axios from "axios";
import "./App.css";
import "./ModernTheme.css";
import "./BeigeTheme.css"; // Import the new beige theme
import "./minimalist.css"
import HeadwayWidget from "./components/HeadwayWidget";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("currentUser")
  );
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem("theme") || "beige"
  ); // Set default to beige
  const [profilePic, setProfilePic] = useState(
    "https://i.pinimg.com/736x/8a/01/90/8a01903812976cb052c8db89eb5fbc78.jpg"
  );
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", currentUser);
      // Fetch user profile to get their profile picture
      fetchUserProfile();
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  useEffect(() => {
    // Service worker update detection and handling
    if ('serviceWorker' in navigator) {
      // Check for updates less frequently - once per hour is usually sufficient
      const updateInterval = setInterval(() => {
        navigator.serviceWorker.ready.then(async (registration) => {
          try {
            // Track when we last checked to avoid excessive checks
            const lastChecked = localStorage.getItem('swLastUpdateCheck');
            const now = Date.now();
            
            // Only check if it's been at least 1 hour since last check
            if (!lastChecked || (now - parseInt(lastChecked)) > 60 * 60 * 1000) {
              console.log("Checking for service worker updates...");
              await registration.update();
              localStorage.setItem('swLastUpdateCheck', now.toString());
            }
          } catch (err) {
            console.error("Error checking for updates:", err);
          }
        });
      }, 60 * 60 * 1000); // Check once per hour instead of every 15 minutes
      
      // The rest of your event listeners can stay the same
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'APP_UPDATED') {
          console.log('New app version available:', event.data.version);
          
          if (window.confirm('A new version of Memory Lane is available. Update now?')) {
            navigator.serviceWorker.ready.then(registration => {
              if (registration.waiting) {
                registration.waiting.postMessage({ action: 'SKIP_WAITING' });
              }
              // No need to reload immediately - the controllerchange event will handle it
            });
          }
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageHandler);
      
      // Handle service worker state changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed - page will reload');
        window.location.reload();
      });
      
      return () => {
        clearInterval(updateInterval);
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      console.log("Fetching profile for user:", currentUser);
      
      // Use path parameter for GET request
      const response = await axios.get(`https://mljapp.onrender.com/japp/getUser/${currentUser}`);
      
      console.log("Profile response:", response.data);
      
      if (response.status === 200 && response.data && response.data.pfpUrl) {
        setProfilePic(response.data.pfpUrl);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };
  const updateProfilePic = (newPicUrl) => {
    setProfilePic(newPicUrl);
  };
  useEffect(() => {
    document.documentElement.className = currentTheme;
    localStorage.setItem("theme", currentTheme);
  }, [currentTheme]);

  const handleLogout = async () => {
    try {
      // Call the logout endpoint
      await axios.put(`https://mljapp.onrender.com/japp/logout/${currentUser}`);

      // Clear user data from localStorage
      localStorage.removeItem("currentUser");

      // Update the state to trigger redirects
      setCurrentUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
      // You could show an error message to the user here
      // But still clear the local state to "force" logout even if API fails
      localStorage.removeItem("currentUser");
      setCurrentUser(null);
    }
  };

  return (

    <Router>
      <div className="app-container">
        <div className="theme-switcher-container">
          <ThemeSwitcher
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
          />
        </div>


          

        {currentUser && (
          <>
    
            {/* Profile Icon in top right */}
            <div className="profile-icon-container">
              <img
                src={profilePic}
                alt="Profile"
                className="profile-icon"
                onClick={() => (window.location.href = "/profile")}
              />
            </div>
            <HeadwayWidget />
            {/* Initialize Firebase notifications with fixed component */}
            <FirebaseNotifications currentUser={currentUser} app={app} />

            {/* Bottom Navigation */}
            <BottomNavigation currentUser={currentUser} />
            
          </>
        )}

        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                <Navigate to="/journal" />
              ) : (
                <Login setCurrentUser={setCurrentUser} />
              )
            }
          />
          <Route
            path="/register"
            element={
              currentUser ? (
                <Navigate to="/journal" />
              ) : (
                <Register setCurrentUser={setCurrentUser} />
              )
            }
          />
          <Route
            path="/journal"
            element={
              currentUser ? (
                <JournalFeed currentUser={currentUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/public-feed"
            element={
              currentUser ? (
                <PublicFeed currentUser={currentUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/friends"
            element={
              currentUser ? (
                <Friends currentUser={currentUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/chat"
            element={
              currentUser ? (
                <Chat currentUser={currentUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/notifications"
            element={
              currentUser ? (
                <NotificationsPage currentUser={currentUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/profile"
            element={
              currentUser ? (
                <Profile
                  currentUser={currentUser}
                  handleLogout={handleLogout}
                  updateProfilePic={updateProfilePic}
                />
              ) : (
                <Navigate to="/" />
              )
            }
            
          />
        </Routes>
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          type="info"
        />
      </div>
    </Router>
  );
}

export default App;