/**
 * ====================================================================
 * Tasks Stats
 * ====================================================================
 * مسؤول عن:
 * - حساب الإحصائيات المرتبطة بالمهام
 * - قراءة counters من storage
 * - تجهيز summary موحد
 * - احتساب نسبة الإنجاز اليومي على أساس:
 *   (المهام + هدف التسبيح اليومي)
 * 
 * لا يحتوي على أي منطق عرض أو تعديل في الـ state.
 */
import { storage } from '../storage.js';
import { APP_CONFIG } from '../config.js';

export const TasksStats = {
    // ==============================
    // الدوال الأساسية الآمنة
    // ==============================
    getCompletedTasksCount() {
        const tasks = Array.isArray(storage?.state?.tasks) ? storage.state.tasks : [];
        return tasks.filter(task => Boolean(task?.completed)).length;
    },

    getTotalTasksCount() {
        const tasks = Array.isArray(storage?.state?.tasks) ? storage.state.tasks : [];
        return tasks.length;
    },

    getDailyTasbeeh() {
        return Number(storage?.state?.dailyTasbeeh) || 0;
    },

    getMonthlyTasbeeh() {
        return Number(storage?.state?.monthlyTasbeeh) || 0;
    },

    getStreakCount() {
        return Number(storage?.state?.streakCount) || 0;
    },

    getTasksCompletedLifetime() {
        return Number(storage?.state?.tasksCompleted) || 0;
    },

    getTasksRemainingCount() {
        return Math.max(0, this.getTotalTasksCount() - this.getCompletedTasksCount());
    },

    getDailyTasbeehTarget() {
        const target = Number(storage?.state?.settings?.dailyTasbeehTarget);
        return Number.isFinite(target) && target > 0
            ? target
            : APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;
    },

    getDailyTasbeehProgressRatio() {
        const target = this.getDailyTasbeehTarget();
        const current = this.getDailyTasbeeh();
        if (target <= 0) return 1;
        return Math.min(current / target, 1);
    },

    getDailyTasbeehRemaining() {
        return Math.max(0, this.getDailyTasbeehTarget() - this.getDailyTasbeeh());
    },

    // نسبة إنجاز المهام فقط (للاستخدام الداخلي)
    getTasksCompletionRate() {
        const total = this.getTotalTasksCount();
        if (total === 0) return 0;
        const completed = this.getCompletedTasksCount();
        return Math.round((completed / total) * 100);
    },

    // ==============================
    // نسبة الإنجاز المركبة (مهام + تسبيح) – كما كانت سابقاً
    // ==============================
    getCompletionRate() {
        const completedTasks = this.getCompletedTasksCount();
        const totalTasks = this.getTotalTasksCount();
        const tasbeehProgress = this.getDailyTasbeehProgressRatio();

        const totalUnits = totalTasks + 1;
        const completedUnits = completedTasks + tasbeehProgress;

        if (totalUnits <= 0) return 0;

        return Math.round((completedUnits / totalUnits) * 100);
    },

    // ==============================
    // نصوص التقدم
    // ==============================
    getTasksProgressText() {
        return `${this.getCompletedTasksCount()} / ${this.getTotalTasksCount()}`;
    },

    getTasbeehProgressText() {
        return `${this.getDailyTasbeeh()} / ${this.getDailyTasbeehTarget()}`;
    },

    // ==============================
    // دالة موحدة لجمع كل الإحصائيات المهمة (بدون رسائل)
    // ==============================
    getDashboardStats() {
        const completedTasks = this.getCompletedTasksCount();
        const totalTasks = this.getTotalTasksCount();
        const dailyTasbeeh = this.getDailyTasbeeh();
        const dailyTasbeehTarget = this.getDailyTasbeehTarget();
        const monthlyTasbeeh = this.getMonthlyTasbeeh();
        const streakCount = this.getStreakCount();
        const tasksCompletedLifetime = this.getTasksCompletedLifetime();

        return {
            completedTasks,
            totalTasks,
            pendingTasks: Math.max(totalTasks - completedTasks, 0),
            tasksCompletionRate: this.getTasksCompletionRate(),
            dailyTasbeeh,
            dailyTasbeehTarget,
            dailyTasbeehProgress: this.getDailyTasbeehProgressRatio(),
            dailyTasbeehRemaining: this.getDailyTasbeehRemaining(),
            monthlyTasbeeh,
            streakCount,
            tasksCompletedLifetime
        };
    },

    // ==============================
    // نص ملخص المتبقي (يمكن أن يستقبل stats مباشرة)
    // ==============================
    getRemainingSummaryText(stats = null) {
        const summary = stats || this.getDashboardStats();

        if (summary.totalTasks === 0 && summary.dailyTasbeeh === 0) {
            return 'ابدأ بإضافة مهام أو تسبيح اليوم ✨';
        }

        const pendingTasks = summary.pendingTasks;
        const remainingTasbeeh = summary.dailyTasbeehRemaining;

        if (pendingTasks === 0 && remainingTasbeeh === 0) {
            return 'اكتمل هدف اليوم بالكامل ✅';
        }

        if (pendingTasks > 0 && remainingTasbeeh > 0) {
            return `باقي ${pendingTasks} مهام و ${remainingTasbeeh} تسبيحة`;
        }

        if (pendingTasks > 0) {
            return `باقي ${pendingTasks} مهام فقط`;
        }

        return `باقي ${remainingTasbeeh} تسبيحة فقط`;
    },

    // ==============================
    // مستوى النشاط (بناءً على الإحصائيات)
    // ==============================
    getActivityLevelFromStats(stats) {
        if (stats.totalTasks === 0 && stats.dailyTasbeeh === 0) {
            return { label: 'ابدأ اليوم', tone: 'neutral' };
        }

        // نستخدم completionRate الأصلي للاتساق مع الواجهة القديمة
        const completionRate = this.getCompletionRate();

        if (completionRate === 100) {
            return { label: 'يوم مثالي', tone: 'excellent' };
        }

        if (completionRate >= 85) {
            return { label: 'ممتاز جدًا', tone: 'excellent' };
        }

        if (completionRate >= 65) {
            return { label: 'تقدم قوي', tone: 'good' };
        }

        if (completionRate >= 40) {
            return { label: 'تقدم جيد', tone: 'good' };
        }

        if (stats.dailyTasbeeh > 0 || stats.completedTasks > 0) {
            return { label: 'بداية موفقة', tone: 'neutral' };
        }

        return { label: 'بداية اليوم', tone: 'neutral' };
    },

    // ==============================
    // رسالة ذكية (بناءً على الإحصائيات)
    // ==============================
    getSmartStatsMessage(stats) {
        // نستخدم completionRate الأصلي للاتساق مع الواجهة القديمة
        const completionRate = this.getCompletionRate();

        if (completionRate === 100) {
            return 'أتممت كل مهامك وحققت هدف التسبيح اليومي، ما شاء الله 🌟';
        }

        if (stats.completedTasks === stats.totalTasks && stats.totalTasks > 0 && stats.dailyTasbeeh < stats.dailyTasbeehTarget) {
            return `أنجزت كل المهام، وبقي ${stats.dailyTasbeehRemaining} تسبيحة لإغلاق اليوم على 100%`;
        }

        if (stats.dailyTasbeeh >= stats.dailyTasbeehTarget && stats.pendingTasks > 0) {
            return `حققت هدف التسبيح اليومي، وبقي ${stats.pendingTasks} مهام للوصول إلى 100%`;
        }

        if (stats.pendingTasks === 1 && stats.dailyTasbeehRemaining === 0) {
            return 'بقيت مهمة واحدة فقط للوصول إلى يوم مثالي 🔥';
        }

        if (stats.pendingTasks === 0 && stats.dailyTasbeehRemaining > 0) {
            return `بقي ${stats.dailyTasbeehRemaining} تسبيحة فقط لتحقيق هدف اليوم`;
        }

        if (completionRate >= 75) {
            return 'أنت قريب جدًا من إكمال يومك بنجاح ممتاز 👏';
        }

        if (completionRate >= 40) {
            return 'تقدمك جيد، استمر بنفس الوتيرة 🌱';
        }

        return 'ابدأ بخطوة صغيرة: مهمة واحدة أو دفعة تسبيح، والباقي سيأتي بسهولة ✨';
    },

    // ==============================
    // التجميع النهائي (متوافق مع الواجهة القديمة)
    // ==============================
    getStatsSummary() {
        const stats = this.getDashboardStats();

        return {
            // الإحصائيات الأساسية
            dailyTasbeeh: stats.dailyTasbeeh,
            dailyTasbeehTarget: stats.dailyTasbeehTarget,
            dailyTasbeehProgressRatio: stats.dailyTasbeehProgress,
            dailyTasbeehRemaining: stats.dailyTasbeehRemaining,
            monthlyTasbeeh: stats.monthlyTasbeeh,
            streakCount: stats.streakCount,
            completedTasks: stats.completedTasks,
            totalTasks: stats.totalTasks,
            remainingTasks: stats.pendingTasks,
            tasksCompletedLifetime: stats.tasksCompletedLifetime,

            // النصوص
            tasksProgressText: this.getTasksProgressText(),
            tasbeehProgressText: this.getTasbeehProgressText(),
            remainingSummaryText: this.getRemainingSummaryText(stats),

            // النسب
            completionRate: this.getCompletionRate(), // الأصلية

            // الرسائل
            activity: this.getActivityLevelFromStats(stats),
            smartMessage: this.getSmartStatsMessage(stats)
        };
    }
};