// ==========================================
// ملف ui.js (الواجهة والجماليات والتنقل والترجمة) - النسخة النهائية المؤمنة 100%
// ==========================================

// مصدر واحد للحقيقة (Single Source of Truth) للغة والنوع والاسم
window.currentLang = window.currentLang || localStorage.getItem('appLang') || 'ar';
window.currentGender = window.currentGender || localStorage.getItem('appGender') || 'm';
window.currentDeceasedName = window.currentDeceasedName || localStorage.getItem('savedDeceasedName') || 'المرحوم صبري كامل سليم';

// تطبيع قيم النوع (حماية من إدخالات غير متوقعة)
function normalizeGender(g) {
    return (g === 'f' || g === 'm') ? g : 'm';
}
window.currentGender = normalizeGender(window.currentGender);

const UI_TEXT = {
    ar: {
        header_dua_m: "اللهم اغفر له وارحمه وعافه واعف عنه وأكرم نزله ووسع مدخله",
        header_dua_f: "اللهم اغفر لها وارحمها وعافها واعف عنها وأكرم نزلها ووسع مدخلها",
        tab_tasbeeh: "المسبحة", tab_azkar: "الأذكار", tab_tracker: "الورد اليومي",
        tab_duas: "الأدعية", tab_quran: "القرآن", tab_names: "الأسماء", tab_stories: "قصص",
        btn_reset: "تصفير العداد", azkar_morning: "الصباح", azkar_evening: "المساء", azkar_sleep: "النوم",
        dua_deceased: "للمتوفى", dua_general: "أدعية عامة",
        quran_full: "المصحف كاملاً", quran_yaseen: "سورة يس", quran_mulk: "سورة الملك", quran_kahf: "سورة الكهف",
        title_tracker: "الورد اليومي", desc_tracker: "قليل دائم خير من كثير منقطع",
        title_names: "أسماء الله الحسنى", title_stories: "قصص وعبر", times: "مرات", btn_copy: "نسخ",
        sadaqa_title: "✨ صدقة جارية لمن تحب",
        sadaqa_desc: "أنشئ نسخة من هذا التطبيق باسم من تحب من الأموات ليكون صدقة جارية لروحهم.",
        btn_create_sadaqa: "أنشئ صدقة جارية الآن",
        modal_title1: "أنشئ صدقة جارية",
        modal_desc1: "اكتب اسم المتوفى ليتم إنشاء رابط مخصص باسمه:",
        btn_generate: "توليد الرابط",
        modal_title2: "تم الإنشاء بنجاح! 🎉",
        modal_desc2: "هذا هو الرابط المخصص، انسخه وشاركه مع عائلتك وأصدقائك:",
        btn_copy_link: "📋 نسخ الرابط",
        btn_open_link: "فتح الرابط ❯",
        footer_dev: "Developed by Yousef Sabry",
        ad_space: "مساحة إعلانية (تظهر هنا بعد موافقة أدسنس)"
    },
    en: {
        header_dua_m: "O Allah, forgive him and have mercy on him",
        header_dua_f: "O Allah, forgive her and have mercy on her",
        tab_tasbeeh: "Tasbeeh", tab_azkar: "Azkar", tab_tracker: "Daily Wird",
        tab_duas: "Duas", tab_quran: "Quran", tab_names: "Names", tab_stories: "Stories",
        btn_reset: "Reset Counter", azkar_morning: "Morning", azkar_evening: "Evening", azkar_sleep: "Sleep",
        dua_deceased: "For Deceased", dua_general: "General Duas",
        quran_full: "Full Quran", quran_yaseen: "Surah Yaseen", quran_mulk: "Surah Al-Mulk", quran_kahf: "Surah Al-Kahf",
        title_tracker: "Daily Wird", desc_tracker: "Consistent small deeds are best",
        title_names: "Names of Allah", title_stories: "Stories", times: "times", btn_copy: "Copy",
        sadaqa_title: "✨ Sadaqa Jariyah",
        sadaqa_desc: "Create a copy of this app with the name of your deceased loved one.",
        btn_create_sadaqa: "Create Sadaqa Now",
        modal_title1: "Create Sadaqa Jariyah",
        modal_desc1: "Enter the name of the deceased to generate a custom link:",
        btn_generate: "Generate Link",
        modal_title2: "Successfully Created! 🎉",
        modal_desc2: "Here is the custom link, copy and share it:",
        btn_copy_link: "📋 Copy Link",
        btn_open_link: "Open Link ❯",
        footer_dev: "Developed by Yousef Sabry",
        ad_space: "Ad Space (Appears here after AdSense approval)"
    }
};

let currentAzkarType = 'morning';
let activeDuaType = 'deceased';

// ----------------------------------------------------
// نسخ آمن (Clipboard + fallback)
// ----------------------------------------------------
async function safeCopy(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        throw new Error('Clipboard API not available');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch {
            ta.remove();
            return false;
        }
    }
}

// ----------------------------------------------------
// اللغة والترجمة
// ----------------------------------------------------
function toggleLanguage() {
    window.currentLang = window.currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('appLang', window.currentLang);
    applyLanguage();
    if (typeof updateInstallBtnLang === 'function') updateInstallBtnLang();
}

function translateI18nNodes(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');

        if (key === 'header_dua') {
            const duaKey = window.currentGender === 'f' ? 'header_dua_f' : 'header_dua_m';
            if (UI_TEXT[window.currentLang]?.[duaKey]) {
                el.textContent = UI_TEXT[window.currentLang][duaKey];
            }
        } else if (UI_TEXT[window.currentLang]?.[key]) {
            el.textContent = UI_TEXT[window.currentLang][key];
        }
    });
}

function applyLanguage() {
    document.documentElement.lang = window.currentLang;
    document.documentElement.dir = window.currentLang === 'ar' ? 'rtl' : 'ltr';

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) langBtn.textContent = window.currentLang === 'ar' ? 'EN' : 'عربي';

    translateI18nNodes();

    const nameInput = document.getElementById('deceasedNameInput');
    if (nameInput) {
        nameInput.placeholder = window.currentLang === 'ar' ? 'مثال: أحمد محمود' : 'Ex: John Doe';
    }

    updateUI();
    renderAzkar(currentAzkarType);
}

// ----------------------------------------------------
// الثيم
// ----------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    setTheme(savedTheme, null);
}

function setTheme(themeName, btnElement) {
    if (themeName === 'default') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', themeName);
    }
    localStorage.setItem('theme', themeName);

    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));

    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const colors = {
            default: 'rgb(30, 111, 92)',
            blue: 'rgb(29, 53, 87)',
            brown: 'rgb(111, 78, 55)',
            dark: 'rgb(17, 24, 39)'
        };
        document.querySelectorAll('.color-dot').forEach(dot => {
            if (getComputedStyle(dot).backgroundColor === colors[themeName]) {
                dot.classList.add('active');
            }
        });
    }
}

// ----------------------------------------------------
// Tabs (ARIA + Keyboard Support)
// ----------------------------------------------------
function updateTabsARIA(activeId, activeBtn) {
    document.querySelectorAll('.tab-content').forEach(panel => {
        const isActive = panel.id === activeId;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn === activeBtn;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
}

function switchTab(id, btn) {
    const targetContent = document.getElementById(id);
    if (!targetContent || !btn) return;

    updateTabsARIA(id, btn);
    localStorage.setItem('activeTab', id);
}

function initTabKeyboard() {
    const tablist = document.querySelector('.tabs-scroll-container[role="tablist"]');
    if (!tablist) return;

    tablist.addEventListener('keydown', (e) => {
        const tabs = Array.from(tablist.querySelectorAll('.tab-btn[role="tab"]'));
        if (!tabs.length) return;

        const currentIndex = tabs.findIndex(t => t.classList.contains('active'));
        const idx = currentIndex >= 0 ? currentIndex : 0;

        let nextIndex = null;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (idx + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (idx - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') nextIndex = 0;
        if (e.key === 'End') nextIndex = tabs.length - 1;

        if (nextIndex !== null) {
            e.preventDefault();
            tabs[nextIndex].focus();
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            const focused = document.activeElement;
            if (focused && focused.classList.contains('tab-btn')) {
                e.preventDefault();
                const match = focused.getAttribute('onclick')?.match(/switchTab\('([^']+)'/);
                if (match?.[1]) switchTab(match[1], focused);
            }
        }
    });
}

// ----------------------------------------------------
// UI Update Hooks
// ----------------------------------------------------
function updateUI() {
    if (typeof updateCounterUI === 'function') updateCounterUI();
    renderActiveDua();
    if (typeof renderTracker === 'function') renderTracker();
    if (typeof renderNames === 'function') renderNames();
    if (typeof renderStories === 'function') renderStories();
}

function updateCounterUI() {
    const counterEl = document.getElementById('totalCounter');
    if (counterEl && typeof state !== 'undefined') {
        counterEl.textContent = state.count;
    }

    if (typeof TASBEEH_AZKAR !== 'undefined' && typeof state !== 'undefined') {
        const tasbeehData = TASBEEH_AZKAR[window.currentLang] || TASBEEH_AZKAR['ar'];
        const dhikr = document.getElementById('dhikrText');
        if (tasbeehData && dhikr) dhikr.textContent = tasbeehData[state.currentZekrIdx];
    }

    if (typeof state !== 'undefined') {
        let currentBatch = (state.count % 33);
        if (state.count > 0 && currentBatch === 0) currentBatch = 33;
        const batchEl = document.getElementById('batchCounter');
        if (batchEl) batchEl.textContent = `${currentBatch} / 33`;
    }
}

// ----------------------------------------------------
// Azkar (XSS-Safe)
// ----------------------------------------------------
function renderAzkar(type) {
    if (typeof checkAzkarAutoReset === 'function') checkAzkarAutoReset();
    const list = document.getElementById('azkarList');
    if (!list || typeof AZKAR === 'undefined') return;

    const azkarData = AZKAR[window.currentLang] || AZKAR['ar'];
    if (!azkarData || !azkarData[type]) return;

    list.textContent = '';
    const frag = document.createDocumentFragment();
    const timesTxt = UI_TEXT[window.currentLang].times;

    azkarData[type].forEach((zekr, index) => {
        const key = `${type}_${index}`;
        const currentCount = (typeof state !== 'undefined' && state.azkarProgress[key]) ? state.azkarProgress[key] : 0;
        const target = zekr.c;
        const isCompleted = currentCount >= target;

        const card = document.createElement('div');
        card.className = 'zekr-item';

        const textWrap = document.createElement('div');
        textWrap.className = 'zekr-text-wrap';
        textWrap.style.fontFamily = "'Amiri', serif";
        textWrap.style.whiteSpace = 'pre-line';
        textWrap.textContent = zekr.t || '';

        const bottomRow = document.createElement('div');
        bottomRow.className = 'zekr-bottom-row';

        const targetSpan = document.createElement('span');
        targetSpan.style.fontSize = '0.85rem';
        targetSpan.style.color = 'var(--text-sub)';
        targetSpan.style.opacity = '0.8';
        targetSpan.textContent = `${window.currentLang === 'ar' ? 'الهدف:' : 'Target:'} ${target} ${timesTxt}`;

        const btn = document.createElement('button');
        btn.className = isCompleted ? 'zekr-count-btn completed' : 'zekr-count-btn';

        if (isCompleted) {
            btn.textContent = '✔️';
            btn.disabled = true;
        } else {
            const spanCount = document.createElement('span');
            spanCount.dir = 'ltr';
            spanCount.style.fontFamily = 'Arial, sans-serif';
            spanCount.style.display = 'inline-block';
            spanCount.textContent = `${currentCount} / ${target}`;

            btn.appendChild(spanCount);
            btn.onclick = () => incrementZekr(type, index, target);
        }

        bottomRow.appendChild(targetSpan);
        bottomRow.appendChild(btn);
        card.appendChild(textWrap);
        card.appendChild(bottomRow);
        frag.appendChild(card);
    });

    list.appendChild(frag);
}

function toggleAzkar(type, btn) {
    document.querySelectorAll('#azkar .azkar-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAzkarType = type;
    renderAzkar(type);
}
// ----------------------------------------------------
// Duas (Gender Adaptation + XSS-Safe)
// ----------------------------------------------------
function toggleDuaCategory(type, btn) {
    const container = btn.parentElement;
    container.querySelectorAll('.azkar-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeDuaType = type;
    renderActiveDua();
}

function adaptDuaForGender(text, gender, lang) {
    if (gender === 'm') return text;

    if (lang === 'ar') {
        return text
            .replace(/ له(?=[\s،.]|$)/g, ' لها')
            .replace(/ عنه(?=[\s،.]|$)/g, ' عنها')
            .replace(/ إنه(?=[\s،.]|$)/g, ' إنها')
            .replace(/ إليه(?=[\s،.]|$)/g, ' إليها')
            .replace(/ عليه(?=[\s،.]|$)/g, ' عليها')
            .replace(/ فيه(?=[\s،.]|$)/g, ' فيها')
            .replace(/ارحمه/g, 'ارحمها')
            .replace(/فارحمه/g, 'فارحمها')
            .replace(/عافه/g, 'عافها')
            .replace(/نزله/g, 'نزلها')
            .replace(/مدخله/g, 'مدخلها')
            .replace(/قبره/g, 'قبرها')
            .replace(/داره/g, 'دارها')
            .replace(/أهله/g, 'أهلها')
            .replace(/أبدله/g, 'أبدلها')
            .replace(/أدخله/g, 'أدخلها')
            .replace(/أعذه/g, 'أعذها')
            .replace(/بصره/g, 'بصرها')
            .replace(/تجعله/g, 'تجعلها')
            .replace(/فقه/g, 'فقها')
            .replace(/حسناته/g, 'حسناتها')
            .replace(/سيئاته/g, 'سيئاتها')
            .replace(/آنسه/g, 'آنسها')
            .replace(/وحدته/g, 'وحدتها')
            .replace(/وحشته/g, 'وحشتها')
            .replace(/غربته/g, 'غربتها')
            .replace(/أنزله/g, 'أنزلها')
            .replace(/يمينه/g, 'يمينها')
            .replace(/تبعثه/g, 'تبعثها')
            .replace(/تعذبه/g, 'تعذبها')
            .replace(/أسكنه/g, 'أسكنها')
            .replace(/احشره/g, 'احشرها')
            .replace(/نفسه/g, 'نفسها')
            .replace(/كان محسناً/g, 'كانت محسنةً')
            .replace(/كان مسيئاً/g, 'كانت مسيئةً')
            .replace(/آمناً مطمئناً/g, 'آمنةً مطمئنةً')
            .replace(/جاء ببابك/g, 'جاءت ببابك')
            .replace(/أناخ بجنابك/g, 'أناخت بجنابك');
    }

    return text
        .replace(/\bhim\b/g, 'her')
        .replace(/\bhis\b/g, 'her')
        .replace(/\bhe\b/g, 'she');
}

function renderActiveDua() {
    if (typeof DECEASED_DUAS === 'undefined' || typeof GENERAL_DUAS === 'undefined') return;

    const isDeceased = activeDuaType === 'deceased';
    const source = isDeceased ? DECEASED_DUAS : GENERAL_DUAS;
    const arr = source[window.currentLang] || source['ar'];
    if (!arr) return;

    const list = document.getElementById('duasList');
    if (!list) return;

    list.textContent = '';
    const frag = document.createDocumentFragment();

    arr.forEach((dua, index) => {
        let finalDua = dua;
        if (isDeceased) finalDua = adaptDuaForGender(dua, window.currentGender, window.currentLang);

        const card = document.createElement('div');
        card.className = 'zekr-item';

        const textWrap = document.createElement('div');
        textWrap.className = 'zekr-text-wrap';
        textWrap.style.fontFamily = "'Amiri', serif";
        textWrap.style.textAlign = 'justify';
        textWrap.style.color = 'var(--primary)';
        textWrap.style.fontWeight = 'bold';
        textWrap.style.fontSize = '1.5rem';
        textWrap.style.whiteSpace = 'pre-line';
        textWrap.textContent = finalDua || '';

        const bottomRow = document.createElement('div');
        bottomRow.className = 'zekr-bottom-row';
        bottomRow.style.justifyContent = 'center';

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.style.width = '100%';
        btn.style.justifyContent = 'center';
        btn.style.borderRadius = '30px';
        btn.style.fontSize = '1.1rem';
        btn.style.padding = '12px';
        btn.onclick = () => copySpecificDua(index, isDeceased);

        const spanTxt = document.createElement('span');
        spanTxt.setAttribute('data-i18n', 'btn_copy');
        spanTxt.textContent = UI_TEXT[window.currentLang].btn_copy;

        btn.textContent = '📋 ';
        btn.appendChild(spanTxt);

        bottomRow.appendChild(btn);
        card.appendChild(textWrap);
        card.appendChild(bottomRow);
        frag.appendChild(card);
    });

    list.appendChild(frag);
}

function copySpecificDua(index, isDeceased) {
    const source = isDeceased ? DECEASED_DUAS : GENERAL_DUAS;
    const arr = source[window.currentLang] || source['ar'];
    let text = arr[index];

    if (isDeceased) text = adaptDuaForGender(text, window.currentGender, window.currentLang);

    const pageTitle = document.title ? document.title.split('|')[0].trim() : window.currentDeceasedName;
    const footerText = window.currentLang === 'ar'
        ? `\n\n(صدقة جارية عن روح ${pageTitle})`
        : `\n\n(Sadaqa for ${pageTitle})`;
    const footer = isDeceased ? footerText : "";

    safeCopy(text + footer).then((ok) => {
        alert(window.currentLang === 'ar'
            ? (ok ? 'تم النسخ بنجاح!' : 'تعذر النسخ، يرجى المحاولة يدوياً')
            : (ok ? 'Copied successfully!' : 'Copy failed'));

        if (typeof gtag === 'function' && ok) {
            gtag('event', 'copy_dua_clicked', {
                'dua_type': isDeceased ? 'deceased' : 'general'
            });
        }
    });
}
// ----------------------------------------------------
// Tracker (XSS-Safe)
// ----------------------------------------------------
function renderTracker() {
    if (typeof checkTrackerAutoReset === 'function') checkTrackerAutoReset();
    if (typeof DAILY_TASKS === 'undefined') return;

    const arr = DAILY_TASKS[window.currentLang] || DAILY_TASKS['ar'];
    if (!arr) return;

    const list = document.getElementById('trackerList');
    if (!list) return;

    list.textContent = '';
    const frag = document.createDocumentFragment();

    arr.forEach((task, index) => {
        const isDone = (typeof state !== 'undefined' && state.trackerTasks[index]) ? true : false;

        const card = document.createElement('div');
        card.className = `task-item ${isDone ? 'done' : ''}`;
        card.onclick = () => toggleTask(index);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = isDone;

        const span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = task || '';

        card.appendChild(checkbox);
        card.appendChild(span);
        frag.appendChild(card);
    });

    list.appendChild(frag);
}

// ----------------------------------------------------
// Names (XSS-Safe)
// ----------------------------------------------------
function renderNames() {
    if (typeof ALLAH_NAMES === 'undefined') return;

    const arr = ALLAH_NAMES[window.currentLang] || ALLAH_NAMES['ar'];
    if (!arr) return;

    const grid = document.getElementById('namesGrid');
    if (!grid) return;

    grid.textContent = '';
    const frag = document.createDocumentFragment();

    arr.forEach(item => {
        const card = document.createElement('div');
        card.className = 'name-card';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'allah-name';
        nameDiv.textContent = item.name || '';

        const descDiv = document.createElement('div');
        descDiv.className = 'allah-desc';
        descDiv.style.whiteSpace = 'pre-line';
        descDiv.textContent = item.desc || '';

        card.appendChild(nameDiv);
        card.appendChild(descDiv);
        frag.appendChild(card);
    });

    grid.appendChild(frag);
}

// ----------------------------------------------------
// Stories (XSS-Safe)
// ----------------------------------------------------
function renderStories() {
    if (typeof STORIES === 'undefined') return;

    const arr = STORIES[window.currentLang] || STORIES['ar'];
    if (!arr) return;

    const list = document.getElementById('storiesList');
    if (!list) return;

    list.textContent = '';
    const frag = document.createDocumentFragment();

    arr.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'story-title';
        titleDiv.textContent = story.title || '';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'story-content';
        contentDiv.style.whiteSpace = 'pre-line';
        contentDiv.textContent = story.content || '';

        card.appendChild(titleDiv);
        card.appendChild(contentDiv);
        frag.appendChild(card);
    });

    list.appendChild(frag);
}

// ----------------------------------------------------
// Modal fallback (إذا لم تكن معرّفة في pwa.js)
// ----------------------------------------------------
if (typeof window.openModal !== 'function') {
    window.openModal = function () {
        const modal = document.getElementById('sadaqaModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';

        const input = document.getElementById('deceasedNameInput');
        if (input) input.value = '';
    };
}

if (typeof window.closeModal !== 'function') {
    window.closeModal = function () {
        const modal = document.getElementById('sadaqaModal');
        if (!modal) return;
        modal.style.display = 'none';
    };
}

// إغلاق عند الضغط خارج المحتوى أو Escape
function initModalUX() {
    const modal = document.getElementById('sadaqaModal');
    const content = modal?.querySelector('.modal-content');
    if (!modal || !content) return;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') window.closeModal();
    });
}

// ----------------------------------------------------
// Init
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const customName = urlParams.get('name');
    const customGender = normalizeGender(urlParams.get('g'));

    // gender
    window.currentGender = customGender;
    localStorage.setItem('appGender', window.currentGender);

    // name
    if (customName && customName.trim() !== "") {
        let cleanName = customName.replace(/المرحومة/g, '').replace(/المرحوم/g, '').trim();
        const titlePrefix = (window.currentGender === 'f') ? 'المرحومة' : 'المرحوم';
        window.currentDeceasedName = `${titlePrefix} ${cleanName}`;
        localStorage.setItem('savedDeceasedName', window.currentDeceasedName);
    }

    // header name + title
    document.querySelectorAll('.deceased-name').forEach(el => el.textContent = window.currentDeceasedName);
    document.title = window.currentDeceasedName + " | Sadaqa";

    // تحديث الدعاء فوراً بناءً على النوع
    translateI18nNodes();

    // manifest
    if (typeof updateDynamicManifest === 'function') updateDynamicManifest(window.currentDeceasedName);

    initTheme();

    if (typeof loadData === 'function') loadData();
    if (typeof checkAzkarAutoReset === 'function') checkAzkarAutoReset();

    applyLanguage();

    // restore tab
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && document.getElementById(savedTab)) {
        const activeBtn =
            document.querySelector(`.tab-btn[onclick*="'${savedTab}'"]`) ||
            document.querySelector(`.tab-btn[onclick*="${savedTab}"]`);

        if (activeBtn) switchTab(savedTab, activeBtn);
    } else {
        // تأكيد ARIA الافتراضي
        const defaultBtn = document.querySelector('.tab-btn.active');
        const defaultPanel = document.querySelector('.tab-content.active');
        if (defaultBtn && defaultPanel) updateTabsARIA(defaultPanel.id, defaultBtn);
    }

    initTabKeyboard();
    initModalUX();

    // ملاحظة: initPWA يتم تشغيله في pwa.js عبر window load عادةً.
});
