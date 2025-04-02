// Функция для хранения данных, совместимая с Electron и браузером
export function saveToStorage(key, data) {
    // Проверяем, доступно ли Electron API
    if (window.electronAPI) {
        window.electronAPI.storeData(key, data);
    } else {
        localStorage.setItem(key, JSON.stringify(data));
    }
}

// Функция для загрузки данных, совместимая с Electron и браузером
export function loadFromStorage(key, defaultValue = []) {
    try {
        // Проверяем, доступно ли Electron API
        if (window.electronAPI) {
            const data = window.electronAPI.loadData(key);
            return data !== null ? data : defaultValue;
        } else {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        }
    } catch (e) {
        console.error('Ошибка при загрузке данных из хранилища:', e);
        return defaultValue;
    }
}

// Функции для сохранения конкретных типов данных
export function saveUsers(users) {
    saveToStorage('crm-users', users);
}

export function saveTasks(tasks) {
    saveToStorage('crm-tasks', tasks);
}

export function saveProjects(projects) {
    saveToStorage('crm-projects', projects);
}

export function saveProjectStages(projectStages) {
    saveToStorage('crm-project-stages', projectStages);
}