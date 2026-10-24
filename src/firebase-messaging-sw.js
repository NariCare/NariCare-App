// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyCEy2gdTUlAxXOmeL2hLxBSk6BF38RB6dU",
  authDomain: "naricare-app.firebaseapp.com",
  projectId: "naricare-app",
  storageBucket: "naricare-app.firebasestorage.app",
  messagingSenderId: "382548282570",
  appId: "1:382548282570:web:3d735a09a72507813ef833"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'NariCare Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/assets/icon/favicon.png', // Adjust path as needed
    badge: '/assets/icon/favicon.png', // Adjust path as needed
    tag: payload.data?.type || 'general',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  // Handle different notification types
  const data = event.notification.data || {};
  let urlToOpen = '/';
  
  switch (data.type) {
    case 'consultation':
      urlToOpen = `/consultation/${data.consultationId}`;
      break;
    case 'chat':
      urlToOpen = `/tabs/chat`;
      break;
    case 'general':
    default:
      urlToOpen = '/tabs/dashboard';
      break;
  }
  
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is already open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});