// ==========================================
// ملف core.js (القلب النابض والتخزين والعمليات) - النسخة النهائية
// ==========================================

// توحيد مصدر اللغة مع باقي الملفات (Single Source of Truth)
window.currentLang = window.currentLang || localStorage.getItem('appLang') || 'ar';

const STORAGE_KEY = 'sadaqa_state_v1'; 
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let state = {
    count: 0,
    currentZekrIdx: 0,
    batchCount: 1,
    azkarProgress: {},
    trackerTasks: {},
    lastAzkarReset: Date.now(),
    lastTrackerReset: new Date().toDateString()
};

let audioCtx = null;

// التهيئة الآمنة للصوت بعد أول تفاعل فعلي للمستخدم
function initAudioOnce() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

function playClickSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// تحصين البيانات لمنع الأخطاء الناتجة عن بيانات تالفة أو ناقصة في التخزين
function normalizeState() {
    if (!state || typeof state !== 'object') state = {};
    if (typeof state.count !== 'number') state.count = 0;
    if (typeof state.currentZekrIdx !== 'number') state.currentZekrIdx = 0;
    if (typeof state.batchCount !== 'number') state.batchCount = 1;
    
    if (!state.azkarProgress || typeof state.azkarProgress !== 'object') state.azkarProgress = {};
    if (typeof state.lastAzkarReset !== 'number') state.lastAzkarReset = Date.now();
    
    if (!state.trackerTasks || typeof state.trackerTasks !== 'object') state.trackerTasks = {};
    if (typeof state.lastTrackerReset !== 'string') state.lastTrackerReset = new Date().toDateString();
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        }
    } catch (e) {
        console.error('Error loading state', e);
    }
    // استدعاء التحصين فوراً بعد تحميل البيانات
    normalizeState(); 
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Error saving state', e);
    }
}

function checkAzkarAutoReset() {
    const now = Date.now();
    if (now - state.lastAzkarReset > SIX_HOURS_MS) {
        state.azkarProgress = {};
        state.lastAzkarReset = now;
        saveData();
    }
}

function checkTrackerAutoReset() {
    const today = new Date().toDateString();
    if (state.lastTrackerReset !== today) {
        state.trackerTasks = {};
        state.lastTrackerReset = today;
        saveData();
    }
}

function incrementCounter() {
    initAudioOnce(); 
    if (navigator.vibrate) navigator.vibrate(15);
    playClickSound();

    state.count++;
    
    // جعل تأثير الاحتفال يتوافق مع لون الثيم الحالي
    if (state.count > 0 && state.count % 33 === 0) {
        if (typeof confetti !== 'undefined') {
            const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#1E6F5C';
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: [primaryColor, '#ffffff', '#E9C46A']
            });
        }
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    }

    if (typeof TASBEEH_AZKAR !== 'undefined') {
        const lang = window.currentLang;
        const arr = TASBEEH_AZKAR[lang] || TASBEEH_AZKAR['ar'];
        if (arr && state.count % 33 === 0) {
            state.currentZekrIdx = (state.currentZekrIdx + 1) % arr.length;
        }
    }

    saveData();
    if (typeof updateCounterUI === 'function') updateCounterUI();
}

function confirmReset() {
    const msg = window.currentLang === 'ar' 
        ? 'هل أنت متأكد من تصفير العداد؟' 
        : 'Are you sure you want to reset the counter?';
        
    if (confirm(msg)) {
        state.count = 0;
        state.currentZekrIdx = 0;
        state.batchCount = 1;
        saveData();
        if (typeof updateCounterUI === 'function') updateCounterUI();
    }
}

function incrementZekr(type, index, target) {
    initAudioOnce();
    if (navigator.vibrate) navigator.vibrate(15);
    playClickSound();

    const key = `${type}_${index}`;
    if (!state.azkarProgress[key]) state.azkarProgress[key] = 0;
    
    if (state.azkarProgress[key] < target) {
        state.azkarProgress[key]++;
        saveData();
        if (typeof renderAzkar === 'function') renderAzkar(type);
    }
}

// تنظيف الكائن عند الإلغاء بدلاً من تخزين false
function toggleTask(index) {
    const next = !state.trackerTasks[index];
    if (next) {
        state.trackerTasks[index] = true;
    } else {
        delete state.trackerTasks[index];
    }
    saveData();
    if (typeof renderTracker === 'function') renderTracker();
}
