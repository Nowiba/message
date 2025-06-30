// Firebase service worker for handling push notifications
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyD7XWXLLnTgB20snEibDk7-1qhye7DLYZg",
  authDomain: "information-project1.firebaseapp.com",
  databaseURL: "https://information-project1-default-rtdb.firebaseio.com",
  projectId: "information-project1",
  storageBucket: "information-project1.firebasestorage.app",
  messagingSenderId: "1098270976013",
  appId: "1:1098270976013:web:2e8e6919576ba984d30d44",
  measurementId: "G-PTMWBR2Y01"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/4117/4117732.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://your-website.com/appointments') // Replace with your URL
  );
});
