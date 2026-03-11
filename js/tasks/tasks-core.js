/**
 * ====================================================================
 * Tasks Core
 * ====================================================================
 * مسؤول عن:
 * - الحالة
 * - المهام الافتراضية
 * - بناء المهام
 * - التكامل مع storage
 */
import { storage } from '../storage.js';

export const TasksCore = {
    DEFAULT_TASKS: [
        { id: 'default_morning_azkar', text: 'قراءة أذكار الصباح ☀️', isDefault: true },
        { id: 'default_evening_azkar', text: 'قراءة أذكار المساء 🌙', isDefault: true },
        { id: 'default_quran', text: 'ورد القرآن الكريم 📖', isDefault: true },
        { id: 'default_istighfar', text: '100 استغفار 🤍', isDefault: true },
        { id: 'default_salawat', text: '100 صلاة على النبي ﷺ ✨', isDefault: true }
    ],

    getState() {
        return storage?.state || null;
    },

    getTasks() {
        const state = this.getState();
        return Array.isArray(state?.tasks) ? state.tasks : [];
    },

    saveState() {
        storage?.save?.();
    },

    createTask(taskData) {
        return {
            id: taskData.id || storage.createTaskId('task'),
            text: typeof taskData.text === 'string' ? taskData.text.trim() : '',
            completed: Boolean(taskData.completed),
            createdAt: taskData.createdAt || new Date().toISOString(),
            updatedAt: taskData.updatedAt || new Date().toISOString(), // تمت الإضافة هنا
            isDefault: Boolean(taskData.isDefault)
        };
    },

    buildDefaultTasks() {
        return this.DEFAULT_TASKS.map(task => this.createTask({
            ...task,
            completed: false
        }));
    },

    normalizeTasks(tasks) {
        if (!Array.isArray(tasks)) return [];

        return tasks
            .map(task => this.createTask(task))
            .filter(task => task.text);
    },

    ensureTaskState() {
        const state = this.getState();
        if (!state) return;

        state.tasks = this.normalizeTasks(state.tasks);

        if (state.tasks.length === 0) {
            state.tasks = this.buildDefaultTasks();
            this.saveState();
            return;
        }

        const existingIds = new Set(state.tasks.map(task => task.id));
        let hasChanges = false;

        this.DEFAULT_TASKS.forEach(defaultTask => {
            if (!existingIds.has(defaultTask.id)) {
                state.tasks.push(this.createTask({
                    ...defaultTask,
                    completed: false
                }));
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveState();
        }
    }
};