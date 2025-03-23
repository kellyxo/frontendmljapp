// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

console.log('Firebase Messaging SW: Script loaded');

firebase.initializeApp({
  apiKey: "AIzaSyCXejjWN4iBlaHeu-aFR4avlYclIeGB_T4",
  authDomain: "memory-lane-1efeb.firebaseapp.com",
  projectId: "memory-lane-1efeb",
  storageBucket: "memory-lane-1efeb.firebasestorage.app",
  messagingSenderId: "497823584629",
  appId: "1:497823584629:web:14f14faa4e02548eb7833c",
  measurementId: "G-F6Z2TT2K3T"
});

console.log('Firebase Messaging SW: Firebase initialized');

const messaging = firebase.messaging();
console.log('Firebase Messaging SW: Messaging initialized');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extract notification details
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/favicon.ico', 
    badge: '/favicon.ico',
    data: payload.data,
    requireInteraction: true, // Makes notification stay until user interacts with it
    vibrate: [200, 100, 200]  // Vibration pattern for mobile devices
  };

  console.log('Attempting to show notification:', { title: notificationTitle, options: notificationOptions });
  
  // Return a promise from showNotification for proper error handling
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('Notification displayed successfully');
    })
    .catch(error => {
      console.error('Error displaying notification:', error);
    });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();
  
  // Handle the click - typically open a specific page
  const urlToOpen = new URL('/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});