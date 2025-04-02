import { saveTasks, loadFromStorage } from './storage.js';
import { getCurrentUser, getUsers, findUserById } from './users.js';
import { getProjects } from './projects.js';
import { showNotification } from './notifications.js';
import { addCalendarEvent } from './calendar.js';
import { getTaskComments, addComment, renderTaskComments } from './comments.js';

let tasks = [];
let currentViewMode = loadFromStorage('tasks-view-mode', 'kanban');
let currentFilter = loadFromStorage('tasks-filter', 'all');
let currentSort = loadFromStorage('tasks-sort', 'newest');
let taskTemplates = loadFromStorage('task-templates', []);

/**
 * Инициализация модуля задач
 * @param {Array} loadedTasks - Загруженные задачи
 */
export function initTasks(loadedTasks) {
    tasks = loadedTasks;
    
    // Настройка обработчиков событий
    setupTaskHandlers();
    
    // Отображение задач
    renderTasks();
}

/**
 * Настройка обработчиков событий для задач
 */
function setupTaskHandlers() {
    // Кнопка создания задачи
    document.getElementById('add-task-btn').addEventListener('click', () => {
        openTaskForm();
    });
    
    // Кнопка создания шаблона задачи
    document.getElementById('create-template-btn').addEventListener('click', () => {
        const templateName = document.getElementById('template-name').value;
        
        if (!templateName) {
            showNotification('Укажите название шаблона', 'error');
            return;
        }
        
        createTaskTemplate();
    });
    
    // Переключение режима отображения
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            changeViewMode(mode);
        });
    });
    
    // Фильтрация задач
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            changeTaskFilter(filter);
        });
    });
    
    // Сортировка задач
    document.getElementById('task-sort').addEventListener('change', (e) => {
        currentSort = e.target.value;
        saveToStorage('tasks-sort', currentSort);
        renderTasks();
    });
    
    // Поиск по задачам
    document.getElementById('task-search').addEventListener('input', (e) => {
        const searchQuery = e.target.value.toLowerCase();
        filterTasksBySearch(searchQuery);
    });
    
    // Выбор шаблона задачи
    document.getElementById('task-template-select').addEventListener('change', (e) => {
        const templateId = e.target.value;
        if (!templateId) return;
        
        loadTaskTemplate(templateId);
    });
    
    // Управление чек-листом
    document.getElementById('add-checklist-item').addEventListener('click', () => {
        addChecklistItem();
    });
    
    // Отправка комментария к задаче
    document.getElementById('comment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const taskId = document.getElementById('task-detail-id').value;
        const commentText = document.getElementById('new-comment').value;
        
        if (!commentText.trim()) return;
        
        const currentUser = getCurrentUser();
        
        const commentData = {
            taskId,
            userId: currentUser.id,
            text: commentText
        };
        
        addComment(commentData);
        
        // Очищаем поле ввода и обновляем список комментариев
        document.getElementById('new-comment').value = '';
        renderTaskComments(taskId, document.getElementById('comments-container'), currentUser.id);
    });
}

/**
 * Получение всех задач
 * @returns {Array} - Массив задач
 */
export function getTasks() {
    return tasks;
}

/**
 * Добавление новой задачи
 * @param {Object} taskData - Данные задачи
 * @returns {Object} - Созданная задача
 */
export function addTask(taskData) {
    const currentUser = getCurrentUser();
    
    const newTask = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description || '',
        status: 'новая',
        priority: taskData.priority || 'средний',
        creator: currentUser.id,
        assignedTo: taskData.assignedTo,
        coAssignees: taskData.coAssignees || [],
        watchers: taskData.watchers || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deadline: taskData.deadline || null,
        projectId: taskData.projectId || null,
        checklist: taskData.checklist || [],
        tags: taskData.tags || []
    };
    
    tasks.push(newTask);
    saveTasks(tasks);
    
    // Если есть дедлайн, добавляем событие в календарь
    if (newTask.deadline) {
        addCalendarEvent({
            title: `Дедлайн: ${newTask.title}`,
            date: new Date(newTask.deadline),
            type: 'task',
            taskId: newTask.id,
            color: '#ef4444'
        });
    }
    
    // Отправляем уведомление исполнителю
    if (newTask.assignedTo && newTask.assignedTo !== currentUser.id) {
        import('./notifications.js').then(module => {
            module.addNotification({
                type: 'task_assigned',
                userId: newTask.assignedTo,
                title: 'Вам назначена новая задача',
                message: `Вам поставлена задача "${newTask.title}"`,
                data: {
                    taskId: newTask.id
                }
            });
        });
    }
    
    return newTask;
}

/**
 * Обновление данных задачи
 * @param {string} taskId - ID задачи
 * @param {Object} taskData - Обновленные данные
 * @returns {Object} - Обновленная задача
 */
export function updateTask(taskId, taskData) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
        return null;
    }
    
    const currentUser = getCurrentUser();
    const originalTask = tasks[taskIndex];
    
    // Обновляем задачу
    const updatedTask = {
        ...originalTask,
        ...taskData,
        updatedAt: new Date().toISOString()
    };
    
    tasks[taskIndex] = updatedTask;
    saveTasks(tasks);
    
    // Проверяем, изменился ли статус задачи
    if (originalTask.status !== updatedTask.status) {
        // Если задача переведена в состояние "Выполнена"
        if (updatedTask.status === 'выполнена' && originalTask.assignedTo) {
            // Уведомление создателю о выполнении задачи
            if (originalTask.creator !== currentUser.id) {
                import('./notifications.js').then(module => {
                    module.addNotification({
                        type: 'task_completed',
                        userId: originalTask.creator,
                        title: 'Задача выполнена',
                        message: `Задача "${updatedTask.title}" была выполнена`,
                        data: {
                            taskId: updatedTask.id
                        }
                    });
                });
            }
        }
    }
    
    // Проверяем, изменился ли дедлайн
    if (originalTask.deadline !== updatedTask.deadline) {
        // Обновляем событие в календаре
        import('./calendar.js').then(module => {
            // Удаляем старое событие
            module.removeCalendarEvent('task', taskId);
            
            // Добавляем новое, если есть дедлайн
            if (updatedTask.deadline) {
                module.addCalendarEvent({
                    title: `Дедлайн: ${updatedTask.title}`,
                    date: new Date(updatedTask.deadline),
                    type: 'task',
                    taskId: updatedTask.id,
                    color: '#ef4444'
                });
            }
        });
    }
    
    return updatedTask;
}

/**
 * Удаление задачи
 * @param {string} taskId - ID задачи
 * @returns {boolean} - Результат операции
 */
export function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
        return false;
    }
    
    // Удаляем связанное событие из календаря
    import('./calendar.js').then(module => {
        module.removeCalendarEvent('task', taskId);
    });
    
    tasks.splice(taskIndex, 1);
    saveTasks(tasks);
    
    return true;
}

/**
 * Изменение статуса задачи
 * @param {string} taskId - ID задачи
 * @param {string} newStatus - Новый статус
 * @returns {Object} - Обновленная задача
 */
export function changeTaskStatus(taskId, newStatus) {
    return updateTask(taskId, { status: newStatus });
}

/**
 * Создание шаблона задачи
 */
function createTaskTemplate() {
    const templateName = document.getElementById('template-name').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;
    const assignedTo = document.getElementById('assigned-to').value;
    const projectId = document.getElementById('task-project').value;
    
    // Получаем элементы чек-листа
    const checklistItems = [];
    document.querySelectorAll('.checklist-item:not(.template)').forEach(item => {
        const text = item.querySelector('input[type="text"]').value;
        if (text) {
            checklistItems.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                text,
                completed: false
            });
        }
    });
    
    // Получаем теги
    const tagsInput = document.getElementById('task-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    const template = {
        id: Date.now().toString(),
        name: templateName,
        data: {
            title,
            description,
            priority,
            assignedTo,
            projectId,
            checklist: checklistItems,
            tags
        }
    };
    
    // Сохраняем шаблон
    taskTemplates.push(template);
    saveToStorage('task-templates', taskTemplates);
    
    // Обновляем список шаблонов
    updateTemplatesList();
    
    // Скрываем форму создания шаблона
    document.getElementById('template-form').style.display = 'none';
    
    showNotification(`Шаблон "${templateName}" успешно создан`, 'success');
}

/**
 * Обновление списка шаблонов
 */
function updateTemplatesList() {
    const templateSelect = document.getElementById('task-template-select');
    
    // Сохраняем текущее значение
    const currentValue = templateSelect.value;
    
    // Очищаем список
    templateSelect.innerHTML = '<option value="">Выберите шаблон</option>';
    
    // Добавляем шаблоны
    taskTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        templateSelect.appendChild(option);
    });
    
    // Восстанавливаем значение, если оно было
    if (currentValue && templateSelect.querySelector(`option[value="${currentValue}"]`)) {
        templateSelect.value = currentValue;
    }
}

/**
 * Загрузка данных из шаблона задачи
 * @param {string} templateId - ID шаблона
 */
function loadTaskTemplate(templateId) {
    const template = taskTemplates.find(t => t.id === templateId);
    
    if (!template) return;
    
    // Заполняем поля формы данными из шаблона
    document.getElementById('task-title').value = template.data.title || '';
    document.getElementById('task-description').value = template.data.description || '';
    document.getElementById('task-priority').value = template.data.priority || 'средний';
    document.getElementById('assigned-to').value = template.data.assignedTo || '';
    document.getElementById('task-project').value = template.data.projectId || '';
    document.getElementById('task-tags').value = template.data.tags?.join(', ') || '';
    
    // Очищаем текущий чек-лист
    const checklistContainer = document.getElementById('checklist-container');
    checklistContainer.querySelectorAll('.checklist-item:not(.template)').forEach(item => {
        checklistContainer.removeChild(item);
    });
    
    // Добавляем элементы чек-листа из шаблона
    if (template.data.checklist && template.data.checklist.length > 0) {
        template.data.checklist.forEach(item => {
            addChecklistItem(item.text);
        });
    }
    
    showNotification(`Шаблон "${template.name}" загружен`, 'info');
}

/**
 * Добавление элемента чек-листа
 * @param {string} text - Текст элемента (опционально)
 */
function addChecklistItem(text = '') {
    const checklistContainer = document.getElementById('checklist-container');
    const templateItem = document.querySelector('.checklist-item.template');
    
    // Клонируем шаблон
    const newItem = templateItem.cloneNode(true);
    newItem.classList.remove('template');
    
    // Устанавливаем текст, если он передан
    if (text) {
        newItem.querySelector('input[type="text"]').value = text;
    }
    
    // Настраиваем кнопку удаления
    const removeBtn = newItem.querySelector('.remove-checklist-item');
    removeBtn.addEventListener('click', () => {
        checklistContainer.removeChild(newItem);
    });
    
    // Добавляем элемент в контейнер
    checklistContainer.appendChild(newItem);
}

/**
 * Открытие формы задачи (создание/редактирование)
 * @param {string} taskId - ID задачи для редактирования (опционально)
 */
export function openTaskForm(taskId = null) {
    // Сбрасываем форму
    document.getElementById('task-form').reset();
    
    // Очищаем чек-лист
    const checklistContainer = document.getElementById('checklist-container');
    checklistContainer.querySelectorAll('.checklist-item:not(.template)').forEach(item => {
        checklistContainer.removeChild(item);
    });
    
    // Заполняем список пользователей
    populateUserSelectsInTaskForm();
    
    // Заполняем список проектов
    populateProjectSelect();
    
    // Обновляем список шаблонов
    updateTemplatesList();
    
    // Если это редактирование задачи
    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
            showNotification('Задача не найдена', 'error');
            return;
        }
        
        // Заполняем поля формы данными задачи
        fillTaskForm(task);
        
        // Меняем заголовок модального окна
        document.getElementById('task-modal-title').textContent = 'Редактирование задачи';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority || 'средний';

// Устанавливаем дедлайн, если есть
        if (task.deadline) {
            const deadline = new Date(task.deadline);
            document.getElementById('task-deadline').value = formatDateForInput(deadline);
        } else {
            document.getElementById('task-deadline').value = '';
        }
        
        // Заполняем селекты пользователей
        if (task.assignedTo) {
            document.getElementById('assigned-to').value = task.assignedTo;
        }
        
        // Заполняем проект, если он привязан
        if (task.projectId) {
            document.getElementById('task-project').value = task.projectId;
        }
        
        // Заполняем чек-лист
        const checklistContainer = document.getElementById('checklist-container');
        checklistContainer.querySelectorAll('.checklist-item:not(.template)').forEach(item => {
            checklistContainer.removeChild(item);
        });
        
        if (task.checklist && task.checklist.length > 0) {
            task.checklist.forEach(item => {
                addChecklistItem(item.text);
            });
        }
        
        // Заполняем теги
        if (task.tags && task.tags.length > 0) {
            document.getElementById('task-tags').value = task.tags.join(', ');
        } else {
            document.getElementById('task-tags').value = '';
        }
        
        // Меняем кнопку отправки формы
        const submitBtn = document.getElementById('task-submit-btn');
        submitBtn.textContent = 'Сохранить';
        submitBtn.dataset.action = 'update';
    } else {
        // Для новой задачи
        document.getElementById('task-modal-title').textContent = 'Создание новой задачи';
        document.getElementById('task-id').value = '';
        
        // Меняем кнопку отправки формы
        const submitBtn = document.getElementById('task-submit-btn');
        submitBtn.textContent = 'Создать';
        submitBtn.dataset.action = 'create';
    }
    
    // Показываем модальное окно
    document.getElementById('task-modal').style.display = 'block';
}

/**
 * Заполнение полей формы задачи
 * @param {Object} task - Задача
 */
function fillTaskForm(task) {
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority || 'средний';
    
    // Устанавливаем дедлайн, если есть
    if (task.deadline) {
        const deadline = new Date(task.deadline);
        document.getElementById('task-deadline').value = formatDateForInput(deadline);
    }
    
    // Заполняем селекты пользователей
    if (task.assignedTo) {
        document.getElementById('assigned-to').value = task.assignedTo;
    }
    
    // Соисполнители и наблюдатели (для мультиселектов)
    if (task.coAssignees && task.coAssignees.length > 0) {
        const coAssigneeSelect = document.getElementById('co-assignee');
        if (coAssigneeSelect.multiple) {
            // Для мультиселекта
            for (const option of coAssigneeSelect.options) {
                option.selected = task.coAssignees.includes(option.value);
            }
        }
    }
    
    if (task.watchers && task.watchers.length > 0) {
        const watcherSelect = document.getElementById('watcher');
        if (watcherSelect.multiple) {
            // Для мультиселекта
            for (const option of watcherSelect.options) {
                option.selected = task.watchers.includes(option.value);
            }
        }
    }
    
    // Заполняем поле проекта
    if (task.projectId) {
        document.getElementById('task-project').value = task.projectId;
    }
    
    // Заполняем чек-лист
    if (task.checklist && task.checklist.length > 0) {
        task.checklist.forEach(item => {
            addChecklistItem(item.text);
        });
    }
    
    // Заполняем теги
    if (task.tags && task.tags.length > 0) {
        document.getElementById('task-tags').value = task.tags.join(', ');
    }
}

/**
 * Изменение режима просмотра задач
 * @param {string} mode - Режим просмотра (kanban, list, table)
 */
function changeViewMode(mode) {
    currentViewMode = mode;
    saveToStorage('tasks-view-mode', mode);
    
    // Обновляем активную кнопку
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    
    // Перерендериваем задачи
    renderTasks();
}

/**
 * Изменение фильтра задач
 * @param {string} filter - Фильтр (all, my, created, watched)
 */
function changeTaskFilter(filter) {
    currentFilter = filter;
    saveToStorage('tasks-filter', filter);
    
    // Обновляем активную кнопку
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    
    // Перерендериваем задачи
    renderTasks();
}

/**
 * Отображение задач
 */
export function renderTasks() {
    const tasksContainer = document.getElementById('tasks-container');
    if (!tasksContainer) return;
    
    // Очищаем контейнер
    tasksContainer.innerHTML = '';
    
    // Получаем задачи текущего пользователя
    const currentUser = getCurrentUser();
    let userTasks = tasks;
    
    // Применяем фильтр
    if (currentFilter !== 'all') {
        switch (currentFilter) {
            case 'my':
                // Задачи, где пользователь исполнитель
                userTasks = tasks.filter(task => task.assignedTo === currentUser.id);
                break;
            case 'created':
                // Задачи, созданные пользователем
                userTasks = tasks.filter(task => task.creator === currentUser.id);
                break;
            case 'coAssigned':
                // Задачи, где пользователь соисполнитель
                userTasks = tasks.filter(task => 
                    task.coAssignees && task.coAssignees.includes(currentUser.id));
                break;
            case 'watched':
                // Задачи, где пользователь наблюдатель
                userTasks = tasks.filter(task => 
                    task.watchers && task.watchers.includes(currentUser.id));
                break;
            case 'active':
                // Активные задачи (не выполненные)
                userTasks = tasks.filter(task => task.status !== 'выполнена' && 
                    (task.creator === currentUser.id || 
                    task.assignedTo === currentUser.id || 
                    (task.coAssignees && task.coAssignees.includes(currentUser.id)) || 
                    (task.watchers && task.watchers.includes(currentUser.id))));
                break;
            case 'completed':
                // Выполненные задачи
                userTasks = tasks.filter(task => task.status === 'выполнена' && 
                    (task.creator === currentUser.id || 
                    task.assignedTo === currentUser.id || 
                    (task.coAssignees && task.coAssignees.includes(currentUser.id)) || 
                    (task.watchers && task.watchers.includes(currentUser.id))));
                break;
        }
    } else {
        // Показываем все задачи, которые доступны пользователю
        userTasks = tasks.filter(task => 
            task.creator === currentUser.id || 
            task.assignedTo === currentUser.id || 
            (task.coAssignees && task.coAssignees.includes(currentUser.id)) || 
            (task.watchers && task.watchers.includes(currentUser.id)));
    }
    
    // Применяем сортировку
    userTasks = sortTasks(userTasks, currentSort);
    
    // Если задач нет, показываем сообщение
    if (userTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-tasks-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                    <path d="M6 8h.01"></path>
                    <path d="M10 8h8"></path>
                    <path d="M6 12h.01"></path>
                    <path d="M10 12h8"></path>
                    <path d="M6 16h.01"></path>
                    <path d="M10 16h8"></path>
                </svg>
                <h3>Нет доступных задач</h3>
                <p>Создайте новую задачу, нажав кнопку "Создать задачу"</p>
                <button id="empty-add-task" class="primary-btn">Создать задачу</button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки создания задачи
        document.getElementById('empty-add-task').addEventListener('click', () => {
            openTaskForm();
        });
        
        return;
    }
    
    // Отображаем задачи в зависимости от выбранного режима просмотра
    if (currentViewMode === 'kanban') {
        renderTasksKanban(userTasks, tasksContainer);
    } else if (currentViewMode === 'list') {
        renderTasksList(userTasks, tasksContainer);
    } else if (currentViewMode === 'table') {
        renderTasksTable(userTasks, tasksContainer);
    }
}

/**
 * Сортировка списка задач
 * @param {Array} tasksList - Список задач
 * @param {string} sortType - Тип сортировки
 * @returns {Array} - Отсортированный список задач
 */
function sortTasks(tasksList, sortType) {
    const sortedTasks = [...tasksList];
    
    switch (sortType) {
        case 'newest':
            // Сортировка по дате создания (сначала новые)
            sortedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            // Сортировка по дате создания (сначала старые)
            sortedTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'deadline':
            // Сортировка по дедлайну (сначала ближайшие)
            sortedTasks.sort((a, b) => {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            break;
        case 'priority':
            // Сортировка по приоритету (высокий -> средний -> низкий)
            const priorityOrder = { 'высокий': 0, 'средний': 1, 'низкий': 2 };
            sortedTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'title':
            // Сортировка по заголовку
            sortedTasks.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    return sortedTasks;
}

/**
 * Отображение результатов поиска
 * @param {Array} foundTasks - Найденные задачи
 */
export function filterTasksBySearch(searchQuery) {
    if (!searchQuery.trim()) {
        // Если запрос пустой, показываем все задачи
        renderTasks(currentFilter, currentViewMode);
        return;
    }
    
    // Получаем задачи текущего пользователя
    const currentUser = getCurrentUser();
    let userTasks = tasks.filter(task => {
        return task.creator === currentUser.id || 
               task.assignedTo === currentUser.id ||
               (task.coAssignees && task.coAssignees.includes(currentUser.id)) ||
               (task.watchers && task.watchers.includes(currentUser.id));
    });
    
    // Фильтруем задачи по запросу
    const foundTasks = userTasks.filter(task => {
        // Ищем в заголовке
        if (task.title.toLowerCase().includes(searchQuery)) {
            return true;
        }
        
        // Ищем в описании
        if (task.description && task.description.toLowerCase().includes(searchQuery)) {
            return true;
        }
        
        // Ищем в чек-листе
        if (task.checklist && task.checklist.some(item => 
            item.text.toLowerCase().includes(searchQuery))) {
            return true;
        }
        
        // Ищем по исполнителю
        const assignee = task.assignedTo ? findUserById(task.assignedTo) : null;
        if (assignee && assignee.username.toLowerCase().includes(searchQuery)) {
            return true;
        }
        
        // Ищем по создателю
        const creator = findUserById(task.creator);
        if (creator && creator.username.toLowerCase().includes(searchQuery)) {
            return true;
        }
        
        // Ищем в тегах
        if (task.tags && task.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery))) {
            return true;
        }
        
        return false;
    });
    
    renderSearchResults(foundTasks);
}

/**
 * Отображение результатов поиска
 * @param {Array} foundTasks - Найденные задачи
 */
export function renderSearchResults(foundTasks) {
    const tasksList = document.getElementById('tasks-container');
    if (!tasksList) return;
    
    tasksList.innerHTML = '';
    
    // Если нет результатов, показываем сообщение
    if (foundTasks.length === 0) {
        tasksList.innerHTML = '<div class="no-tasks-message">По вашему запросу ничего не найдено.</div>';
        return;
    }
    
    // Добавляем заголовок с результатами поиска
    const searchHeader = document.createElement('div');
    searchHeader.className = 'search-results-header';
    searchHeader.innerHTML = `
        <h3>Результаты поиска: найдено ${foundTasks.length} задач</h3>
        <button id="clear-search" class="secondary-btn">Очистить поиск</button>
    `;
    tasksList.appendChild(searchHeader);
    
    // Добавляем обработчик для кнопки очистки поиска
    document.getElementById('clear-search').addEventListener('click', () => {
        // Очищаем поле поиска
        document.getElementById('task-search').value = '';
        
        // Возвращаемся к обычному отображению задач
        renderTasks();
    });
    
    // Отображаем результаты в зависимости от текущего режима просмотра
    if (currentViewMode === 'kanban') {
        renderTasksKanban(foundTasks, tasksList);
    } else if (currentViewMode === 'list') {
        renderTasksList(foundTasks, tasksList);
    } else {
        renderTasksTable(foundTasks, tasksList);
    }
}

/**
 * Форматирование даты для ввода в input
 * @param {Date} date - Дата
 * @returns {string} - Строка в формате YYYY-MM-DDThh:mm
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Форматирование даты для отображения
 * @param {Date} date - Дата
 * @returns {string} - Отформатированная дата
 */
function formatDate(date) {
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Заполнение селектов пользователей в форме задачи
 */
function populateUserSelectsInTaskForm() {
    const users = getUsers();
    
    const assignedToSelect = document.getElementById('assigned-to');
    const coAssigneeSelect = document.getElementById('co-assignee');
    const watcherSelect = document.getElementById('watcher');
    
    // Очищаем селекты
    assignedToSelect.innerHTML = '<option value="">Выберите исполнителя</option>';
    coAssigneeSelect.innerHTML = '<option value="">Выберите соисполнителя</option>';
    watcherSelect.innerHTML = '<option value="">Выберите наблюдателя</option>';
    
    // Заполняем селекты
    users.forEach(user => {
        // Исполнитель
        const assigneeOption = document.createElement('option');
        assigneeOption.value = user.id;
        assigneeOption.textContent = user.username;
        assignedToSelect.appendChild(assigneeOption);
        
        // Соисполнитель
        const coAssigneeOption = document.createElement('option');
        coAssigneeOption.value = user.id;
        coAssigneeOption.textContent = user.username;
        coAssigneeSelect.appendChild(coAssigneeOption);
        
        // Наблюдатель
        const watcherOption = document.createElement('option');
        watcherOption.value = user.id;
        watcherOption.textContent = user.username;
        watcherSelect.appendChild(watcherOption);
    });
}

/**
 * Заполнение селекта проектов в форме задачи
 */
function populateProjectSelect() {
    const projectSelect = document.getElementById('task-project');
    projectSelect.innerHTML = '<option value="">Без проекта</option>';
    
    const projects = getProjects().filter(p => !p.isCompleted);
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
    });
}