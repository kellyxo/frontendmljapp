// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCXejjWN4iBlaHeu-aFR4avlYclIeGB_T4",
  authDomain: "memory-lane-1efeb.firebaseapp.com",
  projectId: "memory-lane-1efeb",
  storageBucket: "memory-lane-1efeb.firebasestorage.app",
  messagingSenderId: "497823584629",
  appId: "1:497823584629:web:14f14faa4e02548eb7833c",
  measurementId: "G-F6Z2TT2K3T"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});