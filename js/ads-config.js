// js/ads-config.js

export const ADS_CONFIG = Object.freeze({
    // 1. الإعلان المدمج (Native) للصفحة الرئيسية
    home: {
        type: 'native-script',
        scriptSrc: 'https://pl28888355.effectivegatecpm.com/3ce3583cf8ed323e6d54932b940b913d/invoke.js',
        containerId: 'container-3ce3583cf8ed323e6d54932b940b913d'
    },

    // 2. إعلانات البانر العادي (Banner 300x250) لباقي الأقسام
    tasks: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },
    wird: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },
    duas: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },
    quran: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },
    names: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },
    stories: {
        type: 'inline-banner',
        atOptions: { key: '4078272ce738cca86c10fc78801a7346', format: 'iframe', height: 250, width: 300, params: {} },
        invokeSrc: 'https://www.highperformanceformat.com/4078272ce738cca86c10fc78801a7346/invoke.js'
    },

    // 3. الرابط المباشر (Smartlink)
    smartlink: 'https://www.effectivegatecpm.com/qt621ycj?key=3b744b9317827f97496494afabffb63f',

    // 4. الإعلان المكافئ الذي سيظهر داخل النافذة (Iframe Modal)
    rewardedAd: {
        type: 'iframe',
        src: 'https://www.effectivegatecpm.com/qt621ycj?key=3b744b9317827f97496494afabffb63f'
    }
});
