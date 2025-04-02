// modules/profile.js
import { getCurrentUser, updateUserData, getUsers } from './users.js';
import { saveToStorage } from './storage.js';

// Глобальные переменные для работы с аватаром
let avatarPreview = null;
let avatarFile = null;

/**
 * Инициализация модуля профиля
 */
export function initProfileModule() {
    // Настройка обработчиков событий
    setupProfileHandlers();
    
    // Отображение профиля при клике на иконку пользователя
    document.getElementById('user-profile-btn').addEventListener('click', () => {
        openUserProfile();
    });
}

/**
 * Открытие профиля пользователя
 * @param {string} userId - ID пользователя (если не указан, открывается профиль текущего пользователя)
 * @param {boolean} isEditable - Можно ли редактировать профиль
 */
export function openUserProfile(userId = null, isEditable = true) {
    const currentUser = getCurrentUser();
    const user = userId ? getUsers().find(u => u.id === userId) : currentUser;
    
    if (!user) {
        console.error('Пользователь не найден');
        return;
    }
    
    // Заполняем данные профиля
    populateProfileForm(user);
    
    // Устанавливаем режим просмотра/редактирования
    toggleProfileEditMode(isEditable && (currentUser.id === user.id || currentUser.isAdmin));
    
    // Показываем модальное окно
    document.getElementById('profile-modal').style.display = 'block';
}

/**
 * Настройка обработчиков событий для профиля
 */
function setupProfileHandlers() {
    // Форма профиля
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById('profile-username').value,
            firstName: document.getElementById('profile-firstname').value,
            lastName: document.getElementById('profile-lastname').value,
            email: document.getElementById('profile-email').value,
            phone: document.getElementById('profile-phone').value,
            position: document.getElementById('profile-position').value,
            department: document.getElementById('profile-department').value
        };
        
        // Если есть файл аватара, добавляем его
        if (avatarFile) {
            const reader = new FileReader();
            reader.onload = function(event) {
                userData.avatar = event.target.result; // Данные аватара в base64
                updateProfile(userData);
            };
            reader.readAsDataURL(avatarFile);
        } else {
            updateProfile(userData);
        }
    });
    
    // Загрузка аватара
    document.getElementById('avatar-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Проверка размера файла (не более 1MB)
        if (file.size > 1024 * 1024) {
            alert('Размер файла не должен превышать 1MB');
            e.target.value = '';
            return;
        }
        
        // Проверка типа файла (только изображения)
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите файл изображения');
            e.target.value = '';
            return;
        }
        
        // Сохраняем файл для отправки
        avatarFile = file;
        
        // Отображаем превью
        const reader = new FileReader();
        reader.onload = function(event) {
            avatarPreview = event.target.result;
            document.getElementById('avatar-preview').style.backgroundImage = `url(${avatarPreview})`;
            document.getElementById('avatar-preview').classList.add('has-avatar');
        };
        reader.readAsDataURL(file);
    });
    
    // Кнопка смены пароля
    document.getElementById('change-password-btn').addEventListener('click', () => {
        document.getElementById('password-section').style.display = 'block';
        document.getElementById('change-password-btn').style.display = 'none';
    });
    
    // Переключение режима редактирования
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        toggleProfileEditMode(true);
    });
    
    // Отмена редактирования
    document.getElementById('cancel-profile-btn').addEventListener('click', () => {
        // Отменяем изменения аватара
        avatarFile = null;
        avatarPreview = null;
        
        // Возвращаем оригинальные данные профиля
        const currentUser = getCurrentUser();
        populateProfileForm(currentUser);
        
        // Переключаем в режим просмотра
        toggleProfileEditMode(false);
    });
}

/**
 * Заполнение формы профиля данными пользователя
 * @param {Object} user - Данные пользователя
 */
function populateProfileForm(user) {
    // Заполняем текстовые поля
    document.getElementById('profile-username').value = user.username || '';
    document.getElementById('profile-firstname').value = user.firstName || '';
    document.getElementById('profile-lastname').value = user.lastName || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-position').value = user.position || '';
    document.getElementById('profile-department').value = user.department || '';
    
    // Скрываем поля для смены пароля
    document.getElementById('password-section').style.display = 'none';
    document.getElementById('change-password-btn').style.display = 'block';
    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-new-password').value = '';
    document.getElementById('profile-confirm-password').value = '';
    
    // Заполняем аватар
    if (user.avatar) {
        document.getElementById('avatar-preview').style.backgroundImage = `url(${user.avatar})`;
        document.getElementById('avatar-preview').classList.add('has-avatar');
        avatarPreview = user.avatar;
    } else {
        document.getElementById('avatar-preview').style.backgroundImage = 'none';
        document.getElementById('avatar-preview').classList.remove('has-avatar');
        // Отображаем инициалы
        const initials = (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '');
        document.getElementById('avatar-initials').textContent = initials || user.username?.charAt(0).toUpperCase() || '';
        avatarPreview = null;
    }
    
    // Сбрасываем файл аватара
    avatarFile = null;
    document.getElementById('avatar-upload').value = '';
    
    // Заполняем заголовок
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
    document.getElementById('profile-title').textContent = fullName;
    
    // Формируем описание профиля
    const userDetails = [
        user.position && `<span class="detail-position">${user.position}</span>`,
        user.department && `<span class="detail-department">${user.department}</span>`,
        user.email && `<span class="detail-email"><i class="fas fa-envelope"></i> ${user.email}</span>`,
        user.phone && `<span class="detail-phone"><i class="fas fa-phone"></i> ${user.phone}</span>`
    ].filter(Boolean).join(' · ');
    
    document.getElementById('profile-details').innerHTML = userDetails;
}

/**
 * Переключение режима редактирования профиля
 * @param {boolean} isEditable - Включить режим редактирования
 */
function toggleProfileEditMode(isEditable) {
    // Переключаем атрибут readonly для полей формы
    const formInputs = document.querySelectorAll('#profile-form input:not([type="file"]):not([type="password"]), #profile-form textarea');
    formInputs.forEach(input => {
        input.readOnly = !isEditable;
        
        if (isEditable) {
            input.classList.add('editable');
        } else {
            input.classList.remove('editable');
        }
    });
    
    // Отображаем/скрываем кнопки управления
    document.getElementById('edit-profile-controls').style.display = isEditable ? 'none' : 'flex';
    document.getElementById('save-profile-controls').style.display = isEditable ? 'flex' : 'none';
    
    // Отображаем/скрываем кнопку загрузки аватара
    document.getElementById('avatar-upload-label').style.display = isEditable ? 'flex' : 'none';
}

/**
 * Обновление профиля пользователя
 * @param {Object} userData - Новые данные пользователя
 */
function updateProfile(userData) {
    const currentUser = getCurrentUser();
    
    // Проверка текущего пароля, если пользователь хочет его изменить
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    if (newPassword) {
        // Проверяем текущий пароль
        if (currentPassword !== currentUser.password) {
            alert('Неверный текущий пароль');
            return;
        }
        
        // Проверяем совпадение паролей
        if (newPassword !== confirmPassword) {
            alert('Новый пароль и подтверждение не совпадают');
            return;
        }
        
        // Добавляем новый пароль к данным
        userData.password = newPassword;
    }
    
    // Обновляем данные пользователя
    const updatedUser = updateUserData(currentUser.id, userData);
    
    if (updatedUser) {
        // Обновляем данные в заголовке приложения
        updateHeaderUserInfo(updatedUser);
        
        // Закрываем режим редактирования
        toggleProfileEditMode(false);
        
        // Перезаполняем форму обновленными данными
        populateProfileForm(updatedUser);
    }
}

/**
 * Обновление информации о пользователе в заголовке приложения
 * @param {Object} user - Данные пользователя
 */
export function updateHeaderUserInfo(user) {
    // Обновляем имя пользователя в заголовке
    const userName = document.getElementById('current-user-name');
    if (userName) {
        userName.textContent = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
    }
    
    // Обновляем аватар в заголовке
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        if (user.avatar) {
            userAvatar.style.backgroundImage = `url(${user.avatar})`;
            userAvatar.classList.add('has-avatar');
            userAvatar.innerHTML = '';
        } else {
            userAvatar.style.backgroundImage = 'none';
            userAvatar.classList.remove('has-avatar');
            // Отображаем инициалы
            const initials = (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '');
            userAvatar.innerHTML = initials || user.username?.charAt(0).toUpperCase() || '';
        }
    }
}