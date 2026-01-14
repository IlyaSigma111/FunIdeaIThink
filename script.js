// ==================== FIREBASE КОНФИГ ====================
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

// АДМИН
const ADMIN_USERNAME = "ArturPirozhkov";
const ADMIN_PASSWORD = "JojoTop1";

// Яндекс Телемост
const TELEMOST_BASE_URL = "https://telemost.yandex.ru";

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let isRegisterMode = false;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let isAdmin = false;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = function() {
    console.log('🚀 NeonChat ЗАПУЩЕН!');
    
    // FIREBASE
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            console.log('✅ Firebase подключен');
        } else {
            console.error('Firebase SDK не загружен!');
            alert('❌ Firebase SDK не загружен! Обнови страницу!');
        }
    } catch (e) {
        console.error('Ошибка Firebase:', e);
        alert('❌ Ошибка Firebase: ' + e.message);
    }
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.value = currentUser.name || '';
                document.getElementById('password').focus();
            }
            
            console.log('Найден пользователь:', currentUser.name);
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }
    
    // Автофокус на логин
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) {
            input.focus();
            input.select();
        }
    }, 500);
    
    // Настройка Enter
    setupEventListeners();
};

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('password').focus();
            }
        });
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAuth();
            }
        });
    }
}

// ==================== АВТОРИЗАЦИЯ (ИСПРАВЛЕНА) ====================
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
    
    // УБИРАЕМ ДИЗЕЙБЛ С КНОПКИ
    button.disabled = false;
    
    if (isRegisterMode) {
        // РЕГИСТРАЦИЯ
        if (!password) {
            alert('Придумай пароль!');
            document.getElementById('password').focus();
            return;
        }
        
        if (password.length < 4) {
            alert('Пароль должен быть минимум 4 символа!');
            document.getElementById('password').focus();
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают!');
            document.getElementById('confirmPassword').focus();
            document.getElementById('confirmPassword').value = '';
            return;
        }
        
        if (localStorage.getItem('neonchat_user_' + username.toLowerCase())) {
            alert('Этот ник уже занят!');
            document.getElementById('username').focus();
            document.getElementById('username').select();
            return;
        }
        
        // Блокируем кнопку только сейчас
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрируем...';
        
        // Запускаем регистрацию
        setTimeout(() => {
            registerUser(username, password);
        }, 100);
        
    } else {
        // ВХОД
        if (!password) {
            alert('Введи пароль!');
            document.getElementById('password').focus();
            return;
        }
        
        // Проверяем админ аккаунт
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('👑 Вход как админ');
            isAdmin = true;
            
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Входим...';
            
            setTimeout(() => {
                createAdminUser();
            }, 100);
            return;
        }
        
        // Блокируем кнопку
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Входим...';
        
        // Запускаем вход
        setTimeout(() => {
            loginUser(username, password);
        }, 100);
    }
}

function registerUser(username, password) {
    myUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const avatars = ['😎', '🐱', '🚀', '🦊', '🐯', '🦁', '🐼', '🐨', '👽', '🤖'];
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
        isSpecialAdmin: true
    };
    
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ Вход как админ');
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

// ==================== ПОКАЗ ЧАТА ====================
function showChatInterface() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    if (isAdmin) {
        document.getElementById('userAvatar').classList.add('admin-avatar');
        document.getElementById('currentUserName').classList.add('admin-name');
        document.getElementById('currentUserName').innerHTML = currentUser.name + ' <span style="color:gold; font-size:0.8em;">👑</span>';
        document.getElementById('adminPanel').style.display = 'block';
    }
    
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = "Напиши сообщение...";
            messageInput.focus();
        }
    }, 300);
    
    initFirebase();
}

function initFirebase() {
    if (!database) {
        alert('❌ Firebase не работает!');
        return;
    }
    
    // Проверка подключения
    database.ref('.info/connected').on('value', (snap) => {
        const isConnected = snap.val() === true;
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = isConnected ? '✓' : '✗';
            statusEl.style.color = isConnected ? '#00ff80' : '#ff6666';
        }
        
        if (isConnected) {
            console.log('✅ Подключено к Firebase');
            updateOnlineStatus();
            monitorOnlineUsers();
            loadMessages();
        } else {
            console.log('❌ Отключено от Firebase');
        }
    });
}

function loadMessages() {
    if (!database) return;
    
    database.ref('messages').on('value', (snapshot) => {
        const data = snapshot.val();
        messages = data ? Object.values(data) : [];
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        updateMessagesDisplay();
        document.getElementById('messageCount').textContent = messages.length;
    });
}

// ==================== ОНЛАЙН СИСТЕМА ====================
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
    if (onlineCount) onlineCount.textContent = totalOnline;
    if (onlineCount2) onlineCount2.textContent = totalOnline;
    
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
        displayMessage(msg);
    });
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function displayMessage(msg) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const isOwn = currentUser && msg.userId === currentUser.id;
    const isSystem = msg.userId === 'system';
    const isAdminMsg = msg.isAdmin || msg.userId.includes('admin');
    const isAI = msg.isAI || msg.userId.includes('ai');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''} ${isAI ? 'ai' : ''}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user ${isAdminMsg ? 'admin' : ''} ${isAI ? 'ai' : ''}">
                ${msg.userAvatar || ''} ${msg.userName}
                ${isAdminMsg ? '👑' : ''}
            </span>
            <span class="message-time">${msg.time}</span>
        </div>
        <div class="message-content">${msg.text}</div>
    `;
    
    container.appendChild(messageDiv);
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
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
        alert('Нет подключения к базе данных!');
        return;
    }
    
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        input.focus();
        return;
    }
    
    if (currentChannel === 'ai') {
        await handleAIChat(text);
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

// ==================== ЯНДЕКС ТЕЛЕМОСТ ====================
function startCall() {
    if (!currentUser) {
        alert('❌ Сначала войди в чат!');
        return;
    }
    
    if (!navigator.onLine) {
        alert('❌ Нет подключения к интернету!');
        return;
    }
    
    const meetingId = generateMeetingId();
    const telemostUrl = `${TELEMOST_BASE_URL}/${meetingId}`;
    
    const callMessage = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '🎥 Яндекс Телемост',
        userAvatar: '🎥',
        text: `📞 <div style="
            background: linear-gradient(135deg, rgba(255, 0, 128, 0.2), rgba(255, 102, 0, 0.2));
            padding: 20px;
            border-radius: 15px;
            border: 2px solid rgba(255, 0, 128, 0.3);
            margin: 10px 0;
            text-align: center;
        ">
            <div style="color: #ff0080; font-size: 1.4em; font-weight: bold; margin-bottom: 15px;">
                <i class="fas fa-video"></i> СОЗДАН ВИДЕОЗВОНОК
            </div>
            
            <a href="${telemostUrl}" target="_blank" style="
                display: inline-block;
                background: linear-gradient(135deg, #ff0080, #ff5500);
                color: white;
                padding: 15px 30px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1em;
                margin: 15px 0;
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 0 20px rgba(255, 0, 128, 0.4);
                cursor: pointer;
                transition: all 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 25px rgba(255, 0, 128, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 0 20px rgba(255, 0, 128, 0.4)'">
                <i class="fas fa-video"></i> ПРИСОЕДИНИТЬСЯ
            </a>
            
            <div style="margin-top: 20px; font-size: 0.9em; color: #aaa;">
                <div><strong>Создатель:</strong> ${currentUser.name}</div>
                <div><strong>Время:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    database.ref('messages/' + callMessage.id).set(callMessage);
    
    window.open(telemostUrl, '_blank', 'width=1200,height=800');
}

function generateMeetingId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ==================== AI БОТ ====================
async function handleAIChat(text) {
    if (!text.trim()) return;
    
    const userMessage = {
        id: Date.now().toString(),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text,
        channel: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAI: false
    };
    
    database.ref('messages/' + userMessage.id).set(userMessage);
    
    showAITyping();
    
    setTimeout(async () => {
        hideAITyping();
        
        const aiResponse = await getAIResponse(text);
        
        const aiMessage = {
            id: (Date.now() + 1).toString(),
            userId: 'ai_assistant',
            userName: '🤖 AI Помощник',
            userAvatar: '🤖',
            text: aiResponse,
            channel: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            isAI: true
        };
        
        database.ref('messages/' + aiMessage.id).set(aiMessage);
    }, 800 + Math.random() * 1200);
}

async function getAIResponse(message) {
    const lowerMsg = message.toLowerCase().trim();
    
    // Математика
    if (/(сколько будет|посчитай|реши|сколько)/i.test(lowerMsg)) {
        try {
            const clean = message.replace(/[^\d+\-*/().,]/g, '').replace(/,/g, '.');
            if (clean && /[\+\-\*\/\(\)]/.test(clean)) {
                const result = eval(clean);
                return `🧮 ${message} = ${result}`;
            }
        } catch (e) {}
    }
    
    // Время
    if (/(который час|сколько времени|time)/i.test(lowerMsg)) {
        return `🕐 Сейчас ${new Date().toLocaleTimeString('ru-RU')}`;
    }
    
    // Приветствия
    if (/(привет|здравств|hi|hello|хай)/i.test(lowerMsg)) {
        const responses = [
            "Привет! 👋 Рад тебя видеть!",
            "Здравствуй! 😊 Чем могу помочь?",
            "Приветствую! 🌟 Задавай вопросы!",
            "О, привет! 🤖 Я твой AI-помощник!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Как дела
    if (/(как дела|как ты|how are)/i.test(lowerMsg)) {
        return "У меня всё отлично! Спасибо что спрашиваешь! 😄";
    }
    
    // Шутки
    if (/(шутк|анекдот|пошути|joke)/i.test(lowerMsg)) {
        const jokes = [
            "Почему программист не спит? Он отлаживает код! 😂",
            "Что сказал один сервер другому? У меня для тебя пакет! 📦",
            "Почему компьютер пошел к врачу? У него был вирус! 🦠"
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Помощь
    if (/(помощь|help|что ты умеешь)/i.test(lowerMsg)) {
        return "Я могу: считать, отвечать на вопросы, шутить, говорить время! Используй команды: /help, /call, /online";
    }
    
    // Обычные ответы
    const responses = [
        "Интересный вопрос! 🤔",
        "Хорошая тема для разговора! 💭",
        "Спасибо что делишься мыслями! 🌟",
        "Давай обсудим это подробнее? 💬",
        "Это заставляет задуматься... 🧠",
        "Отличный повод для дискуссии! 📚",
        "Я запомнил твою мысль! 📝"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

function showAITyping() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-typing';
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.innerHTML = `
        <i class="fas fa-robot"></i>
        <span>🤖 AI набирает ответ...</span>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function hideAITyping() {
    const typingDiv = document.getElementById('aiTypingIndicator');
    if (typingDiv) {
        typingDiv.remove();
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
            if (isAdmin) {
                adminClearChat();
            } else {
                sendSystemMessage('❌ Только администратор может очищать чат');
            }
            break;
            
        case '/announce':
            if (isAdmin) {
                const text = args.join(' ');
                if (text) {
                    adminSendAnnouncement(text);
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
            sendSystemMessage(`👥 Сейчас онлайн: ${onlineUsers.size} пользователей`);
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
            
        case '/ai':
            if (args.length > 0) {
                handleAIChat(args.join(' '));
            }
            break;
            
        default:
            sendSystemMessage('❌ Неизвестная команда. Введи /help для списка команд');
    }
}

function showHelp() {
    let helpText = '📋 <strong>Доступные команды:</strong><br>';
    helpText += '<div style="margin-left: 15px; font-size: 0.9em;">';
    helpText += '/help - Показать это сообщение<br>';
    helpText += '/online - Показать кто онлайн<br>';
    helpText += '/me [действие] - Отправить действие<br>';
    helpText += '/call - Создать видеозвонок<br>';
    helpText += '/ai [вопрос] - Задать вопрос AI<br>';
    
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
        id: Date.now().toString(),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    if (database) {
        database.ref('messages/' + message.id).set(message);
    }
}

function sendActionMessage(action) {
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
    
    if (database) {
        database.ref('messages/' + message.id).set(message);
    }
}

// ==================== АДМИН ФУНКЦИИ ====================
async function adminClearChat() {
    if (!isAdmin) return;
    
    if (!confirm('💀 Очистить весь чат?')) return;
    
    try {
        await database.ref('messages').remove();
        sendSystemMessage('🧹 Чат очищен администратором');
    } catch (error) {
        alert('❌ Ошибка: ' + error.message);
    }
}

async function adminSendAnnouncement(text) {
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '📢 Админ-объявление',
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
}

async function adminKickAll() {
    if (!isAdmin) return;
    
    if (!confirm('🚨 Кикнуть всех пользователей?')) return;
    
    try {
        await database.ref('online').remove();
        sendSystemMessage('🚪 Все пользователи отключены администратором');
    } catch (error) {
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
        'ai': '🤖 Нейросеть'
    };
    
    document.getElementById('channelName').textContent = channelNames[channel] || channel;
    updateMessagesDisplay();
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
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
    }
    
    updateOnlineStatus();
    updateMessagesDisplay();
}

function logout() {
    if (confirm('Выйти из чата?')) {
        if (database && myUserId) {
            database.ref('online/' + myUserId).remove();
        }
        
        localStorage.removeItem('neonchat_current_user');
        location.reload();
    }
}

// Добавляем обработку времени
function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = timeStr;
}

setInterval(updateTime, 60000);
updateTime();
