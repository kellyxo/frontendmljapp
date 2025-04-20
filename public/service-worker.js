// public/service-worker.js

const APP_VERSION = 'v1.7';

// Names for our caches with versioning
const STATIC_CACHE = `memorylane-static-${APP_VERSION}`;
const DATA_CACHE = `memorylane-data-${APP_VERSION}`;
const IMAGE_CACHE = `memorylane-images-${APP_VERSION}`;

// Lists of assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add paths to your CSS and JS files
];

// Installation event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing version', APP_VERSION);
  
  // Wait until the caching is complete
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Force service worker activation
  );
});

// Activation event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating version', APP_VERSION);
  
  event.waitUntil(
    // Get all cache names
    caches.keys().then(cacheNames => {
      return Promise.all([
        // Clean up old caches
        ...cacheNames.map(cacheName => {
          // If this cache is not one of our current ones, delete it
          if (
            cacheName.includes('memorylane-') && 
            !cacheName.includes(APP_VERSION)
          ) {
            console.log('Service Worker: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        
        // Take control immediately
        self.clients.claim(),
        
        // Send update notification to clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'APP_UPDATED',
              version: APP_VERSION
            });
          });
        })
      ]);
    })
  );
});

// Message handler for update control
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only attempt to cache GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  if (url.hostname === 'api.giphy.com') {
    // Pass through to network without caching or intercepting
    event.respondWith(fetch(event.request));
    return;
  }
  
  // HTML and App Shell - network first for faster updates
  if (url.pathname === '/' || 
      url.pathname.endsWith('.html') || 
      url.pathname.includes('/static/js/')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  }
  // API requests - network first with cache fallback
  else if (event.request.url.includes('/japp/')) {
    console.log('Service Worker: Fetching API data', event.request.url);
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If we got a valid response, clone it and store in cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to return from cache
          console.log('Service Worker: Network failed, returning from cache');
          return caches.match(event.request);
        })
    );
  } 
  // Images - cache first for performance
  else if (
    event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/) ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached response if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then(response => {
          // Make sure we got a valid response
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Cache the fetched response
          const responseClone = response.clone();
          caches.open(IMAGE_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        });
      })
    );
  } 
  // Other static assets - cache first with network update
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached response if available
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Cache the new response for next time
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        
        // Return the cached version immediately, but update cache for next time
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Background sync event - process pending operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal-entries') {
    console.log('Service Worker: Syncing journal entries');
    event.waitUntil(syncPendingOperations());
  }
});

// Process pending operations from IndexedDB
async function syncPendingOperations() {
  try {
    // Open your indexed DB and get pending operations
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('MemoryLaneDB', 1);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
    
    // Get pending operations
    const tx = db.transaction('pendingOperations', 'readonly');
    const store = tx.objectStore('pendingOperations');
    const pendingOps = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
    
    console.log('Service Worker: Found pending operations:', pendingOps.length);
    
    if (pendingOps.length === 0) {
      return;
    }
    
    // Process each pending operation
    for (const op of pendingOps) {
      try {
        let response;
        
        // Handle different types of operations
        if (op.type === 'CREATE') {
          // For create operations
          const formData = new FormData();
          
          // Add the JSON data
          formData.append('entryData', new Blob([JSON.stringify(op.data)], {
            type: 'application/json'
          }));
          
          // Add the image if exists
          if (op.image) {
            formData.append('file', op.image);
          }
          
          response = await fetch(op.url, {
            method: 'POST',
            body: formData
          });
        } 
        else if (op.type === 'DELETE') {
          // For delete operations
          response = await fetch(op.url, {
            method: 'DELETE'
          });
        }
        
        if (response && response.ok) {
          // If successful, remove from pending operations
          const deleteTx = db.transaction('pendingOperations', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingOperations');
          deleteStore.delete(op.id);
          
          console.log('Service Worker: Successfully synced operation:', op.id);
        } else {
          console.log('Service Worker: Failed to sync operation:', op.id);
        }
      } catch (error) {
        console.error('Service Worker: Error processing operation:', op.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error syncing operations:', error);
  }
}

// Add notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received', event);
  
  event.notification.close();
  
  // This will focus on an open window or open a new one
  const urlToOpen = new URL('/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if a window/tab is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window if none are open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});