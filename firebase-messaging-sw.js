// Import Firebase scripts in service worker
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBMJuAmIAqDUXhZcGBHq8CszhJL92VaZ64",
  authDomain: "information-project1.firebaseapp.com",
  databaseURL: "https://information-project1-default-rtdb.firebaseio.com",
  projectId: "information-project1",
  storageBucket: "information-project1.firebasestorage.app",
  messagingSenderId: "1098270976013",
  appId: "1:1098270976013:web:2e1ca7602b316b6ed30d44",
  measurementId: "G-YFL07VDXCX"
};

const messaging = firebase.messaging();

// Background message handler
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  // Customize notification
  const notificationTitle = payload.notification?.title || 'Appointment Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have an upcoming appointment',
    icon: '/icons/icon-192x192.png',
    data: { 
      url: payload.notification?.click_action || '/' 
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
