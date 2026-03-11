import { storage } from './storage.js';

let QURAN_JSON = null;

export const quran = {
    initialized: false,
    dataLoaded: false,
    searchBound: false,
    currentSurahNum: null,

    dom: {},

    surahNames: {
        1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة', 6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس', 11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر', 16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه', 21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان', 26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم', 31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر', 36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر', 41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية', 46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق', 51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن', 56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة', 61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق', 66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج', 71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة', 76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس', 81: 'التكوير', 82: 'الإنفطار', 83: 'المطففين', 84: 'الإنشقاق', 85: 'البروج', 86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد', 91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين', 96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات', 101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل', 106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر', 111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس'
    },

    cacheDom() {
        this.dom = {
            searchInput: document.getElementById('searchSurah'),
            surahList: document.getElementById('surahList'),
            surahListContainer: document.getElementById('surahListContainer'),
            surahReader: document.getElementById('surahReader'),
            currentSurahTitle: document.getElementById('currentSurahTitle'),
            ayahsContainer: document.getElementById('ayahsContainer'),
            resumeReadingCard: document.getElementById('resumeReadingCard'),
            lastReadSurahName: document.getElementById('lastReadSurahName'),
            surahBtnTemplate: document.getElementById('tpl-surah-btn')
        };
    },

    getDom(name) {
        if (!this.dom[name]) {
            this.cacheDom();
        }
        return this.dom[name] || null;
    },

    // الاستيراد الديناميكي الحديث بدلاً من loadScriptOnce القديمة
    async ensureDataLoaded() {
        if (this.dataLoaded && QURAN_JSON) return;
        try {
            const module = await import('../data/quranData.js');
            QURAN_JSON = module.QURAN_JSON;
            this.dataLoaded = true;
        } catch (error) {
            console.error('[Quran] Failed to load Quran data:', error);
        }
    },

    bootstrap() {
        this.init();
    },

    async init() {
        if (!this.initialized) {
            this.cacheDom();
            this.bindSearch();
            this.initialized = true;
        }

        await this.ensureDataLoaded();
        this.renderSurahList();
        this.checkBookmark();
    },

    bindSearch() {
        const input = this.getDom('searchInput');
        if (!input || this.searchBound) return;

        this.searchBound = true;
        input.addEventListener('input', () => {
            this.renderSurahList(input.value);
        });
    },

    getSurahNumbers() {
        if (!QURAN_JSON || typeof QURAN_JSON !== 'object') {
            return [];
        }
        return Object.keys(QURAN_JSON)
            .map(Number)
            .filter(Number.isFinite)
            .sort((a, b) => a - b);
    },

    normalizeArabic(text) {
        return String(text || '')
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim();
    },

    createSurahButton(surahNum, surahName) {
        const template = this.getDom('surahBtnTemplate');
        if (!template) return null;

        const clone = template.content.cloneNode(true);
        const btn = clone.querySelector('.surah-item');
        const nameEl = clone.querySelector('.surah-name');
        const numEl = clone.querySelector('.surah-num');

        if (nameEl) nameEl.textContent = surahName;
        if (numEl) numEl.textContent = surahNum;
        if (btn) btn.addEventListener('click', () => this.openSurah(surahNum));

        return clone;
    },

    renderSurahList(searchTerm = '') {
        const list = this.getDom('surahList');
        if (!list) return;

        const surahNumbers = this.getSurahNumbers();
        list.innerHTML = '';

        if (surahNumbers.length === 0) {
            list.innerHTML = '<p class="muted cardx--center" style="grid-column: span 2;">تعذر تحميل فهرس السور.</p>';
            return;
        }

        const normalizedSearch = this.normalizeArabic(searchTerm);

        surahNumbers.forEach(surahNum => {
            const surahName = this.surahNames[surahNum] || `سورة ${surahNum}`;
            const matchName = this.normalizeArabic(surahName).includes(normalizedSearch);
            const matchNumber = String(surahNum).includes(searchTerm.trim());

            if (normalizedSearch && !matchName && !matchNumber) return;

            const btnNode = this.createSurahButton(surahNum, surahName);
            if (btnNode) list.appendChild(btnNode);
        });

        if (!list.children.length) {
            list.innerHTML = '<p class="muted cardx--center" style="grid-column: span 2;">لا توجد نتائج مطابقة.</p>';
        }
    },

    getSurahAyahs(surahNum) {
        if (!QURAN_JSON) return [];
        return QURAN_JSON[String(surahNum)] || QURAN_JSON[surahNum] || [];
    },

    buildAyahLine(ayah, fallbackIndex = 1) {
        const verseNum = Number(ayah?.verse || ayah?.numberInSurah || ayah?.verse_number || fallbackIndex);
        const text = String(ayah?.text || '').trim();
        return `${text} ﴿${verseNum}﴾`;
    },

    saveBookmark(surahNum) {
        if (!storage?.state) return;

        const surahName = this.surahNames[surahNum] || `سورة ${surahNum}`;
        storage.state.quranBookmark = {
            surahNum,
            surahName,
            scroll: Math.max(0, window.scrollY || 0)
        };
        storage.save();
        this.checkBookmark();
    },

    async openSurah(surahNum, options = {}) {
        await this.ensureDataLoaded();

        const ayahs = this.getSurahAyahs(surahNum);
        const reader = this.getDom('surahReader');
        const listContainer = this.getDom('surahListContainer');
        const titleEl = this.getDom('currentSurahTitle');
        const ayahsContainer = this.getDom('ayahsContainer');

        if (!reader || !listContainer || !titleEl || !ayahsContainer) return;

        const surahName = this.surahNames[surahNum] || `سورة ${surahNum}`;
        this.currentSurahNum = surahNum;

        titleEl.textContent = surahName;
        ayahsContainer.innerHTML = '';

        if (!Array.isArray(ayahs) || ayahs.length === 0) {
            ayahsContainer.textContent = 'تعذر تحميل السورة.';
        } else {
            const lines = ayahs.map((ayah, index) => this.buildAyahLine(ayah, index + 1));
            ayahsContainer.textContent = lines.join(' ');
        }

        listContainer.classList.add('is-hidden');
        listContainer.style.display = 'none';

        reader.classList.remove('is-hidden');
        reader.style.display = '';

        this.saveBookmark(surahNum);

        window.history.pushState({ section: 'quran', sub: true }, '', '#surah-reader');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (options.restoreScroll && storage?.state?.quranBookmark?.surahNum === surahNum) {
            const bookmarkScroll = Number(storage.state.quranBookmark.scroll || 0);
            requestAnimationFrame(() => {
                window.scrollTo({ top: bookmarkScroll, behavior: 'auto' });
            });
        }
    },

    closeSurah() {
        const reader = this.getDom('surahReader');
        const listContainer = this.getDom('surahListContainer');

        if (reader) {
            reader.classList.add('is-hidden');
            reader.style.display = 'none';
        }

        if (listContainer) {
            listContainer.classList.remove('is-hidden');
            listContainer.style.display = '';
        }

        this.currentSurahNum = null;
        this.checkBookmark();
        window.history.back();
    },

    checkBookmark() {
        const card = this.getDom('resumeReadingCard');
        const nameEl = this.getDom('lastReadSurahName');
        const bookmark = storage?.state?.quranBookmark;

        if (!card || !nameEl) return;

        if (!bookmark || !bookmark.surahNum || !bookmark.surahName) {
            card.classList.add('is-hidden');
            card.style.display = 'none';
            nameEl.textContent = '';
            return;
        }

        nameEl.textContent = bookmark.surahName;
        card.classList.remove('is-hidden');
        card.style.display = '';
    },

    async resumeReading() {
        const bookmark = storage?.state?.quranBookmark;
        if (!bookmark?.surahNum) return;
        await this.openSurah(bookmark.surahNum, { restoreScroll: true });
    }
};
