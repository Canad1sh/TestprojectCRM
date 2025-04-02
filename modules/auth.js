// modules/auth.js
import { loadFromStorage, saveToStorage } from './storage.js';
import { getUsers, addUser } from './users.js';
import { showSection } from './ui.js';

// Текущий авторизованный пользователь
let currentUser = null;

/**
 * Инициализация модуля авторизации
 */
export function initAuth() {
    // Проверяем, авторизован ли уже пользователь
    const savedSession = loadFromStorage('crm-current-session', null);
    
    if (savedSession) {
        const users = getUsers();
        const foundUser = users.find(u => u.id === savedSession.userId);
        
        if (foundUser) {
            currentUser = foundUser;
            return true; // Уже авторизован
        } else {
            // Некорректная сессия, удаляем
            logout();
        }
    }
    
    // Показываем форму авторизации
    document.getElementById('auth-section').classList.add('active');
    document.getElementById('app-container').style.display = 'none';
    
    // Настраиваем обработчики форм
    setupAuthHandlers();
    
    return false; // Не авторизован
}

/**
 * Настройка обработчиков для форм авторизации и регистрации
 */
function setupAuthHandlers() {
    // Форма входа
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (loginUser(username, password)) {
            document.getElementById('auth-section').classList.remove('active');
            document.getElementById('app-container').style.display = 'flex';
            showSection('dashboard');
        } else {
            document.getElementById('login-error').textContent = 'Неверный логин или пароль';
        }
    });
    
    // Форма регистрации
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const email = document.getElementById('register-email').value;
        const position = document.getElementById('register-position').value;
        const department = document.getElementById('register-department').value;
        
        // Проверка существования пользователя
        const users = getUsers();
        if (users.some(u => u.username === username)) {
            document.getElementById('register-error').textContent = 'Пользователь с таким логином уже существует';
            return;
        }
        
        // Создаем пользователя
        registerUser({
            username,
            password,
            email,
            position,
            department
        });
        
        // Скрываем форму регистрации и показываем форму входа
        document.getElementById('login-form-container').style.display = 'block';
        document.getElementById('register-form-container').style.display = 'none';
        document.getElementById('login-message').textContent = 'Регистрация успешна! Теперь вы можете войти.';
        document.getElementById('login-message').style.color = '#10b981';
    });
    
    // Переключение между формами
    document.getElementById('show-register-form').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form-container').style.display = 'none';
        document.getElementById('register-form-container').style.display = 'block';
    });
    
    document.getElementById('show-login-form').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form-container').style.display = 'block';
        document.getElementById('register-form-container').style.display = 'none';
    });
}

/**
 * Авторизация пользователя
 * @param {string} username - Логин пользователя
 * @param {string} password - Пароль пользователя
 * @returns {boolean} - Результат авторизации
 */
function loginUser(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        
        // Сохраняем сессию
        saveToStorage('crm-current-session', {
            userId: user.id,
            loginTime: new Date().toISOString()
        });
        
        // Обновляем информацию о пользователе в интерфейсе
        document.getElementById('current-user-name').textContent = user.username;
        
        return true;
    }
    
    return false;
}

/**
 * Регистрация нового пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Object} - Созданный пользователь
 */
function registerUser(userData) {
    return addUser({
        ...userData,
        // Хэширование пароля можно добавить для безопасности в реальном приложении
        isActive: true
    });
}

/**
 * Выход из системы
 */
export function logout() {
    currentUser = null;
    saveToStorage('crm-current-session', null);
    
    // Перенаправляем на страницу авторизации
    document.getElementById('auth-section').classList.add('active');
    document.getElementById('app-container').style.display = 'none';
    
    // Сбрасываем форму входа
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
}

/**
 * Получение текущего авторизованного пользователя
 * @returns {Object|null} - Текущий пользователь или null, если нет авторизации
 */
export function getCurrentUser() {
    return currentUser;
}