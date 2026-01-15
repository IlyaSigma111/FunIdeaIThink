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

let isRegisterMode = false;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;
let messageSendLock = false;
let lastMessageTime = 0;

/* ========== ИНИЦИАЛИЗАЦИЯ ========== */
window.onload = function() {
    console.log('🚀 NeonChat запущен');
    
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
    
    // Автофокус
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) input.focus();
    }, 500);
    
    // Обновление времени
    updateTime();
    setInterval(updateTime, 60000);
};

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
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''}`;
        
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
        isAdmin: isAdmin
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

/* ========== ВИДЕОЗВОНКИ ========== */
function startCall() {
    console.log('📞 Кнопка звонка нажата!');
    
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Создаем модальное окно для выбора платформы
    createCallModal();
}

function createCallModal() {
    // Удаляем старые модалки
    const oldModal = document.querySelector('.call-modal-overlay');
    if (oldModal) oldModal.remove();
    
    // Создаем оверлей
    const overlay = document.createElement('div');
    overlay.className = 'call-modal-overlay';
    
    // Создаем контент модалки
    const modalContent = document.createElement('div');
    modalContent.className = 'call-modal-content';
    
    modalContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 15px; background: rgba(0,200,255,0.1); padding: 15px 30px; border-radius: 50px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #0066ff, #00ccff); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; color: white; box-shadow: 0 8px 25px rgba(0,200,255,0.5);">
                    <i class="fas fa-video"></i>
                </div>
                <div style="text-align: left;">
                    <h2 style="color: #00ccff; margin: 0; font-size: 2em; font-weight: 800;">Видеозвонок</h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Выберите платформу</p>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <!-- Discord -->
            <div class="call-platform-card" onclick="createDiscordCall()">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="background: #5865F2; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8em; color: white; box-shadow: 0 6px 20px rgba(88,101,242,0.4);">
                        <i class="fab fa-discord"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.3em; font-weight: 700; color: white; margin-bottom: 5px;">Discord</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">Лучший вариант</div>
                    </div>
                    <div style="color: #00ffaa; font-weight: 700; font-size: 1.1em;">РЕКОМЕНДУЕМ</div>
                </div>
                <div style="color: rgba(255,255,255,0.9); margin-bottom: 20px; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>До 50 участников бесплатно</span></div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Отличное качество</span></div>
                    <div style="display: flex; align-items: center; gap: 10px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Экран, звук, видео</span></div>
                </div>
                <div style="background: rgba(88,101,242,0.3); color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1.1em; margin-top: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    Создать Discord звонок
                </div>
            </div>
            
            <!-- Google Meet -->
            <div class="call-platform-card call-platform-card-google" onclick="createGoogleMeetCall()">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #4285f4, #34a853); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8em; color: white; box-shadow: 0 6px 20px rgba(66,133,244,0.4);">
                        <i class="fab fa-google"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.3em; font-weight: 700; color: white; margin-bottom: 5px;">Google Meet</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">Просто и надежно</div>
                    </div>
                </div>
                <div style="color: rgba(255,255,255,0.9); margin-bottom: 20px; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>До 100 участников</span></div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>60 минут бесплатно</span></div>
                    <div style="display: flex; align-items: center; gap: 10px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Работает в браузере</span></div>
                </div>
                <div style="background: linear-gradient(135deg, rgba(66,133,244,0.3), rgba(52,168,83,0.3)); color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1.1em; margin-top: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    Создать Google Meet
                </div>
            </div>
            
            <!-- Zoom -->
            <div class="call-platform-card call-platform-card-zoom" onclick="createZoomCall()">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #2d8cff, #0066ff); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8em; color: white; box-shadow: 0 6px 20px rgba(45,140,255,0.4);">
                        <i class="fas fa-video"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.3em; font-weight: 700; color: white; margin-bottom: 5px;">Zoom</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">Популярный вариант</div>
                    </div>
                </div>
                <div style="color: rgba(255,255,255,0.9); margin-bottom: 20px; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>40 минут бесплатно</span></div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>До 100 участников</span></div>
                    <div style="display: flex; align-items: center; gap: 10px;"><i class="fas fa-exclamation-triangle" style="color: #ffaa00;"></i><span>Нужно установить приложение</span></div>
                </div>
                <div style="background: linear-gradient(135deg, rgba(45,140,255,0.3), rgba(0,102,255,0.3)); color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1.1em; margin-top: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    Создать Zoom
                </div>
            </div>
            
            <!-- Своя ссылка -->
            <div class="call-platform-card call-platform-card-custom" onclick="createCustomCall()">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #ff3366, #ff9966); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8em; color: white; box-shadow: 0 6px 20px rgba(255,51,102,0.4);">
                        <i class="fas fa-link"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.3em; font-weight: 700; color: white; margin-bottom: 5px;">Своя ссылка</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">Любая платформа</div>
                    </div>
                </div>
                <div style="color: rgba(255,255,255,0.9); margin-bottom: 20px; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Любая платформа</span></div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Без ограничений</span></div>
                    <div style="display: flex; align-items: center; gap: 10px;"><i class="fas fa-check" style="color: #00ffaa;"></i><span>Создать ссылку вручную</span></div>
                </div>
                <div style="background: linear-gradient(135deg, rgba(255,51,102,0.3), rgba(255,153,102,0.3)); color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1.1em; margin-top: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    Создать свою ссылку
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button id="closeCallModal" style="background: rgba(255,60,60,0.2); border: 2px solid rgba(255,100,100,0.6); color: #ff6666; padding: 14px 40px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 1.1em; transition: all 0.3s ease;">Отмена</button>
        </div>
    `;
    
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
    
    // Добавляем обработчик закрытия
    setTimeout(() => {
        const closeBtn = document.getElementById('closeCallModal');
        if (closeBtn) {
            closeBtn.onclick = function() {
                overlay.remove();
            };
        }
        
        // Закрытие по клику на оверлей
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }, 100);
}

function hideCallModal() {
    const modal = document.querySelector('.call-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function createDiscordCall() {
    hideCallModal();
    
    const discordInvite = "https://discord.gg/neonchat";
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(88,101,242,0.15), rgba(88,101,242,0.25)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(88,101,242,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: #5865F2; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(88,101,242,0.5);">
                    <i class="fab fa-discord"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🎮 DISCORD ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #fbbc05; font-weight: 700; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-graduation-cap"></i> Как присоединиться:
                </div>
                
                <div style="color: rgba(255,255,255,0.9); line-height: 1.6; margin-bottom: 20px;">
                    1. <strong>Нажмите на ссылку ниже</strong><br>
                    2. Присоединитесь к серверу NeonChat<br>
                    3. Создайте голосовой канал в сервере<br>
                    4. Пригласите друзей в свой канал
                </div>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
                    <a href="${discordInvite}" target="_blank" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #5865F2, #7289DA); color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(88,101,242,0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        <i class="fab fa-discord"></i>
                        Присоединиться к серверу
                    </a>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Discord');
    showAlert('✅ Инструкция по Discord отправлена в чат!', 'success');
}

function createGoogleMeetCall() {
    hideCallModal();
    
    const meetCode = generateRealMeetCode();
    const meetLink = `https://meet.google.com/${meetCode}`;
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(66,133,244,0.15), rgba(52,168,83,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(66,133,244,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #4285f4, #34a853); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(66,133,244,0.5);">
                    <i class="fab fa-google"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">📞 GOOGLE MEET ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #fbbc05; font-weight: 700; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-graduation-cap"></i> Инструкция:
                </div>
                
                <!-- Код встречи -->
                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin: 15px 0; text-align: center;">
                    <div style="color: #00ffaa; font-weight: 700; margin-bottom: 10px;">Код встречи:</div>
                    <div style="background: rgba(66,133,244,0.2); padding: 12px; border-radius: 8px; font-family: monospace; font-weight: 800; color: white; font-size: 1.3em; letter-spacing: 2px; margin-bottom: 15px; border: 1px solid rgba(66,133,244,0.5);">
                        ${meetCode}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${meetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4285f4, #34a853); color: white; padding: 16px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.2em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(66,133,244,0.4); transition: all 0.3s ease;">
                        <i class="fas fa-video"></i> Присоединиться к звонку
                    </a>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Google Meet');
    showAlert('✅ Ссылка на Google Meet отправлена в чат!', 'success');
}

function createZoomCall() {
    hideCallModal();
    
    const zoomLink = "https://zoom.us/meeting#/create";
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(45,140,255,0.15), rgba(0,102,255,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(45,140,255,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #2d8cff, #0066ff); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(45,140,255,0.5);">
                    <i class="fas fa-video"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🎥 ZOOM ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <div style="color: #ffaa00; font-weight: 700; margin-bottom: 15px; font-size: 1.1em;">
                    <i class="fas fa-exclamation-triangle"></i> Для использования Zoom необходимо:
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px;">
                    <a href="https://zoom.us/download" target="_blank" style="background: linear-gradient(135deg, #2d8cff, #0066ff); color: white; padding: 14px 25px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 6px 20px rgba(45,140,255,0.4); transition: all 0.3s ease; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-download"></i>
                        Скачать Zoom
                    </a>
                </div>
                
                <a href="${zoomLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2d8cff, #0066ff); color: white; padding: 16px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(45,140,255,0.4); transition: all 0.3s ease; margin-top: 15px;">
                    <i class="fas fa-plus-circle"></i> Создать Zoom встречу
                </a>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Zoom');
}

function createCustomCall() {
    hideCallModal();
    
    const customLink = prompt('Введите ссылку на ваш видеозвонок (Discord, Zoom, Google Meet и т.д.):');
    
    if (!customLink) {
        showAlert('❌ Ссылка не была введена', 'error');
        return;
    }
    
    if (!customLink.startsWith('http://') && !customLink.startsWith('https://')) {
        showAlert('❌ Введите корректную ссылку (начинается с http:// или https://)', 'error');
        return;
    }
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(255,51,102,0.15), rgba(255,153,102,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(255,51,102,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #ff3366, #ff9966); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(255,51,102,0.5);">
                    <i class="fas fa-link"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🔗 ССЫЛКА НА ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #00ccff; font-weight: 700; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-external-link-alt"></i> Ссылка на видеозвонок:
                </div>
                
                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin: 15px 0; word-break: break-all; font-family: monospace; color: #00ffaa; font-size: 1.1em; border: 1px solid rgba(0,200,255,0.3);">
                    ${customLink}
                </div>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
                    <a href="${customLink}" target="_blank" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #ff3366, #ff9966); color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(255,51,102,0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        <i class="fas fa-video"></i>
                        Присоединиться
                    </a>
                    
                    <button onclick="copyToClipboard('${customLink}')" style="flex: 1; min-width: 150px; background: rgba(0,200,255,0.2); border: 2px solid rgba(0,200,255,0.5); color: #00ccff; text-align: center; padding: 16px; border-radius: 12px; font-weight: 800; font-size: 1em; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-copy"></i>
                        Копировать
                    </button>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Пользовательская ссылка');
    showAlert('✅ Ссылка на звонок отправлена в чат!', 'success');
}

function generateRealMeetCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    for (let i = 0; i < 11; i++) {
        if (i === 3 || i === 7) {
            code += '-';
        } else {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return code;
}

function sendCallMessage(messageText, platform) {
    const message = {
        id: 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '📞 Система звонков',
        userAvatar: '📞',
        text: messageText,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isCall: true,
        platform: platform
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
        console.error('Ошибка отправки сообщения о звонке:', error);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('✅ Ссылка скопирована в буфер обмена!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('✅ Ссылка скопирована!', 'success');
    });
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
    helpText += '/call - Создать видеозвонок (выбор платформы)<br>';
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
        text: `📣 <div style="background: linear-gradient(45deg, rgba(255,153,0,0.2), rgba(255,255,0,0.2)); padding: 20px; border-radius: 12px; color: #ffcc00; font-weight: bold; border: 2px solid #ff9900; text-align: center; margin: 10px 0;">
            <div style="font-size: 1.3em; margin-bottom: 10px; color: #ff9900;">⚡ ВНИМАНИЕ ВСЕМ!</div>
            <div style="font-size: 1.1em; margin-bottom: 10px;">${text}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #ffcc88;">👑 От администратора <strong>${currentUser.name}</strong></div>
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
                   <div style="font-size:0.9em; color:#ffaaaa;">Перезайдите в чат для продолжения общения</div>
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

// Глобальные функции
window.toggleRegister = toggleRegister;
window.toggleLogin = toggleLogin;
window.handleAuth = handleAuth;
window.sendMessage = sendMessage;
window.addEmoji = addEmoji;
window.switchChannel = switchChannel;
window.startCall = startCall;
window.hideCallModal = hideCallModal;
window.createDiscordCall = createDiscordCall;
window.createGoogleMeetCall = createGoogleMeetCall;
window.createZoomCall = createZoomCall;
window.createCustomCall = createCustomCall;
window.toggleSidebar = toggleSidebar;
window.toggleMembers = toggleMembers;
window.forceSync = forceSync;
window.logout = logout;
window.copyToClipboard = copyToClipboard;
