// js/config.js

export const APP_CONFIG = Object.freeze({
    APP_VERSION: '2.0.0',
    STORAGE_KEY: 'azkar_data',
    SCHEMA_VERSION: 6,
    APP_URL: 'https://azkarapp.github.io/',

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
    }),

    DAILY_AYAH: Object.freeze({
        NO_REPEAT_DAYS: 100
    }),

    REWARDS: Object.freeze({
        POINTS_PER_AD: 10,
        POINTS_FOR_ONE_DAY_AD_FREE: 100,
        AD_FREE_DURATION_MS: 24 * 60 * 60 * 1000
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