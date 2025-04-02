// script.js
import { initializeApp } from './modules/initialization.js';

// Инициализируем приложение при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeApp();
    } catch (error) {
        console.error('Критическая ошибка инициализации приложения:', error);
        alert('Произошла ошибка при запуске приложения. Пожалуйста, перезагрузите страницу.');
    }
});

document.getElementById("loginBtn").addEventListener("click", () => {
    console.log("Кнопка авторизации нажата!");
    // Ваш код открытия окна авторизации
});