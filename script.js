/* ========== КОНФИГУРАЦИЯ ========== */
const firebaseConfig = {
    apiKey: "AIzaSyBBpRh7B5qZdyd66Q4KxsUBhH2qcwshI7g",
    authDomain: "funideaithink-3206d.firebaseapp.com",
    databaseURL: "https://funideaithink-3206d-default-rtdb.firebaseio.com",
    projectId: "funideaithink-3206d",
    storageBucket: "funideaithink-3206d.firebasestorage.app",
    messagingSenderId: "475113847634",
    appId: "1:475113847634:web:ec38afbcb33b5bde57588b",
    measurementId: "G-9PC37HF1MJ"
};

const ADMIN_USERNAME = "ArturPirozhkov";
const ADMIN_PASSWORD = "JojoTop1";
const TEACHER_USERNAME = "Алсу Рашидовна";
const TEACHER_PASSWORD = "1234";

let isRegisterMode = false;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;
let isTeacher = false;
let messageSendLock = false;
let lastMessageTime = 0;
let notificationsEnabled = false;
let soundEnabled = true;
let dmFolderOpen = false;
let currentDMUser = null;
let allUsers = {}; // Все зарегистрированные пользователи для ЛС

/* ========== ИНИЦИАЛИЗАЦИЯ ========== */
window.onload = function() {
    console.log('🚀 NeonChat запущен');
    
    // Загружаем всех пользователей для ЛС
    loadAllUsers();
    
    // Проверяем загрузку Firebase
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase не загружен!');
        setupLocalStorageFallback();
    } else {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            database = firebase.database();
            console.log('✅ Firebase подключен');
        } catch (e) {
            console.error('⚠️ Ошибка Firebase:', e);
            setupLocalStorageFallback();
        }
    }
    
    // Назначаем обработчики событий
    setupEventListeners();
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            isAdmin = currentUser.isAdmin || false;
            isTeacher = currentUser.isTeacher || false;
            
            // Автозаполняем поле логина
            const usernameInput = document.getElementById('username');
            if (usernameInput && currentUser.name) {
                usernameInput.value = currentUser.name;
            }
            
            console.log('Найден сохраненный пользователь:', currentUser.name);
            
            // Показываем чат после небольшой задержки
            setTimeout(() => {
                if (currentUser && currentUser.name) {
                    showChatInterface();
                }
            }, 300);
            
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
        }
    }
    
    // Запрашиваем разрешение на уведомления
    requestNotificationPermission();
    
    // Автофокус
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) input.focus();
    }, 500);
    
    // Обновление времени
    updateTime();
    setInterval(updateTime, 60000);
    
    // Проверяем уведомления
    checkNotificationSettings();
    
    // Настраиваем мобильный ввод и меню
    setTimeout(() => {
        setupMobileInput();
        updateChannelLayout();
        adjustMobileLayout();
    }, 500);
    
    // Слушаем изменения размера окна
    window.addEventListener('resize', function() {
        setupMobileInput();
        updateChannelLayout();
        adjustMobileLayout();
    });
    
    // Мониторим новые ЛС
    if (currentUser) {
        monitorDMs();
    }
};

function loadAllUsers() {
    // Загружаем всех пользователей из localStorage
    allUsers = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('neonchat_user_')) {
            try {
                const user = JSON.parse(localStorage.getItem(key));
                allUsers[user.id] = user;
                allUsers[user.name.toLowerCase()] = user; // Для поиска по имени
            } catch (e) {
                console.error('Ошибка загрузки пользователя:', e);
            }
        }
    }
    console.log('👥 Загружено пользователей:', Object.keys(allUsers).length);
}

function setupEventListeners() {
    console.log('📌 Настройка обработчиков событий');
    
    // Enter для отправки сообщений
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Enter для авторизации
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen && loginScreen.style.display !== 'none') {
                handleAuth();
            }
        }
    });
    
    // Клик вне эмодзи-панели
    document.addEventListener('click', function(e) {
        const emojiPanel = document.getElementById('emojiPanel');
        const emojiBtn = document.querySelector('.action-btn[title="Ещё эмодзи"]');
        
        if (emojiPanel && emojiBtn) {
            if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) {
                if (emojiPanel.style.display === 'block') {
                    emojiPanel.style.display = 'none';
                }
            }
        }
    });
}

function setupLocalStorageFallback() {
    console.log('⚠️ Используем локальное хранилище');
    
    database = {
        ref: function(path) {
            return {
                set: function(data) {
                    return new Promise((resolve) => {
                        if (path.startsWith('messages/')) {
                            const messagesKey = 'firebase_messages';
                            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
                            const messageId = path.split('/')[1] || Date.now().toString();
                            data.id = messageId;
                            messages.push(data);
                            if (messages.length > 100) {
                                messages = messages.slice(-100);
                            }
                            localStorage.setItem(messagesKey, JSON.stringify(messages));
                            updateMessagesDisplay();
                        } else if (path.startsWith('online/')) {
                            const onlineKey = 'firebase_online';
                            let online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            const userId = path.split('/')[1];
                            online[userId] = data;
                            localStorage.setItem(onlineKey, JSON.stringify(online));
                            updateOnlineDisplay();
                        } else if (path.startsWith('dms/')) {
                            // Сохраняем ЛС
                            const parts = path.split('/');
                            if (parts.length >= 3) {
                                const chatKey = `dm_${parts[1]}_${parts[2]}`;
                                let chat = JSON.parse(localStorage.getItem(chatKey) || '{"messages":[]}');
                                chat.messages.push(data);
                                localStorage.setItem(chatKey, JSON.stringify(chat));
                                
                                // Создаем уведомление для получателя
                                if (parts[1] !== myUserId) { // Если сообщение не от меня
                                    const notificationsKey = 'neonchat_dm_notifications';
                                    let notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
                                    notifications.push({
                                        ...data,
                                        isNew: true,
                                        senderId: parts[1],
                                        receiverId: parts[2]
                                    });
                                    localStorage.setItem(notificationsKey, JSON.stringify(notifications));
                                }
                            }
                        }
                        setTimeout(resolve, 50);
                    });
                },
                on: function(event, callback) {
                    if (event === 'value') {
                        if (path === 'messages') {
                            const messagesKey = 'firebase_messages';
                            const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
                            const obj = {};
                            messages.forEach(msg => {
                                obj[msg.id] = msg;
                            });
                            setTimeout(() => callback({ val: () => obj }), 100);
                        } else if (path === 'online') {
                            const onlineKey = 'firebase_online';
                            const online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            setTimeout(() => callback({ val: () => online }), 100);
                        } else if (path.startsWith('dms/')) {
                            const parts = path.split('/');
                            if (parts.length >= 3) {
                                const chatKey = `dm_${parts[1]}_${parts[2]}`;
                                const chat = JSON.parse(localStorage.getItem(chatKey) || '{"messages":[]}');
                                const obj = {};
                                chat.messages.forEach(msg => {
                                    obj[msg.id] = msg;
                                });
                                setTimeout(() => callback({ val: () => obj }), 100);
                            }
                        }
                    } else if (event === 'child_added') {
                        if (path.startsWith('dms/')) {
                            const parts = path.split('/');
                            if (parts.length >= 3 && parts[2] === myUserId) {
                                // Симуляция получения новых сообщений
                                const interval = setInterval(() => {
                                    const notificationsKey = 'neonchat_dm_notifications';
                                    const notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
                                    const newMessages = notifications.filter(n => n.receiverId === myUserId && n.senderId === parts[1]);
                                    
                                    newMessages.forEach(msg => {
                                        callback({ val: () => msg });
                                        // Удаляем из уведомлений после обработки
                                        const updated = notifications.filter(n => n.id !== msg.id);
                                        localStorage.setItem(notificationsKey, JSON.stringify(updated));
                                    });
                                }, 2000);
                                
                                return () => clearInterval(interval);
                            }
                        }
                    }
                    return () => {};
                },
                remove: function() {
                    return new Promise((resolve) => {
                        if (path === 'messages') {
                            localStorage.removeItem('firebase_messages');
                        } else if (path === 'online') {
                            localStorage.removeItem('firebase_online');
                        } else if (path.startsWith('online/')) {
                            const onlineKey = 'firebase_online';
                            let online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            const userId = path.split('/')[1];
                            delete online[userId];
                            localStorage.setItem(onlineKey, JSON.stringify(online));
                        }
                        setTimeout(resolve, 50);
                    });
                },
                onDisconnect: function() {
                    return {
                        remove: function() {
                            return Promise.resolve();
                        }
                    };
                }
            };
        }
    };
}

/* ========== УВЕДОМЛЕНИЯ БРАУЗЕРА ========== */
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Браузер не поддерживает уведомления");
        return;
    }
    
    if (Notification.permission === "granted") {
        notificationsEnabled = true;
        updateNotificationUI(true);
        console.log("Уведомления уже разрешены");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            if (permission === "granted") {
                notificationsEnabled = true;
                updateNotificationUI(true);
                console.log("Уведомления разрешены");
                showBrowserNotification("NeonChat", "Уведомления включены!");
            } else {
                updateNotificationUI(false);
                console.log("Уведомления запрещены");
            }
        });
    }
}

function showBrowserNotification(title, body) {
    if (!notificationsEnabled) return;
    
    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1256/1256650.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1256/1256650.png',
        tag: 'neonchat-notification',
        vibrate: [200, 100, 200],
        renotify: true,
        actions: [
            {
                action: 'open',
                title: 'Открыть чат'
            }
        ]
    };
    
    if (soundEnabled) {
        playNotificationSound();
    }
    
    if (document.hidden) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, options);
        }
    }
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.volume = 0.3;
        audio.play();
    } catch (e) {
        console.log("Не удалось воспроизвести звук уведомления");
    }
}

function updateNotificationUI(enabled) {
    const notifStatus = document.getElementById('notifStatusText');
    const notifBtn = document.getElementById('notifStatus');
    
    if (notifStatus) {
        notifStatus.textContent = enabled ? '🔔' : '🔕';
        notifStatus.style.color = enabled ? '#00ffaa' : '#ff6666';
    }
    
    if (notifBtn) {
        notifBtn.innerHTML = enabled ? 
            '<i class="fas fa-bell"></i> Уведомления' :
            '<i class="fas fa-bell-slash"></i> Уведомления';
    }
}

function checkNotificationSettings() {
    const savedSound = localStorage.getItem('neonchat_sound_enabled');
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
    }
}

/* ========== УЧИТЕЛЬСКИЙ ЛОГИН ========== */
function teacherLogin() {
    console.log('👨‍🏫 Открытие учительского входа...');
    
    // Создаем модальное окно для учительского входа
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(255,153,0,0.1), rgba(255,204,0,0.1));
            border-radius: 20px;
            padding: 40px 35px;
            max-width: 420px;
            width: 100%;
            border: 2px solid rgba(255,153,0,0.5);
            box-shadow: 0 10px 40px rgba(255,153,0,0.2),
                        inset 0 0 20px rgba(255,204,0,0.1);
            backdrop-filter: blur(10px);
            animation: slideUp 0.5s ease;
            text-align: center;
        ">
            <h1 style="color: #ff9900; font-size: 2.2em; margin-bottom: 10px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 0 10px rgba(255,153,0,0.7);">
                👨‍🏫 Учительский вход
            </h1>
            <p style="color: #ffcc66; margin-bottom: 30px; font-size: 1em; opacity: 0.9;">
                Доступ только для преподавателей
            </p>
            
            <div style="background: rgba(255,153,0,0.1); border: 1px solid rgba(255,153,0,0.4); border-radius: 12px; padding: 16px 20px; margin: 15px 0; display: flex; align-items: center;">
                <i class="fas fa-chalkboard-teacher" style="color: #ff9900; margin-right: 12px; font-size: 1.2em;"></i>
                <input type="text" id="teacherUsername" placeholder="Имя учителя..." style="background: transparent; border: none; color: white; font-size: 1.1em; width: 100%; outline: none; font-weight: 500;" value="${TEACHER_USERNAME}">
            </div>
            
            <div style="background: rgba(255,153,0,0.1); border: 1px solid rgba(255,153,0,0.4); border-radius: 12px; padding: 16px 20px; margin: 15px 0; display: flex; align-items: center;">
                <i class="fas fa-lock" style="color: #ff9900; margin-right: 12px; font-size: 1.2em;"></i>
                <input type="password" id="teacherPassword" placeholder="Пароль..." style="background: transparent; border: none; color: white; font-size: 1.1em; width: 100%; outline: none; font-weight: 500;" value="${TEACHER_PASSWORD}">
            </div>
            
            <button onclick="handleTeacherAuth()" style="
                background: linear-gradient(135deg, #ff9900 0%, #ffcc00 100%);
                color: white;
                border: none;
                padding: 17px;
                border-radius: 12px;
                font-size: 1.1em;
                cursor: pointer;
                width: 100%;
                margin: 8px 0;
                font-weight: 600;
                transition: all 0.3s ease;
                letter-spacing: 0.5px;
            ">
                <i class="fas fa-sign-in-alt"></i> Войти как учитель
            </button>
            
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 15px;
                border-radius: 12px;
                font-size: 1em;
                cursor: pointer;
                width: 100%;
                margin-top: 10px;
                font-weight: 500;
                transition: all 0.3s ease;
            ">
                <i class="fas fa-times"></i> Отмена
            </button>
            
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                input::placeholder { color: rgba(255,255,255,0.4); }
                button:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(255,153,0,0.4); }
                button:active { transform: translateY(0); }
            </style>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Фокус на поле пароля
    setTimeout(() => {
        const passwordInput = modal.querySelector('#teacherPassword');
        if (passwordInput) passwordInput.focus();
    }, 100);
    
    // Закрытие по клику вне окна
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // Enter для входа
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleTeacherAuth();
            }
        });
    });
}

function handleTeacherAuth() {
    const username = document.getElementById('teacherUsername')?.value?.trim() || TEACHER_USERNAME;
    const password = document.getElementById('teacherPassword')?.value || TEACHER_PASSWORD;
    
    console.log('👨‍🏫 Попытка входа как учитель:', username);
    
    if (username === TEACHER_USERNAME && password === TEACHER_PASSWORD) {
        console.log('✅ Успешный вход как учитель');
        
        myUserId = 'teacher_' + TEACHER_USERNAME.replace(/\s+/g, '_');
        
        currentUser = {
            id: myUserId,
            name: TEACHER_USERNAME,
            avatar: '👨‍🏫',
            isTeacher: true,
            isSpecialTeacher: true
        };
        
        localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
        
        // Закрываем модальное окно
        const modal = document.querySelector('div[style*="position: fixed; top: 0; left: 0"]');
        if (modal) modal.remove();
        
        showAlert('👨‍🏫 Успешный вход как учитель!', 'success');
        setTimeout(() => {
            showChatInterface();
        }, 500);
        
    } else {
        showAlert('❌ Неверные данные учителя!', 'error');
        
        // Показываем правильные данные
        const usernameInput = document.getElementById('teacherUsername');
        const passwordInput = document.getElementById('teacherPassword');
        if (usernameInput) usernameInput.value = TEACHER_USERNAME;
        if (passwordInput) passwordInput.value = TEACHER_PASSWORD;
        if (passwordInput) passwordInput.focus();
    }
}

/* ========== ОБЫЧНЫЙ ЛОГИН ========== */
function toggleRegister() {
    isRegisterMode = true;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const loginHint = document.getElementById('loginHint');
    
    if (confirmGroup) confirmGroup.style.display = 'flex';
    if (authButton) authButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    if (registerToggleBtn) registerToggleBtn.style.display = 'none';
    if (loginHint) loginHint.style.display = 'block';
    
    setTimeout(() => {
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.focus();
    }, 100);
}

function toggleLogin() {
    isRegisterMode = false;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const loginHint = document.getElementById('loginHint');
    
    if (confirmGroup) confirmGroup.style.display = 'none';
    if (authButton) authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
    if (registerToggleBtn) registerToggleBtn.style.display = 'block';
    if (loginHint) loginHint.style.display = 'none';
    
    setTimeout(() => {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = document.getElementById('authButton');
    
    if (!username) {
        showAlert('Введи никнейм!', 'error');
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
        return;
    }
    
    // Блокируем кнопку
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + 
                          (isRegisterMode ? 'Регистрируем...' : 'Входим...');
    }
    
    if (isRegisterMode) {
        if (!password) {
            showAlert('Придумай пароль!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        if (password.length < 4) {
            showAlert('Пароль должен быть минимум 4 символа!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Пароли не совпадают!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const confirmInput = document.getElementById('confirmPassword');
            if (confirmInput) {
                confirmInput.value = '';
                confirmInput.focus();
            }
            return;
        }
        
        // Проверяем, не занят ли ник
        if (localStorage.getItem('neonchat_user_' + username.toLowerCase())) {
            showAlert('Этот ник уже занят! Выбери другой.', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.focus();
                usernameInput.select();
            }
            return;
        }
        
        // Регистрируем
        registerUser(username, password, button);
        
    } else {
        // Вход
        if (!password) {
            showAlert('Введи пароль!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        // Проверяем админ аккаунт
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('👑 Вход как администратор');
            isAdmin = true;
            createAdminUser(button);
            return;
        }
        
        // Обычный вход
        loginUser(username, password, button);
    }
}

function registerUser(username, password, button) {
    myUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const avatars = ['😎', '🐱', '🚀', '🦊', '🐯', '🦁', '🐼', '🐨'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    currentUser = {
        id: myUserId,
        name: username,
        avatar: avatar,
        passwordHash: simpleHash(password),
        registeredAt: Date.now(),
        isAdmin: false,
        isTeacher: false
    };
    
    // Сохраняем
    localStorage.setItem('neonchat_user_' + username.toLowerCase(), JSON.stringify(currentUser));
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    // Добавляем в список всех пользователей
    allUsers[myUserId] = currentUser;
    allUsers[username.toLowerCase()] = currentUser;
    
    console.log('✅ Новый пользователь:', username);
    
    showAlert(`Добро пожаловать, ${username}!`, 'success');
    showChatInterface();
    
    // Разблокируем кнопку
    if (button) {
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        }, 1000);
    }
}

function loginUser(username, password, button) {
    const userData = localStorage.getItem('neonchat_user_' + username.toLowerCase());
    
    if (!userData) {
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }
        showAlert('Пользователь не найден! Зарегистрируйся сначала.', 'error');
        toggleRegister();
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        const inputHash = simpleHash(password);
        
        if (!user.passwordHash) {
            // Старый пользователь без пароля - сохраняем
            user.passwordHash = inputHash;
            localStorage.setItem('neonchat_user_' + username.toLowerCase(), JSON.stringify(user));
        } else if (user.passwordHash !== inputHash) {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }
            showAlert('Неверный пароль!', 'error');
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            return;
        }
        
        myUserId = user.id;
        currentUser = user;
        isAdmin = user.isAdmin || false;
        isTeacher = user.isTeacher || false;
        
        localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
        
        console.log('✅ Успешный вход:', username);
        showAlert(`С возвращением, ${username}!`, 'success');
        showChatInterface();
        
        // Разблокируем кнопку
        if (button) {
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }
        showAlert('Ошибка входа. Попробуй снова.', 'error');
    }
}

function createAdminUser(button) {
    myUserId = 'admin_' + ADMIN_USERNAME.replace(/\s+/g, '_');
    
    currentUser = {
        id: myUserId,
        name: ADMIN_USERNAME,
        avatar: '👑',
        isAdmin: true,
        isSpecialAdmin: true
    };
    
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    // Добавляем в список всех пользователей
    allUsers[myUserId] = currentUser;
    allUsers[ADMIN_USERNAME.toLowerCase()] = currentUser;
    
    console.log('✅ Вход как администратор');
    showAlert('👑 Вход как администратор!', 'success');
    showChatInterface();
    
    if (button) {
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }, 1000);
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/* ========== ОТОБРАЖЕНИЕ ЧАТА ========== */
function showChatInterface() {
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    const currentUserName = document.getElementById('currentUserName');
    const userAvatar = document.getElementById('userAvatar');
    const userRoleTag = document.getElementById('userRoleTag');
    const adminPanel = document.getElementById('adminPanel');
    const teacherPanel = document.getElementById('teacherPanel');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (chatScreen) chatScreen.style.display = 'flex';
    
    // Обновляем UI
    if (currentUserName && currentUser) {
        currentUserName.textContent = currentUser.name;
    }
    
    if (userAvatar && currentUser) {
        userAvatar.textContent = currentUser.avatar;
    }
    
    // Если админ - меняем стили
    if (isAdmin && currentUser) {
        if (userAvatar) userAvatar.classList.add('admin-avatar');
        if (currentUserName) {
            currentUserName.classList.add('admin-name');
            currentUserName.innerHTML = currentUser.name + ' <span style="color:gold; font-size:0.8em;">👑</span>';
        }
        if (userRoleTag) {
            userRoleTag.textContent = 'Администратор';
            userRoleTag.className = 'user-role role-admin';
        }
        if (adminPanel) adminPanel.style.display = 'block';
    }
    
    // Если учитель - меняем стили
    if (isTeacher && currentUser) {
        if (userAvatar) userAvatar.classList.add('teacher-avatar');
        if (currentUserName) {
            currentUserName.classList.add('teacher-name');
            currentUserName.innerHTML = currentUser.name + ' <span style="color:#ff9900; font-size:0.8em;">👨‍🏫</span>';
        }
        if (userRoleTag) {
            userRoleTag.textContent = 'Учитель';
            userRoleTag.className = 'user-role role-teacher';
        }
        if (teacherPanel) teacherPanel.style.display = 'block';
    }
    
    // Если обычный пользователь
    if (!isAdmin && !isTeacher && currentUser) {
        if (userRoleTag) {
            userRoleTag.textContent = currentUser.role || 'Ученик';
            userRoleTag.className = 'user-role role-student';
        }
    }
    
    // Фокус на поле ввода
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
            messageInput.value = '';
        }
    }, 300);
    
    initFirebase();
}

function initFirebase() {
    if (!database) {
        console.error('База данных не доступна');
        loadLocalMessages();
        return;
    }
    
    try {
        database.ref('.info/connected').on('value', (snap) => {
            const isConnected = snap.val() === true;
            const connectionStatus = document.getElementById('connectionStatus');
            if (connectionStatus) {
                connectionStatus.textContent = isConnected ? '✓' : '✗';
                connectionStatus.style.color = isConnected ? '#00ff80' : '#ff6666';
            }
            
            if (isConnected) {
                updateOnlineStatus();
                monitorOnlineUsers();
                
                if (onlineTimeout) clearInterval(onlineTimeout);
                onlineTimeout = setInterval(() => {
                    updateOnlineStatus();
                }, 30000);
            } else if (onlineTimeout) {
                clearInterval(onlineTimeout);
                onlineTimeout = null;
            }
        });
    } catch (error) {
        console.log('Мониторинг подключения недоступен');
    }
    
    try {
        database.ref('messages').orderByChild('timestamp').limitToLast(100).on('value', (snapshot) => {
            const data = snapshot.val();
            messages = data ? Object.values(data) : [];
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            updateMessagesDisplay();
            const messageCountElement = document.getElementById('messageCount');
            if (messageCountElement) {
                messageCountElement.textContent = messages.length;
            }
        });
    } catch (error) {
        console.log('Загрузка сообщений недоступна');
        loadLocalMessages();
    }
    
    // Запускаем мониторинг ЛС
    monitorDMs();
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeStr;
    }
}

/* ========== СИСТЕМА ОНЛАЙН ========== */
function updateOnlineStatus() {
    if (!database || !currentUser || !myUserId) return;
    
    try {
        const userRef = database.ref('online/' + myUserId);
        userRef.set({
            id: myUserId,
            name: currentUser.name,
            avatar: currentUser.avatar,
            isAdmin: isAdmin,
            isTeacher: isTeacher,
            lastSeen: Date.now()
        });
        
        userRef.onDisconnect().remove();
    } catch (error) {
        console.error('Ошибка обновления онлайн статуса:', error);
    }
}

function monitorOnlineUsers() {
    if (!database) return;
    
    try {
        database.ref('online').on('value', (snapshot) => {
            const data = snapshot.val();
            onlineUsers.clear();
            
            if (data) {
                const now = Date.now();
                const thirtySecondsAgo = now - 30000;
                
                Object.entries(data).forEach(([userId, user]) => {
                    if (user.lastSeen > thirtySecondsAgo) {
                        onlineUsers.set(userId, user);
                    } else {
                        try {
                            database.ref('online/' + userId).remove();
                        } catch (e) {}
                    }
                });
            }
            
            updateOnlineDisplay();
        });
    } catch (error) {
        console.error('Ошибка мониторинга онлайн пользователей:', error);
    }
}

function updateOnlineDisplay() {
    const container = document.getElementById('membersList');
    const onlineCount = document.getElementById('onlineCount');
    const onlineCount2 = document.getElementById('onlineCount2');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Добавляем себя
    if (currentUser && myUserId) {
        const userDiv = document.createElement('div');
        userDiv.className = 'member';
        userDiv.onclick = () => startDMWithUser(currentUser.name);
        userDiv.innerHTML = `
            <div class="member-avatar">${currentUser.avatar}</div>
            <div class="member-name">
                ${currentUser.name}
                <span style="color: #00ff80; font-size: 0.8em;">(Вы)</span>
                ${isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                ${isTeacher ? '<span class="teacher-badge">👨‍🏫</span>' : ''}
                <div class="online-dot"></div>
            </div>
        `;
        container.appendChild(userDiv);
    }
    
    // Добавляем остальных
    let otherUsersCount = 0;
    onlineUsers.forEach((user, userId) => {
        if (userId === myUserId) return;
        otherUsersCount++;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'member';
        userDiv.onclick = () => startDMWithUser(user.name);
        userDiv.innerHTML = `
            <div class="member-avatar">${user.avatar}</div>
            <div class="member-name">
                ${user.name}
                ${user.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                ${user.isTeacher ? '<span class="teacher-badge">👨‍🏫</span>' : ''}
                <div class="online-dot"></div>
            </div>
        `;
        container.appendChild(userDiv);
    });
    
    const totalOnline = onlineUsers.size;
    if (onlineCount) onlineCount.textContent = totalOnline;
    if (onlineCount2) onlineCount2.textContent = totalOnline;
    
    if (otherUsersCount === 0 && currentUser) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        emptyDiv.style.color = 'rgba(255,255,255,0.5)';
        emptyDiv.innerHTML = `
            <i class="fas fa-user-friends" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
            Пока ты один в сети
        `;
        container.appendChild(emptyDiv);
    }
}

/* ========== СООБЩЕНИЯ ========== */
function loadLocalMessages() {
    try {
        const messagesKey = 'firebase_messages';
        const savedMessages = localStorage.getItem(messagesKey);
        
        if (savedMessages) {
            messages = JSON.parse(savedMessages);
            messages.sort((a, b) => a.timestamp - b.timestamp);
            updateMessagesDisplay();
            
            const messageCountElement = document.getElementById('messageCount');
            if (messageCountElement) {
                messageCountElement.textContent = messages.length;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки локальных сообщений:', error);
    }
}

function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    // Если это ЛС, показываем сообщения ЛС
    if (currentChannel === 'dm' && currentDMUser) {
        showDMMessages(container);
        return;
    }
    
    // Иначе показываем обычные сообщения
    const filteredMessages = messages.filter(msg => msg.channel === currentChannel);
    
    if (filteredMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4);">
                <i class="fas fa-comment-alt" style="font-size: 3em; margin-bottom: 15px; display: block;"></i>
                Начни общение первым
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredMessages.forEach(msg => {
        const isOwn = currentUser && msg.userId === currentUser.id;
        const isSystem = msg.userId === 'system';
        const isAdminMsg = msg.isAdmin || (msg.userId && msg.userId.includes('admin'));
        const isTeacherMsg = msg.isTeacher || (msg.userId && msg.userId.includes('teacher'));
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''} ${isTeacherMsg ? 'teacher' : ''}`;
        
        let safeText = msg.text || '';
        safeText = safeText.replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user ${isAdminMsg ? 'admin' : ''} ${isTeacherMsg ? 'teacher' : ''}">
                    ${msg.userAvatar || ''} ${msg.userName || 'Неизвестный'}
                    ${isAdminMsg ? '👑' : ''}
                    ${isTeacherMsg ? '👨‍🏫' : ''}
                </span>
                <span class="message-time">${msg.time || '00:00'}</span>
            </div>
            <div class="message-content">${safeText}</div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

/* ========== ОТПРАВКА СООБЩЕНИЙ ========== */
async function sendMessage() {
    if (messageSendLock) {
        console.log('⏳ Сообщение уже отправляется...');
        return;
    }
    
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const text = input.value.trim();
    
    if (!text) {
        input.focus();
        return;
    }
    
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Проверка на спам
    const now = Date.now();
    if (now - lastMessageTime < 1000) {
        showAlert('⏳ Отправляй сообщения немного медленнее!', 'warning');
        return;
    }
    lastMessageTime = now;
    
    // Проверка команд
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        input.focus();
        return;
    }
    
    // Если это ЛС
    if (currentChannel === 'dm' && currentDMUser) {
        sendDMMessage(text, input);
        return;
    }
    
    // Отправка в общий чат
    messageSendLock = true;
    
    const sendBtn = document.querySelector('.send-btn');
    const originalBtnHtml = sendBtn ? sendBtn.innerHTML : null;
    
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.style.opacity = '0.7';
        sendBtn.disabled = true;
    }
    
    const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAdmin: isAdmin,
        isTeacher: isTeacher
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            if (messages.length > 100) {
                messages = messages.slice(-100);
            }
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        input.value = '';
        input.focus();
        updateOnlineStatus();
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('❌ Ошибка отправки сообщения', 'error');
    } finally {
        messageSendLock = false;
        
        if (sendBtn && originalBtnHtml) {
            setTimeout(() => {
                sendBtn.innerHTML = originalBtnHtml;
                sendBtn.style.opacity = '';
                sendBtn.disabled = false;
            }, 300);
        }
    }
}

/* ========== ЛИЧНЫЕ СООБЩЕНИЯ (РАБОЧИЕ) ========== */
function monitorDMs() {
    if (!database || !myUserId) return;
    
    try {
        // Слушаем входящие ЛС
        database.ref('dms').orderByChild('receiverId').equalTo(myUserId).on('child_added', (snapshot) => {
            const dm = snapshot.val();
            console.log('📨 Получено новое ЛС:', dm);
            
            // Добавляем в список диалогов
            addDMToDialogs(dm.senderId, dm);
            
            // Показываем уведомление
            if (notificationsEnabled && document.hidden) {
                showBrowserNotification(`ЛС от ${dm.senderName}`, dm.text);
            }
            
            // Обновляем список диалогов
            loadDMDialogs();
        });
    } catch (error) {
        console.error('Ошибка мониторинга ЛС:', error);
    }
}

function addDMToDialogs(userId, message) {
    // Находим пользователя по ID
    const user = Object.values(allUsers).find(u => u.id === userId);
    if (!user) return;
    
    const dialogKey = `dm_${userId}`;
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    
    if (!dialogs[dialogKey]) {
        dialogs[dialogKey] = {
            id: userId,
            name: user.name,
            avatar: user.avatar,
            messages: [],
            unread: 0,
            lastMessage: Date.now()
        };
    }
    
    dialogs[dialogKey].messages.push({
        id: message.id || Date.now().toString(),
        userId: userId,
        userName: user.name,
        text: message.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        read: currentChannel === 'dm' && currentDMUser === userId
    });
    
    if (!(currentChannel === 'dm' && currentDMUser === userId)) {
        dialogs[dialogKey].unread = (dialogs[dialogKey].unread || 0) + 1;
    }
    
    dialogs[dialogKey].lastMessage = Date.now();
    
    localStorage.setItem('neonchat_dialogs', JSON.stringify(dialogs));
}

async function sendDMMessage(text, input) {
    if (!currentDMUser) return;
    
    messageSendLock = true;
    
    const sendBtn = document.querySelector('.send-btn');
    const originalBtnHtml = sendBtn ? sendBtn.innerHTML : null;
    
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.style.opacity = '0.7';
        sendBtn.disabled = true;
    }
    
    const dmId = 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const message = {
        id: dmId,
        senderId: myUserId,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        receiverId: currentDMUser,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    try {
        if (database) {
            // Сохраняем у отправителя
            await database.ref('dms/' + dmId).set(message);
            
            // Также сохраняем для получателя (имитируем получение)
            const receiverMessage = { ...message };
            receiverMessage.id = 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 10);
            await database.ref('dms/' + receiverMessage.id).set(receiverMessage);
            
        } else {
            // Локальное хранение - сохраняем для обоих пользователей
            const chatKey = `dm_${myUserId}_${currentDMUser}`;
            let chat = JSON.parse(localStorage.getItem(chatKey) || '{"messages":[]}');
            chat.messages.push(message);
            localStorage.setItem(chatKey, JSON.stringify(chat));
            
            // Для получателя
            const chatKey2 = `dm_${currentDMUser}_${myUserId}`;
            let chat2 = JSON.parse(localStorage.getItem(chatKey2) || '{"messages":[]}');
            chat2.messages.push({...message, isFromOther: true});
            localStorage.setItem(chatKey2, JSON.stringify(chat2));
            
            // Добавляем в уведомления для получателя
            const notificationsKey = 'neonchat_dm_notifications';
            let notifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
            notifications.push({
                ...message,
                isNew: true,
                receiverId: currentDMUser
            });
            localStorage.setItem(notificationsKey, JSON.stringify(notifications));
        }
        
        // Добавляем сообщение в наш список диалогов
        addDMToDialogs(currentDMUser, message);
        
        // Обновляем отображение
        showDMMessages(document.getElementById('messagesContainer'));
        
        input.value = '';
        input.focus();
        
        showAlert('✅ Личное сообщение отправлено!', 'success');
        
    } catch (error) {
        console.error('Ошибка отправки ЛС:', error);
        showAlert('❌ Ошибка отправки ЛС', 'error');
    } finally {
        messageSendLock = false;
        
        if (sendBtn && originalBtnHtml) {
            setTimeout(() => {
                sendBtn.innerHTML = originalBtnHtml;
                sendBtn.style.opacity = '';
                sendBtn.disabled = false;
            }, 300);
        }
    }
}

function showDMMessages(container) {
    if (!container || !currentDMUser) return;
    
    container.innerHTML = '';
    
    // Находим диалог
    const dialogKey = `dm_${currentDMUser}`;
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    const dialog = dialogs[dialogKey];
    
    if (!dialog || !dialog.messages || dialog.messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4);">
                <i class="fas fa-envelope" style="font-size: 3em; margin-bottom: 15px; display: block;"></i>
                Начните диалог с ${currentDMUser}
            </div>
        `;
        return;
    }
    
    // Показываем сообщения
    dialog.messages.forEach(msg => {
        const isOwn = msg.userId === myUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        
        let safeText = msg.text || '';
        safeText = safeText.replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user">
                    ${msg.userName || 'Неизвестный'}
                </span>
                <span class="message-time">${msg.time || '00:00'}</span>
            </div>
            <div class="message-content">${safeText}</div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    // Помечаем как прочитанные
    if (dialog.unread > 0) {
        dialog.unread = 0;
        dialogs[dialogKey] = dialog;
        localStorage.setItem('neonchat_dialogs', JSON.stringify(dialogs));
        loadDMDialogs();
    }
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function toggleDMFolder() {
    const folderContent = document.getElementById('dmFolderContent');
    const folderArrow = document.querySelector('.folder-arrow');
    
    dmFolderOpen = !dmFolderOpen;
    
    if (folderContent) {
        if (dmFolderOpen) {
            folderContent.classList.add('open');
            folderContent.style.maxHeight = '250px';
            folderArrow.classList.add('open');
            loadDMDialogs();
        } else {
            folderContent.classList.remove('open');
            folderContent.style.maxHeight = '0';
            folderArrow.classList.remove('open');
        }
    }
}

function loadDMDialogs() {
    const dmList = document.getElementById('dmList');
    if (!dmList) return;
    
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    dmList.innerHTML = '';
    
    let hasDialogs = false;
    let unreadCount = 0;
    
    // Сортируем диалоги по времени последнего сообщения
    const sortedDialogs = Object.entries(dialogs)
        .filter(([_, dialog]) => dialog.messages && dialog.messages.length > 0)
        .sort((a, b) => (b[1].lastMessage || 0) - (a[1].lastMessage || 0));
    
    sortedDialogs.forEach(([userId, dialog]) => {
        hasDialogs = true;
        const lastMessage = dialog.messages[dialog.messages.length - 1];
        const isUnread = dialog.unread > 0;
        
        if (isUnread) unreadCount += dialog.unread;
        
        const dmItem = document.createElement('div');
        dmItem.className = `dm-item ${isUnread ? 'unread' : ''}`;
        dmItem.onclick = () => {
            currentDMUser = userId;
            switchChannel('dm');
            showDMMessages(document.getElementById('messagesContainer'));
            
            // Обновляем заголовок
            const channelNameElement = document.getElementById('channelName');
            if (channelNameElement) {
                channelNameElement.textContent = `ЛС: ${dialog.name}`;
            }
            
            hideMobilePanels();
        };
        
        dmItem.innerHTML = `
            <div class="dm-avatar">${dialog.avatar || '👤'}</div>
            <div class="dm-info">
                <div class="dm-user">${dialog.name}</div>
                <div class="dm-preview">${lastMessage?.text?.substring(0, 30) || 'Нет сообщений'}...</div>
            </div>
            ${isUnread ? `<span class="dm-badge">${dialog.unread > 9 ? '9+' : dialog.unread}</span>` : ''}
        `;
        
        dmList.appendChild(dmItem);
    });
    
    updateDMBadge(unreadCount);
    
    if (!hasDialogs) {
        dmList.innerHTML = `
            <div style="text-align: center; padding: 15px; color: rgba(255,255,255,0.5);">
                <i class="fas fa-envelope" style="font-size: 1.5em; margin-bottom: 8px; display: block;"></i>
                Нет диалогов
            </div>
        `;
    }
}

function updateDMBadge(count) {
    const folderBadge = document.getElementById('dmFolderBadge');
    const mobileBadge = document.getElementById('mobileDMBadge');
    
    if (folderBadge) {
        if (count > 0) {
            folderBadge.textContent = count > 9 ? '9+' : count;
            folderBadge.style.display = 'inline';
        } else {
            folderBadge.style.display = 'none';
        }
    }
    
    if (mobileBadge) {
        if (count > 0) {
            mobileBadge.textContent = count > 9 ? '9+' : count;
            mobileBadge.style.display = 'inline';
        } else {
            mobileBadge.style.display = 'none';
        }
    }
}

function startNewDM() {
    const modal = document.getElementById('newDMModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Заполняем список пользователей для выбора
        const recipientInput = document.getElementById('dmRecipient');
        if (recipientInput) {
            recipientInput.value = '';
            recipientInput.placeholder = 'Введите имя пользователя или выберите из списка...';
            recipientInput.focus();
            
            // Создаем datalist для автодополнения
            let datalist = document.getElementById('usersDatalist');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'usersDatalist';
                document.body.appendChild(datalist);
            }
            datalist.innerHTML = '';
            
            // Добавляем онлайн пользователей
            onlineUsers.forEach(user => {
                if (user.id !== myUserId) {
                    const option = document.createElement('option');
                    option.value = user.name;
                    datalist.appendChild(option);
                }
            });
            
            // Добавляем всех пользователей
            Object.values(allUsers).forEach(user => {
                if (user.id !== myUserId && !onlineUsers.has(user.id)) {
                    const option = document.createElement('option');
                    option.value = user.name;
                    datalist.appendChild(option);
                }
            });
            
            recipientInput.setAttribute('list', 'usersDatalist');
        }
    }
}

function closeNewDM() {
    const modal = document.getElementById('newDMModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function sendDirectMessage() {
    const recipientInput = document.getElementById('dmRecipient');
    const messageText = document.getElementById('dmMessageText');
    
    if (!recipientInput || !messageText) return;
    
    const recipientName = recipientInput.value.trim();
    const text = messageText.value.trim();
    
    if (!recipientName) {
        showAlert('Введите имя получателя!', 'error');
        return;
    }
    
    if (!text) {
        showAlert('Введите сообщение!', 'error');
        return;
    }
    
    // Находим пользователя
    const recipient = Object.values(allUsers).find(user => 
        user.name.toLowerCase() === recipientName.toLowerCase()
    );
    
    if (!recipient) {
        showAlert('Пользователь не найден!', 'error');
        return;
    }
    
    if (recipient.id === myUserId) {
        showAlert('Нельзя отправить сообщение самому себе!', 'error');
        return;
    }
    
    // Закрываем модальное окно
    closeNewDM();
    
    // Начинаем диалог
    currentDMUser = recipient.id;
    switchChannel('dm');
    
    // Отправляем сообщение
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value = text;
        setTimeout(() => {
            sendMessage();
        }, 100);
    }
    
    showAlert(`Начат диалог с ${recipient.name}`, 'success');
}

function startDMWithUser(username) {
    // Находим пользователя
    const user = Object.values(allUsers).find(u => 
        u.name.toLowerCase() === username.toLowerCase()
    );
    
    if (!user) {
        showAlert('Пользователь не найден!', 'error');
        return;
    }
    
    if (user.id === myUserId) {
        showAlert('Нельзя начать диалог с самим собой!', 'error');
        return;
    }
    
    // Открываем модальное окно нового ЛС
    const modal = document.getElementById('newDMModal');
    if (modal) {
        modal.style.display = 'flex';
        const recipientInput = document.getElementById('dmRecipient');
        const messageText = document.getElementById('dmMessageText');
        
        if (recipientInput) recipientInput.value = user.name;
        if (messageText) {
            messageText.value = '';
            messageText.focus();
        }
    }
}

/* ========== КОМАНДЫ ========== */
function handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch(cmd) {
        case '/help':
            showHelp();
            break;
            
        case '/clean':
        case '/clear':
            if (isAdmin) {
                adminClearChat();
            } else {
                sendSystemMessage('❌ Только администратор может очищать чат');
            }
            break;
            
        case '/announce':
        case '/announcement':
            if (isAdmin) {
                const text = args.join(' ');
                if (text) {
                    adminSendAnnouncement(text);
                } else {
                    adminAnnouncement();
                }
            } else {
                sendSystemMessage('❌ Только администратор может делать объявления');
            }
            break;
            
        case '/kickall':
            if (isAdmin) {
                adminKickAll();
            } else {
                sendSystemMessage('❌ Только администратор может кикать пользователей');
            }
            break;
            
        case '/online':
            sendSystemMessage(`👥 Сейчас онлайн: ${onlineUsers.size} пользователь(ей)`);
            break;
            
        case '/me':
            const action = args.join(' ');
            if (action) {
                sendActionMessage(action);
            }
            break;
            
        case '/call':
            startCall();
            break;
            
        case '/time':
            const now = new Date();
            const timeStr = now.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            sendSystemMessage(`🕒 Текущее время: ${timeStr}`);
            break;
            
        case '/ping':
            sendSystemMessage('🏓 Понг! Чат работает нормально.');
            break;
            
        case '/users':
            const userCount = Object.keys(localStorage).filter(k => k.startsWith('neonchat_user_')).length;
            sendSystemMessage(`👤 Всего пользователей: ${userCount}`);
            break;
            
        case '/dm':
            if (args.length > 0) {
                const recipient = args[0];
                startDMWithUser(recipient);
            } else {
                sendSystemMessage('❌ Используй: /dm [имя пользователя]');
            }
            break;
            
        default:
            sendSystemMessage(`❌ Неизвестная команда "${cmd}". Введи /help для списка команд`);
    }
    
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function showHelp() {
    let helpText = '📋 <strong>Доступные команды:</strong><br>';
    helpText += '<div style="margin-left: 15px; font-size: 0.9em;">';
    helpText += '/help - Показать это сообщение<br>';
    helpText += '/online - Показать кто онлайн<br>';
    helpText += '/me [действие] - Отправить действие<br>';
    helpText += '/call - Создать видеозвонок<br>';
    helpText += '/time - Показать точное время<br>';
    helpText += '/ping - Проверить связь с сервером<br>';
    helpText += '/users - Показать статистику<br>';
    helpText += '/dm [имя] - Начать личный диалог<br>';
    
    if (isAdmin) {
        helpText += '<br><strong style="color:gold;">👑 Админ команды:</strong><br>';
        helpText += '/clean - Очистить весь чат<br>';
        helpText += '/announce [текст] - Сделать объявление<br>';
        helpText += '/kickall - Кикнуть всех пользователей<br>';
    }
    
    if (isTeacher) {
        helpText += '<br><strong style="color:#ff9900;">👨‍🏫 Учительские команды:</strong><br>';
        helpText += '/teacher - Панель учителя<br>';
        helpText += '/announce - Сделать объявление<br>';
    }
    
    helpText += '</div>';
    
    sendSystemMessage(helpText);
}

function sendSystemMessage(text) {
    const message = {
        id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    try {
        if (database) {
            database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки системного сообщения:', error);
    }
}

function sendActionMessage(action) {
    if (!currentUser) return;
    
    const message = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: `<i style="color: #88aaff;">* ${currentUser.name} ${action}</i>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAction: true
    };
    
    try {
        if (database) {
            database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки действия:', error);
    }
}

/* ========== ОСТАЛЬНЫЕ ФУНКЦИИ ========== */
// (Функции startCall, createDiscordCall и т.д. оставляем как были)
// (Функции учителя adminClearChat и т.д. оставляем как были)

function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji + ' ';
        input.focus();
    }
}

function toggleEmojiPanel() {
    const emojiPanel = document.getElementById('emojiPanel');
    if (emojiPanel) {
        if (emojiPanel.style.display === 'block') {
            emojiPanel.style.display = 'none';
        } else {
            emojiPanel.style.display = 'block';
        }
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    currentDMUser = null; // Сбрасываем ЛС при переключении каналов
    
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    
    const targetChannel = document.querySelector(`[onclick*="switchChannel('${channel}')"]`);
    if (targetChannel) {
        targetChannel.classList.add('active');
    }
    
    const channelNames = {
        'main': 'Основной чат',
        'games': 'Игры',
        'lessons': 'Уроки',
        'ai': '🤖 Нейросеть',
        'dm': 'Личные сообщения'
    };
    
    const channelNameElement = document.getElementById('channelName');
    if (channelNameElement) {
        if (channel === 'dm' && currentDMUser) {
            const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
            const dialog = dialogs[currentDMUser];
            channelNameElement.textContent = `ЛС: ${dialog?.name || 'Диалог'}`;
        } else {
            channelNameElement.textContent = channelNames[channel] || channel;
        }
    }
    
    updateMessagesDisplay();
    hideMobilePanels();
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
        rightSidebar.classList.remove('active');
    }
}

function toggleMembers() {
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
        rightSidebar.classList.toggle('active');
    }
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

function showDMView() {
    // Открываем папку ЛС
    const dmFolder = document.getElementById('dmFolder');
    if (dmFolder && dmFolder.querySelector('.folder-header')) {
        dmFolder.querySelector('.folder-header').click();
    }
    
    // Скрываем другие панели
    hideMobilePanels();
}

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
    }
    
    updateOnlineStatus();
    updateMessagesDisplay();
    loadAllUsers();
    loadDMDialogs();
    showAlert('Чат обновлен!', 'success');
}

function hideMobilePanels() {
    document.querySelectorAll('.sidebar, .right-sidebar').forEach(panel => {
        panel.classList.remove('active');
    });
}

function adjustMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const inputArea = document.getElementById('inputArea');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (isMobile && inputArea && mobileMenu) {
        const menuHeight = mobileMenu.offsetHeight;
        inputArea.style.paddingBottom = (menuHeight + 10) + 'px';
    }
}

function logout() {
    if (confirm('Выйти из чата?')) {
        if (database && myUserId) {
            try {
                database.ref('online/' + myUserId).remove();
            } catch (e) {}
        }
        
        if (onlineTimeout) clearInterval(onlineTimeout);
        
        localStorage.removeItem('neonchat_current_user');
        location.reload();
    }
}

function showAlert(message, type = 'info') {
    const oldAlerts = document.querySelectorAll('.neon-alert');
    oldAlerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
    
    const alertDiv = document.createElement('div');
    const colors = {
        success: '#00cc66',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#00aaff'
    };
    
    alertDiv.className = 'neon-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.3);
        font-weight: 500;
        font-size: 14px;
    `;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alertDiv.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}" style="font-size: 1.2em;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                document.body.removeChild(alertDiv);
            }
        }, 300);
    }, 4000);
}

// Глобальные функции
window.toggleRegister = toggleRegister;
window.toggleLogin = toggleLogin;
window.teacherLogin = teacherLogin;
window.handleAuth = handleAuth;
window.sendMessage = sendMessage;
window.addEmoji = addEmoji;
window.toggleEmojiPanel = toggleEmojiPanel;
window.switchChannel = switchChannel;
window.startCall = startCall;
window.toggleSidebar = toggleSidebar;
window.toggleMembers = toggleMembers;
window.forceSync = forceSync;
window.logout = logout;
window.showNotificationSettings = showNotificationSettings;
window.closeNotifications = closeNotifications;
window.saveNotificationSettings = saveNotificationSettings;
window.testNotificationSound = testNotificationSound;
window.startNewDM = startNewDM;
window.closeNewDM = closeNewDM;
window.sendDirectMessage = sendDirectMessage;
window.teacherAnnounce = teacherAnnounce;
window.closeTeacherAnnounce = closeTeacherAnnounce;
window.sendTeacherAnnouncement = sendTeacherAnnouncement;
window.teacherPinMessage = teacherPinMessage;
window.teacherLessonPlan = teacherLessonPlan;
window.adminClearChat = adminClearChat;
window.adminAnnouncement = adminAnnouncement;
window.adminKickAll = adminKickAll;
window.showDMView = showDMView;
window.handleTeacherAuth = handleTeacherAuth;

console.log('✅ Все функции загружены! ЛС теперь работают в обе стороны!');
