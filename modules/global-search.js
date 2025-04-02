// modules/global-search.js - модуль глобального поиска по всей системе
import { getTasks } from './tasks.js';
import { getProjects } from './projects.js';
import { getUsers } from './users.js';
import { getCurrentUser } from './auth.js';
import { showNotification } from './ui-enhancements.js';

/**
 * Инициализация глобального поиска
 */
export function initGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    
    if (searchInput) {
        // Обработчик для поиска по нажатию Enter
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    performSearch(query);
                } else if (query) {
                    showNotification('Для поиска введите не менее 2 символов', 'info');
                }
            }
        });
        
        // Обработчик для показа/скрытия результатов при фокусе
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                showSearchResults(query);
            }
        });
        
        // Очистка поиска при нажатии ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideSearchResults();
                searchInput.value = '';
            }
        });
        
        // Скрытие результатов при клике вне
document.addEventListener('click', (e) => {
    if (!e.target.closest('#global-search-container') && 
        !e.target.closest('#search-results-container')) {
        hideSearchResults();
    }
});
    }
    
    // Создание контейнера для результатов поиска, если его еще нет
    if (!document.getElementById('search-results-container')) {
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'search-results-container';
        resultsContainer.className = 'search-results-container';
        
        document.body.appendChild(resultsContainer);
    }
    
    console.log('Модуль глобального поиска инициализирован');
}

/**
 * Выполнение поиска по всем сущностям системы
 * @param {string} query - Поисковый запрос
 */
export function performSearch(query) {
    query = query.toLowerCase();
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const isAdmin = currentUser.role === 'admin';
    
    // Загрузка необходимых данных
    Promise.all([
        loadTasks(),
        loadProjects(),
        loadUsers()
    ]).then(([tasks, projects, users]) => {
        // Поиск в задачах
        const foundTasks = searchInTasks(tasks, query, currentUser.id);
        
        // Поиск в проектах
        const foundProjects = searchInProjects(projects, query);
        
        // Поиск в пользователях (только для администраторов)
        const foundUsers = isAdmin ? searchInUsers(users, query) : [];
        
        // Отображение результатов
        displaySearchResults(query, foundTasks, foundProjects, foundUsers);
        
        // Показываем уведомление
        const totalResults = foundTasks.length + foundProjects.length + foundUsers.length;
        
        if (totalResults > 0) {
            showNotification(`Найдено ${totalResults} результатов по запросу "${query}"`, 'success');
        } else {
            showNotification(`По запросу "${query}" ничего не найдено`, 'info');
        }
    });
}

/**
 * Загрузка задач для поиска
 * @returns {Promise<Array>} Массив задач
 */
function loadTasks() {
    return new Promise((resolve) => {
        const tasks = getTasks();
        resolve(tasks);
    });
}

/**
 * Загрузка проектов для поиска
 * @returns {Promise<Array>} Массив проектов
 */
function loadProjects() {
    return new Promise((resolve) => {
        const projects = getProjects();
        resolve(projects);
    });
}

/**
 * Загрузка пользователей для поиска
 * @returns {Promise<Array>} Массив пользователей
 */
function loadUsers() {
    return new Promise((resolve) => {
        const users = getUsers();
        resolve(users);
    });
}

/**
 * Поиск в задачах
 * @param {Array} tasks - Массив задач
 * @param {string} query - Поисковый запрос
 * @param {string} userId - Идентификатор текущего пользователя
 * @returns {Array} Найденные задачи
 */
function searchInTasks(tasks, query, userId) {
    return tasks.filter(task => {
        // Проверяем, имеет ли пользователь доступ к задаче
        const hasAccess = task.creator === userId || 
                          task.assignees.includes(userId) || 
                          (task.coAssignees && task.coAssignees.includes(userId)) || 
                          (task.watchers && task.watchers.includes(userId));
        
        if (!hasAccess) return false;
        
        // Поиск по полям задачи
        return task.title.toLowerCase().includes(query) || 
               (task.description && task.description.toLowerCase().includes(query)) ||
               task.status.toLowerCase().includes(query) ||
               task.priority.toLowerCase().includes(query);
    });
}

/**
 * Поиск в проектах
 * @param {Array} projects - Массив проектов
 * @param {string} query - Поисковый запрос
 * @returns {Array} Найденные проекты
 */
function searchInProjects(projects, query) {
    return projects.filter(project => {
        // Поиск по основным полям проекта
        if (project.name.toLowerCase().includes(query)) {
            return true;
        }
        
        // Поиск по дополнительным полям проекта
        if (project.fields && project.fields.length > 0) {
            return project.fields.some(field => 
                field.name.toLowerCase().includes(query) || 
                (field.value && field.value.toLowerCase().includes(query))
            );
        }
        
        return false;
    });
}

/**
 * Поиск в пользователях
 * @param {Array} users - Массив пользователей
 * @param {string} query - Поисковый запрос
 * @returns {Array} Найденные пользователи
 */
function searchInUsers(users, query) {
    return users.filter(user => 
        user.username.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.position && user.position.toLowerCase().includes(query)) ||
        (user.department && user.department.toLowerCase().includes(query))
    );
}

/**
 * Отображение результатов поиска
 * @param {string} query - Поисковый запрос
 * @param {Array} tasks - Найденные задачи
 * @param {Array} projects - Найденные проекты
 * @param {Array} users - Найденные пользователи
 */
function displaySearchResults(query, tasks, projects, users) {
    const container = document.getElementById('search-results-container');
    if (!container) return;
    
    // Очистка контейнера
    container.innerHTML = '';
    
    // Создание заголовка результатов
    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.innerHTML = `
        <h3>Результаты поиска: "${query}"</h3>
        <button id="close-search-results" class="search-close-btn">×</button>
    `;
    container.appendChild(header);
    
    // Обработчик закрытия результатов
    const closeBtn = header.querySelector('#close-search-results');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideSearchResults);
    }
    
    // Если ничего не найдено
    if (tasks.length === 0 && projects.length === 0 && users.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'search-empty-results';
        emptyMessage.textContent = `По запросу "${query}" ничего не найдено`;
        container.appendChild(emptyMessage);
    } else {
        // Создание вкладок для результатов
        const tabs = document.createElement('div');
        tabs.className = 'search-tabs';
        
        const taskTab = document.createElement('button');
        taskTab.className = 'search-tab active';
        taskTab.textContent = `Задачи (${tasks.length})`;
        taskTab.dataset.tab = 'tasks';
        
        const projectTab = document.createElement('button');
        projectTab.className = 'search-tab';
        projectTab.textContent = `Проекты (${projects.length})`;
        projectTab.dataset.tab = 'projects';
        
        const userTab = document.createElement('button');
        userTab.className = 'search-tab';
        userTab.textContent = `Пользователи (${users.length})`;
        userTab.dataset.tab = 'users';
        
        tabs.appendChild(taskTab);
        tabs.appendChild(projectTab);
        
        if (users.length > 0) {
            tabs.appendChild(userTab);
        }
        
        container.appendChild(tabs);
        
        // Создание контейнера для содержимого вкладок
        const tabContent = document.createElement('div');
        tabContent.className = 'search-tab-content';
        container.appendChild(tabContent);
        
        // Отображение вкладки с задачами по умолчанию
        displayTaskResults(tabContent, tasks);
        
        // Обработчики для вкладок
        tabs.querySelectorAll('.search-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Смена активной вкладки
                tabs.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Отображение соответствующего содержимого
                const tabType = tab.dataset.tab;
                
                switch (tabType) {
                    case 'tasks':
                        displayTaskResults(tabContent, tasks);
                        break;
                    case 'projects':
                        displayProjectResults(tabContent, projects);
                        break;
                    case 'users':
                        displayUserResults(tabContent, users);
                        break;
                }
            });
        });
    }
    
    // Отображение контейнера
    container.style.display = 'block';
}

/**
 * Отображение результатов поиска по задачам
 * @param {HTMLElement} container - Контейнер для вывода
 * @param {Array} tasks - Найденные задачи
 */
function displayTaskResults(container, tasks) {
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="search-no-results">Задачи не найдены</div>';
        return;
    }
    
    // Создание таблицы результатов
    const table = document.createElement('table');
    table.className = 'search-results-table';
    
    // Заголовок таблицы
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Название</th>
            <th>Статус</th>
            <th>Приоритет</th>
            <th>Действия</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Тело таблицы
    const tbody = document.createElement('tbody');
    
    tasks.forEach(task => {
        const tr = document.createElement('tr');
        
        // Статус задачи для стилизации
        const statusClass = task.status.replace(' ', '-');
        
        tr.innerHTML = `
            <td class="task-title">${task.title}</td>
            <td><span class="task-status ${statusClass}">${task.status}</span></td>
            <td><span class="task-priority ${task.priority}">${task.priority}</span></td>
            <td>
                <button class="search-action-btn view-task" data-id="${task.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Просмотр
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Добавление обработчиков для кнопок просмотра
    container.querySelectorAll('.view-task').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.id;
            
            // Скрытие результатов поиска
            hideSearchResults();
            
            // Открытие модального окна задачи
            import('./tasks.js').then(module => {
                module.showTaskDetails(taskId);
            });
        });
    });
}

/**
 * Отображение результатов поиска по проектам
 * @param {HTMLElement} container - Контейнер для вывода
 * @param {Array} projects - Найденные проекты
 */
function displayProjectResults(container, projects) {
    container.innerHTML = '';
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="search-no-results">Проекты не найдены</div>';
        return;
    }
    
    // Создание таблицы результатов
    const table = document.createElement('table');
    table.className = 'search-results-table';
    
    // Заголовок таблицы
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Название проекта</th>
            <th>Этап</th>
            <th>Статус</th>
            <th>Действия</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Тело таблицы
    const tbody = document.createElement('tbody');
    
    projects.forEach(project => {
        const tr = document.createElement('tr');
        
        // Получение имени этапа
        let stageName = 'Неизвестный этап';
        import('./projects.js').then(module => {
            const stage = module.getProjectStages().find(s => s.id === project.stageId);
            if (stage) {
                stageName = stage.name;
                tr.querySelector('.project-stage').textContent = stageName;
            }
        });
        
        tr.innerHTML = `
            <td class="project-name">${project.name}</td>
            <td class="project-stage">${stageName}</td>
            <td><span class="project-status ${project.isCompleted ? 'completed' : 'active'}">${project.isCompleted ? 'Завершен' : 'Активен'}</span></td>
            <td>
                <button class="search-action-btn view-project" data-id="${project.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Просмотр
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Добавление обработчиков для кнопок просмотра
    container.querySelectorAll('.view-project').forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.dataset.id;
            
            // Скрытие результатов поиска
            hideSearchResults();
            
            // Переход к разделу проектов и открытие проекта
            import('./projects.js').then(module => {
                // Переключение на раздел проектов
                document.getElementById('projects-link').click();
                
                // Открытие проекта
                setTimeout(() => {
                    module.showProjectDetails(projectId);
                }, 100);
            });
        });
    });
}

/**
 * Отображение результатов поиска по пользователям
 * @param {HTMLElement} container - Контейнер для вывода
 * @param {Array} users - Найденные пользователи
 */
function displayUserResults(container, users) {
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<div class="search-no-results">Пользователи не найдены</div>';
        return;
    }
    
    // Создание таблицы результатов
    const table = document.createElement('table');
    table.className = 'search-results-table';
    
    // Заголовок таблицы
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Имя пользователя</th>
            <th>Email</th>
            <th>Должность</th>
            <th>Отдел</th>
            <th>Действия</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Тело таблицы
    const tbody = document.createElement('tbody');
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td class="user-name">${user.username}</td>
            <td>${user.email || '-'}</td>
            <td>${user.position || '-'}</td>
            <td>${user.department || '-'}</td>
            <td>
                <button class="search-action-btn view-user" data-id="${user.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Профиль
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Добавление обработчиков для кнопок просмотра
    container.querySelectorAll('.view-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.id;
            
            // Скрытие результатов поиска
            hideSearchResults();
            
            // Переход к разделу пользователей
            document.getElementById('users-link').click();
            
            // Показ профиля пользователя
            import('./users.js').then(module => {
                module.showUserProfile(userId);
            });
        });
    });
}

/**
 * Отображение панели результатов поиска
 * @param {string} query - Поисковый запрос
 */
function showSearchResults(query) {
    if (query.length >= 2) {
        const resultsContainer = document.getElementById('search-results-container');
        
        if (resultsContainer) {
            // Установка позиции контейнера относительно поля поиска
            const searchInput = document.getElementById('global-search');
            
            if (searchInput) {
                const rect = searchInput.getBoundingClientRect();
                
                resultsContainer.style.top = (rect.bottom + window.scrollY) + 'px';
                resultsContainer.style.left = (rect.left + window.scrollX) + 'px';
                resultsContainer.style.width = Math.max(400, rect.width) + 'px';
                
                // Выполнение поиска
                performSearch(query);
            }
        }
    }
}

/**
 * Скрытие панели результатов поиска
 */
function hideSearchResults() {
    const resultsContainer = document.getElementById('search-results-container');
    
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}