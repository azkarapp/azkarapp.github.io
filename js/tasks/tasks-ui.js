/**
 * ====================================================================
 * Tasks UI
 * ====================================================================
 * مسؤول عن:
 * - عناصر DOM
 * - المودالات
 * - render للقائمة والإحصائيات الحالية
 * - التبويبات
 * 
 * لا يحتوي على أي منطق أعمال أو تعديل مباشر في storage.
 * جميع التحديثات البصرية تتم عبر الدوال المتخصصة.
 */
import { app } from '../app.js';
import { TasksStats } from './tasks-stats.js';
import { TasksMotivation } from './tasks-motivation.js';
import {
    setTextContent,
    setProgress,
    toggleHidden,
    toggleClass,
    setAriaPressed,
} from '../dom.js';

export const TasksUI = {

    // ==============================
    // المساعدات الأساسية للـ DOM
    // ==============================
    getElement(id) {
        return document.getElementById(id);
    },

    // ==============================
    // المودالات
    // ==============================
    showModal(id) {
        const modal = this.getElement(id);
        if (modal) modal.style.display = 'flex';
    },

    hideModal(id) {
        const modal = this.getElement(id);
        if (modal) modal.style.display = 'none';
    },

    notify(message, type = 'success') {
        app?.showToast?.(message, type);
    },

    // ==============================
    // عرض الإحصائيات فقط (دون قائمة المهام)
    // ==============================
    renderStatsOnly() {
        const summary = TasksStats.getStatsSummary();

        // تحديث النصوص باستخدام setTextContent
        setTextContent('statDailyTasbeeh', summary.dailyTasbeeh);
        setTextContent('statDailyTasbeehInline', summary.dailyTasbeeh);
        setTextContent('statDailyTasbeehTargetInline', summary.dailyTasbeehTarget);
        setTextContent('statStreak', summary.streakCount);
        setTextContent('statMonthlyTasbeeh', summary.monthlyTasbeeh);
        setTextContent('statTasksCompleted', summary.completedTasks);
        setTextContent('statTasksTotal', summary.totalTasks);
        setTextContent('statTasksPercent', `${summary.completionRate}%`);
        setTextContent('statTasksPercentInline', `${summary.completionRate}%`);
        setTextContent('statsActivityLabel', summary.activity.label);
        setTextContent('tasksBadgeText', TasksMotivation.getBadge());
        setTextContent('statTasbeehPercentInline', `${Math.round(summary.dailyTasbeehProgressRatio * 100)}%`);
        setTextContent('statTasksProgressDetails', summary.tasksProgressText);
        setTextContent('statTasbeehProgressDetails', summary.tasbeehProgressText);
        setTextContent('statRemainingSummary', summary.remainingSummaryText);
        setTextContent('statsSmartMessage', summary.smartMessage);

        // تحديث أشرطة التقدم باستخدام setProgress (نسبة من 0 إلى 1)
        setProgress('tasksProgressBar', summary.completionRate / 100);
        setProgress('tasbeehProgressBar', summary.dailyTasbeehProgressRatio);
    },

    // ==============================
    // عرض الرسالة التحفيزية
    // ==============================
    renderMotivation() {
        const motivationEl = this.getElement('tasksMotivationText');
        if (motivationEl) {
            setTextContent(motivationEl, TasksMotivation.getMessage());
        }
    },

    // ==============================
    // إدارة الحالة الفارغة
    // ==============================
    renderEmptyState(listRoot, emptyStateElement, isEmpty) {
        toggleHidden(emptyStateElement, !isEmpty);
        toggleHidden(listRoot, isEmpty);
    },

    // ==============================
    // تحديث الحالة البصرية لبطاقة مهمة (بدون تحديث النص)
    // ==============================
    updateTaskCardState(taskCard, task) {
        if (!taskCard || !task) return;

        // class للحالة المكتملة
        toggleClass(taskCard, 'is-completed', Boolean(task.completed));

        const toggleBtn = taskCard.querySelector('[data-role="toggle-task"]');
        if (toggleBtn) {
            // تحديث الأيقونة أو النص حسب الحالة
            toggleBtn.innerHTML = task.completed
                ? '<i class="fa-solid fa-circle-check" style="color: var(--primary); font-size: 1.3rem;"></i>'
                : '<i class="fa-regular fa-circle" style="font-size: 1.3rem; color: var(--text-sub);"></i>';
            setAriaPressed(toggleBtn, task.completed);
        }

        const deleteBtn = taskCard.querySelector('[data-role="delete-task"]');
        if (deleteBtn) {
            deleteBtn.style.display = task.isDefault ? 'none' : 'inline-flex';
        }
    },

    // ==============================
    // إنشاء عنصر مهمة واحد من القالب
    // ==============================
    renderTaskItem(task, template, controller) {
        // التحقق من صحة المعاملات والقالب
        if (!template?.content?.firstElementChild || !task?.id || !controller) {
            return null;
        }

        const clone = template.content.cloneNode(true);
        const taskCard = clone.firstElementChild;
        if (!taskCard) {
            return null;
        }

        // إضافة data-task-id
        taskCard.dataset.taskId = task.id;

        // تعيين النص
        const taskText = taskCard.querySelector('[data-role="task-text"]');
        setTextContent(taskText, task.text || '');

        // ربط الأزرار
        const toggleBtn = taskCard.querySelector('[data-role="toggle-task"]');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => controller.toggleTask(task.id));
        }

        const deleteBtn = taskCard.querySelector('[data-role="delete-task"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => controller.deleteTask(task.id));
        }

        // تحديث الحالة البصرية
        this.updateTaskCardState(taskCard, task);

        return taskCard;
    },

    // ==============================
    // عرض قائمة المهام كاملة
    // ==============================
    renderList(tasks, template, listRoot, controller, emptyStateElement = null) {
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const isEmpty = safeTasks.length === 0;

        // إدارة عرض الحالة الفارغة (تعمل حتى لو كان listRoot أو template غير موجودين)
        this.renderEmptyState(listRoot, emptyStateElement, isEmpty);

        // إذا كانت القائمة فارغة أو لا يوجد قالب أو لا يوجد عنصر جذر، نتوقف
        if (isEmpty || !listRoot || !template) {
            return;
        }

        // بناء القائمة باستخدام DocumentFragment
        const fragment = document.createDocumentFragment();
        safeTasks.forEach(task => {
            const taskNode = this.renderTaskItem(task, template, controller);
            if (taskNode) {
                fragment.appendChild(taskNode);
            }
        });

        // استبدال المحتوى دفعة واحدة
        listRoot.replaceChildren(fragment);
    },

    // ==============================
    // تحديث عقدة مهمة واحدة (للتحديث الجزئي)
    // ==============================
    updateSingleTaskNode(taskId, task, rootElement) {
        if (!taskId || !task || !rootElement) return;

        const node = rootElement.querySelector(`[data-task-id="${taskId}"]`);
        if (!node) return;

        // تحديث النص إذا تغير
        const taskText = node.querySelector('[data-role="task-text"]');
        setTextContent(taskText, task.text || '');

        // تحديث الحالة البصرية
        this.updateTaskCardState(node, task);
    },

    // ==============================
    // تبديل التبويب (tasks / stats)
    // ==============================
    switchTab(tabName) {
        const tasksView = this.getElement('tasksView');
        const statsView = this.getElement('statsView');
        const tasksBtn = this.getElement('tasksTabBtn');
        const statsBtn = this.getElement('statsTabBtn');

        const isTasksTab = tabName === 'tasks';

        if (tasksView && statsView) {
            tasksView.classList.toggle('is-hidden', !isTasksTab);
            statsView.classList.toggle('is-hidden', isTasksTab);
        }

        if (tasksBtn && statsBtn) {
            tasksBtn.classList.toggle('active', isTasksTab);
            statsBtn.classList.toggle('active', !isTasksTab);
        }
    }
};