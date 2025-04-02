// modules/comments.js
import { saveToStorage, loadFromStorage } from './storage.js';

let comments = [];

export function initComments(loadedComments) {
    comments = loadedComments || [];
}

export function getComments() {
    return comments;
}

export function getTaskComments(taskId) {
    return comments.filter(comment => comment.taskId === taskId);
}

export function addComment(commentData) {
    const newComment = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...commentData
    };
    
    comments.push(newComment);
    saveComments();
    return newComment;
}

export function deleteComment(commentId) {
    comments = comments.filter(comment => comment.id !== commentId);
    saveComments();
}

export function saveComments() {
    saveToStorage('crm-comments', comments);
}

export function renderTaskComments(taskId, containerElement, currentUserId) {
    const taskComments = getTaskComments(taskId);
    containerElement.innerHTML = '';
    
    if (taskComments.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-comments';
        emptyMessage.textContent = 'Нет комментариев. Будьте первым, кто оставит комментарий!';
        containerElement.appendChild(emptyMessage);
        return;
    }
    
    // Сортируем комментарии по дате создания (новые внизу)
    taskComments
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            
            // Определяем, является ли комментарий от текущего пользователя
            const isCurrentUserComment = comment.userId === currentUserId;
            if (isCurrentUserComment) {
                commentEl.classList.add('current-user-comment');
            }
            
            // Загрузить информацию о пользователе
            import('./users.js').then(module => {
                const user = module.findUserById(comment.userId);
                
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${user ? user.username : 'Неизвестный пользователь'}</span>
                        <span class="comment-date">${formatCommentDate(comment.createdAt)}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    ${isCurrentUserComment ? 
                        `<button class="delete-comment-btn" data-id="${comment.id}">Удалить</button>` : ''}
                `;
                
                // Добавляем обработчик удаления комментария
                const deleteBtn = commentEl.querySelector('.delete-comment-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
                            deleteComment(comment.id);
                            renderTaskComments(taskId, containerElement, currentUserId);
                        }
                    });
                }
                
                containerElement.appendChild(commentEl);
            });
        });
}

function formatCommentDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
        return 'Только что';
    } else if (diffMins < 60) {
        return `${diffMins} ${declOfNum(diffMins, ['минуту', 'минуты', 'минут'])} назад`;
    } else if (diffHours < 24) {
        return `${diffHours} ${declOfNum(diffHours, ['час', 'часа', 'часов'])} назад`;
    } else if (diffDays < 7) {
        return `${diffDays} ${declOfNum(diffDays, ['день', 'дня', 'дней'])} назад`;
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Склонение существительных после числительных
function declOfNum(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[
        number % 100 > 4 && number % 100 < 20 ? 
        2 : 
        cases[number % 10 < 5 ? number % 10 : 5]
    ];
}