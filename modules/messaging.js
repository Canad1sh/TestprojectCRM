// modules/messaging.js
import { saveToStorage, loadFromStorage } from './storage.js';
import { getUsers, getCurrentUser } from './users.js';
import { getCurrentUser as getAuthUser } from './auth.js';

let messages = [];
let conversations = []; // Список диалогов пользователя

/**
 * Инициализация модуля сообщений
 */
export function initMessaging() {
    messages = loadFromStorage('crm-messages', []);
    conversations = loadFromStorage('crm-conversations', []);
    
    // Настраиваем обработчики
    setupMessagingHandlers();
}

/**
 * Настройка обработчиков событий для чата
 */
function setupMessagingHandlers() {
    // Открытие чата
    document.getElementById('open-chat-btn').addEventListener('click', () => {
        renderConversationsList();
        document.getElementById('messaging-modal').style.display = 'block';
    });
    
    // Отправка сообщения
    document.getElementById('message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const messageText = document.getElementById('message-input').value.trim();
        if (!messageText) return;
        
        const recipientId = document.getElementById('current-recipient').value;
        if (!recipientId) return;
        
        sendMessage(recipientId, messageText);
        document.getElementById('message-input').value = '';
        
        // Обновляем список сообщений
        renderMessages(recipientId);
        // Обновляем список диалогов
        renderConversationsList();
    });
    
    // Поиск пользователя
    document.getElementById('user-search').addEventListener('input', (e) => {
        const searchQuery = e.target.value.toLowerCase();
        const users = getUsers().filter(user => {
            const currentUser = getAuthUser();
            // Не показываем текущего пользователя в результатах поиска
            return user.id !== currentUser.id && user.username.toLowerCase().includes(searchQuery);
        });
        
        renderSearchResults(users);
    });
}

/**
 * Отправка сообщения
 * @param {string} recipientId - ID получателя
 * @param {string} text - Текст сообщения
 * @returns {Object} - Отправленное сообщение
 */
export function sendMessage(recipientId, text) {
    const currentUser = getAuthUser();
    
    if (!currentUser || !recipientId || !text) {
        console.error('Недостаточно данных для отправки сообщения');
        return null;
    }
    
    const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        recipientId: recipientId,
        text: text,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    
    messages.push(newMessage);
    saveMessages();
    
    // Обновляем или создаем диалог
    updateConversation(recipientId);
    
    return newMessage;
}

/**
 * Обновление информации о диалоге
 * @param {string} userId - ID собеседника
 */
function updateConversation(userId) {
    const currentUser = getAuthUser();
    
    // Ищем существующий диалог
    let conversation = conversations.find(c => 
        (c.user1Id === currentUser.id && c.user2Id === userId) ||
        (c.user1Id === userId && c.user2Id === currentUser.id)
    );
    
    // Получаем последнее сообщение
    const userMessages = getMessagesBetweenUsers(currentUser.id, userId);
    const lastMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
    
    if (conversation) {
        // Обновляем существующий диалог
        conversation.lastMessageTime = lastMessage ? lastMessage.timestamp : new Date().toISOString();
        conversation.lastMessageText = lastMessage ? lastMessage.text : '';
        conversation.unreadCount = userMessages.filter(m => m.recipientId === currentUser.id && !m.isRead).length;
    } else {
        // Создаем новый диалог
        conversation = {
            id: Date.now().toString(),
            user1Id: currentUser.id,
            user2Id: userId,
            lastMessageTime: lastMessage ? lastMessage.timestamp : new Date().toISOString(),
            lastMessageText: lastMessage ? lastMessage.text : '',
            unreadCount: 0
        };
        
        conversations.push(conversation);
    }
    
    saveConversations();
}

/**
 * Получение сообщений между двумя пользователями
 * @param {string} user1Id - ID первого пользователя
 * @param {string} user2Id - ID второго пользователя
 * @returns {Array} - Массив сообщений
 */
export function getMessagesBetweenUsers(user1Id, user2Id) {
    return messages.filter(msg => 
        (msg.senderId === user1Id && msg.recipientId === user2Id) ||
        (msg.senderId === user2Id && msg.recipientId === user1Id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Пометка сообщений как прочитанных
 * @param {string} senderId - ID отправителя
 */
export function markMessagesAsRead(senderId) {
    const currentUser = getAuthUser();
    
    messages = messages.map(msg => {
        if (msg.senderId === senderId && msg.recipientId === currentUser.id && !msg.isRead) {
            return { ...msg, isRead: true };
        }
        return msg;
    });
    
    saveMessages();
    
    // Обновляем информацию о диалоге
    updateConversation(senderId);
}

/**
 * Получение списка диалогов пользователя
 * @returns {Array} - Массив диалогов с дополнительной информацией
 */
export function getUserConversations() {
    const currentUser = getAuthUser();
    if (!currentUser) return [];
    
    // Получаем диалоги текущего пользователя
    const userConversations = conversations.filter(c => 
        c.user1Id === currentUser.id || c.user2Id === currentUser.id
    );
    
    // Дополняем информацией о собеседнике
    return userConversations.map(c => {
        const otherUserId = c.user1Id === currentUser.id ? c.user2Id : c.user1Id;
        const otherUser = getUsers().find(u => u.id === otherUserId);
        
        return {
            ...c,
            otherUser: otherUser || { username: 'Неизвестный пользователь' }
        };
    }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
}

/**
 * Отображение списка диалогов
 */
export function renderConversationsList() {
    const conversationsList = document.getElementById('conversations-list');
    conversationsList.innerHTML = '';
    
    const conversations = getUserConversations();
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-conversations">
                <p>У вас пока нет сообщений</p>
                <p>Воспользуйтесь поиском, чтобы найти собеседника</p>
            </div>
        `;
        return;
    }
    
    conversations.forEach(conversation => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.setAttribute('data-id', conversation.otherUser.id);
        
        // Форматируем время
        const messageTime = formatMessageTime(conversation.lastMessageTime);
        
        conversationItem.innerHTML = `
            <div class="conversation-avatar">
                ${conversation.otherUser.username.charAt(0).toUpperCase()}
            </div>
            <div class="conversation-info">
                <div class="conversation-header">
                    <span class="conversation-name">${conversation.otherUser.username}</span>
                    <span class="conversation-time">${messageTime}</span>
                </div>
                <div class="conversation-message">${conversation.lastMessageText}</div>
            </div>
            ${conversation.unreadCount > 0 ? 
                `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
        `;
        
        conversationItem.addEventListener('click', () => {
            // Открываем диалог с пользователем
            openConversation(conversation.otherUser.id);
        });
        
        conversationsList.appendChild(conversationItem);
    });
}

/**
 * Отображение результатов поиска пользователей
 * @param {Array} users - Массив найденных пользователей
 */
function renderSearchResults(users) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
    
    if (users.length === 0) {
        searchResults.innerHTML = '<div class="empty-results">Пользователи не найдены</div>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'search-result-item';
        userItem.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <span class="user-name">${user.username}</span>
        `;
        
        userItem.addEventListener('click', () => {
            // Открываем диалог с пользователем
            openConversation(user.id);
            // Очищаем поле поиска
            document.getElementById('user-search').value = '';
            searchResults.innerHTML = '';
        });
        
        searchResults.appendChild(userItem);
    });
}

/**
 * Открытие диалога с пользователем
 * @param {string} userId - ID собеседника
 */
export function openConversation(userId) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        console.error('Пользователь не найден');
        return;
    }
    
    // Показываем основную область чата
    document.getElementById('conversations-container').style.display = 'none';
    document.getElementById('empty-chat').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    
    // Устанавливаем информацию о собеседнике
    document.getElementById('chat-header-name').textContent = user.username;
    document.getElementById('current-recipient').value = userId;
    
    // Отображаем сообщения
    renderMessages(userId);
    
    // Помечаем сообщения как прочитанные
    markMessagesAsRead(userId);
}

/**
 * Отображение сообщений диалога
 * @param {string} userId - ID собеседника
 */
export function renderMessages(userId) {
    const currentUser = getAuthUser();
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '';
    
    // Получаем сообщения между пользователями
    const dialogMessages = getMessagesBetweenUsers(currentUser.id, userId);
    
    if (dialogMessages.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-messages">
                <p>Нет сообщений</p>
                <p>Напишите что-нибудь, чтобы начать диалог</p>
            </div>
        `;
        return;
    }
    
    // Группируем сообщения по датам
    const groupedMessages = groupMessagesByDate(dialogMessages);
    
    // Отображаем сообщения по группам
    Object.keys(groupedMessages).forEach(date => {
        // Добавляем разделитель даты
        const dateDiv = document.createElement('div');
        dateDiv.className = 'message-date-divider';
        dateDiv.textContent = formatDateDivider(date);
        messagesList.appendChild(dateDiv);
        
        // Добавляем сообщения этой даты
        groupedMessages[date].forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = 'message-item';
            messageEl.classList.add(message.senderId === currentUser.id ? 'outgoing' : 'incoming');
            
            messageEl.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">${formatMessageTime(message.timestamp, true)}</div>
                </div>
            `;
            
            messagesList.appendChild(messageEl);
        });
    });
    
    // Прокручиваем в конец списка сообщений
    messagesList.scrollTop = messagesList.scrollHeight;
}

/**
 * Группировка сообщений по датам
 * @param {Array} messages - Массив сообщений
 * @returns {Object} - Объект, где ключи - даты, а значения - массивы сообщений
 */
function groupMessagesByDate(messages) {
    const groups = {};
    
    messages.forEach(message => {
        const date = new Date(message.timestamp).toLocaleDateString('ru-RU');
        
        if (!groups[date]) {
            groups[date] = [];
        }
        
        groups[date].push(message);
    });
    
    return groups;
}

/**
 * Форматирование даты-разделителя
 * @param {string} dateString - Строка даты
 * @returns {string} - Отформатированная строка
 */
function formatDateDivider(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

/**
 * Форматирование времени сообщения
 * @param {string} timestampString - Строка времени
 * @param {boolean} showOnlyTime - Показывать только время без даты
 * @returns {string} - Отформатированная строка
 */
function formatMessageTime(timestampString, showOnlyTime = false) {
    const timestamp = new Date(timestampString);
    const now = new Date();
    const diffMs = now - timestamp;
    
    if (showOnlyTime) {
        return timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Менее 24 часов назад
    if (diffMs < 24 * 60 * 60 * 1000) {
        return timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } 
    
    // Менее недели назад
    if (diffMs < 7 * 24 * 60 * 60 * 1000) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[timestamp.getDay()];
    }
    
    // Более недели назад
    return timestamp.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/**
 * Сохранение сообщений в хранилище
 */
function saveMessages() {
    saveToStorage('crm-messages', messages);
}

/**
 * Сохранение списка диалогов в хранилище
 */
function saveConversations() {
    saveToStorage('crm-conversations', conversations);
}

/**
 * Возврат к списку диалогов
 */
export function backToConversations() {
    document.getElementById('conversations-container').style.display = 'block';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('current-recipient').value = '';
    
    // Обновляем список диалогов
    renderConversationsList();
}

// Добавляем обработчик для кнопки "Назад"
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('back-to-conversations').addEventListener('click', backToConversations);
});