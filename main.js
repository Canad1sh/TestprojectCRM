 // main.js - основной модуль инициализации приложения

// Импорты основных модулей
import { loadFromStorage } from './modules/storage.js';
import { initAuth, logout } from './modules/auth.js';
import { initUsers, getUserById, searchUsers } from './modules/users.js';
import { initTasks, searchTasks } from './modules/tasks.js';
import { initProjects, searchProjects } from './modules/projects.js';
import { initComments } from './modules/comments.js';
import { initMessaging } from './modules/messaging.js';
import { initCalendarEvents, renderCalendar } from './modules/calendar-events.js';
import { 
    initUIEnhancements, 
    showNotification, 
    setupModals, 
    handleResponsiveDesign 
} from './modules/ui-enhancements.js';

// Инициализация данных по умолчанию
const DEFAULT_PROJECT_STAGES = [
    { id: "1", name: "Согласование и старт проекта" },
    { id: "2", name: "КП\\договор\\аванс" },
    { id: "3", name: "Подготовка к стройке" },
    { id: "4", name: "Земляные работы" },
    { id: "5", name: "Монтажные работы" },
    { id: "6", name: "ПНР" },
    { id: "7", name: "Подготовка ИД" },
    { id: "8", name: "Защита и подписание ИД" },
    { id: "9", name: "РК и Устранение замечаний" },
    { id: "10", name: "Передача объекта и бюджет" },
    { id: "11", name: "Проект завершен" }
];

// Получение пользователей по умолчанию
function getDefaultUsers() {
    return [
        {
            id: '1',
            username: 'admin',
            password: 'admin123',
            email: 'admin@example.com',
            position: 'Администратор',
            department: 'IT',
            role: 'admin',
            isActive: true
        }
    ];
}


const { app, BrowserWindow, Menu } = require("electron");

// Удаляем стандартное меню
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
    const win = new BrowserWindow({ /* настройки */ });
    win.loadFile("index.html");
});


// Основная функция инициализации приложения
export function initializeApp() {
    try {
        console.log('Инициализация приложения...');
        
        // Загрузка данных из локального хранилища
        const users = loadFromStorage('crm-users', getDefaultUsers());
        const tasks = loadFromStorage('crm-tasks', []);
        const projects = loadFromStorage('crm-projects', []);
        const projectStages = loadFromStorage('crm-project-stages', DEFAULT_PROJECT_STAGES);
        const comments = loadFromStorage('crm-comments', []);

        // Инициализация модулей
        initUsers(users);
        initTasks(tasks);
        initProjects(projects, projectStages);
        initComments(comments);
        initMessaging();
        initCalendarEvents();
        
        // Инициализация расширенных функций интерфейса
        initUIEnhancements();
        
        // Инициализация авторизации
        const isAuthenticated = initAuth();
        
        if (isAuthenticated) {
            // Если пользователь авторизован, показываем главный экран
            document.getElementById('auth-section').classList.remove('active');
            document.getElementById('app-container').style.display = 'flex';
            
            // Настройка навигации и основных обработчиков
            setupNavigation();
            setupMainHandlers();
            setupModalHandlers();
            setupFilterHandlers();
            setupActionButtons();
            
            // Показываем проекты как главный экран по умолчанию
            showSection('projects');
        }
        
        console.log('Приложение инициализировано успешно');
        
    } catch (error) {
        console.error('Критическая ошибка инициализации приложения:', error);
        showNotification('Произошла ошибка при запуске приложения', 'error');
    }
}

// Настройка навигации
function setupNavigation() {
    const navLinks = [
        { id: 'projects-link', section: 'projects' },
        { id: 'tasks-link', section: 'tasks' },
        { id: 'users-link', section: 'users' },
        { id: 'calendar-link', section: 'calendar' },
        { id: 'settings-link', section: 'settings' }
    ];

    navLinks.forEach(link => {
        const element = document.getElementById(link.id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Снимаем активный класс со всех ссылок
                navLinks.forEach(l => {
                    const el = document.getElementById(l.id);
                    if (el) el.classList.remove('active');
                });
                
                // Добавляем активный класс текущей ссылке
                element.classList.add('active');
                
                // Показываем соответствующий раздел
                showSection(link.section);
            });
        }
    });
}

// Настройка основных обработчиков
function setupMainHandlers() {
    // Обработчик выхода из системы
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Обработчик для глобального поиска
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = e.target.value.trim();
                if (searchTerm) {
                    performGlobalSearch(searchTerm);
                }
            }
        });
    }

    // Обработчик переключения темы
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            document.body.className = `theme-${theme}`;
            localStorage.setItem('theme', theme);
            
            // Обновляем активность кнопок
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Показать определенный раздел
function showSection(section) {
    // Скрываем все разделы
    const sections = document.querySelectorAll('main .section');
    sections.forEach(s => s.classList.remove('active'));
    
    // Показываем нужный раздел
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Выполняем дополнительные действия в зависимости от раздела
        loadSectionContent(section);
    }
}

// Загрузка контента для раздела
function loadSectionContent(section) {
    switch(section) {
        case 'projects':
            import('./modules/projects.js').then(module => {
                const activeFilter = document.querySelector('.project-filter-btn.active')?.getAttribute('data-filter') || 'all';
                module.renderProjects(activeFilter);
            }).catch(handleLoadError);
            break;
        case 'tasks':
            import('./modules/tasks.js').then(module => {
                const activeView = document.querySelector('.view-btn.active')?.getAttribute('data-view') || 'kanban';
                const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
                module.renderTasks(activeFilter, activeView);
            }).catch(handleLoadError);
            break;
        case 'users':
            import('./modules/users.js').then(module => {
                module.renderUsers(document.getElementById('users-list'));
            }).catch(handleLoadError);
            break;
        case 'calendar':
            renderCalendar(new Date());
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Обработчик ошибок загрузки контента
function handleLoadError(error) {
    console.error(`Ошибка при загрузке контента:`, error);
    showNotification('Не удалось загрузить данные', 'error');
}

// Загрузка настроек
function loadSettings() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === currentTheme);
    });
}

// Глобальный поиск
function performGlobalSearch(query) {
    Promise.all([
        searchTasks(query),
        searchProjects(query),
        searchUsers(query)
    ]).then(([tasks, projects, users]) => {
        const foundData = { tasks, projects, users };
        displaySearchResults(foundData);
    }).catch(handleLoadError);
}

// Отображение результатов поиска
function displaySearchResults(foundData) {
    const totalResults = Object.values(foundData).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalResults > 0) {
        showNotification(`Найдено результатов: ${totalResults}`, 'info');
        
        // Приоритет отображения: задачи -> проекты -> пользователи
        if (foundData.tasks.length) {
            showSection('tasks');
            import('./modules/tasks.js').then(module => {
                module.renderSearchResults(foundData.tasks);
            });
        } else if (foundData.projects.length) {
            showSection('projects');
            import('./modules/projects.js').then(module => {
                module.renderSearchResults(foundData.projects);
            });
        } else if (foundData.users.length) {
            showSection('users');
            import('./modules/users.js').then(module => {
                module.renderSearchResults(foundData.users);
            });
        }
    } else {
        showNotification('Ничего не найдено', 'warning');
    }
}

// Настройка фильтров
function setupFilterHandlers() {
    // Фильтры для задач
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            const activeViewBtn = document.querySelector('.view-btn.active');
            const view = activeViewBtn ? activeViewBtn.getAttribute('data-view') : 'kanban';
            
            import('./modules/tasks.js').then(module => {
                module.renderTasks(filter, view);
            }).catch(handleLoadError);
        });
    });

    // Фильтры для проектов
    document.querySelectorAll('.project-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.project-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            
            import('./modules/projects.js').then(module => {
                module.renderProjects(filter);
            }).catch(handleLoadError);
        });
    });

    // Переключатель вида задач
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.getAttribute('data-view');
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
            
            import('./modules/tasks.js').then(module => {
                module.renderTasks(filter, view);
            }).catch(handleLoadError);
        });
    });
}

// Настройка кнопок действий
function setupActionButtons() {
    // Кнопка добавления пользователя
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            import('./modules/users.js').then(module => {
                module.openAddUserModal();
            }).catch(handleLoadError);
        });
    }

    // Кнопка добавления задачи
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            Promise.all([
                import('./modules/users.js'),
                import('./modules/projects.js')
            ]).then(([usersModule, projectsModule]) => {
                const users = usersModule.getUsers();
                const projects = projectsModule.getProjects();
                
                // Заполнение селектов
                const assignedToSelect = document.getElementById('assigned-to');
                const coAssigneeSelect = document.getElementById('co-assignee');
                const watcherSelect = document.getElementById('watcher');
                const projectSelect = document.getElementById('task-project');

                // Очистка и заполнение селектов пользователями
                [assignedToSelect, coAssigneeSelect, watcherSelect].forEach(select => {
                    select.innerHTML = '<option value="">Выберите пользователя</option>' + 
                        users.map(user => 
                            `<option value="${user.id}">${user.username}</option>`
                        ).join('');
                });

                // Заполнение селекта проектов
                projectSelect.innerHTML = '<option value="">Без проекта</option>' + 
                    projects.map(project => 
                        `<option value="${project.id}">${project.name}</option>`
                    ).join('');

                // Открытие модального окна
                document.getElementById('task-modal').style.display = 'block';
            }).catch(handleLoadError);
        });
    }

    // Кнопка добавления проекта
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            import('./modules/projects.js').then(module => {
                const stages = module.getProjectStages();
                
                const stageSelect = document.getElementById('project-stage');
                stageSelect.innerHTML = stages.map(stage => 
                    `<option value="${stage.id}">${stage.name}</option>`
                ).join('');

                // Очистка полей проекта
                document.getElementById('project-name').value = '';
                document.getElementById('project-description').value = '';

                document.getElementById('project-modal').style.display = 'block';
            }).catch(handleLoadError);
        });
    }

    // Кнопка управления этапами проектов
    const manageStagesBtn = document.getElementById('manage-stages-btn');
    if (manageStagesBtn) {
        manageStagesBtn.addEventListener('click', () => {
            import('./modules/projects.js').then(module => {
                const stages = module.getProjectStages();
                const stagesList = document.getElementById('stages-list');
                
                // Очистка текущего списка этапов
                stagesList.innerHTML = '';

                // Заполнение списка этапов
                stages.forEach((stage, index) => {
                    const stageItem = document.createElement('div');
                    stageItem.classList.add('stage-item');
                    stageItem.innerHTML = `
                        <span>${stage.name}</span>
                        <div class="stage-actions">
                            <button class="edit-stage-btn" data-id="${stage.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="delete-stage-btn" data-id="${stage.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    `;
                    
                    // Обработчики кнопок редактирования и удаления этапов
                    const editBtn = stageItem.querySelector('.edit-stage-btn');
                    const deleteBtn = stageItem.querySelector('.delete-stage-btn');
                    
                    editBtn.addEventListener('click', () => {
                        const stageName = prompt('Введите новое название этапа:', stage.name);
                        if (stageName && stageName.trim()) {
                            module.updateProjectStage(stage.id, stageName.trim());
                            // Обновляем список этапов
                            manageStagesBtn.click();
                        }
                    });
                    
                    deleteBtn.addEventListener('click', () => {
                        if (confirm(`Вы уверены, что хотите удалить этап "${stage.name}"?`)) {
                            module.deleteProjectStage(stage.id);
                            // Обновляем список этапов
                            manageStagesBtn.click();
                        }
                    });
                    
                    stagesList.appendChild(stageItem);
                });

                // Кнопка добавления нового этапа
                const addStageBtn = document.getElementById('add-stage-btn');
                addStageBtn.onclick = () => {
                    const newStageName = prompt('Введите название нового этапа:');
                    if (newStageName && newStageName.trim()) {
                        module.addProjectStage(newStageName.trim());
                        // Обновляем список этапов
                        manageStagesBtn.click();
                    }
                };

                // Показываем модальное окно
                document.getElementById('stages-modal').style.display = 'block';
            }).catch(handleLoadError);
        });
    }

    // Кнопка добавления события в календаре
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            import('./modules/calendar-events.js').then(module => {
                // Очистка формы
                document.getElementById('event-title').value = '';
                document.getElementById('event-description').value = '';
                document.getElementById('event-date').value = '';
                document.getElementById('event-time').value = '';
                document.getElementById('event-reminder').selectedIndex = 0;

                // Показываем модальное окно
                document.getElementById('event-modal').style.display = 'block';
            }).catch(handleLoadError);
        });
    }
}

// Настройка обработчиков модальных окон
function setupModalHandlers() {
    // Закрытие модальных окон по клику на крестик
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                
                // Сброс формы
                const form = modal.querySelector('form');
                if (form) form.reset();
            }
        });
    });

    // Закрытие модальных окон по клику вне контента
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
                
                // Сброс формы
                const form = modal.querySelector('form');
                if (form) form.reset();
            }
        });
    });

    // Обработчики форм
    setupFormSubmitHandlers();
}

// Настройка обработчиков отправки форм
function setupFormSubmitHandlers() {
    // Форма входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            import('./modules/auth.js').then(module => {
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                module.login(username, password);
            }).catch(handleLoadError);
        });
    }

    // Форма добавления/редактирования задачи
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            import('./modules/tasks.js').then(module => {
                // Собираем данные о задаче
                const taskData = {
                    title: document.getElementById('task-title').value,
                    description: document.getElementById('task-description').value,
                    project: document.getElementById('task-project').value,
                    deadline: document.getElementById('task-deadline').value,
                    priority: document.getElementById('task-priority').value,
                    assignedTo: document.getElementById('assigned-to').value,
                    coAssignees: Array.from(document.getElementById('co-assignee').selectedOptions).map(opt => opt.value),
                    watchers: Array.from(document.getElementById('watcher').selectedOptions).map(opt => opt.value),
                    checklist: getChecklistItems()
                };

                // Сохраняем задачу
                module.createTask(taskData);

                // Закрываем модальное окно
                document.getElementById('task-modal').style.display = 'none';
                taskForm.reset();
            }).catch(handleLoadError);
        });
    }

    // Форма добавления/редактирования проекта
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            import('./modules/projects.js').then(module => {
                // Собираем данные о проекте
                const projectData = {
                    name: document.getElementById('project-name').value,
                    description: document.getElementById('project-description').value,
                    stage: document.getElementById('project-stage').value,
                    fields: getProjectFields()
                };

                // Сохраняем проект
                module.createProject(projectData);

                // Закрываем модальное окно
                document.getElementById('project-modal').style.display = 'none';
                projectForm.reset();
            }).catch(handleLoadError);
        });
    }

    // Форма добавления события в календаре
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            import('./modules/calendar-events.js').then(module => {
                // Собираем данные о событии
                const eventData = {
                    title: document.getElementById('event-title').value,
                    description: document.getElementById('event-description').value,
                    date: document.getElementById('event-date').value,
                    time: document.getElementById('event-time').value,
                    reminder: document.getElementById('event-reminder').value
                };

                // Сохраняем событие
                module.createEvent(eventData);

                // Закрываем модальное окно
                document.getElementById('event-modal').style.display = 'none';
                eventForm.reset();
            }).catch(handleLoadError);
        });
    }
}

// Получение элементов чек-листа
function getChecklistItems() {
    const checklistContainer = document.getElementById('task-checklist');
    return Array.from(checklistContainer.querySelectorAll('.checklist-item')).map(item => ({
        text: item.querySelector('.checklist-item-label').textContent,
        completed: item.querySelector('input[type="checkbox"]').checked
    }));
}

// Получение дополнительных полей проекта
function getProjectFields() {
    const fieldsContainer = document.getElementById('project-fields');
    return Array.from(fieldsContainer.querySelectorAll('.project-field')).map(field => ({
        name: field.querySelector('input[type="text"]').value,
        value: field.querySelector('input[type="text"]:nth-child(2)').value
    }));
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);