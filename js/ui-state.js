// js/ui-state.js

export const uiState = {
    currentSection: 'home',
    currentTasksTab: 'tasks',
    activeModal: null,
    isRendering: false,
    lastRenderAt: 0
};

export function setActiveModal(modalName) {
    uiState.activeModal = modalName || null;
}

export function clearActiveModal() {
    uiState.activeModal = null;
}

export function setCurrentSection(sectionName) {
    if (typeof sectionName === 'string' && sectionName.trim()) {
        uiState.currentSection = sectionName.trim();
    }
}

export function setCurrentTasksTab(tabName) {
    if (typeof tabName === 'string' && tabName.trim()) {
        uiState.currentTasksTab = tabName.trim();
    }
}