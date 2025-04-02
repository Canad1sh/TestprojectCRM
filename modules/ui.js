// modules/ui.js
import { getUsers } from './users.js';
import { getTasks } from './tasks.js';
import { getProjects } from './projects.js';

export function updateDashboard() {
    const tasks = getTasks();
    const projects = getProjects();
    
    // Статистика по задачам
    document.getElementById('total-tasks').textContent = tasks.length;
    document.getElementById('new-tasks').textContent = tasks.filter(task => task.status === 'новая').length;
    document.getElementById('in-progress-tasks').textContent = tasks.filter(task => task.status === 'в работе').length;
    document.getElementById('completed-tasks').textContent = tasks.filter(task => task.status === 'выполнена').length;
    
    // Статистика по проектам
    document.getElementById('total-projects').textContent = projects.length;
    document.getElementById('active-projects').textContent = projects.filter(project => !project.isCompleted).length;
    document.getElementById('completed-projects').textContent = projects.filter(project => project.isCompleted).length;
}

export function showSection(section) {
    console.log(`Показываем раздел: ${section}`);
    
    const sections = {
        'dashboard': ['dashboard', 'dashboard-link'],
        'users': ['users', 'users-link'],
        'tasks': ['tasks', 'tasks-link'],
        'projects': ['projects', 'projects-link']
    };

    // Скрываем все разделы и убираем активные классы
    ['dashboard', 'users', 'tasks', 'projects'].forEach(sec => {
        const sectionElement = document.getElementById(sec);
        const linkElement = document.getElementById(`${sec}-link`);
        
        if (sectionElement) {
            sectionElement.classList.remove('active');
        } else {
            console.error(`Элемент раздела с ID ${sec} не найден`);
        }
        
        if (linkElement) {
            linkElement.classList.remove('active');
        } else {
            console.error(`Элемент ссылки с ID ${sec}-link не найден`);
        }
    });
    
    // Показываем выбранный раздел
    if (sections[section]) {
        const [sectionId, linkId] = sections[section];
        const sectionElement = document.getElementById(sectionId);
        const linkElement = document.getElementById(linkId);
        
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
        
        if (linkElement) {
            linkElement.classList.add('active');
        }
        
        // В зависимости от раздела вызываем соответствующий рендер
        switch(section) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'users':
                import('./users.js').then(module => {
                    module.renderUsers(document.getElementById('users-list'));
                }).catch(error => {
                    console.error('Ошибка при загрузке модуля users.js:', error);
                });
                break;
            case 'tasks':
                import('./tasks.js').then(module => {
                    module.renderTasks();
                }).catch(error => {
                    console.error('Ошибка при загрузке модуля tasks.js:', error);
                });
                break;
            case 'projects':
                import('./projects.js').then(module => {
                    module.renderProjects();
                }).catch(error => {
                    console.error('Ошибка при загрузке модуля projects.js:', error);
                });
                break;
        }
    } else {
        console.error(`Неизвестный раздел: ${section}`);
    }
}

export function setupModalHandlers() {
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modals = [
                'user-modal', 'task-modal', 'project-modal', 
                'stages-modal', 'field-modal', 'view-project-modal', 
                'move-stage-modal', 'task-detail-modal', 'add-participant-modal'
            ];
            
            modals.forEach(modalId => {
                const modalElement = document.getElementById(modalId);
                if (modalElement) {
                    modalElement.style.display = 'none';
                }
            });
        });
    });

    // Закрытие модальных окон по клику вне
    window.addEventListener('click', (e) => {
        const modals = [
            'user-modal', 'task-modal', 'project-modal', 
            'stages-modal', 'field-modal', 'view-project-modal', 
            'move-stage-modal', 'task-detail-modal', 'add-participant-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

export function setupFilterHandlers() {
    const taskFilterButtons = document.querySelectorAll('.filter-btn');
    const projectFilterButtons = document.querySelectorAll('.project-filter-btn');
    
    // Фильтрация задач
    taskFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            taskFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            import('./tasks.js').then(module => {
                module.renderTasks(filter);
            }).catch(error => {
                console.error('Ошибка при загрузке модуля tasks.js:', error);
            });
        });
    });
    
    // Фильтрация проектов
    projectFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            projectFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            import('./projects.js').then(module => {
                module.renderProjects(filter);
            }).catch(error => {
                console.error('Ошибка при загрузке модуля projects.js:', error);
            });
        });
    });
}