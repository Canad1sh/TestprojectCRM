// modules/user-management.js
import { getUsers, addUser, deleteUser, updateUserData, getCurrentUser } from './users.js';
import { openUserProfile } from './profile.js';
import { showNotification } from './notifications.js';

/**
 * Инициализация модуля управления пользователями
 */
export function initUserManagement() {
    // Настройка обработчиков событий
    setupUserManagementHandlers();
    
    // Первоначальное отображение списка пользователей
    renderUsersList();
}

/**
 * Настройка обработчиков событий для управления пользователями
 */
function setupUserManagementHandlers() {
    // Кнопка добавления пользователя
    document.getElementById('add-user-btn').addEventListener('click', () => {
        // Очищаем форму
        document.getElementById('user-form').reset();
        
        // Меняем заголовок модального окна
        document.getElementById('user-modal-title').textContent = 'Добавление нового пользователя';
        
        // Отображаем поле пароля
        document.getElementById('password-group').style.display = 'block';
        
        // Показываем раздел прав доступа
        document.getElementById('user-permissions').style.display = 'block';
        
        // Скрываем кнопку "Обновить" и показываем "Создать"
        document.getElementById('update-user-btn').style.display = 'none';
        document.getElementById('create-user-btn').style.display = 'inline-block';
        
        // Показываем модальное окно
        document.getElementById('user-modal').style.display = 'block';
    });
    
    // Форма создания пользователя
    document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Проверка, является ли это созданием или обновлением
        const isCreating = document.getElementById('create-user-btn').style.display !== 'none';
        
        if (isCreating) {
            createUser();
        } else {
            updateUser();
        }
    });
    
    // Поиск пользователей
    document.getElementById('user-search').addEventListener('input', (e) => {
        const searchQuery = e.target.value.toLowerCase();
        renderUsersList(searchQuery);
    });
    
    // Фильтрация пользователей
    document.getElementById('user-filter').addEventListener('change', (e) => {
        const filter = e.target.value;
        const searchQuery = document.getElementById('user-search').value.toLowerCase();
        renderUsersList(searchQuery, filter);
    });
}

/**
 * Создание нового пользователя
 */
function createUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    const firstName = document.getElementById('firstname').value;
    const lastName = document.getElementById('lastname').value;
    const position = document.getElementById('position').value;
    const department = document.getElementById('department').value;
    const isAdmin = document.getElementById('is-admin').checked;
    const isActive = document.getElementById('is-active').checked;
    
    // Проверка обязательных полей
    if (!username || !password || !email) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    // Проверка уникальности логина
    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showNotification('Пользователь с таким логином уже существует', 'error');
        return;
    }
    
    // Создаем пользователя
    const newUser = addUser({
        username,
        password,
        email,
        firstName,
        lastName,
        position,
        department,
        isAdmin,
        isActive
    });
    
    if (newUser) {
        showNotification(`Пользователь ${username} успешно создан`, 'success');
        document.getElementById('user-modal').style.display = 'none';
        renderUsersList();
    } else {
        showNotification('Ошибка при создании пользователя', 'error');
    }
}

/**
 * Обновление данных пользователя
 */
function updateUser() {
    const userId = document.getElementById('user-id').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const firstName = document.getElementById('firstname').value;
    const lastName = document.getElementById('lastname').value;
    const position = document.getElementById('position').value;
    const department = document.getElementById('department').value;
    const isAdmin = document.getElementById('is-admin').checked;
    const isActive = document.getElementById('is-active').checked;
    
    // Проверка обязательных полей
    if (!username || !email) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    // Проверка уникальности логина
    const users = getUsers();
    const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== userId);
    if (existingUser) {
        showNotification('Пользователь с таким логином уже существует', 'error');
        return;
    }
    
    // Обновляем пользователя
    const userData = {
        username,
        email,
        firstName,
        lastName,
        position,
        department,
        isAdmin,
        isActive
    };
    
    // Если пароль был введен, обновляем его тоже
    const password = document.getElementById('password').value;
    if (password) {
        userData.password = password;
    }
    
    const updatedUser = updateUserData(userId, userData);
    
    if (updatedUser) {
        showNotification(`Данные пользователя ${username} успешно обновлены`, 'success');
        document.getElementById('user-modal').style.display = 'none';
        renderUsersList();
    } else {
        showNotification('Ошибка при обновлении данных пользователя', 'error');
    }
}

/**
 * Открытие формы редактирования пользователя
 * @param {string} userId - ID пользователя
 */
function editUser(userId) {
    const user = getUsers().find(u => u.id === userId);
    
    if (!user) {
        showNotification('Пользователь не найден', 'error');
        return;
    }
    
    // Заполняем форму данными пользователя
    document.getElementById('user-id').value = user.id;
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('firstname').value = user.firstName || '';
    document.getElementById('lastname').value = user.lastName || '';
    document.getElementById('position').value = user.position || '';
    document.getElementById('department').value = user.department || '';
    document.getElementById('is-admin').checked = user.isAdmin || false;
    document.getElementById('is-active').checked = user.isActive !== false; // По умолчанию активен
    
    // Очищаем поле пароля
    document.getElementById('password').value = '';
    
    // Меняем заголовок модального окна
    document.getElementById('user-modal-title').textContent = 'Редактирование пользователя';
    
    // Скрываем кнопку "Создать" и показываем "Обновить"
    document.getElementById('create-user-btn').style.display = 'none';
    document.getElementById('update-user-btn').style.display = 'inline-block';
    
    // Показываем поле пароля (опционально для обновления)
    document.getElementById('password-group').style.display = 'block';
    document.getElementById('password-hint').textContent = 'Оставьте пустым, чтобы не менять пароль';
    
    // Проверяем, может ли текущий пользователь менять права доступа
    const currentUser = getCurrentUser();
    if (currentUser.isAdmin) {
        document.getElementById('user-permissions').style.display = 'block';
    } else {
        document.getElementById('user-permissions').style.display = 'none';
    }
    
    // Показываем модальное окно
    document.getElementById('user-modal').style.display = 'block';
}

/**
 * Отображение списка пользователей
 * @param {string} searchQuery - Строка поиска
 * @param {string} filter - Фильтр (all, active, admin)
 */
export function renderUsersList(searchQuery = '', filter = 'all') {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    let users = getUsers();
    const currentUser = getCurrentUser();
    
    // Применяем фильтрацию
    if (filter === 'active') {
        users = users.filter(user => user.isActive !== false);
    } else if (filter === 'admin') {
        users = users.filter(user => user.isAdmin);
    } else if (filter === 'inactive') {
        users = users.filter(user => user.isActive === false);
    }
    
    // Применяем поиск
    if (searchQuery) {
        users = users.filter(user => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            return user.username.toLowerCase().includes(searchQuery) || 
                   user.email.toLowerCase().includes(searchQuery) ||
                   fullName.includes(searchQuery) ||
                   (user.position && user.position.toLowerCase().includes(searchQuery)) ||
                   (user.department && user.department.toLowerCase().includes(searchQuery));
        });
    }
    
    // Если нет пользователей после фильтрации
    if (users.length === 0) {
        usersList.innerHTML = `
            <tr>
                <td colspan="5" class="empty-list-message">
                    <div>
                        <i class="fas fa-users-slash"></i>
                        <p>Пользователи не найдены</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Добавляем пользователей в список
    users.forEach(user => {
        const row = document.createElement('tr');
        const isCurrentUser = user.id === currentUser.id;
        
        if (isCurrentUser) {
            row.classList.add('current-user-row');
        }
        
        // Формируем полное имя
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '-';
        
        // Формируем статусы
        const adminBadge = user.isAdmin ? 
            '<span class="user-badge admin-badge">Администратор</span>' : '';
        const statusBadge = user.isActive === false ? 
            '<span class="user-badge inactive-badge">Неактивен</span>' : 
            '<span class="user-badge active-badge">Активен</span>';
        
        row.innerHTML = `
            <td class="user-info-cell">
                <div class="user-info">
                    <div class="user-avatar small ${user.avatar ? 'has-avatar' : ''}" 
                         style="${user.avatar ? `background-image: url(${user.avatar})` : ''}">
                        ${!user.avatar ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || user.username?.charAt(0).toUpperCase() || '' : ''}
                    </div>
                    <div class="user-name-info">
                        <div class="user-name">${user.username} ${isCurrentUser ? '<span class="current-user-badge">Вы</span>' : ''}</div>
                        <div class="user-full-name">${fullName}</div>
                    </div>
                </div>
            </td>
            <td>${user.email || '-'}</td>
            <td>${user.position || '-'}</td>
            <td>${user.department || '-'}</td>
            <td>
                ${adminBadge}
                ${statusBadge}
            </td>
            <td class="actions-cell">
                <button class="action-btn view-btn" title="Просмотреть профиль" data-id="${user.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="Редактировать" data-id="${user.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn ${isCurrentUser ? 'disabled' : 'delete-btn'}" title="Удалить" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        usersList.appendChild(row);
    });
    
    // Добавляем обработчики событий для кнопок
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            openUserProfile(userId, false); // Открываем профиль в режиме просмотра
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            editUser(userId);
        });
    });
    
    document.querySelectorAll('.delete-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            const user = getUsers().find(u => u.id === userId);
            
            if (window.confirm(`Вы действительно хотите удалить пользователя ${user.username}?`)) {
                if (deleteUser(userId)) {
                    showNotification(`Пользователь ${user.username} успешно удален`, 'success');
                    renderUsersList(searchQuery, filter);
                } else {
                    showNotification('Невозможно удалить пользователя, так как он связан с задачами или проектами', 'error');
                }
            }
        });
    });