// modules/initialization.js - обновленная версия с поддержкой авторизации и чата
import { loadFromStorage } from './storage.js';
import { initUsers } from './users.js';
import { initTasks, getTasks } from './tasks.js';
import { initProjects } from './projects.js';
import { showSection, setupModalHandlers, setupFilterHandlers } from './ui.js';
import { initComments } from './comments.js';
import { initAuth, logout } from './auth.js'; // Импортируем модуль авторизации
import { initMessaging } from './messaging.js'; // Импортируем модуль чата

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

export function initializeApp() {
    // Загрузка данных из локального хранилища
    const users = loadFromStorage('crm-users', []);
    const tasks = loadFromStorage('crm-tasks', []);
    const projects = loadFromStorage('crm-projects', []);
    const projectStages = loadFromStorage('crm-project-stages', DEFAULT_PROJECT_STAGES);
    const comments = loadFromStorage('crm-comments', []);

    // Инициализация модулей
    initUsers(users);
    initTasks(tasks);
    initProjects(projects, projectStages);
    initComments(comments);
    initMessaging(); // Инициализация модуля чата
    
    // Инициализация авторизации
    const isAuthenticated = initAuth();
    
    if (isAuthenticated) {
        // Если пользователь уже авторизован, показываем главный экран
        document.getElementById('auth-section').classList.remove('active');
        document.getElementById('app-container').style.display = 'flex';
        
        // Настройка обработчиков - порядок важен!
        setupNavigation(); // Сначала настраиваем навигацию
        setupModalHandlers();
        setupFilterHandlers();
        setupFormHandlers();
        setupAuthHandlers(); // Добавляем обработчики для авторизации
        
        // Показываем дашборд при загрузке
        showSection('dashboard');
    }
    
    // Добавляем дополнительную проверку для отладки
    console.log('Приложение инициализировано успешно');
}

function setupAuthHandlers() {
    // Обработчик выхода из системы
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
    });
}

function setupNavigation() {
    // Навигация по клику
    const navLinks = [
        { id: 'dashboard-link', section: 'dashboard' },
        { id: 'users-link', section: 'users' },
        { id: 'tasks-link', section: 'tasks' },
        { id: 'projects-link', section: 'projects' }
    ];

    // Сначала удаляем все существующие слушатели событий (чтобы избежать дублирования)
    navLinks.forEach(link => {
        const element = document.getElementById(link.id);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    });

    // Затем добавляем новые слушатели
    navLinks.forEach(link => {
        const element = document.getElementById(link.id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Переключение на раздел: ${link.section}`);
                showSection(link.section);
            });
        } else {
            console.error(`Элемент с ID ${link.id} не найден в DOM`);
        }
    });
    
    console.log('Навигация настроена успешно');
}

function setupFormHandlers() {
    // Форма добавления пользователя
    document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value, // Добавляем пароль
            email: document.getElementById('email').value,
            position: document.getElementById('position').value,
            department: document.getElementById('department').value
        };
        
        import('./users.js').then(module => {
            module.addUser(userData);
            module.renderUsers(document.getElementById('users-list'));
        });
        
        e.target.reset();
        document.getElementById('user-modal').style.display = 'none';
    });

    // Форма добавления задачи
    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Получаем значения полей
        const coAssignee = document.getElementById('co-assignee').value;
        const watcher = document.getElementById('watcher').value;
        
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            assignedTo: document.getElementById('assigned-to').value,
            // Добавляем соисполнителя и наблюдателя в массивы, если они выбраны
            coAssignees: coAssignee ? [coAssignee] : [],
            watchers: watcher ? [watcher] : [],
            priority: document.getElementById('task-priority').value
        };
        
        import('./tasks.js').then(module => {
            module.addTask(taskData);
            module.renderTasks();
        });
        
        e.target.reset();
        document.getElementById('task-modal').style.display = 'none';
    });

    // Форма добавления проекта
    document.getElementById('project-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const projectData = {
            name: document.getElementById('project-name').value,
            stageId: document.getElementById('project-stage').value,
            fields: []
        };
        
        // Собираем значения дополнительных полей
        const fieldsContainer = document.getElementById('project-fields');
        fieldsContainer.querySelectorAll('[id^="field-"]').forEach(fieldInput => {
            const field = {
                id: fieldInput.id.replace('field-', ''),
                name: fieldInput.previousElementSibling.textContent.replace(':', ''),
                value: fieldInput.value
            };
            projectData.fields.push(field);
        });
        
        import('./projects.js').then(module => {
            module.addProject(projectData);
            module.renderProjects();
        });
        
        e.target.reset();
        document.getElementById('project-modal').style.display = 'none';
    });

    // Форма добавления этапа проекта
    document.getElementById('stage-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const stageName = document.getElementById('stage-name').value;
        
        import('./projects.js').then(module => {
            module.addProjectStage(stageName);
            
            // Перерисовываем список этапов
            const stagesList = document.getElementById('stages-list');
            const stagesWrapper = document.querySelector('.stages-wrapper');
            
            // Обновляем список и селекты этапов
            document.querySelectorAll('[id$="stage"]').forEach(select => {
                const selectedValue = select.value;
                select.innerHTML = '';
                module.getProjectStages().forEach(stage => {
                    const option = document.createElement('option');
                    option.value = stage.id;
                    option.textContent = stage.name;
                    select.appendChild(option);
                });
                select.value = selectedValue;
            });
        });
        
        e.target.reset();
    });

    // Форма добавления поля для проекта
    document.getElementById('field-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fieldData = {
            name: document.getElementById('field-name').value,
            type: document.getElementById('field-type').value
        };
        
        const fieldsContainer = document.getElementById('project-fields');
        const newFieldId = Date.now().toString();
        
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';
        
        let fieldInput = '';
        if (fieldData.type === 'textarea') {
            fieldInput = `<textarea id="field-${newFieldId}" placeholder="${fieldData.name}"></textarea>`;
        } else {
            fieldInput = `<input type="${fieldData.type}" id="field-${newFieldId}" placeholder="${fieldData.name}">`;
        }
        
        fieldGroup.innerHTML = `
            <div class="field-header">
                <label for="field-${newFieldId}">${fieldData.name}</label>
                <button type="button" class="remove-field-btn" data-id="${newFieldId}">×</button>
            </div>
            ${fieldInput}
        `;
        
        fieldsContainer.appendChild(fieldGroup);
        
        // Добавляем обработчик удаления поля
        fieldGroup.querySelector('.remove-field-btn').addEventListener('click', () => {
            fieldsContainer.removeChild(fieldGroup);
        });
        
        e.target.reset();
        document.getElementById('field-modal').style.display = 'none';
    });

    // Форма изменения этапа проекта
    document.getElementById('move-stage-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newStageId = document.getElementById('new-stage').value;
        
        import('./projects.js').then(module => {
            // Текущий проект сохранен в глобальной переменной из предыдущего модуля
            module.moveProjectStage(window.currentProjectId, newStageId);
            module.renderProjects();
        });
        
        document.getElementById('move-stage-modal').style.display = 'none';
        document.getElementById('view-project-modal').style.display = 'none';
    });

    // Кнопки открытия модальных окон
    document.getElementById('add-user-btn').addEventListener('click', () => {
        document.getElementById('user-modal').style.display = 'block';
    });

    document.getElementById('add-task-btn').addEventListener('click', () => {
        import('./users.js').then(module => {
            const assignedToSelect = document.getElementById('assigned-to');
            const coAssigneeSelect = document.getElementById('co-assignee');
            const watcherSelect = document.getElementById('watcher');
            
            // Очищаем и заполняем селекты пользователей
            assignedToSelect.innerHTML = '<option value="">Выберите исполнителя</option>';
            coAssigneeSelect.innerHTML = '<option value="">Выберите соисполнителя</option>';
            watcherSelect.innerHTML = '<option value="">Выберите наблюдателя</option>';
            
            const users = module.getUsers();
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
        });
        
        document.getElementById('task-modal').style.display = 'block';
    });

    document.getElementById('add-project-btn').addEventListener('click', () => {
        // Сбрасываем текущий проект
        window.currentProjectId = null;
        
        // Заполняем список этапов
        import('./projects.js').then(module => {
            const stageSelect = document.getElementById('project-stage');
            stageSelect.innerHTML = '';
            module.getProjectStages().forEach(stage => {
                const option = document.createElement('option');
                option.value = stage.id;
                option.textContent = stage.name;
                stageSelect.appendChild(option);
            });
        });
        
        // Очищаем дополнительные поля
        document.getElementById('project-fields').innerHTML = '';
        
        document.getElementById('project-modal').style.display = 'block';
    });

    document.getElementById('manage-stages-btn').addEventListener('click', () => {
        import('./projects.js').then(module => {
            const stagesList = document.getElementById('stages-list');
            stagesList.innerHTML = '';
            
            module.getProjectStages().forEach(stage => {
                const stageItem = document.createElement('div');
                stageItem.className = 'stage-item';
                stageItem.innerHTML = `
                    <span>${stage.name}</span>
                    <button class="delete-stage-btn" data-id="${stage.id}">×</button>
                `;
                stagesList.appendChild(stageItem);
                
                // Добавляем обработчик удаления этапа
                stageItem.querySelector('.delete-stage-btn').addEventListener('click', () => {
                    import('./projects.js').then(projectModule => {
                        const stageId = stageItem.querySelector('.delete-stage-btn').getAttribute('data-id');
                        if (projectModule.deleteProjectStage(stageId)) {
                            stagesList.removeChild(stageItem);
                        }
                    });
                });
            });
        });
        
        document.getElementById('stages-modal').style.display = 'block';
    });
    
    // Открытие модального окна добавления поля
    document.getElementById('add-field-btn').addEventListener('click', () => {
        document.getElementById('field-modal').style.display = 'block';
    });
}