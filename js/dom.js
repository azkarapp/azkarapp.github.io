// js/dom.js

/**
 * ====================================================================
 * DOM Helpers
 * ====================================================================
 * مجموعة أدوات موحدة للتعامل مع DOM:
 * - الوصول الآمن للعناصر
 * - تحديث النصوص
 * - التحكم في الإخفاء/الإظهار
 * - تحديث أشرطة التقدم
 * - إدارة الكلاسات وخصائص ARIA
 * - التعامل مع القوالب والأطفال
 */

// ==============================
// الوصول إلى العناصر
// ==============================

/**
 * الحصول على عنصر بواسطة id
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function getById(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return document.getElementById(id);
}

/**
 * تحويل معامل (قد يكون id أو عنصر) إلى عنصر DOM
 * @param {string|HTMLElement} elementOrId
 * @returns {HTMLElement|null}
 */
export function resolveElement(elementOrId) {
    if (!elementOrId) return null;
    if (typeof elementOrId === 'string') {
        return getById(elementOrId);
    }
    return elementOrId;
}

// ==============================
// تحديث المحتوى
// ==============================

/**
 * تعيين نص العنصر (آمن)
 * @param {string|HTMLElement} elementOrId
 * @param {*} value
 */
export function setTextContent(elementOrId, value) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.textContent = String(value ?? '');
}

/**
 * إدراج HTML آمن (يزيل script tags)
 * @param {string|HTMLElement} elementOrId
 * @param {string} html
 */
export function safeHTML(elementOrId, html) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    el.innerHTML = '';
    el.appendChild(template.content);
}

/**
 * نص آمن (مشابه لـ setTextContent ولكن مع معامل مختلف)
 * @param {HTMLElement} element
 * @param {string} text
 */
export function safeText(element, text) {
    if (!element) return;
    element.textContent = String(text);
}

// ==============================
// التحكم في الإظهار/الإخفاء
// ==============================

/**
 * إخفاء أو إظهار عنصر باستخدام خاصية hidden
 * @param {string|HTMLElement} elementOrId
 * @param {boolean} hidden
 */
export function toggleHidden(elementOrId, hidden) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.hidden = Boolean(hidden);
}

// ==============================
// أشرطة التقدم
// ==============================

/**
 * تحديث عرض progress bar (نسبة مئوية)
 * @param {string|HTMLElement} elementOrId
 * @param {number} ratio (0..1)
 */
export function setProgress(elementOrId, ratio) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    const safeRatio = Math.max(0, Math.min(Number(ratio) || 0, 1));
    el.style.width = `${Math.round(safeRatio * 100)}%`;
}

// ==============================
// إدارة الكلاسات
// ==============================

/**
 * إضافة/إزالة كلاس
 * @param {string|HTMLElement} elementOrId
 * @param {string} className
 * @param {boolean} [force] - true للإضافة، false للإزالة، بدون toggle
 */
export function toggleClass(elementOrId, className, force) {
    const el = resolveElement(elementOrId);
    if (!el || typeof className !== 'string' || !className.trim()) return;
    if (typeof force === 'boolean') {
        el.classList.toggle(className, force);
    } else {
        el.classList.toggle(className);
    }
}

// ==============================
// خصائص ARIA
// ==============================

/**
 * تعيين aria-pressed
 * @param {string|HTMLElement} elementOrId
 * @param {boolean} value
 */
export function setAriaPressed(elementOrId, value) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.setAttribute('aria-pressed', String(Boolean(value)));
}
// js/config.js

export const APP_CONFIG = Object.freeze({
    APP_VERSION: '2.0.0',
    STORAGE_KEY: 'azkar_data',
    SCHEMA_VERSION: 6,

    DEFAULTS: Object.freeze({
        DAILY_TASBEEH_TARGET: 100,
        MASBAHA_BATCH_TARGET: 33,
        THEME: 'default',
        SILENT_MODE: false
    }),

    LOCAL_STORAGE_KEYS: Object.freeze({
        DAILY_TASBEEH_TARGET: 'azkar_daily_target',
        MASBAHA_TARGET: 'masbaha_target',
        SILENT_MODE: 'azkar_silent',
        CUSTOM_AZKAR_LIST: 'azkar_custom_list',
        THEME: 'azkar_theme'
    })
});

export function toPositiveInt(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}

export function getDefaultSettings() {
    return {
        dailyTasbeehTarget: APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET,
        masbahaTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
        silentMode: APP_CONFIG.DEFAULTS.SILENT_MODE,
        theme: APP_CONFIG.DEFAULTS.THEME
    };
}

export function readLegacySettings() {
    return {
        dailyTasbeehTarget: toPositiveInt(
            localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.DAILY_TASBEEH_TARGET),
            APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET
        ),
        masbahaTarget: toPositiveInt(
            localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MASBAHA_TARGET),
            APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET
        ),
        silentMode: localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.SILENT_MODE) === 'true',
        theme: localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.THEME) || APP_CONFIG.DEFAULTS.THEME
    };
}