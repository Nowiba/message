importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMJuAmIAqDUXhZcGBHq8CszhJL92VaZ64",
  authDomain: "information-project1.firebaseapp.com",
  databaseURL: "https://information-project1-default-rtdb.firebaseio.com",
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
    icon: '/icons/icon-192x192.png'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
