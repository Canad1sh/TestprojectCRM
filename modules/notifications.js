// modules/notifications.js
import { saveToStorage, loadFromStorage } from './storage.js';
import { getCurrentUser } from './auth.js';
import { updateNotificationBadges } from './header.js';

let notifications = [];

/**
 * Инициализация модуля уведомлений
 */
export function initNotifications() {
    notifications = loadFromStorage('crm-notifications', []);
    
    // Настраиваем обработчики
    setupNotificationsHandlers();
    
    // Проверяем просроченные задачи для уведомлений
    checkOverdueTasks();
    
    // Проверяем календарь событий
    checkCalendarEvents();
}

/**
 * Настройка обработчиков событий для уведомлений
 */
function setupNotificationsHandlers() {
    // Закрытие модального окна уведомлений
    const notificationsModal = document.getElementById('notifications-modal');
    if (notificationsModal) {
        const closeBtn = notificationsModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notificationsModal.style.display = 'none';
            });
        }
        
        // Закрытие по клику вне модального окна
        window.addEventListener('click', (e) => {
            if (e.target === notificationsModal) {
                notificationsModal.style.display = 'none';
            }
        });
    }
}

/**
 * Добавление нового уведомления
 * @param {Object} notificationData - Данные уведомления
 * @returns {Object} - Созданное уведомление
 */
export function addNotification(notificationData) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    const newNotification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        isRead: false,
        userId: currentUser.id,
        ...notificationData
    };
    
    notifications.push(newNotification);
    saveNotifications();
    
    // Обновляем счетчики уведомлений
    updateNotificationBadges();
    
    return newNotification;
}

/**
 * Получение уведомлений текущего пользователя
 * @returns {Array} - Массив уведомлений
 */
export function getUserNotifications() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    return notifications
        .filter(notification => notification.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Получение непрочитанных уведомлений
 * @returns {Array} - Массив непрочитанных уведомлений
 */
export function getUnreadNotifications() {
    return getUserNotifications().filter(notification => !notification.isRead);
}

/**
 * Отметка уведомления как прочитанного
 * @param {string} notificationId - ID уведомления
 */
export function markNotificationAsRead(notificationId) {
    notifications = notifications.map(notification => {
        if (notification.id === notificationId) {
            return { ...notification, isRead: true };
        }
        return notification;
    });
    
    saveNotifications();
    updateNotificationBadges();
}

/**
 * Отметка всех уведомлений как прочитанных
 */
export function markAllNotificationsAsRead() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    notifications = notifications.map(notification => {
        if (notification.userId === currentUser.id) {
            return { ...notification, isRead: true };
        }
        return notification;
    });
    
    saveNotifications();
    updateNotificationBadges();
}

/**
 * Удаление уведомления
 * @param {string} notificationId - ID уведомления
 */
export function deleteNotification(notificationId) {
    notifications = notifications.filter(notification => notification.id !== notificationId);
    saveNotifications();
    updateNotificationBadges();
}

/**
 * Сохранение уведомлений в хранилище
 */
function saveNotifications() {
    saveToStorage('crm-notifications', notifications);
}

/**
 * Отображение модального окна с уведомлениями
 */
export function showNotifications() {
    const userNotifications = getUserNotifications();
    const notificationsModal = document.getElementById('notifications-modal');
    const notificationsList = document.getElementById('notifications-list');
    
    if (!notificationsModal || !notificationsList) return;
    
    // Очищаем список уведомлений
    notificationsList.innerHTML = '';
    
    if (userNotifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-notifications">
                <div class="empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </div>
                <p>Нет уведомлений</p>
            </div>
        `;
    } else {
        // Группируем уведомления по дате
        const groupedNotifications = groupNotificationsByDate(userNotifications);
        
        // Создаем элементы списка для каждого уведомления
        Object.keys(groupedNotifications).forEach(date => {
            // Добавляем разделитель даты
            const dateDiv = document.createElement('div');
            dateDiv.className = 'notification-date-divider';
            dateDiv.textContent = formatDateDivider(date);
            notificationsList.appendChild(dateDiv);
            
            // Добавляем уведомления этой даты
            groupedNotifications[date].forEach(notification => {
                const notificationItem = document.createElement('div');
                notificationItem.className = 'notification-item';
                if (!notification.isRead) {
                    notificationItem.classList.add('unread');
                }
                
                // Иконка в зависимости от типа уведомления
                const iconHTML = getNotificationIcon(notification.type);
                
                notificationItem.innerHTML = `
                    <div class="notification-icon">
                        ${iconHTML}
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${formatNotificationTime(notification.timestamp)}</div>
                    </div>
                    <div class="notification-actions">
                        <button class="notification-read-btn" data-id="${notification.id}" title="Отметить как прочитанное">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="notification-delete-btn" data-id="${notification.id}" title="Удалить уведомление">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;
                
                notificationsList.appendChild(notificationItem);
                
                // Добавляем обработчики для кнопок
                const readBtn = notificationItem.querySelector('.notification-read-btn');
                if (readBtn) {
                    readBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const notificationId = readBtn.getAttribute('data-id');
                        markNotificationAsRead(notificationId);
                        notificationItem.classList.remove('unread');
                        readBtn.style.display = 'none';
                    });
                }
                
                const deleteBtn = notificationItem.querySelector('.notification-delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const notificationId = deleteBtn.getAttribute('data-id');
                        deleteNotification(notificationId);
                        notificationItem.remove();
                        
                        // Если это было последнее уведомление в группе, удаляем разделитель даты
                        if (notificationsList.querySelectorAll('.notification-item').length === 0) {
                            notificationsList.innerHTML = `
                                <div class="empty-notifications">
                                    <div class="empty-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                                        </svg>
                                    </div>
                                    <p>Нет уведомлений</p>
                                </div>
                            `;
                        }
                    });
                }
                
                // При клике на уведомление также помечаем его как прочитанное
                notificationItem.addEventListener('click', () => {
                    if (!notification.isRead) {
                        markNotificationAsRead(notification.id);
                        notificationItem.classList.remove('unread');
                        const readBtn = notificationItem.querySelector('.notification-read-btn');
                        if (readBtn) {
                            readBtn.style.display = 'none';
                        }
                    }
                    
                    // Если в уведомлении есть ссылка, переходим по ней
                    if (notification.link) {
                        notificationsModal.style.display = 'none';
                        
                        // В зависимости от типа ссылки выполняем соответствующее действие
                        if (notification.linkType === 'task') {
                            import('./tasks.js').then(module => {
                                module.openTaskDetails(notification.link);
                            });
                        } else if (notification.linkType === 'project') {
                            import('./projects.js').then(module => {
                                module.showProjectDetails(notification.link);
                            });
                        } else if (notification.linkType === 'calendar') {
                            import('./calendar.js').then(module => {
                                module.openCalendarEvent(notification.link);
                            });
                        }
                    }
                });
            });
        });
        
        // Добавляем кнопку "Отметить все как прочитанные"
        const unreadCount = getUnreadNotifications().length;
        if (unreadCount > 0) {
            const markAllBtn = document.createElement('button');
            markAllBtn.className = 'mark-all-read-btn';
            markAllBtn.textContent = `Отметить все как прочитанные (${unreadCount})`;
            markAllBtn.addEventListener('click', () => {
                markAllNotificationsAsRead();
                document.querySelectorAll('.notification-item.unread').forEach(item => {
                    item.classList.remove('unread');
                    const readBtn = item.querySelector('.notification-read-btn');
                    if (readBtn) {
                        readBtn.style.display = 'none';
                    }
                });
                markAllBtn.remove();
            });
            
            notificationsList.insertBefore(markAllBtn, notificationsList.firstChild);
        }
    }
    
    // Показываем модальное окно
    notificationsModal.style.display = 'block';
}

/**
 * Группировка уведомлений по датам
 * @param {Array} notifications - Массив уведомлений
 * @returns {Object} - Объект, где ключи - даты, а значения - массивы уведомлений
 */
function groupNotificationsByDate(notifications) {
    const groups = {};
    
    notifications.forEach(notification => {
        const date = new Date(notification.timestamp).toLocaleDateString('ru-RU');
        
        if (!groups[date]) {
            groups[date] = [];
        }
        
        groups[date].push(notification);
    });
    
    return groups;
}

/**
 * Форматирование даты-разделителя
 * @param {string} dateString - Строка даты
 * @returns {string} - Отформатированная строка
 */
function formatDateDivider(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

/**
 * Форматирование времени уведомления
 * @param {string} timestampString - Строка времени
 * @returns {string} - Отформатированная строка
 */
function formatNotificationTime(timestampString) {
    const timestamp = new Date(timestampString);
    const now = new Date();
    const diffMs = now - timestamp;
    
    // Менее 1 минуты назад
    if (diffMs < 60000) {
        return 'Только что';
    }
    
    // Менее 1 часа назад
    if (diffMs < 3600000) {
        const minutes = Math.floor(diffMs / 60000);
        return `${minutes} ${declOfNum(minutes, ['минуту', 'минуты', 'минут'])} назад`;
    }
    
    // Менее 24 часов назад
    if (diffMs < 86400000) {
        const hours = Math.floor(diffMs / 3600000);
        return `${hours} ${declOfNum(hours, ['час', 'часа', 'часов'])} назад`;
    }
    
    // Если в текущем году
    if (timestamp.getFullYear() === now.getFullYear()) {
        return timestamp.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Если в другом году
    return timestamp.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Получение иконки для уведомления в зависимости от типа
 * @param {string} type - Тип уведомления
 * @returns {string} - HTML-код иконки
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'task':
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            `;
        case 'overdue':
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        case 'project':
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
            `;
        case 'calendar':
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            `;
        case 'system':
        default:
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            `;
    }
}

/**
 * Склонение существительных после числительных
 * @param {number} number - Число
 * @param {Array<string>} titles - Массив вариантов склонения
 * @returns {string} - Подходящее склонение
 */
function declOfNum(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[
        number % 100 > 4 && number % 100 < 20 ? 
        2 : 
        cases[number % 10 < 5 ? number % 10 : 5]
    ];
}

/**
 * Проверка просроченных задач для уведомлений
 */
function checkOverdueTasks() {
    import('./tasks.js').then(module => {
        const tasks = module.getTasks();
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        // Получаем задачи, назначенные текущему пользователю
        const userTasks = tasks.filter(task => 
            (task.assignedTo === currentUser.id || 
            (task.coAssignees && task.coAssignees.includes(currentUser.id))) &&
            task.status !== 'выполнена'
        );
        
        // Проверяем сроки выполнения
        const now = new Date();
        
        userTasks.forEach(task => {
            if (task.deadline) {
                const deadline = new Date(task.deadline);
                
                // Если срок уже истек и нет уведомления об этом
                if (deadline < now && !hasOverdueNotification(task.id)) {
                    addNotification({
                        type: 'overdue',
                        title: 'Просрочена задача',
                        message: `Задача "${task.title}" просрочена. Крайний срок был ${formatDate(task.deadline)}.`,
                        link: task.id,
                        linkType: 'task',
                        taskId: task.id
                    });
                }
                
                // Если срок истекает через 1 день и нет уведомления об этом
                const oneDayBefore = new Date(deadline);
                oneDayBefore.setDate(oneDayBefore.getDate() - 1);
                
                if (now >= oneDayBefore && now < deadline && !hasDeadlineNotification(task.id)) {
                    addNotification({
                        type: 'task',
                        title: 'Скоро истечет срок задачи',
                        message: `Срок задачи "${task.title}" истекает завтра (${formatDate(task.deadline)}).`,
                        link: task.id,
                        linkType: 'task',
                        taskId: task.id
                    });
                }
            }
        });
    });
    
    // Устанавливаем таймер для регулярной проверки
    setTimeout(checkOverdueTasks, 3600000); // Проверка каждый час
}

/**
 * Проверка календаря событий
 */
function checkCalendarEvents() {
    import('./calendar.js').then(module => {
        const events = module.getCalendarEvents();
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        // Получаем события текущего пользователя
        const userEvents = events.filter(event => 
            event.userId === currentUser.id ||
            (event.participants && event.participants.includes(currentUser.id))
        );
        
        // Проверяем события на сегодня и завтра
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        userEvents.forEach(event => {
            const eventDate = new Date(event.date);
            
            // Убираем часы, минуты и секунды для сравнения только дат
            const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowDateOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
            
            // Если событие на сегодня и нет уведомления об этом
            if (eventDateOnly.getTime() === nowDateOnly.getTime() && !hasEventNotification(event.id, 'today')) {
                addNotification({
                    type: 'calendar',
                    title: 'Событие сегодня',
                    message: `У вас запланировано событие "${event.title}" на сегодня.`,
                    link: event.id,
                    linkType: 'calendar',
                    eventId: event.id,
                    notificationType: 'today'
                });
            }
            
            // Если событие на завтра и нет уведомления об этом
            if (eventDateOnly.getTime() === tomorrowDateOnly.getTime() && !hasEventNotification(event.id, 'tomorrow')) {
                addNotification({
                    type: 'calendar',
                    title: 'Событие завтра',
                    message: `У вас запланировано событие "${event.title}" на завтра.`,
                    link: event.id,
                    linkType: 'calendar',
                    eventId: event.id,
                    notificationType: 'tomorrow'
                });
            }
        });
    });
    
    // Устанавливаем таймер для регулярной проверки
    setTimeout(checkCalendarEvents, 3600000); // Проверка каждый час
}

/**
 * Проверка наличия уведомления о просроченной задаче
 * @param {string} taskId - ID задачи
 * @returns {boolean} - Результат проверки
 */
function hasOverdueNotification(taskId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    return notifications.some(notification => 
        notification.userId === currentUser.id &&
        notification.type === 'overdue' &&
        notification.taskId === taskId
    );
}

/**
 * Проверка наличия уведомления о приближающемся сроке задачи
 * @param {string} taskId - ID задачи
 * @returns {boolean} - Результат проверки
 */
function hasDeadlineNotification(taskId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    return notifications.some(notification => 
        notification.userId === currentUser.id &&
        notification.type === 'task' &&
        notification.taskId === taskId
    );
}

/**
 * Проверка наличия уведомления о событии календаря
 * @param {string} eventId - ID события
 * @param {string} notificationType - Тип уведомления ('today' или 'tomorrow')
 * @returns {boolean} - Результат проверки
 */
function hasEventNotification(eventId, notificationType) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    return notifications.some(notification => 
        notification.userId === currentUser.id &&
        notification.type === 'calendar' &&
        notification.eventId === eventId &&
        notification.notificationType === notificationType
    );
}

/**
 * Форматирование даты
 * @param {string} dateString - Строка даты
 * @returns {string} - Отформатированная строка
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}