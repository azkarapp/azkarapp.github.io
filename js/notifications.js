// js/notifications.js

import { app } from './app.js';

export const notifications = {
    settings: {
        morning: { enabled: false, time: '06:00', label: 'أذكار الصباح', message: 'حان الآن موعد قراءة أذكار الصباح ☀️' },
        evening: { enabled: false, time: '16:00', label: 'أذكار المساء', message: 'حان الآن موعد قراءة أذكار المساء 🌙' },
        sleep: { enabled: false, time: '21:00', label: 'أذكار النوم', message: 'لا تنسَ قراءة أذكار النوم قبل أن تغفو 😴' }
    },

    // للتحقق من تكرار الإشعارات في نفس اليوم
    lastNotificationCheckKey: null,

    init() {
        if (!('Notification' in window)) return;
        this.loadSettings();
        this.bindUI();
        this.startChecker();
    },

    loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('azkar_notifications'));
            if (saved) {
                if (saved.morning) this.settings.morning = { ...this.settings.morning, ...saved.morning };
                if (saved.evening) this.settings.evening = { ...this.settings.evening, ...saved.evening };
                if (saved.sleep) this.settings.sleep = { ...this.settings.sleep, ...saved.sleep };
            }
        } catch (e) {}
        this.updateUI();
    },

    saveSettings() {
        localStorage.setItem('azkar_notifications', JSON.stringify(this.settings));
        if (app && typeof app.showToast === 'function') {
            app.showToast('تم حفظ أوقات التنبيه 🔔', 'success');
        }
    },

    bindUI() {
        const saveBtn = document.getElementById('saveNotificationsBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.handleSaveClick());
    },

    updateUI() {
        ['morning', 'evening', 'sleep'].forEach(key => {
            const toggle = document.getElementById(`notify${key.charAt(0).toUpperCase() + key.slice(1)}`);
            const timeInput = document.getElementById(`time${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (toggle) toggle.checked = this.settings[key].enabled;
            if (timeInput) timeInput.value = this.settings[key].time;
        });
    },

    async handleSaveClick() {
        // التأكد من وجود Notification API
        if (!('Notification' in window)) {
            if (app) app.showToast('المتصفح لا يدعم الإشعارات', 'error');
            return;
        }

        // التعامل مع الإذن
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                if (app) app.showToast('يرجى السماح للإشعارات من المتصفح', 'error');
                return;
            }
        } else if (Notification.permission === 'denied') {
            if (app) app.showToast('الإشعارات محظورة من المتصفح', 'error');
            return;
        }

        ['morning', 'evening', 'sleep'].forEach(key => {
            const toggle = document.getElementById(`notify${key.charAt(0).toUpperCase() + key.slice(1)}`);
            const timeInput = document.getElementById(`time${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (toggle) this.settings[key].enabled = toggle.checked;
            if (timeInput && timeInput.value) this.settings[key].time = timeInput.value;
        });

        this.saveSettings();

        // إشعار تأكيدي مبسط
        this.showNotification('تم تفعيل التنبيهات ✨', 'تأكد من ترك التطبيق بالخلفية أو فتحه لاحقاً ليصلك الإشعار.');
    },

    startChecker() {
        // فحص الوقت كل 30 ثانية لضمان الدقة
        setInterval(() => this.checkTimeAndNotify(), 30000);
        setTimeout(() => this.checkTimeAndNotify(), 2000);
    },

    checkTimeAndNotify() {
        // التأكد من الإذن
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const now = new Date();
        const currentKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

        // منع التكرار السريع (إذا تم التحقق مؤخراً جداً)
        if (this.lastNotificationCheckKey === currentKey) return;
        this.lastNotificationCheckKey = currentKey;

        const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
        const todayDate = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

        let notifyHistory = {};
        try {
            notifyHistory = JSON.parse(localStorage.getItem('azkar_notify_history')) || {};
        } catch (e) {}

        let historyChanged = false;

        ['morning', 'evening', 'sleep'].forEach(key => {
            const setting = this.settings[key];
            if (!setting.enabled) return;

            const [targetH, targetM] = setting.time.split(':').map(Number);
            const targetTotalMinutes = (targetH * 60) + targetM;

            // حساب الفرق بين الوقت الحالي ووقت الإشعار المستهدف
            const timeDiff = currentTotalMinutes - targetTotalMinutes;
            
            // إذا حان الوقت (أو تجاوزه بحد أقصى 4 ساعات = 240 دقيقة) ولم نرسل إشعاراً اليوم
            if (timeDiff >= 0 && timeDiff <= 240) {
                if (notifyHistory[key] !== todayDate) {
                    this.showNotification(setting.label, setting.message);
                    notifyHistory[key] = todayDate;
                    historyChanged = true;
                }
            }
        });

        if (historyChanged) {
            localStorage.setItem('azkar_notify_history', JSON.stringify(notifyHistory));
        }
    },

    async showNotification(title, body) {
        if (!('Notification' in window)) return;

        // محاولة استخدام Service Worker أولاً
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                    await registration.showNotification(title, {
                        body: body,
                        icon: './icons/icon-192x192.png',
                        badge: './icons/icon-192x192.png',
                        vibrate: [200, 100, 200, 100, 200],
                        tag: 'azkar-notification-' + Date.now(),
                        renotify: true,
                        data: { url: './index.html' }
                    });
                    return;
                }
            } catch (error) {
                // فشل استخدام Service Worker، نستخدم fallback
            }
        }
        
        // Fallback: Notification العادي
        try {
            new Notification(title, { body: body, icon: './icons/icon-192x192.png' });
        } catch (error) {
            // تجاهل أي خطأ في الـ fallback
        }
    }
};