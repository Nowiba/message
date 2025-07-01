importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMJuAmIAqDUXhZcGBHq8CszhJL92VaZ64",
  authDomain: "information-project1.firebaseapp.com",
  projectId: "information-project1",
  storageBucket: "information-project1.appspot.com",
  messagingSenderId: "1098270976013",
  appId: "1:1098270976013:web:2e1ca7602b316b6ed30d44"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message', payload);
  
  const notificationTitle = payload.notification?.title || 'Appointment Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .catch(err => console.error('Notification show error:', err));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
