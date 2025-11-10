// Service worker for push notifications
console.log('Service Worker: Script loaded');

self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
});

self.addEventListener('push', function(event) {
  console.log('🔔 Service Worker: Push event received!', event);
  console.log('🔔 Service Worker: Event data:', event.data);
  console.log('🔔 Service Worker: Event data type:', event.data ? event.data.type : 'no data');
  
  let notificationData = {
    title: 'Notification',
    body: 'You have a new notification',
    icon: '/icon.png',
    badge: '/badge.png',
    data: {}
  };

  // Try to parse the push data
  if (event.data) {
    try {
      // Try json() first
      const data = event.data.json();
      console.log('🔔 Service Worker: Parsed push data (JSON):', data);
      
      // Handle different payload formats
      if (data.title) {
        notificationData.title = data.title;
      }
      if (data.body) {
        notificationData.body = data.body;
      }
      if (data.icon) {
        notificationData.icon = data.icon;
      }
      if (data.data) {
        notificationData.data = data.data;
      }
    } catch (e) {
      console.log('🔔 Service Worker: JSON parse failed, trying text:', e);
      // If json() fails, try text()
      try {
        const text = event.data.text();
        console.log('🔔 Service Worker: Push data as text:', text);
        if (text) {
          try {
            const parsed = JSON.parse(text);
            console.log('🔔 Service Worker: Parsed text as JSON:', parsed);
            notificationData.title = parsed.title || notificationData.title;
            notificationData.body = parsed.body || notificationData.body;
          } catch (e2) {
            console.log('🔔 Service Worker: Text is not JSON, using as body');
            notificationData.body = text;
          }
        }
      } catch (e3) {
        console.error('🔔 Service Worker: Error getting text:', e3);
        // If both fail, use default
        notificationData.body = 'You have a new notification (data unavailable)';
      }
    }
  } else {
    console.log('🔔 Service Worker: No data in push event, using defaults');
  }

  console.log('🔔 Service Worker: Final notification data:', notificationData);

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    requireInteraction: true, // Keep notification visible until user interacts
    tag: 'push-notification', // Use same tag so notifications replace each other
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    silent: false, // Make sure it's not silent
    renotify: true, // Re-notify even if tag is the same
  };

  console.log('🔔 Service Worker: Calling showNotification with:', notificationData.title, options);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, options),
      // Also send a message to all clients to show in-page notification
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NOTIFICATION',
            title: notificationData.title,
            body: notificationData.body
          });
        });
      })
    ])
      .then(() => {
        console.log('✅ Service Worker: Notification shown successfully!');
        console.log('✅ Service Worker: Clients notified:', self.clients.matchAll().then(c => c.length));
      })
      .catch((error) => {
        console.error('❌ Service Worker: Error showing notification:', error);
        console.error('❌ Service Worker: Error details:', error.message, error.stack);
        // Try showing a simpler notification as fallback
        return self.registration.showNotification('Notification', {
          body: notificationData.body || 'You have a new notification',
          tag: 'fallback',
          requireInteraction: true
        });
      })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

self.addEventListener('message', function(event) {
  console.log('Service Worker: Message received:', event.data);
});

