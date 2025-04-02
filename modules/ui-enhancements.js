// modules/ui-enhancements.js

// Инициализация улучшений интерфейса
export function initUIEnhancements() {
    setupCurrentTimeDisplay();
    setupThemeToggle();
    setupAdminUI();
    initCalendar();
    setupTaskViewSwitcher();
    setupNotifications();
}

// Отображение текущего времени и даты в сайдбаре
function setupCurrentTimeDisplay() {
    function updateTime() {
        const now = new Date();
        
        // Обновление времени
        const timeElement = document.getElementById('current-time');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (timeElement) {
            timeElement.textContent = `${hours}:${minutes}`;
        }
        
        // Обновление даты
        const dateElement = document.getElementById('current-date');
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        if (dateElement) {
            dateElement.textContent = `${day}.${month}.${year}`;
        }
    }
    
    // Обновляем время сразу и потом каждую минуту
    updateTime();
    setInterval(updateTime, 60000);
}

// Переключение между светлой и темной темой
function setupThemeToggle() {
    // Получение сохраненной темы или использование светлой по умолчанию
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('theme-dark', savedTheme === 'dark');
    
    // Обработчик для кнопки смены темы в меню пользователя
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }
    
    // Обработчики для кнопок в настройках
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
            
            // Обновление активной кнопки
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        
        // Установка активной кнопки при загрузке
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
}

// Функция переключения темы
function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    setTheme(isDark ? 'light' : 'dark');
}

// Установка определенной темы
function setTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    
    // Показываем уведомление
    showNotification(
        theme === 'dark' ? 'Темная тема активирована' : 'Светлая тема активирована',
        'success'
    );
}

// Настройка интерфейса администратора
function setupAdminUI() {
    // Проверка, является ли текущий пользователь администратором
    import('./auth.js').then(module => {
        const currentUser = module.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
            document.body.classList.add('is-admin');
        }
    }).catch(error => {
        console.error('Ошибка при проверке прав администратора:', error);
    });
}

// Инициализация календаря
function initCalendar() {
    const calendarSection = document.getElementById('calendar');
    if (!calendarSection) return;
    
    let currentDate = new Date();
    
    // Обработчики навигации по календарю
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthLabel = document.getElementById('current-month');
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
        });
    }
    
    // Обработчик для добавления события
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            showEventModal();
        });
    }
    
    // Рендеринг календаря при показе раздела
    document.getElementById('calendar-link').addEventListener('click', () => {
        setTimeout(() => {
            renderCalendar(currentDate);
        }, 100);
    });
    
    // Инициализация формы события
    initEventForm();
}

// Рендеринг календаря
function renderCalendar(date) {
    const calendarDays = document.getElementById('calendar-days');
    const currentMonthLabel = document.getElementById('current-month');
    
    if (!calendarDays || !currentMonthLabel) return;
    
    // Очищаем календарь
    calendarDays.innerHTML = '';
    
    // Устанавливаем заголовок месяца
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    currentMonthLabel.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Получаем первый день месяца и количество дней
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Определяем сдвиг для первого дня (0 - понедельник, 6 - воскресенье)
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex < 0) firstDayIndex = 6; // Воскресенье
    
    // Добавляем дни предыдущего месяца
    const prevMonthLastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `
            <div class="calendar-date">${prevMonthLastDay - firstDayIndex + i + 1}</div>
            <div class="calendar-events"></div>
        `;
        calendarDays.appendChild(dayDiv);
    }
    
    // Добавляем дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        // Отмечаем текущий день
        if (date.getFullYear() === today.getFullYear() && 
            date.getMonth() === today.getMonth() && 
            i === today.getDate()) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `
            <div class="calendar-date">${i}</div>
            <div class="calendar-events"></div>
        `;
        
        // Добавляем обработчик для добавления события на этот день
        dayDiv.addEventListener('click', () => {
            const eventDate = new Date(date.getFullYear(), date.getMonth(), i);
            showEventModal(eventDate);
        });
        
        calendarDays.appendChild(dayDiv);
    }
    
    // Заполняем оставшиеся ячейки днями следующего месяца
    const totalDaysAdded = firstDayIndex + lastDay.getDate();
    const remainingDays = 42 - totalDaysAdded; // 7x6 grid = 42 cells
    
    for (let i = 1; i <= remainingDays; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `
            <div class="calendar-date">${i}</div>
            <div class="calendar-events"></div>
        `;
        calendarDays.appendChild(dayDiv);
    }
    
    // Загрузка и отображение событий
    loadCalendarEvents(date);
}

// Загрузка событий календаря
function loadCalendarEvents(date) {
    // Загружаем задачи с крайними сроками
    import('./tasks.js').then(module => {
        const tasks = module.getTasks();
        
        // Фильтруем задачи с дедлайнами в текущем месяце
        const tasksWithDeadlines = tasks.filter(task => {
            if (!task.deadline) return false;
            
            const deadlineDate = new Date(task.deadline);
            return deadlineDate.getFullYear() === date.getFullYear() && 
                   deadlineDate.getMonth() === date.getMonth();
        });
        
        // Загружаем события календаря
        import('./calendar-events.js').then(calendarModule => {
            const events = calendarModule.getEvents();
            
            // Фильтруем события текущего месяца
            const currentMonthEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getFullYear() === date.getFullYear() && 
                       eventDate.getMonth() === date.getMonth();
            });
            
            // Отображаем события на календаре
            displayEventsOnCalendar(tasksWithDeadlines, currentMonthEvents);
        }).catch(error => {
            console.error('Ошибка при загрузке событий календаря:', error);
            
            // Если модуль не существует, создаем его
            import('./storage.js').then(storageModule => {
                // Инициализация хранилища событий
                const events = storageModule.loadFromStorage('crm-calendar-events', []);
                storageModule.saveToStorage('crm-calendar-events', events);
                
                // Отображаем только задачи
                displayEventsOnCalendar(tasksWithDeadlines, []);
            });
        });
    }).catch(error => {
        console.error('Ошибка при загрузке задач:', error);
    });
}

// Отображение событий на календаре
function displayEventsOnCalendar(tasks, events) {
    const calendarDays = document.querySelectorAll('.calendar-day:not(.other-month)');
    
    // Отображение задач
    tasks.forEach(task => {
        const deadlineDate = new Date(task.deadline);
        const day = deadlineDate.getDate();
        
        // Находим ячейку для этого дня
        const dayCell = Array.from(calendarDays).find(cell => {
            const dateElement = cell.querySelector('.calendar-date');
            return parseInt(dateElement.textContent) === day;
        });
        
        if (dayCell) {
            const eventsContainer = dayCell.querySelector('.calendar-events');
            const eventDiv = document.createElement('div');
            eventDiv.className = 'calendar-event task';
            eventDiv.textContent = task.title;
            
            // Добавляем обработчик для открытия задачи
            eventDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showTaskDetails(task.id);
            });
            
            eventsContainer.appendChild(eventDiv);
        }
    });
    
    // Отображение событий календаря
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const day = eventDate.getDate();
        
        // Находим ячейку для этого дня
        const dayCell = Array.from(calendarDays).find(cell => {
            const dateElement = cell.querySelector('.calendar-date');
            return parseInt(dateElement.textContent) === day;
        });
        
        if (dayCell) {
            const eventsContainer = dayCell.querySelector('.calendar-events');
            const eventDiv = document.createElement('div');
            eventDiv.className = 'calendar-event event';
            eventDiv.textContent = event.title;
            
            // Добавляем обработчик для открытия события
            eventDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showEventModal(null, event);
            });
            
            eventsContainer.appendChild(eventDiv);
        }
    });
}

// Показ модального окна для события
function showEventModal(date = null, existingEvent = null) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const titleInput = document.getElementById('event-title');
    const descriptionInput = document.getElementById('event-description');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    
    // Устанавливаем заголовок модального окна
    document.getElementById('event-modal-title').textContent = 
        existingEvent ? 'Редактировать событие' : 'Добавить событие';
    
    // Если передана дата, устанавливаем её в поле
    if (date) {
        const formattedDate = date.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }
    
    // Если передано существующее событие, заполняем форму
    if (existingEvent) {
        titleInput.value = existingEvent.title;
        descriptionInput.value = existingEvent.description || '';
        
        const eventDate = new Date(existingEvent.date);
        dateInput.value = eventDate.toISOString().split('T')[0];
        
        if (existingEvent.time) {
            timeInput.value = existingEvent.time;
        }
        
        // Устанавливаем значение напоминания
        const reminderSelect = document.getElementById('event-reminder');
        if (reminderSelect && existingEvent.reminder) {
            reminderSelect.value = existingEvent.reminder.toString();
        }
        
        // Добавляем кнопку удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'secondary-btn danger';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.style.marginRight = 'auto';
        
        deleteBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить это событие?')) {
                deleteCalendarEvent(existingEvent.id);
                modal.style.display = 'none';
            }
        });
        
        const formActions = form.querySelector('.form-actions');
        formActions.prepend(deleteBtn);
    }
    
    // Открываем модальное окно
    modal.style.display = 'block';
}

// Инициализация формы события
function initEventForm() {
    const form = document.getElementById('event-form');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const reminder = parseInt(document.getElementById('event-reminder').value);
        
        // Сохраняем событие
        saveCalendarEvent({
            title,
            description,
            date,
            time,
            reminder
        });
        
        // Закрываем модальное окно
        document.getElementById('event-modal').style.display = 'none';
        
        // Обновляем календарь
        const currentDate = new Date(date);
        renderCalendar(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        
        // Показываем уведомление
        showNotification('Событие успешно добавлено', 'success');
    });
}

// Сохранение события календаря
function saveCalendarEvent(eventData) {
    import('./storage.js').then(module => {
        // Загрузка существующих событий
        const events = module.loadFromStorage('crm-calendar-events', []);
        
        // Если есть id, обновляем существующее событие
        if (eventData.id) {
            const index = events.findIndex(e => e.id === eventData.id);
            if (index !== -1) {
                events[index] = eventData;
            }
        } else {
            // Создаем новое событие
            const newEvent = {
                id: Date.now().toString(),
                ...eventData,
                createdAt: new Date().toISOString()
            };
            events.push(newEvent);
            
            // Если установлено напоминание, планируем его
            if (newEvent.reminder > 0) {
                scheduleReminder(newEvent);
            }
        }
        
        // Сохраняем события
        module.saveToStorage('crm-calendar-events', events);
    });
}

// Удаление события календаря
function deleteCalendarEvent(eventId) {
    import('./storage.js').then(module => {
        // Загрузка существующих событий
        const events = module.loadFromStorage('crm-calendar-events', []);
        
        // Удаляем событие по id
        const updatedEvents = events.filter(event => event.id !== eventId);
        
        // Сохраняем обновленный список
        module.saveToStorage('crm-calendar-events', updatedEvents);
        
        // Обновляем календарь
        const currentDate = new Date();
        renderCalendar(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        
        // Показываем уведомление
        showNotification('Событие удалено', 'success');
    });
}

// Планирование напоминания
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
    
    // Вычисляем время напоминания (отнимаем минуты)
    const reminderTime = new Date(eventDate.getTime() - (event.reminder * 60 * 1000));
    
    // Если время напоминания уже прошло, не планируем
    if (reminderTime < new Date()) {
        return;
    }
    
    // Вычисляем задержку в миллисекундах
    const delay = reminderTime.getTime() - Date.now();
    
    // Планируем напоминание
    setTimeout(() => {
        showNotification(`Напоминание: ${event.title}`, 'info');
    }, delay);
}

// Переключение представления задач
function setupTaskViewSwitcher() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            
            // Изменяем класс активной кнопки
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Обновляем представление задач
            switchTaskView(view);
        });
    });
}

// Переключение между представлениями задач (канбан/список)
function switchTaskView(view) {
    const tasksContainer = document.getElementById('tasks-list');
    
    if (!tasksContainer) return;
    
    // Изменяем класс контейнера задач
    tasksContainer.className = view === 'kanban' ? 'tasks-container' : 'tasks-list-view';
    
    // Перерисовываем задачи
    import('./tasks.js').then(module => {
        // Получаем текущий фильтр
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
        
        // Перерисовываем задачи с учетом нового представления
        module.renderTasks(filter, view);
    });
}

// Система уведомлений
function setupNotifications() {
    // Создаем контейнер для уведомлений, если он еще не существует
    if (!document.getElementById('notifications-container')) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
}

// Показ уведомления
export function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications-container');
    
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${getNotificationTitle(type)}</span>
            <button class="notification-close">&times;</button>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    // Добавляем уведомление в контейнер
    container.appendChild(notification);
    
    // Настраиваем кнопку закрытия
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    });
    
    // Автоматически закрываем уведомление через указанное время
    if (duration > 0) {
        setTimeout(() => {
            // Проверяем, что уведомление еще в DOM
            if (container.contains(notification)) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }
}

// Получение заголовка уведомления в зависимости от типа
function getNotificationTitle(type) {
    switch (type) {
        case 'success':
            return 'Успешно';
        case 'error':
            return 'Ошибка';
        case 'warning':
            return 'Предупреждение';
        case 'info':
        default:
            return 'Информация';
    }
}

// Функция для отображения деталей задачи (для ссылок из календаря)
function showTaskDetails(taskId) {
    import('./tasks.js').then(module => {
        module.showTaskDetails(taskId);
    }).catch(error => {
        console.error('Ошибка при открытии задачи:', error);
    });
}