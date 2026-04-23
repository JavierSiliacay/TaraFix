// TaraFix Background Push & PWA Worker

// This is where you can add custom service worker logic
self.addEventListener('push', function(event: any) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/logo.png',
                badge: '/logo.png',
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
                (self as any).registration.showNotification(data.title || 'New Message', options)
            );
        } catch (e) {
            console.error('Push event error:', e);
        }
    }
});

self.addEventListener('notificationclick', function(event: any) {
    event.notification.close();
    event.waitUntil(
        (self as any).clients.openWindow(event.notification.data.url)
    );
});
