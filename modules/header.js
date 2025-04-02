// modules/header.js
import { getCurrentUser } from './auth.js';
import { loadFromStorage, saveToStorage } from './storage.js';
import { getUnreadNotifications } from './notifications.js';

let clockInterval = null;
let themeMode = loadFromStorage('crm-theme-mode', 'light');

/**
 * Инициализация шапки приложения
 */
export function initHeader() {
    // Устанавливаем имя и роль пользователя
    setupUserInfo();
    
    // Запускаем часы
    startClock();
    
    // Устанавливаем обработчики
    setupHeaderHandlers();
    
    // Применяем текущую тему
    applyTheme(themeMode);
    
    // Обновляем счетчики уведомлений
    updateNotificationBadges();
    
    // Обработчик глобального поиска
    setupGlobalSearch();
}

/**
 * Установка информации о пользователе в шапке
 */
function setupUserInfo() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    // Устанавливаем имя пользователя
    const userNameElement = document.getElementById('header-user-name');
    if (userNameElement) {
        userNameElement.textContent = currentUser.username;
    }
    
    // Устанавливаем роль пользователя
    const userRoleElement = document.getElementById('header-user-role');
    if (userRoleElement) {
        userRoleElement.textContent = currentUser.isAdmin ? 'Администратор' : 'Пользователь';
    }
    
    // Устанавливаем аватар пользователя
    const userAvatarElement = document.getElementById('header-user-avatar');
    if (userAvatarElement) {
        if (currentUser.avatar) {
            // Если у пользователя есть аватар, показываем его
            userAvatarElement.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.username}">`;
        } else {
            // Иначе показываем первую букву имени
            userAvatarElement.textContent = currentUser.username.charAt(0).toUpperCase();
        }
    }
}

/**
 * Запуск часов в шапке
 */
function startClock() {
    // Очищаем предыдущий интервал, если он существует
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    
    // Функция обновления времени и даты
    const updateClock = () => {
        const now = new Date();
        
        // Обновляем время
        const clockElement = document.getElementById('header-clock');
        if (clockElement) {
            clockElement.textContent = now.toLocaleTimeString('ru-RU');
        }
        
        // Обновляем дату
        const dateElement = document.getElementById('header-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
            });
        }
    };
    
    // Обновляем сразу после запуска
    updateClock();
    
    // Устанавливаем интервал обновления каждую секунду
    clockInterval = setInterval(updateClock, 1000);
}

/**
 * Установка обработчиков событий для шапки
 */
function setupHeaderHandlers() {
    // Обработчик клика по меню пользователя
    const userMenu = document.getElementById('user-menu');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    
    if (userMenu && userMenuDropdown) {
        userMenu.addEventListener('click', () => {
            userMenuDropdown.classList.toggle('active');
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                userMenuDropdown.classList.remove('active');
            }
        });
    }
    
    // Обработчик переключения темы
    const themeSwitcherBtn = document.getElementById('theme-switcher');
    if (themeSwitcherBtn) {
        themeSwitcherBtn.addEventListener('click', toggleTheme);
    }
    
    // Обработчик клика по значку уведомлений
    const notificationIcon = document.getElementById('notification-icon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', () => {
            import('./notifications.js').then(module => {
                module.showNotifications();
            });
        });
    }
    
    // Обработчик клика по значку сообщений
    const messagesIcon = document.getElementById('messages-icon');
    if (messagesIcon) {
        messagesIcon.addEventListener('click', () => {
            import('./messaging.js').then(module => {
                module.renderConversationsList();
                document.getElementById('messaging-modal').style.display = 'block';
            });
        });
    }
    
    // Обработчик для личного кабинета
    const profileMenuItem = document.getElementById('profile-menu-item');
    if (profileMenuItem) {
        profileMenuItem.addEventListener('click', () => {
            import('./profile.js').then(module => {
                module.showProfileSettings();
            });
        });
    }
    
    // Обработчик для настроек
    const settingsMenuItem = document.getElementById('settings-menu-item');
    if (settingsMenuItem) {
        settingsMenuItem.addEventListener('click', () => {
            import('./settings.js').then(module => {
                module.showSettings();
            });
        });
    }
    
    // Обработчик для выхода
    const logoutMenuItem = document.getElementById('logout-menu-item');
    if (logoutMenuItem) {
        logoutMenuItem.addEventListener('click', () => {
            import('./auth.js').then(module => {
                module.logout();
            });
        });
    }
}

/**
 * Переключение между светлой и темной темой
 */
function toggleTheme() {
    themeMode = themeMode === 'light' ? 'dark' : 'light';
    applyTheme(themeMode);
    saveToStorage('crm-theme-mode', themeMode);
}

/**
 * Применение темы к документу
 * @param {string} mode - Режим темы ('light' или 'dark')
 */
function applyTheme(mode) {
    if (mode === 'dark') {
        document.body.classList.add('dark-mode');
        const themeSwitcherIcon = document.getElementById('theme-switcher-icon');
        if (themeSwitcherIcon) {
            themeSwitcherIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            `;
        }
    } else {
        document.body.classList.remove('dark-mode');
        const themeSwitcherIcon = document.getElementById('theme-switcher-icon');
        if (themeSwitcherIcon) {
            themeSwitcherIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            `;
        }
    }
}

/**
 * Обновление счетчиков уведомлений
 */
export function updateNotificationBadges() {
    // Получаем непрочитанные уведомления
    const unreadNotifications = getUnreadNotifications();
    const notificationBadge = document.getElementById('notification-badge');
    
    if (notificationBadge) {
        if (unreadNotifications.length > 0) {
            notificationBadge.textContent = unreadNotifications.length > 9 ? '9+' : unreadNotifications.length;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    // Обновляем счетчик непрочитанных сообщений
    import('./messaging.js').then(module => {
        const conversations = module.getUserConversations();
        const unreadCount = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        
        const messagesBadge = document.getElementById('messages-badge');
        if (messagesBadge) {
            if (unreadCount > 0) {
                messagesBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                messagesBadge.style.display = 'flex';
            } else {
                messagesBadge.style.display = 'none';
            }
        }
    });
}

/**
 * Настройка глобального поиска
 */
function setupGlobalSearch() {
    const searchInput = document.getElementById('header-search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchQuery = searchInput.value.trim();
            if (searchQuery) {
                import('./search.js').then(module => {
                    module.performGlobalSearch(searchQuery);
                });
            }
        }
    });
    
    // Добавляем также обработчик фокуса для мобильной версии
    searchInput.addEventListener('focus', () => {
        import('./search.js').then(module => {
            module.showSearchSuggestions();
        });
    });
}

/**
 * Отображение краткого уведомления
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления ('success', 'error', 'warning', 'info')
 * @param {number} duration - Длительность отображения в миллисекундах
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Создаем новое уведомление
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            ${getToastIcon(type)}
        </div>
        <div class="toast-content">${message}</div>
        <button class="toast-close">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Добавляем класс для анимации появления
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Добавляем обработчик клика на кнопку закрытия
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    // Автоматически скрываем через указанное время
    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

/**
 * Получение иконки для уведомления в зависимости от типа
 * @param {string} type - Тип уведомления
 * @returns {string} - HTML-код иконки
 */
function getToastIcon(type) {
    switch (type) {
        case 'success':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`;
        case 'error':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
        case 'warning':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`;
        case 'info':
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
    }
}