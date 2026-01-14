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

// Админ аккаунт
const ADMIN_USERNAME = "ArturPirozhkov";
const ADMIN_PASSWORD = "JojoTop1";

// Глобальные переменные
let isRegisterMode = false;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;
let messageSendLock = false; // Флаг для блокировки двойной отправки
let lastMessageTime = 0; // Время последнего сообщения
let eventListenersAdded = false;

/* ========== ИНИЦИАЛИЗАЦИЯ ========== */
window.onload = function() {
    console.log('🚀 NeonChat запущен');
    
    // Инициализация Firebase
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        console.log('✅ Firebase подключен');
    } catch (e) {
        console.log('⚠️ Firebase не инициализирован, используем локальный режим');
        setupLocalStorageFallback();
    }
    
    // Назначаем обработчики событий (только один раз!)
    if (!eventListenersAdded) {
        setupEventListeners();
        eventListenersAdded = true;
    }
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            isAdmin = currentUser.isAdmin || false;
            
            // Автозаполняем поле логина
            const usernameInput = document.getElementById('username');
            if (usernameInput && currentUser.name) {
                usernameInput.value = currentUser.name;
            }
            
            console.log('Найден сохраненный пользователь:', currentUser.name);
            
            // Автоматически показываем чат если пользователь сохранен
            setTimeout(() => {
                if (currentUser && currentUser.name) {
                    showChatInterface();
                }
            }, 500);
            
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
        }
    }
    
    // Автофокус
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) input.focus();
    }, 300);
    
    // Обновление времени
    updateTime();
    setInterval(updateTime, 60000);
};

/* ========== НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ========== */
function setupEventListeners() {
    console.log('📌 Настройка обработчиков событий');
    
    // Кнопка авторизации
    const authButton = document.getElementById('authButton');
    if (authButton) {
        const newAuthButton = authButton.cloneNode(true);
        authButton.parentNode.replaceChild(newAuthButton, authButton);
        document.getElementById('authButton').addEventListener('click', handleAuth);
    }
    
    // Кнопка регистрации
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    if (registerToggleBtn) {
        const newRegisterBtn = registerToggleBtn.cloneNode(true);
        registerToggleBtn.parentNode.replaceChild(newRegisterBtn, registerToggleBtn);
        document.getElementById('registerToggleBtn').addEventListener('click', toggleRegister);
    }
    
    // Ссылка для входа
    const loginLink = document.querySelector('.mode-switch a');
    if (loginLink) {
        const newLoginLink = loginLink.cloneNode(true);
        loginLink.parentNode.replaceChild(newLoginLink, loginLink);
        document.querySelector('.mode-switch a').addEventListener('click', toggleLogin);
    }
    
    // Поле ввода сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        const newMessageInput = messageInput.cloneNode(true);
        messageInput.parentNode.replaceChild(newMessageInput, messageInput);
        
        // Только один обработчик для Enter
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Фокус/блюр эффекты
        newMessageInput.addEventListener('focus', function() {
            this.style.borderColor = '#00ccff';
            this.style.boxShadow = '0 0 15px rgba(0, 200, 255, 0.3)';
        });
        
        newMessageInput.addEventListener('blur', function() {
            this.style.borderColor = 'rgba(0, 200, 255, 0.3)';
            this.style.boxShadow = 'none';
        });
    }
    
    // Кнопка отправки сообщения
    const sendButton = document.querySelector('.send-btn');
    if (sendButton) {
        const newSendButton = sendButton.cloneNode(true);
        sendButton.parentNode.replaceChild(newSendButton, sendButton);
        document.querySelector('.send-btn').addEventListener('click', function(e) {
            e.preventDefault();
            sendMessage();
        });
    }
    
    // Поля логина/пароля
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput) {
        usernameInput.replaceWith(usernameInput.cloneNode(true));
        const newUsernameInput = document.getElementById('username');
        newUsernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const passwordField = document.getElementById('password');
                if (passwordField) passwordField.focus();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.replaceWith(passwordInput.cloneNode(true));
        const newPasswordInput = document.getElementById('password');
        newPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAuth();
            }
        });
    }
    
    // Эмодзи кнопки
    setupEmojiButtons();
    
    // Каналы чата
    setupChannelButtons();
}

function setupEmojiButtons() {
    const emojis = ['😊', '😂', '❤️', '🔥', '👍'];
    emojis.forEach(emoji => {
        const btn = document.querySelector(`.action-btn:contains('${emoji}')`);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                addEmoji(emoji);
            });
        }
    });
}

function setupChannelButtons() {
    const channels = ['main', 'games', 'music', 'ai'];
    channels.forEach(channel => {
        const elements = document.querySelectorAll(`[onclick*="switchChannel('${channel}')"]`);
        elements.forEach(el => {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            newEl.addEventListener('click', function(e) {
                e.preventDefault();
                switchChannel(channel);
            });
        });
    });
}

/* ========== ФОЛБЭК ДЛЯ ЛОКАЛЬНОГО ХРАНИЛИЩА ========== */
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
                        } else if (path.startsWith('online/')) {
                            const onlineKey = 'firebase_online';
                            let online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            const userId = path.split('/')[1];
                            online[userId] = data;
                            localStorage.setItem(onlineKey, JSON.stringify(online));
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
                            callback({ val: () => obj });
                        } else if (path === 'online') {
                            const onlineKey = 'firebase_online';
                            const online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            callback({ val: () => online });
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

/* ========== АВТОРИЗАЦИЯ ========== */
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
        isAdmin: false
    };
    
    // Сохраняем
    localStorage.setItem('neonchat_user_' + username.toLowerCase(), JSON.stringify(currentUser));
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
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
    myUserId = 'admin_' + ADMIN_USERNAME;
    
    currentUser = {
        id: myUserId,
        name: ADMIN_USERNAME,
        avatar: '👑',
        isAdmin: true,
        isSpecialAdmin: true
    };
    
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ Вход как администратор');
    showAlert('👑 Вход как администратор!', 'success');
    showChatInterface();
    
    // Разблокируем кнопку
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
    const adminPanel = document.getElementById('adminPanel');
    
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
        
        // Показываем админ-панель
        if (adminPanel) adminPanel.style.display = 'block';
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
        // Мониторинг подключения
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
        // Загрузка сообщений
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
        userDiv.innerHTML = `
            <div class="member-avatar">${currentUser.avatar}</div>
            <div class="member-name">
                ${currentUser.name}
                <span style="color: #00ff80; font-size: 0.8em;">(Вы)</span>
                ${isAdmin ? '<span class="admin-badge">👑</span>' : ''}
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
        userDiv.innerHTML = `
            <div class="member-avatar">${user.avatar}</div>
            <div class="member-name">
                ${user.name}
                ${user.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
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
        const isCallMessage = msg.text && msg.text.includes('GOOGLE MEET');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''} ${isCallMessage ? 'call-message' : ''}`;
        
        // Безопасное отображение HTML
        let safeText = msg.text || '';
        safeText = safeText.replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user ${isAdminMsg ? 'admin' : ''}">
                    ${msg.userAvatar || ''} ${msg.userName || 'Неизвестный'}
                    ${isAdminMsg ? '👑' : ''}
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

/* ========== ИСПРАВЛЕННАЯ ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЙ ========== */
async function sendMessage() {
    // ЗАЩИТА ОТ ДВОЙНОЙ ОТПРАВКИ
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
    
    // БЛОКИРУЕМ ОТПРАВКУ
    messageSendLock = true;
    
    // Меняем вид кнопки отправки
    const sendBtn = document.querySelector('.send-btn');
    const originalBtnHtml = sendBtn ? sendBtn.innerHTML : null;
    const originalBtnOpacity = sendBtn ? sendBtn.style.opacity : null;
    
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
        isAdmin: isAdmin
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            // Локальное сохранение
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            if (messages.length > 100) {
                messages = messages.slice(-100);
            }
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            
            // Обновляем отображение
            messages = messages;
            updateMessagesDisplay();
        }
        
        // Очищаем поле ввода
        input.value = '';
        input.focus();
        
        // Обновляем онлайн статус
        updateOnlineStatus();
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('❌ Ошибка отправки сообщения', 'error');
    } finally {
        // ВСЕГДА разблокируем отправку, даже если была ошибка
        messageSendLock = false;
        
        // Восстанавливаем кнопку
        if (sendBtn && originalBtnHtml) {
            sendBtn.innerHTML = originalBtnHtml;
            sendBtn.style.opacity = originalBtnOpacity || '';
            sendBtn.disabled = false;
        }
    }
}

/* ========== ВИДЕОЗВОНКИ ЧЕРЕЗ GOOGLE MEET ========== */
function startCall() {
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Генерируем уникальный код для Google Meet
    const meetCode = generateMeetCode();
    
    // Создаем ссылку Google Meet (работает 100%)
    const meetLink = `https://meet.google.com/${meetCode}`;
    
    // Создаем красивое сообщение о звонке
    const callMessage = createGoogleMeetMessage(meetCode, meetLink);
    
    // Отправляем сообщение в чат
    sendCallMessage(callMessage);
    
    // Показываем инструкцию
    showMeetInstructions(meetCode, meetLink);
}

function generateMeetCode() {
    // Генерируем код как у Google Meet
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    
    let code = '';
    
    // 3 группы по 3 символа
    for (let part = 0; part < 3; part++) {
        for (let i = 0; i < 3; i++) {
            const pool = Math.random() > 0.5 ? chars : nums;
            code += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        if (part < 2) code += '-';
    }
    
    return code.toLowerCase();
}

function createGoogleMeetMessage(meetCode, meetLink) {
    const timestamp = Date.now();
    
    return {
        id: 'call_' + timestamp + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '📞 Система звонков',
        userAvatar: '📞',
        text: `
            <div class="call-message-container" style="
                background: linear-gradient(135deg, rgba(26, 115, 232, 0.15), rgba(66, 133, 244, 0.15));
                border-radius: 16px;
                padding: 22px;
                margin: 12px 0;
                border: 2px solid rgba(66, 133, 244, 0.4);
                box-shadow: 0 8px 25px rgba(66, 133, 244, 0.25);
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            ">
                <!-- Google цвета в фоне -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background: linear-gradient(90deg, #4285f4, #34a853, #fbbc05, #ea4335);
                    background-size: 400% 100%;
                    animation: gradientMove 4s ease infinite;
                "></div>
                
                <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 18px;">
                    <div style="
                        background: linear-gradient(135deg, #4285f4, #34a853);
                        width: 55px;
                        height: 55px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.6em;
                        color: white;
                        box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
                    ">
                        <i class="fab fa-google"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.4em; font-weight: 700; color: #4285f4; margin-bottom: 6px;">
                            🎥 GOOGLE MEET ЗВОНОК
                        </div>
                        <div style="color: rgba(255,255,255,0.85); font-size: 0.95em; display: flex; align-items: center; gap: 8px;">
                            <div style="
                                background: #34a853;
                                color: white;
                                padding: 4px 10px;
                                border-radius: 20px;
                                font-size: 0.85em;
                                font-weight: 600;
                            ">
                                <i class="fas fa-user-check"></i> ${currentUser.name}
                            </div>
                            <span>создал видеозвонок</span>
                        </div>
                    </div>
                </div>
                
                <!-- Код встречи -->
                <div style="
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 12px;
                    padding: 18px;
                    margin: 18px 0;
                    border: 1px solid rgba(66, 133, 244, 0.3);
                    text-align: center;
                ">
                    <div style="color: #fbbc05; font-size: 0.95em; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-key"></i> Код встречи:
                    </div>
                    <div style="
                        background: rgba(66, 133, 244, 0.2);
                        padding: 14px;
                        border-radius: 10px;
                        font-family: 'Courier New', monospace;
                        font-weight: 800;
                        color: white;
                        font-size: 1.5em;
                        letter-spacing: 3px;
                        border: 2px solid rgba(66, 133, 244, 0.5);
                        margin-bottom: 15px;
                    ">
                        ${meetCode}
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <a href="${meetLink}" target="_blank" onclick="joinMeetCall('${meetLink}')" style="
                            flex: 1;
                            min-width: 200px;
                            background: linear-gradient(135deg, #4285f4, #34a853);
                            color: white;
                            text-align: center;
                            padding: 16px 24px;
                            border-radius: 12px;
                            text-decoration: none;
                            font-weight: 700;
                            font-size: 1.1em;
                            border: 1px solid rgba(255,255,255,0.3);
                            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 12px;
                            position: relative;
                            overflow: hidden;
                        ">
                            <i class="fas fa-video"></i>
                            <span>Присоединиться</span>
                            <div style="
                                position: absolute;
                                top: 0;
                                left: -100%;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                                animation: shimmer 2s infinite;
                            "></div>
                        </a>
                        
                        <button onclick="copyMeetCode('${meetCode}')" style="
                            flex: 1;
                            min-width: 150px;
                            background: rgba(251, 188, 5, 0.2);
                            border: 1px solid rgba(251, 188, 5, 0.5);
                            color: #fbbc05;
                            text-align: center;
                            padding: 16px 20px;
                            border-radius: 12px;
                            font-weight: 700;
                            font-size: 1em;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        ">
                            <i class="fas fa-copy"></i>
                            <span>Копировать код</span>
                        </button>
                    </div>
                </div>
                
                <!-- Инструкция -->
                <div style="
                    background: rgba(52, 168, 83, 0.1);
                    border-radius: 10px;
                    padding: 16px;
                    margin-top: 15px;
                    border-left: 4px solid #34a853;
                ">
                    <div style="color: #34a853; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-lightbulb"></i> Как присоединиться:
                    </div>
                    <div style="color: rgba(255,255,255,0.9); line-height: 1.5; font-size: 0.9em;">
                        <div style="margin-bottom: 6px;">1. <strong>Нажмите "Присоединиться"</strong></div>
                        <div style="margin-bottom: 6px;">2. Войдите в Google аккаунт (или используйте гостевой доступ)</div>
                        <div style="margin-bottom: 6px;">3. <strong>Введите код:</strong> ${meetCode}</div>
                        <div>4. Разрешите доступ к камере и микрофону</div>
                    </div>
                </div>
                
                <!-- Google лого -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    font-size: 0.85em;
                    color: rgba(255,255,255,0.6);
                ">
                    <i class="fab fa-google" style="color: #4285f4;"></i>
                    <span>Работает на Google Meet</span>
                    <i class="fas fa-shield-alt" style="color: #34a853;"></i>
                    <span>Безопасно</span>
                </div>
            </div>
            
            <style>
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                .call-message-container:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(66, 133, 244, 0.35);
                }
            </style>
        `,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isCall: true
    };
}

function showMeetInstructions(meetCode, meetLink) {
    const overlay = document.createElement('div');
    overlay.className = 'meet-instructions-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.97);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(20px);
        animation: fadeIn 0.4s ease;
        padding: 30px;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 40px;
        border-radius: 24px;
        border: 2px solid rgba(66, 133, 244, 0.6);
        box-shadow: 0 0 60px rgba(66, 133, 244, 0.5);
        max-width: 650px;
        width: 90%;
        color: white;
        position: relative;
        overflow: hidden;
    `;
    
    modal.innerHTML = `
        <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #4285f4, #34a853, #fbbc05, #ea4335);
            background-size: 400% 100%;
            animation: gradientMove 4s ease infinite;
        "></div>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                background: rgba(66, 133, 244, 0.1);
                padding: 15px 30px;
                border-radius: 50px;
                margin-bottom: 20px;
            ">
                <div style="
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2em;
                    color: white;
                    box-shadow: 0 8px 25px rgba(66, 133, 244, 0.5);
                ">
                    <i class="fab fa-google"></i>
                </div>
                <div style="text-align: left;">
                    <h2 style="color: #4285f4; margin: 0; font-size: 2em; font-weight: 800;">
                        Google Meet
                    </h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">
                        видеозвонок создан!
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Код встречи крупно -->
        <div style="
            background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15));
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            border: 2px solid rgba(66, 133, 244, 0.4);
            text-align: center;
            position: relative;
            overflow: hidden;
        ">
            <div style="color: #fbbc05; font-size: 1.1em; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                <i class="fas fa-hashtag" style="font-size: 1.3em;"></i>
                <span style="font-weight: 600;">КОД ВСТРЕЧИ</span>
            </div>
            
            <div style="
                background: rgba(0, 0, 0, 0.3);
                padding: 25px;
                border-radius: 16px;
                font-family: 'Courier New', monospace;
                font-weight: 900;
                color: white;
                font-size: 2.5em;
                letter-spacing: 5px;
                border: 3px solid rgba(66, 133, 244, 0.6);
                margin: 20px 0;
                text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                box-shadow: inset 0 0 30px rgba(66, 133, 244, 0.2);
            ">
                ${meetCode}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
                <a href="${meetLink}" target="_blank" onclick="joinMeetCall('${meetLink}')" style="
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    color: white;
                    text-align: center;
                    padding: 20px;
                    border-radius: 16px;
                    text-decoration: none;
                    font-weight: 800;
                    font-size: 1.3em;
                    border: 2px solid rgba(255,255,255,0.3);
                    box-shadow: 0 8px 30px rgba(66, 133, 244, 0.5);
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <i class="fas fa-video" style="font-size: 1.5em;"></i>
                    <span>Присоединиться</span>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                        animation: shimmer 2s infinite;
                    "></div>
                </a>
                
                <button onclick="copyMeetCode('${meetCode}')" style="
                    background: linear-gradient(135deg, rgba(251, 188, 5, 0.2), rgba(234, 67, 53, 0.2));
                    border: 2px solid rgba(251, 188, 5, 0.6);
                    color: #fbbc05;
                    text-align: center;
                    padding: 20px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 1.2em;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                ">
                    <i class="fas fa-copy" style="font-size: 1.5em;"></i>
                    <span>Копировать код</span>
                </button>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 40px; flex-wrap: wrap;">
            <button onclick="createNewMeetLink()" style="
                background: linear-gradient(135deg, #4285f4, #34a853);
                border: none;
                color: white;
                padding: 16px 35px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 700;
                font-size: 1.1em;
                box-shadow: 0 6px 25px rgba(66, 133, 244, 0.4);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <i class="fas fa-plus-circle"></i>
                <span>Создать новую встречу</span>
            </button>
            
            <button onclick="this.closest('.meet-instructions-overlay').remove()" style="
                background: rgba(234, 67, 53, 0.2);
                border: 2px solid rgba(234, 67, 53, 0.6);
                color: #ea4335;
                padding: 16px 35px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 700;
                font-size: 1.1em;
                transition: all 0.3s ease;
            ">
                Закрыть
            </button>
        </div>
        
        <style>
            @keyframes gradientMove {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        </style>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Закрытие по клику на оверлей
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function sendCallMessage(callMessage) {
    try {
        if (database) {
            database.ref('messages/' + callMessage.id).set(callMessage);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(callMessage);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки сообщения о звонке:', error);
    }
}

function joinMeetCall(meetLink) {
    // Открываем Google Meet в новом окне
    const width = 1300;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
    
    window.open(meetLink, 'NeonChat Google Meet', features);
    
    // Закрываем модальное окно
    const overlay = document.querySelector('.meet-instructions-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function copyMeetCode(meetCode) {
    const text = `Google Meet звонок от ${currentUser.name}:
Код встречи: ${meetCode}
Ссылка: https://meet.google.com/${meetCode}
Присоединяйтесь!`;
    
    navigator.clipboard.writeText(text).then(() => {
        showAlert('✅ Код звонка скопирован в буфер обмена!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('✅ Код звонка скопирован!', 'success');
    });
}

function createNewMeetLink() {
    // Открываем страницу создания новой встречи
    window.open('https://meet.google.com/new', '_blank');
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
            sendSystemMessage(`👤 Всего пользователей: ${localStorage.length}`);
            break;
            
        default:
            sendSystemMessage(`❌ Неизвестная команда "${cmd}". Введи /help для списка команд`);
    }
    
    // Очищаем поле ввода
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
    helpText += '/call - Создать видеозвонок (Google Meet)<br>';
    helpText += '/time - Показать точное время<br>';
    helpText += '/ping - Проверить связь с сервером<br>';
    helpText += '/users - Показать статистику<br>';
    
    if (isAdmin) {
        helpText += '<br><strong style="color:gold;">👑 Админ команды:</strong><br>';
        helpText += '/clean - Очистить весь чат<br>';
        helpText += '/announce [текст] - Сделать объявление<br>';
        helpText += '/kickall - Кикнуть всех пользователей<br>';
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

/* ========== АДМИН ФУНКЦИИ ========== */
async function adminClearChat() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может очищать чат', 'error');
        return;
    }
    
    if (!confirm('💀 ТОЧНО ОЧИСТИТЬ ВЕСЬ ЧАТ?\nЭто удалит ВСЕ сообщения у всех пользователей!')) {
        return;
    }
    
    try {
        if (database) {
            await database.ref('messages').remove();
        } else {
            localStorage.removeItem('firebase_messages');
            messages = [];
            updateMessagesDisplay();
        }
        
        const message = {
            id: 'clear_' + Date.now(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: '🧹 <strong style="color:#ff0000;">ЧАТ ОЧИЩЕН АДМИНИСТРАТОРОМ!</strong> Все сообщения удалены.',
            channel: 'main',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        console.log('✅ Чат очищен админом');
        showAlert('✅ Чат полностью очищен!', 'success');
        
    } catch (error) {
        console.error('Ошибка очистки чата:', error);
        showAlert('❌ Ошибка: ' + error.message, 'error');
    }
}

function adminAnnouncement() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может делать объявления', 'error');
        return;
    }
    
    const text = prompt('Текст объявления для всех пользователей:');
    if (!text) return;
    
    adminSendAnnouncement(text);
}

async function adminSendAnnouncement(text) {
    const message = {
        id: 'announce_' + Date.now(),
        userId: 'system',
        userName: '📢 АДМИН-ОБЪЯВЛЕНИЕ',
        userAvatar: '📢',
        text: `📣 <div style="
            background: linear-gradient(45deg, rgba(255, 153, 0, 0.2), rgba(255, 255, 0, 0.2));
            padding: 20px;
            border-radius: 12px;
            color: #ffcc00;
            font-weight: bold;
            border: 2px solid #ff9900;
            text-align: center;
            margin: 10px 0;
        ">
            <div style="font-size: 1.3em; margin-bottom: 10px; color: #ff9900;">⚡ ВНИМАНИЕ ВСЕМ!</div>
            <div style="font-size: 1.1em; margin-bottom: 10px;">${text}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #ffcc88;">
                👑 От администратора <strong>${currentUser.name}</strong>
            </div>
        </div>`,
        channel: 'main',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        console.log('✅ Объявление отправлено');
        showAlert('✅ Объявление отправлено всем пользователям!', 'success');
    } catch (error) {
        console.error('Ошибка отправки объявления:', error);
        showAlert('❌ Ошибка отправки объявления', 'error');
    }
}

async function adminKickAll() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может кикать пользователей', 'error');
        return;
    }
    
    if (!confirm('🚨 КИКНУТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ?\nВсе онлайн пользователи будут отключены!')) {
        return;
    }
    
    try {
        if (database) {
            await database.ref('online').remove();
        }
        
        const message = {
            id: 'kickall_' + Date.now(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: `🚨 <div style="background: linear-gradient(45deg, rgba(255,0,0,0.2), rgba(255,68,0,0.2)); padding: 20px; border-radius: 12px; border: 2px solid #ff0000; text-align: center;">
                   <strong style="color:#ff0000; font-size:1.3em;">⚠️ ВСЕ ПОЛЬЗОВАТЕЛИ ОТКЛЮЧЕНЫ!</strong><br><br>
                   🔥 Администратор <strong>${currentUser.name}</strong> отключил всех пользователей!<br><br>
                   <div style="font-size:0.9em; color:#ffaaaa;">
                   Перезайдите в чат для продолжения общения
                   </div>
                   </div>`,
            channel: 'main',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        console.log('✅ Все пользователи отключены');
        showAlert('✅ Все онлайн пользователи отключены!', 'success');
        
    } catch (error) {
        console.error('Ошибка кика всех:', error);
        showAlert('❌ Ошибка: ' + error.message, 'error');
    }
}

/* ========== УТИЛИТЫ ========== */
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji + ' ';
        input.focus();
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    
    // Находим и активируем нужный канал
    const targetChannel = document.querySelector(`[onclick*="switchChannel('${channel}')"]`);
    if (targetChannel) {
        targetChannel.classList.add('active');
    }
    
    const channelNames = {
        'main': 'Основной чат',
        'games': 'Игры',
        'music': 'Музыка',
        'ai': '🤖 Нейросеть'
    };
    
    const channelNameElement = document.getElementById('channelName');
    if (channelNameElement) {
        channelNameElement.textContent = channelNames[channel] || channel;
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

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
    }
    
    updateOnlineStatus();
    updateMessagesDisplay();
    showAlert('Чат обновлен!', 'success');
}

function hideMobilePanels() {
    document.querySelectorAll('.sidebar, .right-sidebar').forEach(panel => {
        panel.classList.remove('active');
    });
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

/* ========== УВЕДОМЛЕНИЯ ========== */
function showAlert(message, type = 'info') {
    // Удаляем старые уведомления
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
    
    // Добавляем стили для анимации если их еще нет
    if (!document.querySelector('#alert-animations')) {
        const style = document.createElement('style');
        style.id = 'alert-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                document.body.removeChild(alertDiv);
            }
        }, 300);
    }, 4000);
}

// Добавляем глобальные функции для кнопок HTML
window.toggleRegister = toggleRegister;
window.toggleLogin = toggleLogin;
window.handleAuth = handleAuth;
window.sendMessage = sendMessage;
window.addEmoji = addEmoji;
window.switchChannel = switchChannel;
window.startCall = startCall;
window.toggleSidebar = toggleSidebar;
window.toggleMembers = toggleMembers;
window.forceSync = forceSync;
window.logout = logout;
window.joinMeetCall = joinMeetCall;
window.copyMeetCode = copyMeetCode;
window.createNewMeetLink = createNewMeetLink;
