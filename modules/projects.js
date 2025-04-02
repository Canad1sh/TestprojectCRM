// modules/projects.js - улучшенная версия
import { saveProjects, saveProjectStages } from './storage.js';
import { updateDashboard } from './ui.js';

let projects = [];
let projectStages = [];

export function initProjects(loadedProjects, loadedStages) {
    projects = loadedProjects;
    projectStages = loadedStages;
}

export function getProjects() {
    return projects;
}

export function getProjectStages() {
    return projectStages;
}

export function addProject(projectData) {
    const newProject = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCompleted: false,
        ...projectData
    };
    
    projects.push(newProject);
    saveProjects(projects);
    updateDashboard();
    return newProject;
}

export function updateProject(projectId, projectData) {
    projects = projects.map(project => {
        if (project.id === projectId) {
            return {
                ...project,
                ...projectData,
                updatedAt: new Date().toISOString()
            };
        }
        return project;
    });
    
    saveProjects(projects);
    return projects.find(p => p.id === projectId);
}

export function moveProjectStage(projectId, newStageId) {
    const lastStageId = projectStages[projectStages.length - 1].id;
    
    projects = projects.map(project => {
        if (project.id === projectId) {
            // Если проект перемещается в финальный этап, отмечаем его как завершенный
            const isCompleted = newStageId === lastStageId;
            
            return {
                ...project,
                stageId: newStageId,
                updatedAt: new Date().toISOString(),
                isCompleted
            };
        }
        return project;
    });
    
    saveProjects(projects);
    updateDashboard();
    return projects.find(p => p.id === projectId);
}

export function addProjectStage(stageName) {
    const newStage = {
        id: Date.now().toString(),
        name: stageName
    };
    
    projectStages.push(newStage);
    saveProjectStages(projectStages);
    return newStage;
}

export function deleteProjectStage(stageId) {
    // Проверяем, есть ли проекты на этом этапе
    const projectsOnStage = projects.filter(project => project.stageId === stageId);
    
    if (projectsOnStage.length > 0) {
        alert('Невозможно удалить этап, на котором есть проекты.');
        return false;
    }
    
    projectStages = projectStages.filter(stage => stage.id !== stageId);
    saveProjectStages(projectStages);
    return true;
}

export function renderProjects(filter = 'all') {
    const projectsBoard = document.getElementById('projects-board');
    projectsBoard.innerHTML = '';
    
    // Показываем индикатор загрузки
    projectsBoard.innerHTML = '<div class="loading-projects">Загрузка проектов...</div>';
    
    // Имитируем небольшую задержку для анимации загрузки (можно убрать в продакшене)
    setTimeout(() => {
        // Создаем колонки для каждого этапа
        const stagesWrapper = document.createElement('div');
        stagesWrapper.className = 'stages-wrapper';
        projectsBoard.innerHTML = ''; // Очищаем индикатор загрузки
        projectsBoard.appendChild(stagesWrapper);
        
        // Фильтрация проектов
        let filteredProjects = projects;
        if (filter === 'active') {
            filteredProjects = projects.filter(project => !project.isCompleted);
        } else if (filter === 'completed') {
            filteredProjects = projects.filter(project => project.isCompleted);
        }
        
        // Формируем колонки с проектами
        projectStages.forEach((stage, index) => {
            const stageColumn = document.createElement('div');
            stageColumn.className = 'stage-column';
            stageColumn.style.animationDelay = `${index * 0.05}s`; // Каскадная анимация для колонок
            
            // Заголовок колонки (название этапа)
            const stageHeader = document.createElement('div');
            stageHeader.className = 'stage-header';
            
            const stageProjects = filteredProjects.filter(p => p.stageId === stage.id);
            
            stageHeader.innerHTML = `
                <h3>${stage.name}</h3>
                <span class="project-count">${stageProjects.length}</span>
            `;
            stageColumn.appendChild(stageHeader);
            
            // Проекты в этом этапе
            stageProjects.forEach((project, projectIndex) => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                if (project.isCompleted) {
                    projectCard.classList.add('completed');
                }
                projectCard.setAttribute('data-id', project.id);
                projectCard.style.animationDelay = `${index * 0.05 + projectIndex * 0.03}s`; // Каскадная анимация для карточек
                
                // Базовая информация о проекте
                let projectFields = '';
                if (project.fields && project.fields.length > 0) {
                    const firstField = project.fields[0]; // Показываем только первое поле в карточке
                    projectFields = `<div class="project-field"><span>${firstField.name}:</span> ${firstField.value || '-'}</div>`;
                }
                
                projectCard.innerHTML = `
                    <div class="project-card-header">
                        <h4>${project.name}</h4>
                        <span class="project-date">${formatDate(project.updatedAt)}</span>
                    </div>
                    ${projectFields}
                    <div class="project-card-footer">
                        <button class="view-project-btn" data-id="${project.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="margin-right: 4px">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Просмотр
                        </button>
                    </div>
                `;
                
                stageColumn.appendChild(projectCard);
                
                // Добавляем обработчик клика на всю карточку
                projectCard.addEventListener('click', (e) => {
                    // Если клик был не по кнопке, а по карточке
                    if (!e.target.closest('.view-project-btn')) {
                        const projectId = projectCard.getAttribute('data-id');
                        showProjectDetails(projectId);
                    }
                });
            });
            
            stagesWrapper.appendChild(stageColumn);
        });
        
        // Если нет проектов, показываем сообщение
        if (filteredProjects.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-projects';
            emptyMessage.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    <h3 style="margin-bottom: 8px; color: #475569;">Проектов не найдено</h3>
                    <p style="margin-bottom: 16px;">Создайте новый проект, нажав кнопку «Создать проект»</p>
                    <button id="empty-add-project" class="primary-btn" style="margin: 0 auto; display: inline-flex;">Создать проект</button>
                </div>
            `;
            projectsBoard.innerHTML = '';
            projectsBoard.appendChild(emptyMessage);
            
            // Добавляем обработчик для кнопки
            document.getElementById('empty-add-project').addEventListener('click', () => {
                document.getElementById('add-project-btn').click();
            });
        }
        
        // Добавляем обработчики для кнопок просмотра проекта
        document.querySelectorAll('.view-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращаем всплытие события на родительскую карточку
                const projectId = btn.getAttribute('data-id');
                showProjectDetails(projectId);
            });
        });
        
        updateDashboard();
    }, 400); // Задержка для демонстрации загрузки
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showProjectDetails(projectId) {
    window.currentProjectId = projectId; // Сохраняем ID текущего проекта для использования в других функциях
    const project = projects.find(p => p.id === projectId);
    
    if (!project) return;
    
    // Находим название этапа
    const stage = projectStages.find(s => s.id === project.stageId);
    const stageName = stage ? stage.name : 'Неизвестный этап';
    
    // Статус проекта с иконкой
    const statusIcon = project.isCompleted 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a6cf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    
    // Заполняем данные о проекте
    document.getElementById('view-project-title').textContent = project.name;
    
    const projectDetails = document.getElementById('project-details');
    projectDetails.innerHTML = `
        <div class="project-detail">
            <span class="detail-label">Этап:</span>
            <span class="detail-value">${stageName}</span>
        </div>
        <div class="project-detail">
            <span class="detail-label">Создан:</span>
            <span class="detail-value">${formatDate(project.createdAt)}</span>
        </div>
        <div class="project-detail">
            <span class="detail-label">Обновлен:</span>
            <span class="detail-value">${formatDate(project.updatedAt)}</span>
        </div>
        <div class="project-detail">
            <span class="detail-label">Статус:</span>
            <span class="detail-value" style="display: flex; align-items: center;">
                ${statusIcon}
                ${project.isCompleted ? 'Завершен' : 'Активен'}
            </span>
        </div>
        <h4 class="fields-header">Информация о проекте:</h4>
    `;
    
    // Добавляем поля проекта
    if (project.fields && project.fields.length > 0) {
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'project-fields';
        
        project.fields.forEach(field => {
            const fieldEl = document.createElement('div');
            fieldEl.className = 'project-detail';
            fieldEl.innerHTML = `
                <span class="detail-label">${field.name}:</span>
                <span class="detail-value">${field.value || '-'}</span>
            `;
            fieldsContainer.appendChild(fieldEl);
        });
        
        projectDetails.appendChild(fieldsContainer);
    } else {
        const noFields = document.createElement('p');
        noFields.style.color = '#64748b';
        noFields.style.fontStyle = 'italic';
        noFields.textContent = 'Дополнительных полей нет.';
        projectDetails.appendChild(noFields);
    }
    
    // Показываем/скрываем кнопки в зависимости от статуса проекта
    document.getElementById('move-stage-btn').style.display = project.isCompleted ? 'none' : 'flex';
    
    document.getElementById('view-project-modal').style.display = 'block';
    
    // Добавляем обработчик для кнопки изменения этапа
    document.getElementById('move-stage-btn').onclick = () => {
        // Заполняем селект с этапами
        const newStageSelect = document.getElementById('new-stage');
        newStageSelect.innerHTML = '';
        
        projectStages.forEach(stage => {
            // Пропускаем текущий этап
            if (stage.id === project.stageId) return;
            
            const option = document.createElement('option');
            option.value = stage.id;
            option.textContent = stage.name;
            newStageSelect.appendChild(option);
        });
        
        document.getElementById('move-stage-modal').style.display = 'block';
    };
    
    // Добавляем обработчик для кнопки редактирования проекта
    document.getElementById('edit-project-btn').onclick = () => {
        // Здесь можно реализовать функционал редактирования проекта
        // Например, заполнить форму создания проекта текущими данными и показать её
        alert('Функционал редактирования проекта будет доступен в следующем обновлении.');
    };
}