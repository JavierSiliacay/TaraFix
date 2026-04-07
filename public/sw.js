// TaraFix Background Push Service Worker
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon.png', // Ensure you have this icon in public/
            badge: '/icon.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/profile'
            },
            actions: [
                {
                    action: 'open',
                    title: 'View Message'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'New Message', options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
