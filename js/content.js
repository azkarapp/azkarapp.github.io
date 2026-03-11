import { storage } from './storage.js';
import { app } from './app.js';
import { APP_CONFIG } from './config.js';
import { TasksStats } from './tasks/tasks-stats.js';
import {
    setTextContent,
    setProgress,
    toggleHidden
} from './dom.js';

let QURAN_JSON = null;
let DUAS_JSON = null;
let ALLAH_NAMES = null;
let STORIES_JSON = null;
let DAILY_MESSAGES = null;
let DAILY_AYAHS = null;           // ✅ إضافة متغير تخزين الآيات اليومية

export const content = {
    initialized: false,
    rendered: { duas: false, names: false, stories: false },
    dom: {},

    async init() {
        if (this.initialized) {
            this.setDailyAyah();
            this.setDailyMessage();
            this.renderMiniStats();
            return;
        }

        this.cacheDom();
        await this.ensureMessagesLoaded();
        this.setDailyMessage();
        this.setDailyAyah();
        this.renderMiniStats();

        this.initialized = true;
    },

    cacheDom() {
        this.dom = {
            dailyAyahText: document.getElementById('dailyAyahText'),
            dailyMessageText: document.getElementById('dailyMessageText'),
            duasList: document.getElementById('duasList'),
            namesGrid: document.getElementById('namesGrid'),
            storiesGrid: document.getElementById('storiesGrid'),
            dashboardTemplate: document.getElementById('tpl-dashboard-btn'),
            subviewHeaderTemplate: document.getElementById('tpl-subview-header'),
            duaCardTemplate: document.getElementById('tpl-dua-card'),
            nameCardTemplate: document.getElementById('tpl-name-card'),
            storyCardTemplate: document.getElementById('tpl-story-card'),
            miniTasbeeh: document.getElementById('miniTasbeeh'),
            miniTasks: document.getElementById('miniTasks'),
            miniProgress: document.getElementById('miniProgress'),
            miniStreak: document.getElementById('miniStreak'),
            dailyStatsMini: document.getElementById('dailyStatsMini')
        };
    },

    getDom(name) {
        if (!this.dom[name]) this.cacheDom();
        return this.dom[name] || null;
    },

    getTemplateClone(templateName) {
        const template = this.getDom(templateName);
        if (!template) return null;
        return template.content.cloneNode(true);
    },

    setContainerContent(container, html = '') {
        if (container) container.innerHTML = html;
    },

    toggleView({ show, hide }) {
        if (hide) {
            hide.classList.add('is-hidden');
            hide.style.display = 'none';
        }
        if (show) {
            show.classList.remove('is-hidden');
            show.style.display = '';
        }
    },

    // الاستيراد الديناميكي المدمج النظيف
    async ensureQuranLoaded() {
        if (QURAN_JSON) return;
        try { const module = await import('../data/quranData.js'); QURAN_JSON = module.QURAN_JSON; } catch (e) { console.error(e); }
    },
    async ensureDuasLoaded() {
        if (DUAS_JSON) return;
        try { const module = await import('../data/duasData.js'); DUAS_JSON = module.DUAS_JSON; } catch (e) { console.error(e); }
    },
    async ensureNamesLoaded() {
        if (ALLAH_NAMES) return;
        try { const module = await import('../data/names.js'); ALLAH_NAMES = module.ALLAH_NAMES; } catch (e) { console.error(e); }
    },
    async ensureStoriesLoaded() {
        if (STORIES_JSON) return;
        try { const module = await import('../data/stories.js'); STORIES_JSON = module.STORIES_JSON; } catch (e) { console.error(e); }
    },
    async ensureMessagesLoaded() {
        if (DAILY_MESSAGES) return;
        try { const module = await import('../data/messages.js'); DAILY_MESSAGES = module.DAILY_MESSAGES; } catch (e) { console.error(e); }
    },
    // ✅ دالة جديدة لتحميل الآيات اليومية من ملف JSON مستقل
    async ensureDailyAyahsLoaded() {
        if (DAILY_AYAHS) return;
        try {
            const response = await fetch('./data/ayahs.json');
            if (!response.ok) {
                throw new Error(`Failed to load ayahs.json: ${response.status}`);
            }
            const data = await response.json();
            DAILY_AYAHS = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[Content] ensureDailyAyahsLoaded error:', error);
            DAILY_AYAHS = [];
        }
    },

    createDashboardBtn(text, iconClass, onClickFn) {
        const clone = this.getTemplateClone('dashboardTemplate');
        if (!clone) return null;
        const btn = clone.querySelector('.home-btn');
        const icon = clone.querySelector('.home-icon-box i');
        const label = clone.querySelector('.home-btn-text');
        if (btn) btn.addEventListener('click', onClickFn);
        if (icon) icon.className = `fa-solid ${iconClass}`;
        if (label) label.textContent = text;
        return clone;
    },

    createSubviewHeader(title) {
        const clone = this.getTemplateClone('subviewHeaderTemplate');
        if (!clone) return null;
        const titleEl = clone.querySelector('.subview-title');
        if (titleEl) titleEl.textContent = title;
        return clone;
    },

    appendEmptyState(container, text) {
        if (!container) return;
        const empty = document.createElement('p');
        empty.className = 'muted cardx--center';
        empty.textContent = text;
        container.appendChild(empty);
    },

    normalizeArabic(text) {
        return String(text || '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
    },

    // ✅ دالة setDailyAyah المعدلة بالكامل
    async setDailyAyah() {
        const el = this.getDom('dailyAyahText');
        if (!el) return;

        try {
            await this.ensureDailyAyahsLoaded();

            const ayahs = Array.isArray(DAILY_AYAHS) ? DAILY_AYAHS : [];
            if (ayahs.length === 0) {
                el.textContent = 'لا تتوفر آية اليوم حاليًا.';
                return;
            }

            const today = storage.getLocalDateKey();
            const currentAyahId = Number(storage?.state?.dailyAyahId);
            const currentAyahDate = storage?.state?.dailyAyahDate || '';

            let selectedAyah = null;

            // إذا كانت الآية الحالية لهذا اليوم صالحة، نستخدمها
            if (currentAyahDate === today && Number.isFinite(currentAyahId)) {
                selectedAyah = ayahs.find(item => Number(item?.id) === currentAyahId) || null;
            }

            // إذا لم تكن صالحة، نختار آية جديدة غير مكررة
            if (!selectedAyah) {
                const recentIds = Array.isArray(storage?.state?.recentDailyAyahIds)
                    ? storage.state.recentDailyAyahIds.map(Number).filter(Number.isFinite)
                    : [];

                // الآيات المتاحة: تلك التي ليست في القائمة الأخيرة
                let availableAyahs = ayahs.filter(item => !recentIds.includes(Number(item?.id)));

                if (availableAyahs.length === 0) {
                    availableAyahs = ayahs; // إذا تكررت الكل، نستخدم الكل
                }

                const daySeed = this.getDayOfYear(new Date());
                const index = daySeed % availableAyahs.length;
                selectedAyah = availableAyahs[index] || availableAyahs[0] || null;

                if (selectedAyah) {
                    const selectedId = Number(selectedAyah.id);

                    // تحديث التخزين
                    storage.state.dailyAyahId = Number.isFinite(selectedId) ? selectedId : null;
                    storage.state.dailyAyahDate = today;

                    // تحديث قائمة الآيات الحديثة
                    const nextRecentIds = [
                        ...recentIds.filter(id => id !== selectedId),
                        selectedId
                    ].slice(-APP_CONFIG.DAILY_AYAH.NO_REPEAT_DAYS);

                    storage.state.recentDailyAyahIds = nextRecentIds;
                    storage.save();
                }
            }

            el.textContent = selectedAyah?.text?.trim() || 'لا تتوفر آية اليوم حاليًا.';
        } catch (error) {
            console.error('[Content] setDailyAyah error:', error);
            el.textContent = 'لا تتوفر آية اليوم حاليًا.';
        }
    },

    setDailyMessage() {
        const el = this.getDom('dailyMessageText');
        if (!el) return;
        const messages = Array.isArray(DAILY_MESSAGES) ? DAILY_MESSAGES : [];
        if (messages.length === 0) { el.textContent = '—'; return; }
        const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
        const period = Math.floor(currentHour / 6);
        const item = messages[period % messages.length];
        el.textContent = item?.message || String(item || '—');
    },

    getDayOfYear(date = new Date()) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / 86400000);
    },
        async renderDuas() {
        const list = this.getDom('duasList');
        if (!list || this.rendered.duas) return;
        try {
            await this.ensureDuasLoaded();
            const source = DUAS_JSON;
            const categoriesData = source?.categories;
            if (!categoriesData || typeof categoriesData !== 'object') return;
            
            list.innerHTML = '';
            const grid = document.createElement('div');
            grid.id = 'duaCategoriesGrid';
            grid.className = 'home-grid home-grid--catalog';
            const contentDiv = document.createElement('div');
            contentDiv.id = 'duaCategoryContent';
            contentDiv.className = 'is-hidden';
            contentDiv.style.display = 'none';

            list.appendChild(grid);
            list.appendChild(contentDiv);

            Object.keys(categoriesData).forEach(catName => {
                const btnNode = this.createDashboardBtn(catName, 'fa-hands-praying', () => this.openDuaCategory(catName));
                if (btnNode) grid.appendChild(btnNode);
            });
            this.rendered.duas = true;
        } catch (error) { console.error('[Content] renderDuas error:', error); }
    },

    openDuaCategory(catName) {
        const categoriesData = DUAS_JSON?.categories;
        if (!categoriesData || !categoriesData[catName]) return;

        const duasList = categoriesData[catName];
        const contentEl = document.getElementById('duaCategoryContent');
        const gridEl = document.getElementById('duaCategoriesGrid');
        if (!contentEl || !gridEl) return;

        window.history.pushState({ section: 'duas', sub: true }, '', '#duas-category');
        this.setContainerContent(contentEl);

        const headerNode = this.createSubviewHeader(catName);
        if (headerNode) contentEl.appendChild(headerNode);

        if (!Array.isArray(duasList) || duasList.length === 0) {
            this.appendEmptyState(contentEl, 'لا توجد أدعية في هذا القسم حالياً.');
        } else {
            duasList.forEach(item => {
                const text = item?.dua || item?.text || '';
                const clone = this.getTemplateClone('duaCardTemplate');
                if (!clone) return;

                const duaText = clone.querySelector('.dua-text');
                const copyBtn = clone.querySelector('.copy-btn');
                const shareBtn = clone.querySelector('.share-btn');

                if (duaText) duaText.textContent = text;
                if (copyBtn) copyBtn.addEventListener('click', () => app?.copyToClipboard?.(text));
                if (shareBtn) shareBtn.addEventListener('click', () => app?.shareText?.(text));

                contentEl.appendChild(clone);
            });
        }
        this.toggleView({ show: contentEl, hide: gridEl });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async renderNames() {
        const grid = this.getDom('namesGrid');
        if (!grid || this.rendered.names) return;
        try {
            await this.ensureNamesLoaded();
            const source = ALLAH_NAMES;
            const namesArray = Array.isArray(source) ? source : (Array.isArray(source?.ar) ? source.ar : []);
            if (!Array.isArray(namesArray) || namesArray.length === 0) return;

            grid.innerHTML = '';
            namesArray.forEach(item => {
                const clone = this.getTemplateClone('nameCardTemplate');
                if (!clone) return;
                const nameTitle = clone.querySelector('.name-title');
                const nameDesc = clone.querySelector('.name-desc');
                if (nameTitle) nameTitle.textContent = item?.name || '';
                if (nameDesc) nameDesc.textContent = item?.desc || item?.meaning || '';
                grid.appendChild(clone);
            });
            this.rendered.names = true;
        } catch (error) { console.error('[Content] renderNames error:', error); }
    },

    async renderStories() {
        const grid = this.getDom('storiesGrid');
        if (!grid || this.rendered.stories) return;
        try {
            await this.ensureStoriesLoaded();
            const categories = Array.isArray(STORIES_JSON?.categories) ? STORIES_JSON.categories : [];
            if (categories.length === 0) return;

            grid.innerHTML = '';
            const catGrid = document.createElement('div');
            catGrid.id = 'storyCategoriesGrid';
            catGrid.className = 'home-grid home-grid--catalog';
            const contentDiv = document.createElement('div');
            contentDiv.id = 'storyCategoryContent';
            contentDiv.className = 'is-hidden';
            contentDiv.style.display = 'none';

            grid.appendChild(catGrid);
            grid.appendChild(contentDiv);

            categories.forEach(cat => {
                const btnNode = this.createDashboardBtn(cat.name, 'fa-book-journal-whills', () => this.openStoryCategory(cat.name));
                if (btnNode) catGrid.appendChild(btnNode);
            });
            this.rendered.stories = true;
        } catch (error) { console.error('[Content] renderStories error:', error); }
    },

    openStoryCategory(catName) {
        const categories = Array.isArray(STORIES_JSON?.categories) ? STORIES_JSON.categories : [];
        const category = categories.find(c => c.name === catName);
        if (!category) return;

        const contentEl = document.getElementById('storyCategoryContent');
        const gridEl = document.getElementById('storyCategoriesGrid');
        if (!contentEl || !gridEl) return;

        window.history.pushState({ section: 'stories', sub: true }, '', '#stories-category');
        this.setContainerContent(contentEl);

        const headerNode = this.createSubviewHeader(catName);
        if (headerNode) contentEl.appendChild(headerNode);

        const stories = Array.isArray(category.stories) ? category.stories : [];
        if (stories.length === 0) {
            this.appendEmptyState(contentEl, 'لا توجد قصص في هذا القسم حالياً.');
        } else {
            stories.forEach(item => {
                const clone = this.getTemplateClone('storyCardTemplate');
                if (!clone) return;
                const titleEl = clone.querySelector('.story-title');
                const storyEl = clone.querySelector('.story-content');
                const lessonEl = clone.querySelector('.story-lesson');
                if (titleEl) titleEl.textContent = item?.title || '';
                if (storyEl) storyEl.textContent = item?.story || item?.text || '';
                if (lessonEl) lessonEl.textContent = `💡 العبرة: ${item?.lesson || ''}`;
                contentEl.appendChild(clone);
            });
        }
        this.toggleView({ show: contentEl, hide: gridEl });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ✅ دالة mini stats بعد التعديلات
    renderMiniStats() {
        const homeSection = document.getElementById('home');
        const statsMini = this.getDom('dailyStatsMini');
        if (!homeSection || !statsMini) return;

        const isHomeActive = homeSection.classList.contains('active');
        if (!isHomeActive) {
            statsMini.style.display = 'none';
            statsMini.classList.add('is-hidden');
            return;
        }

        statsMini.style.display = '';
        statsMini.classList.remove('is-hidden');

        // الحصول على الإحصائيات من المصدر الموحد
        const stats = TasksStats.getStatsSummary();

        // تحديث النصوص
        setTextContent(this.getDom('miniTasbeeh'), stats.dailyTasbeeh);
        setTextContent(this.getDom('miniTasks'), `${stats.completedTasks}/${stats.totalTasks}`);
        setTextContent(this.getDom('miniProgress'), `${stats.completionRate}%`);
        setTextContent(this.getDom('miniStreak'), stats.streakCount);

        // (تمت إزالة التعامل مع miniTasbeehBar و miniTasksBar لأنهما غير موجودين في HTML)
        // (تمت إزالة التعامل مع statsEmptyState لأنه يخص قسم الإحصائيات العام وليس home mini stats)
    }
};