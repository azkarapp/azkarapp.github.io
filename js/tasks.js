import { storage } from './storage.js';
import { content } from './content.js';
import { achievements } from './achievements.js';
import { TasksCore } from './tasks/tasks-core.js';
import { TasksStats } from './tasks/tasks-stats.js';
import { TasksMotivation } from './tasks/tasks-motivation.js';
import { TasksUI } from './tasks/tasks-ui.js';
import { scheduleRender } from './render-scheduler.js';
import { setCurrentTasksTab } from './ui-state.js';

export const tasks = {
    taskToDeleteId: null,
    initialized: false,
    activeTab: 'tasks',

    // دالة مساعدة لتجميع عمليات إعادة الرسم
    queueTasksRerender() {
        scheduleRender('tasks-render', () => this.render());
        scheduleRender('tasks-stats-render', () => this.renderStatsOnly?.());

        if (typeof content?.renderMiniStats === 'function') {
            scheduleRender('mini-stats-render', () => content.renderMiniStats());
        }
    },

    init() {
        if (!storage || !TasksCore || !TasksStats || !TasksUI) return;
        if (!this.initialized) {
            TasksCore.ensureTaskState();
            this.initialized = true;
        }
        this.refreshVisibleState();
    },

    switchTab(tabName) {
        this.activeTab = tabName === 'stats' ? 'stats' : 'tasks';
        setCurrentTasksTab(this.activeTab);
        this.refreshVisibleState();
    },

    renderStatsOnly() {
        TasksUI.renderStatsOnly();
    },

    // ✅ التعديل الأساسي: تمرير المعاملات المطلوبة لـ TasksUI.renderList
    refreshVisibleState() {
        TasksCore.ensureTaskState();

        if (this.activeTab === 'stats') {
            TasksUI.renderStatsOnly();
            TasksUI.renderMotivation();
            TasksUI.switchTab('stats');
            return;
        }

        // تجهيز البيانات والعناصر المطلوبة للرسم
        const tasksList = TasksCore.getTasks();                     // قائمة المهام
        const template = document.getElementById('tpl-task-card');  // template
        const listRoot = document.getElementById('tasksList');       // عنصر القائمة
        const emptyStateElement = document.getElementById('tasksEmptyState'); // empty state

        // استدعاء renderList بالمعاملات الصحيحة
        TasksUI.renderList(tasksList, template, listRoot, this, emptyStateElement);
        TasksUI.switchTab('tasks');
    },

    restoreDefaultTasks() {
        TasksUI.showModal('restoreTasksModal');
    },

    closeRestoreModal() {
        TasksUI.hideModal('restoreTasksModal');
    },

    confirmRestoreTasks() {
        const stateTasks = TasksCore.getTasks();
        const customTasks = stateTasks.filter(t => !t.isDefault);
        const defaults = TasksCore.buildDefaultTasks();

        storage.state.tasks = [...defaults, ...customTasks];
        TasksCore.saveState();

        this.queueTasksRerender();
        this.closeRestoreModal();
        TasksUI.notify('تم استعادة المهام الافتراضية');
    },

    addTask() {
        const input = TasksUI.getElement('newTaskInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        const tasksList = TasksCore.getTasks();
        const newTask = TasksCore.createTask({ text, isDefault: false });
        tasksList.push(newTask);
        TasksCore.saveState();

        input.value = '';

        this.queueTasksRerender();
        TasksUI.notify('تمت الإضافة بنجاح ✨');
    },
        toggleTask(taskId) {
        const tasksList = storage.state.tasks || [];
        const task = tasksList.find(t => t.id === taskId);
        if (!task) return;

        const wasCompleted = task.completed;
        task.completed = !wasCompleted;
        task.updatedAt = new Date().toISOString();

        if (task.completed && !wasCompleted && storage) {
            storage.state.tasksCompleted = (storage.state.tasksCompleted || 0) + 1;
        }

        TasksCore.saveState();
        achievements?.checkAchievements?.();

        this.queueTasksRerender();

        if (navigator.vibrate) navigator.vibrate(40);

        const completed = TasksStats.getCompletedTasksCount();
        const total = TasksStats.getTotalTasksCount();

        if (completed === total && total > 0) {
            TasksUI.notify(TasksMotivation.getMessage());
        }
    },

    deleteTask(taskId) {
        this.taskToDeleteId = taskId;
        TasksUI.showModal('deleteTaskModal');
    },

    closeDeleteModal() {
        TasksUI.hideModal('deleteTaskModal');
        this.taskToDeleteId = null;
    },

    confirmDeleteTask() {
        if (this.taskToDeleteId === null) return;

        const tasksList = TasksCore.getTasks();
        const taskIndex = tasksList.findIndex(t => t.id === this.taskToDeleteId);
        const task = tasksList[taskIndex];

        if (!task) {
            this.closeDeleteModal();
            return;
        }

        if (task.isDefault) {
            this.closeDeleteModal();
            TasksUI.notify('لا يمكن حذف المهام الافتراضية');
            return;
        }

        tasksList.splice(taskIndex, 1);
        TasksCore.saveState();

        this.queueTasksRerender();
        this.closeDeleteModal();
        TasksUI.notify('تم حذف المهمة');
    },

    render() {
        this.refreshVisibleState();
    }
};