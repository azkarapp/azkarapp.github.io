import { storage } from './storage.js';
import { content } from './content.js';
import { achievements } from './achievements.js';
import { app } from './app.js';
import { APP_CONFIG } from './config.js';
import { scheduleRender } from './render-scheduler.js';
import { tasks } from './tasks.js';
import {
    setTextContent,
    setProgress,
    setAriaPressed
} from './dom.js';

let AZKAR_JSON = null;

export const masbaha = {
    // القيم الافتراضية من config
    isSilent: APP_CONFIG.DEFAULTS.SILENT_MODE,
    isCustomZekrActive: false,
    currentTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
    customAzkar: [],
    zekrToDeleteIndex: null,
    categoriesRendered: false,
    dom: {},
    audio: null,

    azkarCycle: [
        'سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله',
        'اللهم صل على محمد', 'أستغفر الله', 'لا حول ولا قوة إلا بالله', 'حسبنا الله ونعم الوكيل'
    ],

    // دالة مساعدة لتجميع طلبات إعادة الرسم
    queueMasbahaRerender() {
        scheduleRender('masbaha-ui', () => this.updateUI());

        if (typeof content?.renderMiniStats === 'function') {
            scheduleRender('mini-stats-render', () => content.renderMiniStats());
        }

        if (typeof tasks?.renderStatsOnly === 'function') {
            scheduleRender('tasks-stats-render', () => tasks.renderStatsOnly());
        }
    },

    async ensureAzkarLoaded() {
        if (AZKAR_JSON) return;
        try {
            const module = await import('../data/azkar.js');
            AZKAR_JSON = module.AZKAR_JSON;
        } catch (e) {
            console.error('[Masbaha] Failed to load Azkar data', e);
        }
    },

    init() {
        this.cacheDom();
        this.loadSettings();
        this.setupAudio();
        this.updateSilentIcon();
        this.updateUI();
        this.renderAzkarCategories();
    },

    cacheDom() {
        this.dom = {
            targetInput: document.getElementById('masbahaTargetInput'),
            silentIcon: document.getElementById('silentIcon'),
            totalCounter: document.getElementById('totalCounter'),
            batchCounter: document.getElementById('batchCounter'),
            generalZekrDisplay: document.getElementById('generalZekrDisplay'),
            customZekrModal: document.getElementById('customZekrModal'),
            customZekrListContainer: document.getElementById('customZekrListContainer'),
            newCustomZekrInput: document.getElementById('newCustomZekrInput'),
            deleteZekrModal: document.getElementById('deleteZekrModal'),
            resetMasbahaModal: document.getElementById('resetMasbahaModal'),
            azkarCategoriesGrid: document.getElementById('azkarCategoriesGrid'),
            wirdMainView: document.getElementById('wirdMainView'),
            wirdListView: document.getElementById('wirdListView'),
            azkarListTitle: document.getElementById('azkarListTitle'),
            wirdAzkarList: document.getElementById('wirdAzkarList')
        };
    },

    loadSettings() {
        const settings = storage?.state?.settings || {};

        const savedTarget = Number(settings.masbahaTarget);
        this.currentTarget = Number.isFinite(savedTarget) && savedTarget > 0
            ? savedTarget
            : APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET;

        this.isSilent = Boolean(settings.silentMode);

        try {
            const savedCustomList = JSON.parse(
                localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CUSTOM_AZKAR_LIST)
            ) || [];
            this.customAzkar = Array.isArray(savedCustomList)
                ? savedCustomList.filter(item => typeof item === 'string' && item.trim())
                : [];
        } catch (error) { this.customAzkar = []; }

        if (this.dom.targetInput) this.dom.targetInput.value = this.currentTarget;
    },

    setupAudio() {
        try {
            this.audio = new Audio('./assets/audio/tasbeeh-click.mp3');
            this.audio.preload = 'auto';
        } catch (error) { this.audio = null; }
    },

    playClickSound() {
        if (this.isSilent || !this.audio) return;
        try {
            this.audio.currentTime = 0;
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {});
            }
        } catch (error) { console.error(error); }
    },

    updateTarget() {
        const nextValue = Number(this.dom.targetInput?.value);
        this.currentTarget = Number.isFinite(nextValue) && nextValue > 0
            ? nextValue
            : APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET;

        if (storage?.state?.settings) {
            storage.state.settings.masbahaTarget = this.currentTarget;
            storage.save();
        }

        if (this.dom.targetInput) this.dom.targetInput.value = this.currentTarget;
        this.queueMasbahaRerender();
        app?.showToast?.('تم تحديث الهدف اليومي 🎯');
    },

    toggleSilent() {
        this.isSilent = !this.isSilent;

        if (storage?.state?.settings) {
            storage.state.settings.silentMode = this.isSilent;
            storage.save();
        }

        this.updateSilentIcon();
        app?.showToast?.(this.isSilent ? 'تم تفعيل الوضع الصامت 🔇' : 'تم تشغيل الصوت 🔊');
    },

    updateSilentIcon() {
        const icon = this.dom.silentIcon || document.getElementById('silentIcon');
        if (!icon) return;

        icon.className = this.isSilent ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        setAriaPressed('masbahaSilentToggle', this.isSilent);
    },

    async increment() {
        if (!storage || !storage.state) return;

        storage.state.currentSessionTasbeeh = (storage.state.currentSessionTasbeeh || 0) + 1;
        storage.state.totalTasbeeh = (storage.state.totalTasbeeh || 0) + 1;
        storage.state.dailyTasbeeh = (storage.state.dailyTasbeeh || 0) + 1;
        storage.state.monthlyTasbeeh = (storage.state.monthlyTasbeeh || 0) + 1;
        storage.save();

        if (!this.isSilent) {
            this.playClickSound();
        }

        if (navigator.vibrate) {
            if (storage.state.currentSessionTasbeeh % this.currentTarget === 0) {
                navigator.vibrate([100, 50, 100]);
            } else {
                navigator.vibrate(50);
            }
        }

        achievements?.checkAchievements?.();
        this.queueMasbahaRerender();
    },

    reset() {
        const modal = this.dom.resetMasbahaModal || document.getElementById('resetMasbahaModal');
        if (modal) modal.style.display = 'flex';
    },

    closeResetModal() {
        const modal = this.dom.resetMasbahaModal || document.getElementById('resetMasbahaModal');
        if (modal) modal.style.display = 'none';
    },

    confirmReset() {
        if (storage && storage.state) {
            storage.state.currentSessionTasbeeh = 0;
            storage.save();
        }
        this.isCustomZekrActive = false;

        // ✅ إعادة تمكين زر التسبيح الرئيسي بعد التصفير (لإلغاء أي تعطيل سابق)
        const masbahaBtn = document.querySelector('.masbaha-btn');
        if (masbahaBtn) {
            masbahaBtn.disabled = false;
            masbahaBtn.classList.add('btn--primary');
            // إعادة opacity للعنصر الأب (البطاقة) إذا تم تغييرها
            const parentCard = masbahaBtn.closest('.cardx');
            if (parentCard) {
                parentCard.style.opacity = '1';
            }
        }

        this.queueMasbahaRerender();
        this.closeResetModal();
        app?.showToast?.('تم تصفير العداد 🔄');
    },

    // تحديث واجهة المسبحة بحيث يعكس شريط التقدم الدورة الحالية (batch)
    updateUI() {
        if (!storage || !storage.state) return;

        const sessionCount = storage.state.currentSessionTasbeeh || 0;
        const target = this.currentTarget;
        const batch = sessionCount % target;
        const currentPhase = Math.floor(sessionCount / target) % this.azkarCycle.length;

        // تحديث النصوص الأساسية
        setTextContent('masbahaCounter', sessionCount);
        setTextContent('masbahaBatch', `${batch} / ${target}`);
        if (!this.isCustomZekrActive) {
            setTextContent('masbahaCurrentZekr', this.azkarCycle[currentPhase]);
        }

        // حساب نسبة تقدم الدورة الحالية (إذا sessionCount مضاعف للهدف، يكون الشريط ممتلئاً)
        const batchForProgress = batch === 0 && sessionCount > 0 ? target : batch;
        const ratio = target > 0 ? batchForProgress / target : 0;
        setProgress('masbahaProgressBar', ratio);

        // التوافق مع العناصر القديمة
        if (this.dom.totalCounter) {
            setTextContent(this.dom.totalCounter, sessionCount);
        }
        if (this.dom.batchCounter) {
            setTextContent(this.dom.batchCounter, `${batch} / ${target}`);
        }
        if (this.dom.generalZekrDisplay && !this.isCustomZekrActive) {
            setTextContent(this.dom.generalZekrDisplay, this.azkarCycle[currentPhase]);
        }
    },
        openCustomZekrModal() {
        const modal = this.dom.customZekrModal || document.getElementById('customZekrModal');
        if (!modal) return;
        this.renderCustomZekrList();
        modal.style.display = 'flex';
        setTimeout(() => {
            const input = this.dom.newCustomZekrInput || document.getElementById('newCustomZekrInput');
            if (input) input.focus();
        }, 100);
    },

    closeCustomZekrModal() {
        const modal = this.dom.customZekrModal || document.getElementById('customZekrModal');
        if (modal) modal.style.display = 'none';
    },

    saveCustomZekr() {
        const input = this.dom.newCustomZekrInput || document.getElementById('newCustomZekrInput');
        if (!input) return;
        const zekr = input.value.trim();
        if (!zekr) return;

        if (this.azkarCycle.includes(zekr)) {
            app?.showToast?.('هذا الذكر موجود بالفعل في الأذكار الأساسية!', 'error');
            return;
        }

        if (!this.customAzkar.includes(zekr)) {
            this.customAzkar.unshift(zekr);
            localStorage.setItem(
                APP_CONFIG.LOCAL_STORAGE_KEYS.CUSTOM_AZKAR_LIST,
                JSON.stringify(this.customAzkar)
            );
        }

        input.value = '';
        this.selectCustomZekr(zekr);
        app?.showToast?.('تمت الإضافة بنجاح ✨');
    },

    deleteCustomZekr(index) {
        this.zekrToDeleteIndex = index;
        const modal = this.dom.deleteZekrModal || document.getElementById('deleteZekrModal');
        if (modal) modal.style.display = 'flex';
    },

    closeDeleteModal() {
        const modal = this.dom.deleteZekrModal || document.getElementById('deleteZekrModal');
        if (modal) modal.style.display = 'none';
        this.zekrToDeleteIndex = null;
    },

    confirmDeleteZekr() {
        if (this.zekrToDeleteIndex === null) return;
        this.customAzkar.splice(this.zekrToDeleteIndex, 1);
        localStorage.setItem(
            APP_CONFIG.LOCAL_STORAGE_KEYS.CUSTOM_AZKAR_LIST,
            JSON.stringify(this.customAzkar)
        );
        this.renderCustomZekrList();
        this.closeDeleteModal();
        app?.showToast?.('تم حذف الذكر بنجاح 🗑️');
    },

    selectCustomZekr(zekr) {
        this.isCustomZekrActive = true;
        if (this.dom.generalZekrDisplay) {
            setTextContent(this.dom.generalZekrDisplay, zekr);
        }
        if (storage && storage.state) {
            storage.state.currentSessionTasbeeh = 0;
            storage.save();
        }
        this.queueMasbahaRerender();
        this.closeCustomZekrModal();
    },

    renderCustomZekrList() {
        const container = this.dom.customZekrListContainer || document.getElementById('customZekrListContainer');
        if (!container) return;
        container.innerHTML = '';

        this.azkarCycle.forEach(zekr => {
            const item = document.createElement('div');
            item.className = 'custom-zekr-item';
            item.style.borderRight = '4px solid var(--primary)';
            const textDiv = document.createElement('div');
            textDiv.className = 'custom-zekr-text amiri-text';
            textDiv.textContent = zekr;
            textDiv.style.cursor = 'pointer';
            textDiv.onclick = () => this.selectCustomZekr(zekr);
            item.appendChild(textDiv);
            container.appendChild(item);
        });

        if (this.customAzkar.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'muted';
            divider.style.margin = '15px 0 5px 0';
            divider.style.fontWeight = 'bold';
            divider.textContent = 'أذكاري المضافة:';
            container.appendChild(divider);
        }

        this.customAzkar.forEach((zekr, index) => {
            const item = document.createElement('div');
            item.className = 'custom-zekr-item';
            const textDiv = document.createElement('div');
            textDiv.className = 'custom-zekr-text amiri-text';
            textDiv.textContent = zekr;
            textDiv.style.cursor = 'pointer';
            textDiv.onclick = () => this.selectCustomZekr(zekr);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn icon-btn--transparent';
            deleteBtn.style.color = '#ef4444';
            deleteBtn.style.width = '35px';
            deleteBtn.style.height = '35px';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteBtn.onclick = (event) => {
                event.stopPropagation();
                this.deleteCustomZekr(index);
            };

            item.appendChild(textDiv);
            item.appendChild(deleteBtn);
            container.appendChild(item);
        });
    },

    async renderAzkarCategories() {
        const grid = this.dom.azkarCategoriesGrid || document.getElementById('azkarCategoriesGrid');
        const template = document.getElementById('tpl-dashboard-btn');
        if (!grid) return;

        await this.ensureAzkarLoaded();

        if (!AZKAR_JSON || !Array.isArray(AZKAR_JSON.categories)) {
            grid.innerHTML = '<p class="muted cardx--center" style="grid-column: span 2;">جاري تحميل الأذكار...</p>';
            return;
        }

        if (this.categoriesRendered || !template) return;

        grid.innerHTML = '';
        const iconMap = {
            'صباح': 'fa-sun', 'مساء': 'fa-cloud-sun', 'نوم': 'fa-moon',
            'استيقاظ': 'fa-sun-plant-wilt', 'صلاة': 'fa-pray', 'مسجد': 'fa-mosque',
            'سفر': 'fa-plane', 'وضوء': 'fa-hand-holding-droplet'
        };

        AZKAR_JSON.categories.forEach(cat => {
            let iconName = 'fa-book-open';
            for (const keyword in iconMap) {
                if (cat.category.includes(keyword)) {
                    iconName = iconMap[keyword];
                    break;
                }
            }

            const clone = template.content.cloneNode(true);
            const btn = clone.querySelector('.home-btn');
            const iconBox = clone.querySelector('.home-icon-box');
            const textSpan = clone.querySelector('.home-btn-text');

            if (btn) {
                btn.style.padding = '10px';
                btn.style.gap = '8px';
                btn.onclick = () => this.openAzkarCategory(cat.category, cat.category);
            }
            if (iconBox) {
                iconBox.style.width = '38px';
                iconBox.style.height = '38px';
                iconBox.style.fontSize = '1.1rem';
                iconBox.innerHTML = `<i class="fa-solid ${iconName}"></i>`;
            }
            if (textSpan) {
                textSpan.style.fontSize = '0.85rem';
                textSpan.textContent = cat.category;
            }

            grid.appendChild(clone);
        });

        this.categoriesRendered = true;
    },

    async openAzkarCategory(key, title) {
        await this.ensureAzkarLoaded();
        if (!AZKAR_JSON || !Array.isArray(AZKAR_JSON.categories)) return;

        const categoryData = AZKAR_JSON.categories.find(c => c.category === key);
        if (!categoryData || !storage?.state) return;

        if (this.dom.azkarListTitle) this.dom.azkarListTitle.textContent = title;

        if (!storage.state.azkarProgress) storage.state.azkarProgress = {};
        if (!storage.state.azkarProgress[key]) storage.state.azkarProgress[key] = {};

        const listContainer = this.dom.wirdAzkarList || document.getElementById('wirdAzkarList');
        const template = document.getElementById('tpl-zekr-card');
        if (!listContainer || !template) return;

        listContainer.innerHTML = '';
        const safeKey = key.replace(/\s+/g, '-');

        categoryData.azkar.forEach((zekr, index) => {
            const target = Number(zekr.repeat || zekr.count || 1);
            const current = storage.state.azkarProgress[key][index] || 0;
            const isDone = current >= target;

            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.zekr-card');
            const zekrTextEl = clone.querySelector('.zekr-text');
            const fadlContainer = clone.querySelector('.zekr-fadl-container');
            const fadlText = clone.querySelector('.zekr-fadl');
            const copyBtn = clone.querySelector('.copy-btn');
            const shareBtn = clone.querySelector('.share-btn');
            const counterBtn = clone.querySelector('.zekr-counter-btn');
            const statusSpan = clone.querySelector('.zekr-status');
            const countSpan = clone.querySelector('.zekr-count');

            const zekrText = zekr.text || zekr.zekr || '';
            const zekrMeta = zekr.reference || zekr.fadl || '';

            if (zekrTextEl) zekrTextEl.textContent = zekrText;
            if (zekrMeta && fadlContainer && fadlText) {
                fadlText.textContent = `📚 ${zekrMeta}`;
                fadlContainer.style.display = 'block';
            }

            if (copyBtn) copyBtn.onclick = () => app?.copyToClipboard(zekrText);
            if (shareBtn) shareBtn.onclick = () => app?.shareText(zekrText);
            if (counterBtn) counterBtn.id = `zekr-btn-${safeKey}-${index}`;
            if (countSpan) countSpan.textContent = `${current} / ${target}`;

            if (isDone) {
                if (card) { card.style.border = '2px solid var(--primary)'; card.style.opacity = '0.6'; }
                if (counterBtn) counterBtn.disabled = true;
                if (statusSpan) statusSpan.innerHTML = '<i class="fa-solid fa-check-double"></i> اكتمل';
            } else {
                if (card) { card.style.border = '2px solid var(--border)'; card.style.opacity = '1'; }
                if (counterBtn) {
                    counterBtn.classList.add('btn--primary');
                    counterBtn.onclick = () => this.tickZekr(key, index, target);
                }
                if (statusSpan) statusSpan.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> اضغط للعد';
            }

            listContainer.appendChild(clone);
        });

        if (this.dom.wirdMainView) {
            this.dom.wirdMainView.classList.add('is-hidden');
            this.dom.wirdMainView.style.display = 'none';
        }
        if (this.dom.wirdListView) {
            this.dom.wirdListView.classList.remove('is-hidden');
            this.dom.wirdListView.style.display = '';
        }

        window.history.pushState({ section: 'wird', sub: true }, '', '#azkar-list');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    tickZekr(category, index, target) {
        if (!storage || !storage.state) return;
        if (!storage.state.azkarProgress[category]) storage.state.azkarProgress[category] = {};

        let current = storage.state.azkarProgress[category][index] || 0;
        if (current >= target) return;

        current += 1;
        storage.state.azkarProgress[category][index] = current;
        storage.save();

        if (navigator.vibrate) navigator.vibrate(current >= target ? [100, 50, 100] : 50);

        const safeCategory = category.replace(/\s+/g, '-');
        const btn = document.getElementById(`zekr-btn-${safeCategory}-${index}`);
        if (!btn) return;

        const countSpan = btn.querySelector('.zekr-count');
        const statusSpan = btn.querySelector('.zekr-status');
        const parentCard = btn.parentElement;

        if (countSpan) countSpan.textContent = `${current} / ${target}`;

        if (current >= target) {
            btn.classList.remove('btn--primary');
            btn.disabled = true;
            if (parentCard) { parentCard.style.borderColor = 'var(--primary)'; parentCard.style.opacity = '0.6'; }
            if (statusSpan) statusSpan.innerHTML = '<i class="fa-solid fa-check-double"></i> اكتمل';
        }

        if (typeof content?.renderMiniStats === 'function') {
            scheduleRender('mini-stats-render', () => content.renderMiniStats());
        }
    },

    closeAzkarCategory() {
        window.history.back();
    }
};