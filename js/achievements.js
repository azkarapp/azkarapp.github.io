// js/achievements.js

/**
 * =====================================================
 * Achievements System
 * =====================================================
 * مسؤول عن:
 * - تعريف الإنجازات
 * - فحص الإنجازات
 * - تسجيل الإنجازات المكتسبة
 * - إظهار إشعار عند فتح إنجاز جديد
 */
import { storage } from './storage.js';
import { app } from './app.js';

export const achievements = {
    list: [
        {
            id: 'tasbeeh_33',
            title: 'بداية الذكر',
            desc: 'قمت بـ 33 تسبيحة',
            icon: 'fa-seedling',
            check: (state) => (state.totalTasbeeh || 0) >= 33
        },
        {
            id: 'tasbeeh_100',
            title: 'ذاكر نشيط',
            desc: 'قمت بـ 100 تسبيحة',
            icon: 'fa-star',
            check: (state) => (state.totalTasbeeh || 0) >= 100
        },
        {
            id: 'tasbeeh_500',
            title: 'ذاكر قوي',
            desc: 'قمت بـ 500 تسبيحة',
            icon: 'fa-fire',
            check: (state) => (state.totalTasbeeh || 0) >= 500
        },
        {
            id: 'task_1',
            title: 'أول مهمة',
            desc: 'أنجزت أول مهمة',
            icon: 'fa-check',
            check: (state) => (state.tasksCompleted || 0) >= 1
        },
        {
            id: 'task_10',
            title: 'منظم',
            desc: 'أنجزت 10 مهام',
            icon: 'fa-list-check',
            check: (state) => (state.tasksCompleted || 0) >= 10
        },
        {
            id: 'streak_3',
            title: '3 أيام التزام',
            desc: 'حافظت على 3 أيام متتالية',
            icon: 'fa-calendar',
            check: (state) => (state.streakCount || 0) >= 3
        },
        {
            id: 'streak_7',
            title: 'أسبوع التزام',
            desc: 'حافظت على 7 أيام متتالية',
            icon: 'fa-medal',
            check: (state) => (state.streakCount || 0) >= 7
        }
    ],

    ensureStateShape() {
        if (!storage || !storage.state) return false;

        if (!Array.isArray(storage.state.achievements)) {
            storage.state.achievements = [];
        }

        if (!Number.isFinite(Number(storage.state.tasksCompleted))) {
            storage.state.tasksCompleted = 0;
        }

        return true;
    },

    checkAchievements() {
        if (!this.ensureStateShape()) return;

        const state = storage.state;
        let unlockedAny = false;

        this.list.forEach((achievement) => {
            // التحقق من أن الإنجاز لم يفتح بالفعل
            if (state.achievements.includes(achievement.id)) return;

            // قراءة آمنة للقيم
            let conditionMet = false;
            try {
                conditionMet = achievement.check(state);
            } catch (e) {
                console.warn(`[Achievements] Error checking ${achievement.id}:`, e);
                return;
            }

            if (conditionMet) {
                state.achievements.push(achievement.id);
                unlockedAny = true;

                if (app && typeof app.showToast === 'function') {
                    app.showToast(`🏆 إنجاز جديد: ${achievement.title}`, 'success');
                }
            }
        });

        if (unlockedAny) {
            storage.save();
        }
    },

    getUnlocked() {
        if (!this.ensureStateShape()) return [];

        const unlockedIds = storage.state.achievements;
        return this.list.filter(item => unlockedIds.includes(item.id));
    },

    getLocked() {
        if (!this.ensureStateShape()) return [];

        const unlockedIds = storage.state.achievements;
        return this.list.filter(item => !unlockedIds.includes(item.id));
    }
};