// modules/calendar-events.js
import { saveToStorage, loadFromStorage } from './storage.js';
import { showNotification } from './ui-enhancements.js';

let events = [];

/**
 * Инициализация модуля событий календаря
 */
export function initCalendarEvents() {
    events = loadFromStorage('crm-calendar-events', []);
    
    // Планирование напоминаний для существующих событий
    scheduleAllReminders();
}

/**
 * Получение списка всех событий
 * @returns {Array} Массив событий
 */
export function getEvents() {
    return events;
}

/**
 * Получение события по идентификатору
 * @param {string} eventId - Идентификатор события
 * @returns {Object|null} Найденное событие или null
 */
export function getEventById(eventId) {
    return events.find(event => event.id === eventId);
}

/**
 * Добавление нового события
 * @param {Object} eventData - Данные события
 * @returns {Object} Созданное событие
 */
export function addEvent(eventData) {
    const newEvent = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...eventData
    };
    
    events.push(newEvent);
    saveEvents();
    
    // Если установлено напоминание, планируем его
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
export function updateEvent(eventId, eventData) {
    const index = events.findIndex(event => event.id === eventId);
    
    if (index === -1) return null;
    
    const updatedEvent = {
        ...events[index],
        ...eventData,
        updatedAt: new Date().toISOString()
    };
    
    events[index] = updatedEvent;
    saveEvents();
    
    // Если изменилось время события или напоминание, переплпнируем
    if (eventData.date || eventData.time || eventData.reminder) {
        scheduleReminder(updatedEvent);
    }
    
    return updatedEvent;
}

/**
 * Удаление события
 * @param {string} eventId - Идентификатор события
 * @returns {boolean} Результат удаления
 */
export function deleteEvent(eventId) {
    const initialLength = events.length;
    events = events.filter(event => event.id !== eventId);
    
    if (events.length < initialLength) {
        saveEvents();
        return true;
    }
    
    return false;
}

/**
 * Получение событий в указанном диапазоне дат
 * @param {Date} startDate - Начальная дата
 * @param {Date} endDate - Конечная дата
 * @returns {Array} Отфильтрованные события
 */
export function getEventsInRange(startDate, endDate) {
    return events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
    });
}

/**
 * Получение событий для конкретного дня
 * @param {Date} date - Дата
 * @returns {Array} События для указанного дня
 */
export function getEventsForDay(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getFullYear() === year && 
               eventDate.getMonth() === month && 
               eventDate.getDate() === day;
    });
}

/**
 * Сохранение событий в хранилище
 */
function saveEvents() {
    saveToStorage('crm-calendar-events', events);
}

/**
 * Планирование всех напоминаний при запуске
 */
function scheduleAllReminders() {
    const now = new Date();
    
    events.forEach(event => {
        // Проверяем, есть ли напоминание и не прошло ли оно уже
        if (!event.reminder || event.reminder <= 0) return;
        
        const eventDate = new Date(event.date);
        
        // Если указано время, учитываем его
        if (event.time) {
            const timeParts = event.time.split(':');
            eventDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
        } else {
            // По умолчанию устанавливаем на 9:00
            eventDate.setHours(9, 0);
        }
        
        // Вычисляем время напоминания
        const reminderTime = new Date(eventDate.getTime() - (event.reminder * 60 * 1000));
        
        // Если время напоминания еще не прошло, планируем его
        if (reminderTime > now) {
            scheduleReminder(event);
        }
    });
}

/**
 * Планирование напоминания для события
 * @param {Object} event - Событие для напоминания
 */
function scheduleReminder(event) {
    const eventDate = new Date(event.date);
    
    // Если указано время, учитываем его
    if (event.time) {
        const timeParts = event.time.split(':');
        eventDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
    } else {
        // По умолчанию устанавливаем на 9:00
        eventDate.setHours(9, 0);
    }
    
    // Вычисляем время напоминания
    const reminderTime = new Date(eventDate.getTime() - (event.reminder * 60 * 1000));
    
    // Если время напоминания уже прошло, не планируем
    if (reminderTime <= new Date()) {
        return;
    }
    
    // Вычисляем задержку в миллисекундах
    const delay = reminderTime.getTime() - Date.now();
    
    // Планируем напоминание
    setTimeout(() => {
        // Проверяем, что событие еще существует
        const currentEvents = loadFromStorage('crm-calendar-events', []);
        const eventStillExists = currentEvents.some(e => e.id === event.id);
        
        if (eventStillExists) {
            const formattedDate = new Date(event.date).toLocaleDateString('ru-RU');
            const timeStr = event.time ? ` в ${event.time}` : '';
            
            showNotification(
                `Напоминание: "${event.title}" ${formattedDate}${timeStr}`,
                'info',
                0 // Не скрывать автоматически
            );
            
            // Воспроизводим звук уведомления, если возможно
            playNotificationSound();
        }
    }, delay);
}

/**
 * Воспроизведение звука уведомления
 */
function playNotificationSound() {
    try {
        const audio = new Audio('/assets/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Не удалось воспроизвести звук уведомления'));
    } catch (error) {
        console.log('Ошибка при воспроизведении звука уведомления:', error);
    }
}

/**
 * Экспорт событий в формат iCalendar (.ics)
 * @returns {string} Содержимое .ics файла
 */
export function exportEventsToICS() {
    // Начало файла iCalendar
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SK CRM//Calendar Events//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ].join('\r\n');
    
    // Добавляем каждое событие
    events.forEach(event => {
        const eventDate = new Date(event.date);
        let eventStart, eventEnd;
        
        // Если указано время, используем его
        if (event.time) {
            const [hours, minutes] = event.time.split(':').map(Number);
            eventStart = new Date(eventDate);
            eventStart.setHours(hours, minutes, 0);
            
            // По умолчанию событие длится 1 час
            eventEnd = new Date(eventStart);
            eventEnd.setHours(eventStart.getHours() + 1);
        } else {
            // Если время не указано, считаем событием на весь день
            eventStart = eventDate;
            eventEnd = new Date(eventDate);
            eventEnd.setDate(eventEnd.getDate() + 1);
        }
        
        // Форматируем дату и время для iCalendar
        const formatDate = (date, allDay = false) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            if (allDay) {
                return `${year}${month}${day}`;
            }
            
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        };
        
        // Обрабатываем описание события
        const description = event.description ? event.description.replace(/\n/g, '\\n') : '';
        
        // Создаем событие в формате iCalendar
        const isAllDay = !event.time;
        const eventBlock = [
            'BEGIN:VEVENT',
            `UID:${event.id}@sk-crm`,
            `DTSTAMP:${formatDate(new Date(), false)}Z`,
            isAllDay ? `DTSTART;VALUE=DATE:${formatDate(eventStart, true)}` : `DTSTART:${formatDate(eventStart)}`,
            isAllDay ? `DTEND;VALUE=DATE:${formatDate(eventEnd, true)}` : `DTEND:${formatDate(eventEnd)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ].join('\r\n');
        
        icsContent += '\r\n' + eventBlock;
    });
    
    // Завершаем файл
    icsContent += '\r\nEND:VCALENDAR';
    
    return icsContent;
}

/**
 * Скачивание календаря в формате .ics
 */
export function downloadCalendarAsICS() {
    const icsContent = exportEventsToICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sk-crm-calendar.ics';
    link.click();
    
    // Освобождаем ресурсы
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    
    showNotification('Календарь успешно экспортирован', 'success');
}