// ========================================
// NOTIFICATIONS - Push / browser notifications module
// ========================================

window.VIP = window.VIP || {};

VIP.notifications = (function () {

    // ---- Service Worker (no-op; registration handled in index.html) ----

    async function registerUserServiceWorker() {
        // No-op: registration is done in index.html inline script
    }

    // ---- Browser notification permission ----

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
            });
        }
    }

    function showBrowserNotification(title, body, icon = '/favicon.ico') {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: icon,
                    badge: icon,
                    tag: 'new-message',
                    requireInteraction: false,
                    silent: false
                });
                notification.onclick = () => { window.focus(); notification.close(); };
                setTimeout(() => notification.close(), 5000);
            } catch (e) {
            }
        }
    }

    // ---- Audio notification ----

    // ⚠️ Por qué esto es así (#273, owner: "el usuario no recibe el sonido"):
    // en Android/iPhone un AudioContext creado FUERA de un gesto del usuario
    // nace 'suspended' y todo lo que se toque en él es MUDO. Antes el contexto
    // se creaba recién al llegar el mensaje (sin gesto) y nunca se llamaba
    // resume() → silencio. Ahora: el contexto se crea y se DESBLOQUEA con el
    // primer toque/tecla del usuario en la página (listeners one-shot en
    // captura), y antes de sonar siempre se intenta resume(). Un solo contexto
    // compartido (VIP.state.notificationAudioContext) — ui.js._playChime lo reusa.
    let _unlockBound = false;
    function _ensureCtx() {
        if (VIP.state.notificationAudioContext) return VIP.state.notificationAudioContext;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) VIP.state.notificationAudioContext = new AC();
        } catch (e) {}
        return VIP.state.notificationAudioContext;
    }
    function _unlockOnGesture() {
        if (_unlockBound) return;
        _unlockBound = true;
        const evs = ['pointerdown', 'touchend', 'keydown', 'click'];
        const unlock = function () {
            const ctx = _ensureCtx();
            if (!ctx) return;
            try {
                const p = ctx.resume();
                if (p && p.then) p.then(function () {
                    if (ctx.state === 'running') evs.forEach(function (e) { document.removeEventListener(e, unlock, true); });
                }).catch(function () {});
            } catch (e) {}
        };
        evs.forEach(function (e) { document.addEventListener(e, unlock, { capture: true, passive: true }); });
    }
    function initNotificationSound() {
        _ensureCtx();
        _unlockOnGesture();
    }

    function _beep(ctx) {
        // Dos tonos ascendentes cortos (mismo timbre que ui.js._playChime).
        [[880, 0], [1320, 0.14]].forEach(function (p) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = p[0];
            const t = ctx.currentTime + p[1];
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.36);
        });
    }

    function playNotificationSound() {
        const ctx = _ensureCtx();
        _unlockOnGesture();
        if (!ctx) return;
        try {
            if (ctx.state === 'suspended') {
                // Si el usuario ya tocó la página alguna vez, resume() funciona
                // acá aunque no estemos en un gesto; si no, queda mudo hasta el
                // primer toque (límite del celular, no nuestro).
                const p = ctx.resume();
                if (p && p.then) { p.then(function () { try { _beep(ctx); } catch (e) {} }).catch(function () {}); return; }
            }
            _beep(ctx);
        } catch (e) {}
        // Vibración corta en Android como refuerzo (iOS la ignora).
        try { if (navigator.vibrate) navigator.vibrate(120); } catch (e) {}
    }

    // Enganchar los listeners de desbloqueo apenas carga el módulo: cualquier
    // toque posterior (login, abrir el casino, escribir) deja el audio listo.
    try { _unlockOnGesture(); } catch (e) {}

    // ---- FCM token registration ----
    // This delegates to the unified window.sendFcmTokenAfterLogin defined in
    // index.html (which handles dedup, retry, and rotation). If that hasn't
    // loaded yet, fall back to a simple one-shot attempt.
    async function sendFcmTokenAfterLogin() {
        // window.sendFcmTokenAfterLogin is set by index.html inline script
        // and is the canonical implementation with dedup/retry/rotation.
        if (typeof window.sendFcmTokenAfterLogin === 'function' &&
            window.sendFcmTokenAfterLogin !== sendFcmTokenAfterLogin) {
            return window.sendFcmTokenAfterLogin();
        }

        // Fallback: simple one-shot if inline script hasn't loaded yet
        const fcmToken  = localStorage.getItem('fcmToken');
        const authToken = localStorage.getItem('userToken');


        if (fcmToken && authToken) {
            try {
                const response = await fetch(`${VIP.config.API_URL}/api/notifications/register-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ fcmToken: fcmToken })
                });

                const data = await response.json();
                if (data.success) {
                } else {
                }
            } catch (error) {
            }
        }
    }

    return {
        registerUserServiceWorker,
        requestNotificationPermission,
        showBrowserNotification,
        initNotificationSound,
        playNotificationSound,
        sendFcmTokenAfterLogin
    };

})();

// Window alias so index.html inline script can still call registerUserServiceWorker()
window.registerUserServiceWorker = VIP.notifications.registerUserServiceWorker;
// sendFcmTokenAfterLogin may be overridden by index.html inline script (intentional)
window.sendFcmTokenAfterLogin    = VIP.notifications.sendFcmTokenAfterLogin;
