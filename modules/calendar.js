// modules/calendar.js - модуль для работы с календарем и событиями
import { saveToStorage, loadFromStorage } from './storage.js';
import { getTasks } from './tasks.js';
import { getProjectByTaskId } from './projects.js';
import { getCurrentUser } from './auth.js';
import { showNotification } from './ui-enhancements.js';

let calendarEvents = [];
let reminderTimeouts = {}; // Хранение идентификаторов setTimeout для напоминаний

/**
 * Инициализация модуля календаря
 */
export function initCalendar() {
    // Загрузка событий из хранилища
    calendarEvents = loadFromStorage('crm-calendar-events', []);
    
    // Установка обработчиков для календаря
    setupCalendarControls();
    
    // Планирование напоминаний для существующих событий
    scheduleAllReminders();
    
    console.log('Модуль календаря инициализирован');
}

/**
 * Настройка элементов управления календарем
 */
function setupCalendarControls() {
    // Кнопки навигации по месяцам
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            const currentMonthStr = document.getElementById('current-month').dataset.date;
            if (currentMonthStr) {
                const currentMonth = new Date(currentMonthStr);
                currentMonth.setMonth(currentMonth.getMonth() - 1);
                renderMonth(currentMonth);
            }
        });
        
        nextMonthBtn.addEventListener('click', () => {
            const currentMonthStr = document.getElementById('current-month').dataset.date;
            if (currentMonthStr) {
                const currentMonth = new Date(currentMonthStr);
                currentMonth.setMonth(currentMonth.getMonth() + 1);
                renderMonth(currentMonth);
            }
        });
    }
    
    // Кнопка добавления события
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            showEventForm();
        });
    }
    
    // Форма события
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventFormSubmit);
    }
}

/**
 * Обработчик отправки формы события
 * @param {Event} e - Событие отправки формы
 */
function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const reminder = parseInt(document.getElementById('event-reminder').value);
    
    if (!title || !date) {
        showNotification('Необходимо указать название и дату события', 'error');
        return;
    }
    
    if (eventId) {
        // Обновление существующего события
        updateEvent(eventId, { title, description, date, time, reminder });
        showNotification('Событие обновлено', 'success');
    } else {
        // Создание нового события
        addEvent({ title, description, date, time, reminder });
        showNotification('Событие добавлено', 'success');
    }
    
    // Закрытие модального окна
    document.getElementById('event-modal').style.display = 'none';
    
    // Перерисовка календаря
    const currentMonthStr = document.getElementById('current-month').dataset.date;
    if (currentMonthStr) {
        renderMonth(new Date(currentMonthStr));
    }
}

/**
 * Рендеринг календаря на указанный месяц
 * @param {Date} date - Дата для отображения месяца
 */
export function renderMonth(date) {
    const calendarContainer = document.getElementById('calendar-days');
    const currentMonthDisplay = document.getElementById('current-month');
    
    if (!calendarContainer || !currentMonthDisplay) return;
    
    // Сохранение текущей даты для использования в навигации
    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    currentMonthDisplay.dataset.date = monthDate.toISOString();
    
    // Очистка контейнера
    calendarContainer.innerHTML = '';
    
    // Установка заголовка месяца
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    currentMonthDisplay.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Получение первого дня месяца
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Получение последнего дня месяца
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Определение сдвига для начала месяца (0 - понедельник, 6 - воскресенье)
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex < 0) firstDayIndex = 6; // Воскресенье
    
    // Добавление дней предыдущего месяца
    const prevMonthLastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    
    for (let i = 0; i < firstDayIndex; i++) {
        const day = prevMonthLastDay - firstDayIndex + i + 1;
        const dayDate = new Date(date.getFullYear(), date.getMonth() - 1, day);
        const dayElement = createDayElement(dayDate, 'prev-month');
        calendarContainer.appendChild(dayElement);
    }
    
    // Добавление дней текущего месяца
    const today = new Date();
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayDate = new Date(date.getFullYear(), date.getMonth(), i);
        let dayClass = '';
        
        // Проверка на текущий день
        if (today.getFullYear() === date.getFullYear() && 
            today.getMonth() === date.getMonth() && 
            today.getDate() === i) {
            dayClass = 'today';
        }
        
        const dayElement = createDayElement(dayDate, dayClass);
        calendarContainer.appendChild(dayElement);
    }
    
    // Добавление дней следующего месяца
    const daysAdded = firstDayIndex + lastDay.getDate();
    const remainingCells = 42 - daysAdded; // 6 недель по 7 дней = 42 ячейки
    
    for (let i = 1; i <= remainingCells; i++) {
        const dayDate = new Date(date.getFullYear(), date.getMonth() + 1, i);
        const dayElement = createDayElement(dayDate, 'next-month');
        calendarContainer.appendChild(dayElement);
    }
    
    // Загрузка и отображение событий
    loadEventsForMonth(date);
}

/**
 * Создание элемента дня календаря
 * @param {Date} date - Дата дня
 * @param {string} className - Дополнительный класс для ячейки
 * @returns {HTMLElement} Элемент ячейки дня
 */
function createDayElement(date, className = '') {
    const dayElement = document.createElement('div');
    dayElement.className = `calendar-day ${className}`;
    dayElement.dataset.date = date.toISOString().split('T')[0];
    
    const dateElement = document.createElement('div');
    dateElement.className = 'calendar-date';
    dateElement.textContent = date.getDate();
    
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-events';
    
    dayElement.appendChild(dateElement);
    dayElement.appendChild(eventsContainer);
    
    // Обработчик клика для добавления события
    dayElement.addEventListener('click', () => {
        showEventForm(date);
    });
    
    return dayElement;
}

/**
 * Загрузка и отображение событий для месяца
 * @param {Date} date - Дата месяца
 */
function loadEventsForMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Загрузка задач с дедлайнами в этом месяце
    const tasks = getTasks().filter(task => {
        if (!task.deadline) return false;
        
        const deadlineDate = new Date(task.deadline);
        return deadlineDate.getFullYear() === year && deadlineDate.getMonth() === month;
    });
    
    // Загрузка событий календаря
    const events = calendarEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
    
    // Отображение событий на календаре
    displayEvents(tasks, events);
}

/**
 * Отображение событий и задач на календаре
 * @param {Array} tasks - Задачи для отображения
 * @param {Array} events - События для отображения
 */
function displayEvents(tasks, events) {
    // Отображение задач
    tasks.forEach(task => {
        const deadlineDate = new Date(task.deadline);
        const dateString = deadlineDate.toISOString().split('T')[0];
        const dayElement = document.querySelector(`.calendar-day[data-date="${dateString}"]`);
        
        if (dayElement) {
            const eventsContainer = dayElement.querySelector('.calendar-events');
            
            const taskElement = document.createElement('div');
            taskElement.className = 'calendar-event task';
            if (deadlineDate < new Date() && task.status !== 'выполнена') {
                taskElement.classList.add('overdue');
            }
            
            // Получение проекта, если задача привязана
            let projectName = '';
            if (task.projectId) {
                const project = getProjectByTaskId(task.id);
                if (project) {
                    projectName = ` (${project.name})`;
                }
            }
            
            taskElement.textContent = task.title + projectName;
            taskElement.title = `Задача: ${task.title}${projectName}\nСтатус: ${task.status}\nПриоритет: ${task.priority}`;
            
            // Обработчик для открытия задачи
            taskElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращение всплытия, чтобы не срабатывал клик по дню
                import('./tasks.js').then(module => {
                    module.showTaskDetails(task.id);
                });
            });
            
            eventsContainer.appendChild(taskElement);
        }
    });
    
    // Отображение событий календаря
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const dateString = eventDate.toISOString().split('T')[0];
        const dayElement = document.querySelector(`.calendar-day[data-date="${dateString}"]`);
        
        if (dayElement) {
            const eventsContainer = dayElement.querySelector('.calendar-events');
            
            const eventElement = document.createElement('div');
            eventElement.className = 'calendar-event';
            eventElement.textContent = event.title;
            
            let timeStr = '';
            if (event.time) {
                timeStr = ` (${event.time})`;
            }
            
            eventElement.title = `Событие: ${event.title}${timeStr}\n${event.description || ''}`;
            
            // Обработчик для открытия события
            eventElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращение всплытия, чтобы не срабатывал клик по дню
                showEventForm(null, event);
            });
            
            eventsContainer.appendChild(eventElement);
        }
    });
}

/**
 * Показ формы события
 * @param {Date} date - Дата для предварительного заполнения (опционально)
 * @param {Object} event - Существующее событие для редактирования (опционально)
 */
function showEventForm(date = null, event = null) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const titleInput = document.getElementById('event-title');
    const descriptionInput = document.getElementById('event-description');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    const reminderSelect = document.getElementById('event-reminder');
    const eventIdInput = document.getElementById('event-id');
    
    // Очистка формы
    form.reset();
    eventIdInput.value = '';
    
    // Установка заголовка
    document.getElementById('event-modal-title').textContent = 
        event ? 'Редактирование события' : 'Добавление события';
    
    // Если передана дата, устанавливаем её
    if (date) {
        const formattedDate = date.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }
    
    // Если передано событие, заполняем форму
    if (event) {
        titleInput.value = event.title;
        descriptionInput.value = event.description || '';
        dateInput.value = event.date;
        timeInput.value = event.time || '';
        reminderSelect.value = event.reminder || '0';
        eventIdInput.value = event.id;
        
        // Добавление кнопки удаления
        if (!document.getElementById('delete-event-btn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'delete-event-btn';
            deleteBtn.type = 'button';
            deleteBtn.className = 'secondary-btn danger';
            deleteBtn.textContent = 'Удалить';
            deleteBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить это событие?')) {
                    deleteEvent(event.id);
                    modal.style.display = 'none';
                    
                    // Перерисовка календаря
                    const currentMonthStr = document.getElementById('current-month').dataset.date;
                    if (currentMonthStr) {
                        renderMonth(new Date(currentMonthStr));
                    }
                }
            });
            
            const formActions = form.querySelector('.form-actions');
            if (formActions) {
                formActions.insertBefore(deleteBtn, formActions.firstChild);
            }
        }
    } else {
        // Удаление кнопки удаления, если она существует
        const deleteBtn = document.getElementById('delete-event-btn');
        if (deleteBtn) {
            deleteBtn.remove();
        }
    }
    
    // Отображение модального окна
    modal.style.display = 'block';
}

/**
 * Добавление нового события
 * @param {Object} eventData - Данные события
 * @returns {Object} Новое событие
 */
function addEvent(eventData) {
    const currentUser = getCurrentUser();
    
    const newEvent = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.id : null,
        ...eventData
    };
    
    calendarEvents.push(newEvent);
    saveEvents();
    
    // Планирование напоминания, если указано
    if (newEvent.reminder > 0) {
        scheduleReminder(newEvent);
    }
    
    return newEvent;
}

/**
 * Обновление существующего события
 * @param {string} eventId - Идентификатор события
 * @param {Object} eventData - Новые данные события
 * @returns {Object|null} Обновленное событие или null, если не найдено
 */
function updateEvent(eventId, eventData) {
    const index = calendarEvents.findIndex(event => event.id === eventId);
    
    if (index === -1) return null;
    
    // Очистка напоминания, если оно было установлено
    if (reminderTimeouts[eventId]) {
        clearTimeout(reminderTimeouts[eventId]);
        delete reminderTimeouts[eventId];
    }
    
    const updatedEvent = {
        ...calendarEvents[index],
        ...eventData,
        updatedAt: new Date().toISOString()
    };
    
    calendarEvents[index] = updatedEvent;
    saveEvents();
    
    // Планирование напоминания, если указано
    if (updatedEvent.reminder > 0) {
        scheduleReminder(updatedEvent);
    }
    
    return updatedEvent;
}

/**
 * Удаление события
 * @param {string} eventId - Идентификатор события
 * @returns {boolean} Результат удаления
 */
function deleteEvent(eventId) {
    // Очистка напоминания, если оно было установлено
    if (reminderTimeouts[eventId]) {
        clearTimeout(reminderTimeouts[eventId]);
        delete reminderTimeouts[eventId];
    }
    
    const initialLength = calendarEvents.length;
    calendarEvents = calendarEvents.filter(event => event.id !== eventId);
    
    if (calendarEvents.length < initialLength) {
        saveEvents();
        showNotification('Событие удалено', 'success');
        return true;
    }
    
    return false;
}

/**
 * Сохранение событий в хранилище
 */
function saveEvents() {
    saveToStorage('crm-calendar-events', calendarEvents);
}

/**
 * Планирование всех напоминаний при запуске
 */
function scheduleAllReminders() {
    // Очистка существующих напоминаний
    Object.keys(reminderTimeouts).forEach(id => {
        clearTimeout(reminderTimeouts[id]);
    });
    reminderTimeouts = {};
    
    // Планирование напоминаний для событий
    calendarEvents.forEach(event => {
        if (event.reminder && event.reminder > 0) {
            scheduleReminder(event);
        }
    });
    
    // Планирование напоминаний для задач с дедлайнами
    getTasks().forEach(task => {
        if (task.deadline && task.status !== 'выполнена') {
            scheduleTaskReminder(task);
        }
    });
}

/**
 * Планирование напоминания для события
 * @param {Object} event - Событие
 */
function scheduleReminder(event) {
    if (!event.reminder || event.reminder <= 0) return;
    
    const eventDate = new Date(event.date);
    
    // Если указано время, учитываем его
    if (event.time) {
        const [hours, minutes] = event.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0);
    } else {
        // По умолчанию событие в 9:00
        eventDate.setHours(9, 0, 0);
    }
    
    // Вычисляем время напоминания (за указанное количество минут)
    const reminderTime = new Date(eventDate.getTime() - (event.reminder * 60 * 1000));
    
    // Если время напоминания уже прошло, не устанавливаем
    if (reminderTime <= new Date()) return;
    
    // Очистка предыдущего напоминания, если оно существует
    if (reminderTimeouts[event.id]) {
        clearTimeout(reminderTimeouts[event.id]);
    }
    
    // Установка нового напоминания
    const delay = reminderTime.getTime() - Date.now();
    reminderTimeouts[event.id] = setTimeout(() => {
        showNotification(`Напоминание: ${event.title}`, 'info', 0);
        playNotificationSound();
    }, delay);
}

/**
 * Планирование напоминания для задачи
 * @param {Object} task - Задача
 */
function scheduleTaskReminder(task) {
    if (!task.deadline || task.status === 'выполнена') return;
    
    const deadlineDate = new Date(task.deadline);
    
    // Напоминание за день до дедлайна
    const reminderTime = new Date(deadlineDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(9, 0, 0); // Напоминание в 9:00
    
    // Если время напоминания уже прошло, не устанавливаем
    if (reminderTime <= new Date()) return;
    
    // Очистка предыдущего напоминания, если оно существует
    const reminderKey = `task_${task.id}`;
    if (reminderTimeouts[reminderKey]) {
        clearTimeout(reminderTimeouts[reminderKey]);
    }
    
    // Установка нового напоминания
    const delay = reminderTime.getTime() - Date.now();
    reminderTimeouts[reminderKey] = setTimeout(() => {
        showNotification(`Напоминание: Задача "${task.title}" должна быть выполнена завтра!`, 'warning', 0);
        playNotificationSound();
    }, delay);
}

/**
 * Воспроизведение звука уведомления
 */
function playNotificationSound() {
    try {
        const audio = new Audio('/assets/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => {
            console.log('Не удалось воспроизвести звук уведомления:', err);
        });
    } catch (error) {
        console.log('Ошибка воспроизведения звука:', error);
    }
}

/**
 * Экспорт событий в формат iCalendar (.ics)
 * @returns {string} Содержимое файла .ics
 */
export function exportToICalendar() {
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SK CRM//Calendar Module//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ].join('\r\n');
    
    // Добавление событий
    calendarEvents.forEach(event => {
        const eventDate = new Date(event.date);
        let dtstart, dtend;
        
        if (event.time) {
            // Если указано время, создаем событие с точным временем
            const [hours, minutes] = event.time.split(':').map(Number);
            eventDate.setHours(hours, minutes, 0, 0);
            
            dtstart = formatICalDateTime(eventDate);
            
            // Событие длится 1 час по умолчанию
            const endDate = new Date(eventDate);
            endDate.setHours(endDate.getHours() + 1);
            dtend = formatICalDateTime(endDate);
        } else {
            // Если время не указано, создаем событие на весь день
            dtstart = formatICalDate(eventDate);
            
            const endDate = new Date(eventDate);
            endDate.setDate(endDate.getDate() + 1);
            dtend = formatICalDate(endDate);
        }
        
        const summary = escapeICalText(event.title);
        const description = event.description ? escapeICalText(event.description) : '';
        
        const eventBlock = [
            'BEGIN:VEVENT',
            `UID:${event.id}@sk-crm`,
            `DTSTAMP:${formatICalDateTime(new Date())}`,
            event.time ? `DTSTART:${dtstart}` : `DTSTART;VALUE=DATE:${dtstart}`,
            event.time ? `DTEND:${dtend}` : `DTEND;VALUE=DATE:${dtend}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ].join('\r\n');
        
        icsContent += '\r\n' + eventBlock;
    });
    
    // Добавление задач с дедлайнами
    getTasks().filter(task => task.deadline).forEach(task => {
        const deadlineDate = new Date(task.deadline);
        const dtstart = formatICalDateTime(deadlineDate);
        
        const endDate = new Date(deadlineDate);
        endDate.setHours(endDate.getHours() + 1);
        const dtend = formatICalDateTime(endDate);
        
        const summary = escapeICalText(`Дедлайн: ${task.title}`);
        const description = escapeICalText(`Статус: ${task.status}\nПриоритет: ${task.priority}\n${task.description || ''}`);
        
        const eventBlock = [
            'BEGIN:VEVENT',
            `UID:task_${task.id}@sk-crm`,
            `DTSTAMP:${formatICalDateTime(new Date())}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ].join('\r\n');
        
        icsContent += '\r\n' + eventBlock;
    });
    
    icsContent += '\r\nEND:VCALENDAR';
    
    return icsContent;
}

/**
 * Форматирование даты для iCalendar
 * @param {Date} date - Дата
 * @returns {string} Дата в формате iCalendar
 */
function formatICalDate(date) {
    return date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0');
}

/**
 * Форматирование даты и времени для iCalendar
 * @param {Date} date - Дата и время
 * @returns {string} Дата и время в формате iCalendar
 */
function formatICalDateTime(date) {
    return formatICalDate(date) +
        'T' +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0');
}

/**
 * Экранирование текста для iCalendar
 * @param {string} text - Исходный текст
 * @returns {string} Экранированный текст
 */
function escapeICalText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Скачивание календаря в формате iCalendar
 */
export function downloadCalendar() {
    const icsContent = exportToICalendar();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sk-crm-calendar.ics';
    link.click();
    
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    
    showNotification('Календарь экспортирован в формате iCalendar', 'success');
}