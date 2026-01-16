// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyBBpRh7B5qZdyd66Q4KxsUBhH2qcwshI7g",
    authDomain: "funideaithink-3206d.firebaseapp.com",
    databaseURL: "https://funideaithink-3206d-default-rtdb.firebaseio.com",
    projectId: "funideaithink-3206d",
    storageBucket: "funideaithink-3206d.firebasestorage.app",
    messagingSenderId: "475113847634",
    appId: "1:475113847634:web:ec38afbcb33b5bde57588b",
    measurementId: "G-9PC37HF1MJ"
};

// Инициализация Firebase в Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Обработка фоновых сообщений
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Получено фоновое сообщение:', payload);
    
    const notificationTitle = payload.data?.title || 'NeonChat';
    const notificationOptions = {
        body: payload.data?.body || 'Новое сообщение',
        icon: payload.data?.icon || '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'neonchat-push',
        data: payload.data,
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: 'Открыть чат'
            },
            {
                action: 'mark_read',
                title: 'Прочитано'
            }
        ]
    };
    
    // Показываем уведомление
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка кликов по уведомлению
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Клик по уведомлению:', event);
    
    event.notification.close();
    
    // Открываем/фокусируем окно чата
    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true})
            .then(function(clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === self.location.origin + '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
    
    // Обработка действий в уведомлении
    if (event.action === 'open') {
        // Открываем чат
        clients.openWindow('/').then(function(windowClient) {
            // Можно отправить сообщение об открытии конкретного чата
        });
    } else if (event.action === 'mark_read') {
        // Помечаем как прочитанное (отправляем на сервер)
        console.log('Сообщение помечено как прочитанное');
    }
});

// Регистрируем кастомные события
self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('[firebase-messaging-sw.js] Подписка изменена:', event);
    
    event.waitUntil(
        messaging.getToken().then(function(token) {
            if (!token) {
                console.log('Нет токена после обновления подписки');
                return;
            }
            
            // Отправляем новый токен на сервер
            return fetch('/update-push-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    action: 'update'
                })
            });
        })
    );
});
