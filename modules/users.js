// modules/users.js - обновленная версия с поддержкой входа и пароля
import { saveUsers, saveToStorage, loadFromStorage } from './storage.js';
import { getTasks } from './tasks.js';
import { getCurrentUser as getAuthUser } from './auth.js';

let users = [];
let currentUserId = null;

export function initUsers(loadedUsers) {
    users = loadedUsers;
    // Загружаем текущего пользователя из хранилища
    currentUserId = loadFromStorage('crm-current-user', null);
}

export function getUsers() {
    return users;
}

export function getCurrentUser() {
    const authUser = getAuthUser();
    // Если пользователь авторизован через auth.js, используем его
    if (authUser) {
        return authUser;
    }
    // Иначе используем старый метод (для обратной совместимости)
    return currentUserId ? findUserById(currentUserId) : null;
}

export function setCurrentUser(userId) {
    currentUserId = userId;
    saveToStorage('crm-current-user', userId);
}

export function addUser(userData) {
    const newUser = {
        id: Date.now().toString(),
        ...userData
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Если это первый пользователь, устанавливаем его как текущего
    if (users.length === 1) {
        setCurrentUser(newUser.id);
    }
    
    return newUser;
}

export function deleteUser(userId) {
    // Проверяем, есть ли задачи, назначенные этому пользователю
    const tasks = getTasks();
    const userTasks = tasks.filter(task => 
        task.creator === userId || 
        task.assignees.includes(userId) || 
        (task.coAssignees && task.coAssignees.includes(userId)) || 
        (task.watchers && task.watchers.includes(userId))
    );
    
    if (userTasks.length > 0) {
        alert('Невозможно удалить пользователя, который является участником задач.');
        return false;
    }
    
    users = users.filter(user => user.id !== userId);
    saveUsers(users);
    
    // Если удаляется текущий пользователь, сбрасываем его
    if (currentUserId === userId) {
        currentUserId = users.length > 0 ? users[0].id : null;
        saveToStorage('crm-current-user', currentUserId);
    }
    
    return true;
}

export function findUserById(userId) {
    return users.find(user => user.id === userId);
}

export function populateUserSelect(selectElement) {
    selectElement.innerHTML = '<option value="">Выберите пользователя</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.username;
        selectElement.appendChild(option);
    });
}

export function renderUsers(usersListElement) {
    usersListElement.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const isCurrentUser = user.id === currentUserId;
        
        if (isCurrentUser) {
            row.classList.add('current-user-row');
        }
        
        row.innerHTML = `
            <td>${user.username} ${isCurrentUser ? '<span class="current-user-badge">Текущий</span>' : ''}</td>
            <td>${user.email}</td>
            <td>${user.position || '-'}</td>
            <td>${user.department || '-'}</td>
            <td>
                <button class="action-btn message-btn" data-id="${user.id}">Сообщение</button>
                <button class="action-btn assign-btn" data-id="${user.id}">Задача</button>
                <button class="action-btn set-current-btn" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>
                    ${isCurrentUser ? 'Активен' : 'Выбрать'}
                </button>
                <button class="action-btn delete-btn" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>Удалить</button>
            </td>
        `;
        
        usersListElement.appendChild(row);
    });
    
    // Обработка кнопок
    document.querySelectorAll('.assign-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            document.getElementById('assigned-to').value = userId;
            document.getElementById('tasks-link').click();
            document.getElementById('task-modal').style.display = 'block';
        });
    });
    
    document.querySelectorAll('.set-current-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            setCurrentUser(userId);
            renderUsers(usersListElement);
            
            // Если открыт раздел задач, обновляем его
            if (document.getElementById('tasks').classList.contains('active')) {
                import('./tasks.js').then(module => {
                    module.renderTasks();
                });
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            if (deleteUser(userId)) {
                renderUsers(usersListElement);
            }
        });
    });
    
    // Обработка кнопок для сообщений
    document.querySelectorAll('.message-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            
            // Открываем модальное окно сообщений
            import('./messaging.js').then(module => {
                module.openConversation(userId);
                document.getElementById('messaging-modal').style.display = 'block';
            });
        });
    });
}