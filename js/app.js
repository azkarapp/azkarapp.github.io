import { storage } from './storage.js';
import { content } from './content.js';
import { masbaha } from './masbaha.js';
import { quran } from './quran.js';
import { tasks } from './tasks.js';
import { notifications } from './notifications.js';
import { APP_CONFIG } from './config.js';
import { uiState, setCurrentSection } from './ui-state.js';
import { scheduleRender } from './render-scheduler.js';
import { toggleHidden } from './dom.js';
// ✅ إضافة imports للملفات الجديدة
import { adsManager } from './ads.js';
import { rewardSystem } from './rewards.js';

let firebaseCoreLoader = null;

async function ensureFirebaseCoreLoaded() {
    if (window.__firebaseCoreInitialized) return true;
    if (!firebaseCoreLoader) {
        firebaseCoreLoader = import('./firebase-core.js')
            .then(() => true)
            .catch(error => {
                console.error('[App] Failed to lazy load firebase-core:', error);
                firebaseCoreLoader = null;
                return false;
            });
    }
    return firebaseCoreLoader;
}

export const app = {
    newWorker: null,
    initialized: false,
    toastTimeout: null,
    toastRemoveTimeout: null,
    dayWatcherInterval: null,
    lastKnownDateKey: '',
    sectionBootState: {
        home: true, wird: false, duas: false, quran: false,
        tasks: false, names: false, stories: false, settingsPage: false
    },
    sectionTitles: {
        wird: 'ورد الذكر', duas: 'الأدعية الجامعة', quran: 'القرآن الكريم',
        tasks: 'المهام والإحصائيات', names: 'أسماء الله الحسنى',
        stories: 'قصص وعبر', settingsPage: 'حسابي'
    },
    subViews: [
        { id: 'surahReader', container: 'surahListContainer', check: () => quran?.checkBookmark?.() },
        { id: 'wirdListView', container: 'wirdMainView', check: null },
        { id: 'duaCategoryContent', container: 'duaCategoriesGrid', check: null },
        { id: 'storyCategoryContent', container: 'storyCategoriesGrid', check: null }
    ],
    toastMeta: {
        success: { icon: 'fa-circle-check', label: 'نجاح' },
        error: { icon: 'fa-circle-exclamation', label: 'خطأ' },
        warning: { icon: 'fa-triangle-exclamation', label: 'تنبيه' },
        info: { icon: 'fa-circle-info', label: 'معلومة' }
    },

    refreshHomeWidgets() {
        scheduleRender('mini-stats-render', () => content?.renderMiniStats?.());
        scheduleRender('tasks-stats-render', () => tasks?.renderStatsOnly?.());
    },

    refreshTasksViews() {
        scheduleRender('tasks-render', () => tasks?.render?.());
        scheduleRender('tasks-stats-render', () => tasks?.renderStatsOnly?.());
    },

    // ✅ التعديل الأساسي: استدعاء storage.init() أولاً
    init() {
        if (this.initialized) return;
        this.initialized = true;

        // مهم جداً: تحميل الحالة المحفوظة أولاً
        try {
            storage?.init?.();
        } catch (error) {
            console.error('[App] Failed to initialize storage:', error);
        }

        // ✅ تهيئة أنظمة المكافآت والإعلانات
        rewardSystem.init();
        adsManager.init();

        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());

        this.setupServiceWorkerUpdates();

        this.initTheme();
        this.loadUserProfile();
        this.bindGlobalEvents();
        this.bindUIEvents();
        this.bootstrapCriticalModules();
        this.setupSmartUpdates();
        this.restoreRouteFromHash();
        this.setupDayWatcher();
    },

    updateOnlineStatus() {
        const offlineBanner = this.getElement('offlineBanner');
        if (offlineBanner) {
            toggleHidden(offlineBanner, navigator.onLine);
        }
    },

    setupServiceWorkerUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.action === 'updateReady') {
                    this.showUpdateBanner();
                }
            });
        }
    },

    showUpdateBanner() {
        const banner = this.getElement('updateAvailableBanner');
        if (banner) {
            toggleHidden(banner, false);
        }
    },

    hideUpdateBanner() {
        const banner = this.getElement('updateAvailableBanner');
        if (banner) {
            toggleHidden(banner, true);
        }
    },

    getElement(id) { return document.getElementById(id); },
    getHeaderTitle() { return this.getElement('headerTitle'); },
    getBackButton() { return this.getElement('backBtn'); },
    getSectionElement(id) { return this.getElement(id); },
    
    hideElement(element, useHiddenClass = false) {
        if (!element) return;
        if (useHiddenClass) element.classList.add('is-hidden');
        element.style.display = 'none';
    },
    showElement(element, displayValue = '', removeHiddenClass = false) {
        if (!element) return;
        if (removeHiddenClass) element.classList.remove('is-hidden');
        element.style.display = displayValue;
    },

    bindGlobalEvents() {
        window.addEventListener('popstate', (event) => this.handleBackButton(event));
        
        document.addEventListener('visibilitychange', () => { 
            if (!document.hidden) {
                this.checkForNewDay();
                if (notifications) notifications.checkTimeAndNotify(); 
            }
        });
        
        window.addEventListener('focus', () => { 
            this.checkForNewDay();
            if (notifications) notifications.checkTimeAndNotify();
        });
    },

    bindUIEvents() {
        document.body.addEventListener('click', (event) => {
            if (event.target.closest('#backBtn')) { window.history.back(); return; }

            const navBtn = event.target.closest('[data-nav-section]');
            if (navBtn) {
                const section = navBtn.dataset.navSection;
                const title = navBtn.dataset.navTitle || this.sectionTitles[section] || 'أذكار المسلم';
                this.openSection(section, title);
                return;
            }

            const masbahaBtn = event.target.closest('[data-masbaha-action]');
            if (masbahaBtn) {
                const action = masbahaBtn.dataset.masbahaAction;
                const actions = {
                    'update-target': () => masbaha?.updateTarget?.(),
                    'toggle-silent': () => masbaha?.toggleSilent?.(),
                    'increment': () => masbaha?.increment?.(),
                    'reset': () => masbaha?.reset?.(),
                    'open-custom-modal': () => masbaha?.openCustomZekrModal?.(),
                    'close-category': () => masbaha?.closeAzkarCategory?.(),
                    'save-custom-zekr': () => masbaha?.saveCustomZekr?.(),
                    'close-custom-modal': () => masbaha?.closeCustomZekrModal?.(),
                    'confirm-delete-zekr': () => masbaha?.confirmDeleteZekr?.(),
                    'close-delete-modal': () => masbaha?.closeDeleteModal?.(),
                    'confirm-reset': () => masbaha?.confirmReset?.(),
                    'close-reset-modal': () => masbaha?.closeResetModal?.()
                };
                if (actions[action]) actions[action]();
                return;
            }

            const quranBtn = event.target.closest('[data-quran-action]');
            if (quranBtn) {
                const action = quranBtn.dataset.quranAction;
                const actions = {
                    'resume-reading': () => quran?.resumeReading?.(),
                    'close-surah': () => quran?.closeSurah?.()
                };
                if (actions[action]) actions[action]();
                return;
            }

            const tasksBtn = event.target.closest('[data-tasks-action]');
            if (tasksBtn) {
                const action = tasksBtn.dataset.tasksAction;
                const actions = {
                    'switch-tab': () => tasks?.switchTab?.(tasksBtn.dataset.tasksTab || 'tasks'),
                    'restore-defaults': () => tasks?.restoreDefaultTasks?.(),
                    'add-task': () => tasks?.addTask?.(),
                    'confirm-delete': () => tasks?.confirmDeleteTask?.(),
                    'close-delete-modal': () => tasks?.closeDeleteModal?.(),
                    'confirm-restore': () => tasks?.confirmRestoreTasks?.(),
                    'close-restore-modal': () => tasks?.closeRestoreModal?.()
                };
                if (actions[action]) actions[action]();
                return;
            }

            const modalBtn = event.target.closest('[data-app-modal-action]');
            if (modalBtn) {
                const action = modalBtn.dataset.appModalAction;
                // ✅ تم حذف 'close-about' لأنه لم يعد هناك aboutModal
                const actions = {
                    'close-update': () => this.closeUpdateModal()
                };
                if (actions[action]) actions[action]();
                return;
            }

            const themeBtn = event.target.closest('[data-theme-btn]');
            if (themeBtn) { this.setTheme(themeBtn.dataset.themeBtn); return; }

            const appActionBtn = event.target.closest('[data-app-action]');
            if (appActionBtn) {
                const action = appActionBtn.dataset.appAction;
                // ✅ تم حذف الحالة 'about' لأن زر "عن التطبيق" القديم أزيل واستبدل برابط خارجي
                if (action === 'share') this.shareApp();
                else if (action === 'updates') this.checkForUpdates();
                return;
            }

            if (event.target.classList.contains('modal-overlay')) {
                const id = event.target.id;
                // ✅ تم حذف 'aboutModal' لأنه لم يعد موجوداً
                const modalClosers = {
                    updateModal: () => this.closeUpdateModal(),
                    customZekrModal: () => masbaha?.closeCustomZekrModal?.(),
                    deleteZekrModal: () => masbaha?.closeDeleteModal?.(),
                    resetMasbahaModal: () => masbaha?.closeResetModal?.(),
                    deleteTaskModal: () => tasks?.closeDeleteModal?.(),
                    restoreTasksModal: () => tasks?.closeRestoreModal?.()
                };
                if (modalClosers[id]) modalClosers[id]();
            }
        });

        document.body.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (event.target.matches('[data-custom-zekr-enter-save="true"]')) {
                    event.preventDefault();
                    masbaha?.saveCustomZekr?.();
                } else if (event.target.matches('[data-tasks-enter-add="true"]')) {
                    event.preventDefault();
                    tasks?.addTask?.();
                }
            }
        });

        // ✅ تم تغيير الحدث من input إلى change لمنع الحفظ المتكرر
        document.body.addEventListener('change', (event) => {
            if (event.target.matches('#dailyTargetInput')) {
                this.saveUserProfile();
            }
        });

        // ✅ ربط زر مشاهدة الإعلان لعرض إعلان فيديو مكافأة عبر adsManager
        const watchRewardedAdBtn = document.getElementById('watchRewardedAdBtn');
        if (watchRewardedAdBtn) {
            watchRewardedAdBtn.addEventListener('click', () => {
                try {
                    // اطلب من adsManager عرض إعلان فيديو مكافآت. سيتم منح النقاط
                    // تلقائيًا عند انتهاء الإعلان.
                    adsManager.showRewardedAd();
                } catch (error) {
                    console.error('[App] Failed to show rewarded ad:', error);
                }
            });
        }
    },

    safeInit(label, fn) {
        try { fn?.(); } catch (error) { console.error(`[App] Bootstrap error in ${label}:`, error); }
    },

    bootstrapCriticalModules() {
        requestAnimationFrame(() => {
            this.safeInit('content.init', () => content?.init?.());
            this.safeInit('tasks.init', () => tasks?.init?.());
            this.safeInit('masbaha.init', () => masbaha?.init?.());
            this.safeInit('notifications.init', () => notifications?.init?.());

            if (typeof quran?.bootstrap === 'function') {
                this.safeInit('quran.bootstrap', () => quran.bootstrap());
            } else {
                this.safeInit('quran.checkBookmark', () => quran?.checkBookmark?.());
            }

            this.sectionBootState.wird = true;
            this.sectionBootState.tasks = true;
            this.sectionBootState.quran = true;
        });
    },

    restoreRouteFromHash() {
        const hash = window.location.hash.replace('#', '').trim();
        if (!hash) { this.showHomeInternal(); return; }
        if (this.sectionTitles[hash] && this.getSectionElement(hash)) {
            this.showSectionInternal(hash, this.sectionTitles[hash]);
            this.runSectionInitializers(hash);
            return;
        }
        this.showHomeInternal();
    },

    runSectionInitializers(id) {
        switch (id) {
            case 'quran':
                if (!this.sectionBootState.quran) {
                    this.safeInit('section:quran:init', () => quran?.init?.());
                    this.sectionBootState.quran = true;
                }
                this.safeInit('section:quran:bookmark', () => quran?.checkBookmark?.());
                break;
            case 'duas':
                if (!this.sectionBootState.duas) {
                    this.safeInit('section:duas:render', () => content?.renderDuas?.());
                    this.sectionBootState.duas = true;
                }
                break;
            case 'tasks':
                if (!this.sectionBootState.tasks) {
                    this.safeInit('section:tasks:init', () => tasks?.init?.());
                    this.sectionBootState.tasks = true;
                } else {
                    this.safeInit('section:tasks:refresh', () => tasks?.refreshVisibleState?.());
                }
                break;
            case 'wird':
                if (!this.sectionBootState.wird) {
                    this.safeInit('section:wird:init', () => masbaha?.init?.());
                    this.sectionBootState.wird = true;
                } else {
                    this.safeInit('section:wird:updateUI', () => masbaha?.updateUI?.());
                    this.safeInit('section:wird:categories', () => masbaha?.renderAzkarCategories?.());
                }
                break;
            case 'names':
                if (!this.sectionBootState.names) {
                    this.safeInit('section:names:render', () => content?.renderNames?.());
                    this.sectionBootState.names = true;
                }
                break;
            case 'stories':
                if (!this.sectionBootState.stories) {
                    this.safeInit('section:stories:render', () => content?.renderStories?.());
                    this.sectionBootState.stories = true;
                }
                break;
            case 'settingsPage':
                this.sectionBootState.settingsPage = true;
                this.safeInit('section:settings:firebase', () => { ensureFirebaseCoreLoaded(); });
                break;
        }
    },
        getLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    setupDayWatcher() {
        this.lastKnownDateKey = this.getLocalDateKey();
        if (this.dayWatcherInterval) clearInterval(this.dayWatcherInterval);
        this.dayWatcherInterval = setInterval(() => this.checkForNewDay(), 60 * 1000);
    },

    checkForNewDay() {
        const currentDateKey = this.getLocalDateKey();
        if (this.lastKnownDateKey === currentDateKey) return;
        this.lastKnownDateKey = currentDateKey;

        try { storage?.checkNewDay?.(); } catch (error) { console.error(error); }
        try { masbaha?.updateUI?.(); } catch (error) { console.error(error); }
        try { tasks?.refreshVisibleState?.(); } catch (error) { console.error(error); }
        try { quran?.checkBookmark?.(); } catch (error) { console.error(error); }
        try { content?.setDailyAyah?.(); content?.setDailyMessage?.(); } catch (error) { console.error(error); }

        scheduleRender('mini-stats-render', () => content?.renderMiniStats?.());
        scheduleRender('tasks-stats-render', () => tasks?.renderStatsOnly?.());

        this.showToast('بدأ يوم جديد، تم تحديث المهام والإحصائيات تلقائيًا 🌅', 'info');
    },

    getOrCreateToast() {
        let toast = this.getElement('appToast');
        if (toast) return toast;
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'app-toast is-hidden';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="app-toast__icon" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></div>
            <div class="app-toast__body">
                <div class="app-toast__label">نجاح</div>
                <div class="app-toast__message"></div>
            </div>
        `;
        document.body.appendChild(toast);
        return toast;
    },

    showToast(message, type = 'success') {
        const toast = this.getOrCreateToast();
        const iconEl = toast.querySelector('.app-toast__icon i');
        const labelEl = toast.querySelector('.app-toast__label');
        const messageEl = toast.querySelector('.app-toast__message');
        const safeType = this.toastMeta[type] ? type : 'success';
        const meta = this.toastMeta[safeType];

        toast.classList.remove('is-hidden', 'app-toast--success', 'app-toast--error', 'app-toast--warning', 'app-toast--info', 'app-toast--visible');
        toast.classList.add(`app-toast--${safeType}`);

        if (iconEl) iconEl.className = `fa-solid ${meta.icon}`;
        if (labelEl) labelEl.textContent = meta.label;
        if (messageEl) messageEl.textContent = message;

        clearTimeout(this.toastTimeout);
        clearTimeout(this.toastRemoveTimeout);

        requestAnimationFrame(() => toast.classList.add('app-toast--visible'));

        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('app-toast--visible');
            this.toastRemoveTimeout = setTimeout(() => toast.classList.add('is-hidden'), 260);
        }, 2600);
    },

    handleBackButton(event) {
        for (const view of this.subViews) {
            const element = this.getElement(view.id);
            if (element && (!element.classList.contains('is-hidden') || element.style.display === 'block')) {
                this.hideElement(element, true);
                const container = this.getElement(view.container);
                this.showElement(container, '', true);
                if (typeof view.check === 'function') view.check();
                return;
            }
        }
        if (event.state && event.state.section) {
            this.showSectionInternal(event.state.section, event.state.title);
            this.runSectionInitializers(event.state.section);
            return;
        }
        this.showHomeInternal();
    },

    resetSubviews() {
        this.subViews.forEach(view => {
            const element = this.getElement(view.id);
            const container = this.getElement(view.container);
            if (element && container) {
                this.hideElement(element, true);
                this.showElement(container, '', true);
            }
        });
        quran?.checkBookmark?.();
    },

    setActiveTab(id) {
        document.querySelectorAll('.tab-content').forEach(panel => {
            panel.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');
        });
        const target = this.getSectionElement(id);
        if (target) {
            target.classList.add('active');
            target.setAttribute('aria-hidden', 'false');
        }
    },

    updateHeader(title, showBackButton) {
        const headerTitle = this.getHeaderTitle();
        if (headerTitle) headerTitle.textContent = title || 'أذكار المسلم';

        const backBtn = this.getBackButton();
        if (!backBtn) return;
        if (showBackButton) {
            backBtn.classList.remove('is-hidden');
            backBtn.style.display = 'flex';
        } else {
            backBtn.classList.add('is-hidden');
            backBtn.style.display = 'none';
        }
    },

    showSectionInternal(id, title) {
        setCurrentSection(id);
        this.setActiveTab(id);
        this.updateHeader(title || 'أذكار المسلم', true);
        // ✅ تحديث الإعلانات حسب القسم المعروض
        adsManager.updateVisibleSlots(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showHomeInternal() {
        setCurrentSection('home');
        this.setActiveTab('home');
        this.updateHeader('أذكار المسلم', false);
        this.resetSubviews();
        adsManager.updateVisibleSlots('home'); // ✅ تحديث الإعلانات للصفحة الرئيسية

        scheduleRender('mini-stats-render', () => content?.renderMiniStats?.());
        scheduleRender('tasks-stats-render', () => tasks?.renderStatsOnly?.());
    },

    openSection(id, title) {
        setCurrentSection(id);
        this.showSectionInternal(id, title);
        window.history.pushState({ section: id, title }, '', `#${id}`);
        this.runSectionInitializers(id);
    },

    goHome() {
        this.showHomeInternal();
        window.history.pushState(null, '', window.location.pathname);
    },

    // ==================== الإعدادات والثيم ====================
    initTheme() {
        const themeName = storage?.state?.settings?.theme || APP_CONFIG.DEFAULTS.THEME;
        this.setTheme(themeName, false);
    },

    setTheme(themeName, persist = true) {
        const safeTheme = typeof themeName === 'string' && themeName.trim()
            ? themeName.trim()
            : APP_CONFIG.DEFAULTS.THEME;

        if (safeTheme === 'default') {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', safeTheme);
        }

        if (persist && storage?.state?.settings) {
            storage.state.settings.theme = safeTheme;
            storage.save();
        }
    },

    loadUserProfile() {
        const targetInput = this.getElement('dailyTargetInput');
        const currentTarget = storage?.state?.settings?.dailyTasbeehTarget
            || APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;

        if (targetInput) {
            targetInput.value = currentTarget;
        }
    },

    saveUserProfile() {
        const targetInput = this.getElement('dailyTargetInput');
        const nextTarget = Math.max(
            1,
            Number(targetInput?.value) || APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET
        );

        if (storage?.state?.settings) {
            storage.state.settings.dailyTasbeehTarget = nextTarget;
            storage.save();
        }

        if (targetInput) {
            targetInput.value = nextTarget;
        }

        scheduleRender('tasks-stats-render', () => tasks?.renderStatsOnly?.());
        scheduleRender('mini-stats-render', () => content?.renderMiniStats?.());

        this.showToast('تم حفظ هدف التسبيح اليومي ✅', 'success');
    },

    // ==================== المودالات ====================
    // ✅ تم حذف openAboutModal و closeAboutModal نهائياً
    showUpdateModal(worker) { this.newWorker = worker; const m = this.getElement('updateModal'); if (m) m.style.display = 'flex'; },
    closeUpdateModal() { const m = this.getElement('updateModal'); if (m) m.style.display = 'none'; },

    setupSmartUpdates() {
        if (!('serviceWorker' in navigator)) return;
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    },

    checkForUpdates() {
        if (!('serviceWorker' in navigator)) {
            this.showToast('عفواً، المتصفح لا يدعم التحديثات الذكية.', 'error');
            return;
        }
        this.showToast('جاري البحث عن تحديثات...', 'info');
        navigator.serviceWorker.getRegistration().then(registration => {
            if (!registration) { this.showToast('لم يتم العثور على Service Worker نشط.', 'error'); return; }
            return registration.update().then(() => {
                if (registration.waiting) this.showUpdateModal(registration.waiting);
                else setTimeout(() => this.showToast('أنت على أحدث إصدار بالفعل!', 'success'), 800);
            });
        }).catch(error => {
            console.error('[App] Update check error:', error);
            this.showToast('تعذر الاتصال بالخادم، تأكد من الإنترنت.', 'error');
        });
    },

    applyUpdate() {
        if (this.newWorker) {
            this.showToast('جاري التحديث...', 'info');
            this.newWorker.postMessage({ action: 'skipWaiting' });
            this.hideUpdateBanner();
            return;
        }
        this.closeUpdateModal();
    },

    shareApp() {
        const url = APP_CONFIG.APP_URL;
        const text = 'أنصحك بتجربة تطبيق "أذكار المسلم" المذهل 📱✨:\n\n';
        if (navigator.share) { navigator.share({ title: 'أذكار', text, url }).catch(() => {}); return; }
        this.copyToClipboard(text + url);
    },

    shareText(text) {
        if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
        this.copyToClipboard(text);
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => this.showToast('تم النسخ بنجاح!', 'success')).catch(() => this.showToast('تعذر النسخ.', 'error'));
    }
};

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});