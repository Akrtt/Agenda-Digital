// firebase-messaging-sw.js
// Service Worker para FCM (debe estar en la raíz)

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDT76OdtQM6UUPj4k6gv7O9Ow7BwH6dEWM",
  authDomain: "calendario-ea7e0.firebaseapp.com",
  projectId: "calendario-ea7e0",
  storageBucket: "calendario-ea7e0.firebasestorage.app",
  messagingSenderId: "1032562955831",
  appId: "1:1032562955831:web:050e5438ac017c28f251b2",
  measurementId: "G-L00QYFD1MJ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificación recibida en background:', payload);
  const notificationTitle = payload.notification.title || 'Notificación Agenda';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: payload.notification.icon || '/fondopantalla1.png',
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
