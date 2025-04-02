// modules/settings.js
import { saveToStorage, loadFromStorage } from './storage.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './header.js';

let settings = {};

/**
 * Инициализация модуля настроек
 */
export function initSettings() {
    settings = loadFromStorage('crm-settings', {
        theme: 'light', // Тема по умолчанию
        language: 'ru',  // Язык по умолчанию
        notificationsEnabled: true, // Уведомления включены
        emailNotifications: false, // Email-уведомления отключены
        taskView: 'kanban', // Вид отображения задач по умолчанию
        projectView: 'kanban', // Вид отображения проектов по умолчанию
        autoSave: true // Автосохранение включено
    });
    
    // Применяем настройки при загрузке приложения
    applySettings();
}

/**
 * Сохранение настроек
 * @param {Object} newSettings - Новые настройки
 */
export function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    saveToStorage('crm-settings', settings);
    applySettings();
    return settings;
}

/**
 * Применение настроек к приложению
 */
function applySettings() {
    // Применяем тему
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Сохраняем вид отображения задач
    if (document.getElementById('task-view-type')) {
        document.getElementById('task-view-type').value = settings.taskView;
    }
    
    // Сохраняем вид отображения проектов
    if (document.getElementById('project-view-type')) {
        document.getElementById('project-view-type').value = settings.projectView;
    }
}

/**
 * Получение всех настроек
 * @returns {Object} - Объект с настройками
 */
export function getSettings() {
    return settings;
}

/**
 * Получение конкретной настройки
 * @param {string} key - Ключ настройки
 * @param {*} defaultValue - Значение по умолчанию
 * @returns {*} - Значение настройки
 */
export function getSetting(key, defaultValue = null) {
    return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Отображение модального окна настроек
 */
export function showSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;
    
    // Заполняем форму текущими настройками
    const themeSelect = document.getElementById('settings-theme');
    if (themeSelect) {
        themeSelect.value = settings.theme;
    }
    
    const languageSelect = document.getElementById('settings-language');
    if (languageSelect) {
        languageSelect.value = settings.language;
    }
    
    const notificationsCheckbox = document.getElementById('settings-notifications');
    if (notificationsCheckbox) {
        notificationsCheckbox.checked = settings.notificationsEnabled;
    }
    
    const emailNotificationsCheckbox = document.getElementById('settings-email-notifications');
    if (emailNotificationsCheckbox) {
        emailNotificationsCheckbox.checked = settings.emailNotifications;
    }
    
    const taskViewSelect = document.getElementById('settings-task-view');
    if (taskViewSelect) {
        taskViewSelect.value = settings.taskView;
    }
    
    const projectViewSelect = document.getElementById('settings-project-view');
    if (projectViewSelect) {
        projectViewSelect.value = settings.projectView;
    }
    
    const autoSaveCheckbox = document.getElementById('settings-auto-save');
    if (autoSaveCheckbox) {
        autoSaveCheckbox.checked = settings.autoSave;
    }
    
    // Обработчик для формы настроек
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.onsubmit = function(e) {
            e.preventDefault();
            
            const newSettings = {
                theme: themeSelect.value,
                language: languageSelect.value,
                notificationsEnabled: notificationsCheckbox.checked,
                emailNotifications: emailNotificationsCheckbox.checked,
                taskView: taskViewSelect.value,
                projectView: projectViewSelect.value,
                autoSave: autoSaveCheckbox.checked
            };
            
            saveSettings(newSettings);
            settingsModal.style.display = 'none';
            showToast('Настройки успешно сохранены', 'success');
        };
    }
    
    // Показываем модальное окно
    settingsModal.style.display = 'block';
}

/**
 * Проверка прав пользователя (администратор или нет)
 * @returns {boolean} - Результат проверки
 */
export function isUserAdmin() {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.isAdmin;
}

/**
 * Проверка доступности раздела для текущего пользователя
 * @param {string} section - Название раздела
 * @returns {boolean} - Результат проверки
 */
export function isSectionAccessible(section) {
    // Разделы, доступные только администраторам
    const adminOnlySections = ['users', 'admin'];
    
    // Если раздел доступен только администраторам, проверяем права
    if (adminOnlySections.includes(section)) {
        return isUserAdmin();
    }
    
    // Остальные разделы доступны всем пользователям
    return true;
}