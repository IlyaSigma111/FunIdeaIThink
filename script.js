// ==================== КОНФИГУРАЦИЯ ====================
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

// Админ аккаунт (ник: ArturPirozhkov, пароль: JojoTop1)
const ADMIN_USERNAME = "ArturPirozhkov";
const ADMIN_PASSWORD = "JojoTop1";

// Глобальные переменные
let isRegisterMode = false;
let telegramEnabled = true; // Всегда включено
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = function() {
    console.log('🚀 NeonChat запущен');
    
    // Инициализация Firebase
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            console.log('✅ Firebase подключен');
        } catch (e) {
            database = firebase.database();
        }
    }
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            
            // Автозаполняем поле логина
            const usernameInput = document.getElementById('username');
            if (usernameInput && currentUser.name) {
                usernameInput.value = currentUser.name;
                document.getElementById('password').focus();
            }
            
            console.log('Найден сохраненный пользователь:', currentUser.name);
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

// ==================== АВТОРИЗАЦИЯ ====================
function toggleRegister() {
    isRegisterMode = true;
    document.getElementById('confirmPasswordGroup').style.display = 'flex';
    document.getElementById('authButton').innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    document.getElementById('registerToggleBtn').style.display = 'none';
    document.getElementById('loginHint').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('password').focus();
    }, 100);
}

function toggleLogin() {
    isRegisterMode = false;
    document.getElementById('confirmPasswordGroup').style.display = 'none';
    document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
    document.getElementById('registerToggleBtn').style.display = 'block';
    document.getElementById('loginHint').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('username').focus();
    }, 100);
}

function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = document.getElementById('authButton');
    
    if (!username) {
        alert('Введи никнейм!');
        document.getElementById('username').focus();
        return;
    }
    
    // Блокируем кнопку
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + 
                      (isRegisterMode ? 'Регистрируем...' : 'Входим...');
    
    if (isRegisterMode) {
        // Регистрация
        if (!password) {
            alert('Придумай пароль!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('password').focus();
            return;
        }
        
        if (password.length < 4) {
            alert('Пароль должен быть минимум 4 символа!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('password').focus();
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('confirmPassword').focus();
            document.getElementById('confirmPassword').value = '';
            return;
        }
        
        // Проверяем, не занят ли ник
        if (localStorage.getItem('neonchat_user_' + username.toLowerCase())) {
            alert('Этот ник уже занят! Выбери другой.');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('username').focus();
            document.getElementById('username').select();
            return;
        }
        
        // Регистрируем
        registerUser(username, password);
        
    } else {
        // Вход
        if (!password) {
            alert('Введи пароль!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            document.getElementById('password').focus();
            return;
        }
        
        // Проверяем админ аккаунт
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('👑 Вход как администратор');
            isAdmin = true;
            createAdminUser();
            return;
        }
        
        // Обычный вход
        loginUser(username, password);
    }
}

function registerUser(username, password) {
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
    showChatInterface();
}

function loginUser(username, password) {
    const userData = localStorage.getItem('neonchat_user_' + username.toLowerCase());
    
    if (!userData) {
        document.getElementById('authButton').disabled = false;
        document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        alert('Пользователь не найден! Зарегистрируйся сначала.');
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
            document.getElementById('authButton').disabled = false;
            document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            alert('Неверный пароль!');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
            return;
        }
        
        myUserId = user.id;
        currentUser = user;
        isAdmin = user.isAdmin || false;
        
        localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
        
        console.log('✅ Успешный вход:', username);
        showChatInterface();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        document.getElementById('authButton').disabled = false;
        document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        alert('Ошибка входа. Попробуй снова.');
    }
}

function createAdminUser() {
    myUserId = 'admin_' + ADMIN_USERNAME;
    
    currentUser = {
        id: myUserId,
        name: ADMIN_USERNAME,
        avatar: '👑',
        isAdmin: true,
        isSpecialAdmin: true // Флаг специального админа
    };
    
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ Вход как администратор');
    showChatInterface();
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// ==================== ОТОБРАЖЕНИЕ ЧАТА ====================
function showChatInterface() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    
    // Обновляем UI
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    // Если админ - меняем стили
    if (isAdmin) {
        document.getElementById('userAvatar').classList.add('admin-avatar');
        document.getElementById('currentUserName').classList.add('admin-name');
        document.getElementById('currentUserName').innerHTML = currentUser.name + ' <span style="color:gold; font-size:0.8em;">👑</span>';
        
        // Показываем админ-панель
        document.getElementById('adminPanel').style.display = 'block';
    }
    
    // Фокус на поле ввода
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 300);
    
    initFirebase();
}

function initFirebase() {
    if (!database) {
        console.error('Firebase не инициализирован');
        return;
    }
    
    // Мониторинг подключения
    database.ref('.info/connected').on('value', (snap) => {
        const isConnected = snap.val() === true;
        document.getElementById('connectionStatus').textContent = isConnected ? '✓' : '✗';
        document.getElementById('connectionStatus').style.color = isConnected ? '#00ff80' : '#ff6666';
        
        if (isConnected) {
            updateOnlineStatus();
            monitorOnlineUsers();
            
            onlineTimeout = setInterval(() => {
                updateOnlineStatus();
            }, 5000);
        } else if (onlineTimeout) {
            clearInterval(onlineTimeout);
        }
    });
    
    // Загрузка сообщений
    database.ref('messages').on('value', (snapshot) => {
        const data = snapshot.val();
        messages = data ? Object.values(data) : [];
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        updateMessagesDisplay();
        document.getElementById('messageCount').textContent = messages.length;
    });
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    document.getElementById('currentTime').textContent = timeStr;
}

// ==================== СИСТЕМА ОНЛАЙН ====================
function updateOnlineStatus() {
    if (!database || !currentUser || !myUserId) return;
    
    const userRef = database.ref('online/' + myUserId);
    userRef.set({
        id: myUserId,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isAdmin: isAdmin,
        lastSeen: Date.now()
    });
    
    userRef.onDisconnect().remove();
}

function monitorOnlineUsers() {
    if (!database) return;
    
    database.ref('online').on('value', (snapshot) => {
        const data = snapshot.val();
        onlineUsers.clear();
        
        if (data) {
            const now = Date.now();
            const tenSecondsAgo = now - 10000;
            
            Object.entries(data).forEach(([userId, user]) => {
                if (user.lastSeen > tenSecondsAgo) {
                    onlineUsers.set(userId, user);
                } else {
                    database.ref('online/' + userId).remove();
                }
            });
        }
        
        updateOnlineDisplay();
    });
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
                <span style="color: #00ff80;">(Вы)</span>
                ${isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                <div class="online-dot"></div>
            </div>
        `;
        container.appendChild(userDiv);
    }
    
    // Добавляем остальных
    onlineUsers.forEach((user, userId) => {
        if (userId === myUserId) return;
        
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
    onlineCount.textContent = totalOnline;
    onlineCount2.textContent = totalOnline;
    
    if (totalOnline === 1) {
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

// ==================== СООБЩЕНИЯ ====================
function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
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
        const isAdminMsg = msg.isAdmin || msg.userId.includes('admin');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''}`;
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user ${isAdminMsg ? 'admin' : ''}">
                    ${msg.userAvatar || ''} ${msg.userName}
                    ${isAdminMsg ? '👑' : ''}
                </span>
                <span class="message-time">${msg.time}</span>
            </div>
            <div class="message-content">${msg.text}</div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) {
        input.focus();
        return;
    }
    
    if (!currentUser) {
        alert('Сначала войди в чат!');
        return;
    }
    
    if (!database) {
        alert('Нет подключения к базе данных');
        return;
    }
    
    // Проверка на команды
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        input.focus();
        return;
    }
    
    const message = {
        id: Date.now().toString(),
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
        await database.ref('messages/' + message.id).set(message);
        updateOnlineStatus();
        input.value = '';
        input.focus();
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert('❌ Ошибка отправки сообщения');
    }
}

// ==================== КОМАНДЫ ====================
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
            
        default:
            sendSystemMessage(`❌ Неизвестная команда. Введи /help для списка команд`);
    }
}

function showHelp() {
    let helpText = '📋 <strong>Доступные команды:</strong><br>';
    helpText += '<div style="margin-left: 15px; font-size: 0.9em;">';
    helpText += '/help - Показать это сообщение<br>';
    helpText += '/online - Показать кто онлайн<br>';
    helpText += '/me [действие] - Отправить действие<br>';
    
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
    if (!database) return;
    
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    database.ref('messages/' + message.id).set(message);
}

function sendActionMessage(action) {
    if (!database || !currentUser) return;
    
    const message = {
        id: Date.now().toString(),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: `<i style="color: #88aaff;">* ${currentUser.name} ${action}</i>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAction: true
    };
    
    database.ref('messages/' + message.id).set(message);
}

// ==================== АДМИН ФУНКЦИИ ====================
async function adminClearChat() {
    if (!isAdmin) {
        alert('❌ Только администратор может очищать чат');
        return;
    }
    
    if (!confirm('💀 ТОЧНО ОЧИСТИТЬ ВЕСЬ ЧАТ?\nЭто удалит ВСЕ сообщения у всех пользователей!')) {
        return;
    }
    
    if (!database) {
        alert('❌ Нет подключения к Firebase');
        return;
    }
    
    try {
        await database.ref('messages').remove();
        
        const message = {
            id: Date.now().toString(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: '🧹 <strong style="color:#ff0000;">ЧАТ ОЧИЩЕН АДМИНИСТРАТОРОМ!</strong> Все сообщения удалены.',
            channel: 'main',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        await database.ref('messages/' + message.id).set(message);
        
        console.log('✅ Чат очищен админом');
        alert('✅ Чат полностью очищен!');
        
    } catch (error) {
        console.error('Ошибка очистки чата:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

function adminAnnouncement() {
    if (!isAdmin) {
        alert('❌ Только администратор может делать объявления');
        return;
    }
    
    const text = prompt('Текст объявления для всех пользователей:');
    if (!text) return;
    
    adminSendAnnouncement(text);
}

async function adminSendAnnouncement(text) {
    if (!database) return;
    
    const message = {
        id: Date.now().toString(),
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
    
    await database.ref('messages/' + message.id).set(message);
    console.log('✅ Объявление отправлено');
    alert('✅ Объявление отправлено всем пользователям!');
}

async function adminKickAll() {
    if (!isAdmin) {
        alert('❌ Только администратор может кикать пользователей');
        return;
    }
    
    if (!confirm('🚨 КИКНУТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ?\nВсе онлайн пользователи будут отключены!')) {
        return;
    }
    
    if (!database) {
        alert('❌ Нет подключения к Firebase');
        return;
    }
    
    try {
        await database.ref('online').remove();
        
        const message = {
            id: Date.now().toString(),
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
        
        await database.ref('messages/' + message.id).set(message);
        
        console.log('✅ Все пользователи отключены');
        alert('✅ Все онлайн пользователи отключены!');
        
    } catch (error) {
        console.error('Ошибка кика всех:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

// ==================== УТИЛИТЫ ====================
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    event.target.closest('.channel').classList.add('active');
    
    const channelNames = {
        'main': 'Основной чат',
        'games': 'Игры',
        'music': 'Музыка',
        'memes': 'Мемы'
    };
    
    document.getElementById('channelName').textContent = channelNames[channel] || channel;
    updateMessagesDisplay();
    hideMobilePanels();
}

function startCall() {
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    if (database && currentUser) {
        const message = {
            id: Date.now().toString(),
            userId: 'system',
            userName: '📞',
            userAvatar: '📞',
            text: `📞 <b>Создан видеозвонок</b><br>
                   <a href="${jitsiUrl}" target="_blank" style="
                       display: inline-block;
                       background: linear-gradient(135deg, #ff3366, #ff9966);
                       color: white;
                       padding: 10px 20px;
                       border-radius: 10px;
                       text-decoration: none;
                       font-weight: 600;
                       margin-top: 10px;
                       border: 1px solid rgba(255,255,255,0.2);
                   ">
                       Присоединиться
                   </a>`,
            channel: currentChannel,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        database.ref('messages/' + message.id).set(message);
    }
    
    window.open(jitsiUrl, '_blank');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.right-sidebar').classList.remove('active');
}

function toggleMembers() {
    document.querySelector('.right-sidebar').classList.toggle('active');
    document.querySelector('.sidebar').classList.remove('active');
}

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(180deg)';
    setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
    
    updateOnlineStatus();
    updateMessagesDisplay();
}

function hideMobilePanels() {
    document.querySelectorAll('.sidebar, .right-sidebar').forEach(panel => {
        panel.classList.remove('active');
    });
}

function logout() {
    if (confirm('Выйти из чата?')) {
        if (database && myUserId) {
            database.ref('online/' + myUserId).remove();
        }
        
        if (onlineTimeout) clearInterval(onlineTimeout);
        
        localStorage.removeItem('neonchat_current_user');
        location.reload();
    }
}

// Обработка Enter для отправки
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
