/**
 * ====================================================================
 * Tasks Motivation
 * ====================================================================
 * مسؤول عن:
 * - الرسائل التحفيزية
 * - تقييم حالة اليوم الحالية
 */
import { TasksStats } from './tasks-stats.js';

export const TasksMotivation = {
    getMessage() {
        const stats = TasksStats.getStatsSummary();

        if (stats.completionRate === 100) {
            return 'أتممت كل مهامك وحققت هدف التسبيح اليومي، يوم رائع جدًا 🌟';
        }

        if (stats.totalTasks === 0) {
            // تم استبدال 33 بنصف الهدف اليومي
            if (stats.dailyTasbeeh >= Math.ceil(stats.dailyTasbeehTarget / 2)) {
                return 'أحسنت في الذكر اليوم، أضف مهمة صغيرة ليكتمل يومك ✨';
            }
            return 'ابدأ بإضافة مهمة واحدة صغيرة اليوم ✨';
        }

        if (stats.completedTasks === stats.totalTasks && stats.totalTasks > 0) {
            if (stats.dailyTasbeeh >= stats.dailyTasbeehTarget) {
                return 'ما شاء الله، أغلقت اليوم كاملًا على 100% ✅';
            }
            return `أنجزت كل المهام، بقي ${stats.dailyTasbeehRemaining} تسبيحة لهدف اليوم 📿`;
        }

        if (stats.completedTasks === 0) {
            // تم استبدال 33 بنصف الهدف اليومي
            if (stats.dailyTasbeeh >= Math.ceil(stats.dailyTasbeehTarget / 2)) {
                return 'بداية ممتازة في الذكر — الآن ابدأ أول مهمة 💪';
            }
            return 'ابدأ بأول مهمة الآن، والباقي سيأتي بسهولة 💪';
        }

        if (stats.remainingTasks === 1 && stats.dailyTasbeehRemaining === 0) {
            return 'تبقّت مهمة واحدة فقط — أنت قريب جدًا من يوم مثالي 🔥';
        }

        if (stats.remainingTasks === 0 && stats.dailyTasbeehRemaining > 0) {
            return `تبقّى ${stats.dailyTasbeehRemaining} تسبيحة فقط للوصول إلى 100% 📿`;
        }

        if (stats.completionRate >= 75) {
            return 'ممتاز، تقدّمك اليوم قوي جدًا 🌟';
        }

        if (stats.completionRate >= 40) {
            return 'أداء جيد، أكمل بنفس الوتيرة 👏';
        }

        if (stats.dailyTasbeeh >= Math.ceil(stats.dailyTasbeehTarget / 2)) {
            return 'تقدمك في الذكر جميل اليوم، أكمل مع المهام 🌱';
        }

        return 'خطوة صغيرة الآن تصنع فرقًا كبيرًا بنهاية اليوم 🌱';
    },

    getBadge() {
        const stats = TasksStats.getStatsSummary();

        if (stats.completionRate === 100) {
            return '🏆 يوم مكتمل';
        }

        if (stats.streakCount >= 7) {
            return '🔥 التزام قوي';
        }

        if (stats.dailyTasbeeh >= stats.dailyTasbeehTarget) {
            return '⭐ هدف الذكر مكتمل';
        }

        if (stats.completionRate >= 50) {
            return '✅ في الطريق';
        }

        return '🌱 بداية طيبة';
    }
};