// js/ads.js

import { rewardSystem } from './rewards.js';
import { ADS_CONFIG } from './ads-config.js';

const SLOT_IDS = [
    'homeAdSlot',
    'wirdAdSlot',
    'duasAdSlot',
    'quranBottomAdSlot',
    'tasksAdSlot',
    'namesAdSlot',
    'storiesAdSlot'
];

const SECTION_SLOT_MAP = {
    home: 'homeAdSlot',
    wird: 'wirdAdSlot',
    duas: 'duasAdSlot',
    quran: 'quranBottomAdSlot',
    tasks: 'tasksAdSlot',
    names: 'namesAdSlot',
    stories: 'storiesAdSlot'
};

const loadedSections = new Set();
const VIDEO_BANNER_SECTIONS = new Set(['home']);

function appendScript(slotEl, src, attrs = {}) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;

    Object.entries(attrs).forEach(([key, value]) => {
        if (value === true) {
            script.setAttribute(key, 'true');
        } else if (value !== false && value != null) {
            script.setAttribute(key, String(value));
        }
    });

    slotEl.appendChild(script);
    return script;
}

export const adsManager = {
    isAdRunning: false, // منع تشغيل إعلانين في نفس الوقت

    init() {
        this.refreshRewardBox();
        this.hideAllSlots();

        const videoBanner = document.getElementById('fixedVideoBanner');
        if (videoBanner) {
            videoBanner.hidden = true;
        }
    },

    hideAllSlots() {
        SLOT_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });
    },

    shouldShowAds() {
        return !rewardSystem.isAdFreeActive();
    },

    // دالة حقن الإعلان في القسم المحدد
    loadAdForSection(sectionName) {
        // حماية: إذا كان المستخدم يمتلك رصيد "بدون إعلانات"، لا نقم بتحميل أي إعلان
        if (rewardSystem.isAdFreeActive()) return;

        const slotId = SECTION_SLOT_MAP[sectionName];
        if (!slotId) return;

        const config = ADS_CONFIG[sectionName];
        if (!config) return;

        // منع تحميل الإعلان مرتين في نفس القسم
        if (loadedSections.has(sectionName)) return;

        const slotEl = document.getElementById(slotId);
        if (!slotEl) return;

        slotEl.hidden = false;
        slotEl.style.display = 'block';

        if (config.type === 'native-script') {
            const container = document.createElement('div');
            container.id = config.containerId;
            slotEl.appendChild(container);
            appendScript(slotEl, config.scriptSrc);
        } else if (config.type === 'inline-banner') {
            // إضافة الإعدادات للنافذة ليتمكن Adsterra من قراءتها
            window.atOptions = config.atOptions;
            appendScript(slotEl, config.invokeSrc);
        }

        loadedSections.add(sectionName);
    },

    updateVisibleSlots(sectionName) {
        this.hideAllSlots();

        const adsAllowed = this.shouldShowAds();
        const videoBanner = document.getElementById('fixedVideoBanner');
        if (videoBanner) {
            videoBanner.hidden = !(adsAllowed && VIDEO_BANNER_SECTIONS.has(sectionName));
        }

        if (!adsAllowed) {
            this.refreshRewardBox();
            return;
        }

        const targetId = SECTION_SLOT_MAP[sectionName];
        const config = ADS_CONFIG[sectionName];
        if (!targetId || !config) {
            this.refreshRewardBox();
            return;
        }

        const slot = document.getElementById(targetId);
        if (slot) {
            slot.hidden = false;
            this.loadAdForSection(sectionName);
        }

        this.refreshRewardBox();
    },

    refreshRewardBox() {
        const rewardPointsText = document.getElementById('rewardPointsText');
        const rewardRemainingText = document.getElementById('rewardRemainingText');
        const adsDisabledUntilText = document.getElementById('adsDisabledUntilText');

        if (rewardPointsText) {
            rewardPointsText.textContent = `رصيدك الحالي: ${rewardSystem.getPoints()} نقطة`;
        }

        if (rewardRemainingText) {
            rewardRemainingText.textContent =
                `متبقي ${rewardSystem.getRemainingPoints()} نقطة للحصول على يوم بدون إعلانات`;
        }

        if (adsDisabledUntilText) {
            const statusText = rewardSystem.getAdFreeStatusText();
            adsDisabledUntilText.hidden = !statusText;
            adsDisabledUntilText.textContent = statusText;
        }
    },

    onRewardedAdCompleted() {
        rewardSystem.addPoints();
        this.refreshRewardBox();
    },

    // ✅ النظام الشامل للنافذة، العداد التنازلي، والإعلان الداخلي (Iframe)
    showRewardedAd() {
        if (this.isAdRunning) return;

        const modal = document.getElementById('rewardedVideoModal');
        const countdownEl = document.getElementById('videoAdCountdown');
        const closeBtn = document.getElementById('closeVideoAdBtn');
        const adContainer = document.getElementById('rewardedAdContainer');

        if (!modal || !closeBtn || !adContainer) return;

        this.isAdRunning = true;

        // 1. تنظيف الحاوية وحقن الإعلان الحقيقي (Iframe)
        adContainer.innerHTML = ''; 
        if (ADS_CONFIG.rewardedAd && ADS_CONFIG.rewardedAd.type === 'iframe') {
            const iframe = document.createElement('iframe');
            iframe.src = ADS_CONFIG.rewardedAd.src;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.minHeight = '250px';
            iframe.style.border = 'none';
            iframe.setAttribute('scrolling', 'yes'); // السماح بالتمرير داخل الإعلان
            adContainer.appendChild(iframe);
        } else {
            adContainer.innerHTML = '<span style="color: #7F8C8D;">لا يوجد إعلان متاح حالياً.</span>';
        }

        // 2. إعدادات المودال والبدء
        let duration = 30; // 30 ثانية
        modal.classList.remove('is-hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        closeBtn.disabled = true;
        closeBtn.style.opacity = '0.5';
        closeBtn.style.cursor = 'not-allowed';
        closeBtn.textContent = 'انتظر لإنهاء الإعلان';

        const updateCountdown = () => {
            if (countdownEl) countdownEl.textContent = duration.toString();
        };
        updateCountdown();

        // 3. تشغيل العداد التنازلي الذكي (يتوقف إذا غادر المستخدم الصفحة)
        const timerId = setInterval(() => {
            // التحقق: هل المستخدم فاتح التطبيق وينظر إليه؟
            if (document.visibilityState === 'visible') {
                duration -= 1;
                updateCountdown();
            }
            
            if (duration <= 0) {
                clearInterval(timerId);
                // تفعيل الزر بعد انتهاء الوقت
                closeBtn.disabled = false;
                closeBtn.style.opacity = '1';
                closeBtn.style.cursor = 'pointer';
                closeBtn.textContent = 'الحصول على المكافأة وإغلاق';
                if (countdownEl) countdownEl.textContent = '0';
            }
        }, 1000);

        // 4. التعامل مع زر الإغلاق والمكافأة
        const handleClose = () => {
            if (duration > 0) return; // حماية إضافية تمنع الإغلاق المبكر

            modal.classList.add('is-hidden');
            modal.setAttribute('aria-hidden', 'true');
            adContainer.innerHTML = ''; // مسح الإعلان
            
            closeBtn.removeEventListener('click', handleClose);
            
            // فترة تبريد لمنع فتح إعلانين في نفس اللحظة
            setTimeout(() => {
                this.isAdRunning = false;
            }, 3000);

            // منح النقاط
            this.onRewardedAdCompleted();
            if (window.app && typeof window.app.showToast === 'function') {
                window.app.showToast('شكراً لدعمك! تمت إضافة 10 نقاط لرصيدك 🎁', 'success');
            }
        };

        closeBtn.addEventListener('click', handleClose);
    }
};