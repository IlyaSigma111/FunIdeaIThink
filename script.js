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
    console.log('🚀 НАЧИНАЕМ ШИЗОФРЕНИЮ...');
    
    // FIREBASE ИНИЦИАЛИЗАЦИЯ
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log('✅ FIREBASE ВКЛЮЧЁН!');
    } catch (e) {
        console.error('❌ FIREBASE НЕ РАБОТАЕТ:', e);
        alert('FIREBASE НЕ РАБОТАЕТ! Проверь консоль!');
        return;
    }
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            
            const usernameInput = document.getElementById('username');
            if (usernameInput && currentUser.name) {
                usernameInput.value = currentUser.name;
                document.getElementById('password').focus();
            }
            
            console.log('Найден сохраненный шизофреник:', currentUser.name);
        } catch (e) {
            console.error('Ошибка загрузки шизофреника:', e);
        }
    }
    
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) input.focus();
    }, 300);
    
    // Настройка обработчиков
    setupEventListeners();
};

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

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
        alert('ВВЕДИ НИК, ШИЗОФРЕНИК!');
        document.getElementById('username').focus();
        return;
    }
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + 
                      (isRegisterMode ? 'Регистрируем...' : 'Входим...');
    
    if (isRegisterMode) {
        if (!password) {
            alert('ПРИДУМАЙ ПАРОЛЬ, ДЕБИЛ!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('password').focus();
            return;
        }
        
        if (password.length < 4) {
            alert('ПАРОЛЬ ДОЛЖЕН БЫТЬ МИНИМУМ 4 СИМВОЛА, ТУПОЙ!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('password').focus();
            return;
        }
        
        if (password !== confirmPassword) {
            alert('ПАРОЛИ НЕ СОВПАДАЮТ, ОЛУХ!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('confirmPassword').focus();
            document.getElementById('confirmPassword').value = '';
            return;
        }
        
        if (localStorage.getItem('neonchat_user_' + username.toLowerCase())) {
            alert('ЭТОТ НИК УЖЕ ЗАНЯТ, КРЕТИН!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            document.getElementById('username').focus();
            document.getElementById('username').select();
            return;
        }
        
        registerUser(username, password);
        
    } else {
        if (!password) {
            alert('ВВЕДИ ПАРОЛЬ, ДЕБИЛ!');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            document.getElementById('password').focus();
            return;
        }
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('👑 ВХОД КАК БОГ');
            isAdmin = true;
            createAdminUser();
            return;
        }
        
        loginUser(username, password);
    }
}

function registerUser(username, password) {
    myUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const avatars = ['😎', '🐱', '🚀', '🦊', '🐯', '🦁', '🐼', '🐨', '👽', '🤖', '👾', '🦄'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    currentUser = {
        id: myUserId,
        name: username,
        avatar: avatar,
        passwordHash: simpleHash(password),
        registeredAt: Date.now(),
        isAdmin: false
    };
    
    localStorage.setItem('neonchat_user_' + username.toLowerCase(), JSON.stringify(currentUser));
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ НОВЫЙ ШИЗОФРЕНИК:', username);
    showChatInterface();
}

function loginUser(username, password) {
    const userData = localStorage.getItem('neonchat_user_' + username.toLowerCase());
    
    if (!userData) {
        document.getElementById('authButton').disabled = false;
        document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        alert('ШИЗОФРЕНИК НЕ НАЙДЕН! РЕГИСТРИРУЙСЯ!');
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
            alert('НЕВЕРНЫЙ ПАРОЛЬ, ИДИОТ!');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
            return;
        }
        
        myUserId = user.id;
        currentUser = user;
        isAdmin = user.isAdmin || false;
        
        localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
        
        console.log('✅ УСПЕШНЫЙ ВХОД:', username);
        showChatInterface();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        document.getElementById('authButton').disabled = false;
        document.getElementById('authButton').innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        alert('ОШИБКА ВХОДА. ПОПРОБУЙ СНОВА.');
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
    
    console.log('✅ ВХОД КАК БОГ');
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
        document.getElementById('messageInput').focus();
    }, 300);
    
    initFirebase();
}

function initFirebase() {
    if (!database) {
        alert('❌ FIREBASE НЕ РАБОТАЕТ! Перезагрузи страницу!');
        return;
    }
    
    // Проверка подключения
    database.ref('.info/connected').on('value', (snap) => {
        const isConnected = snap.val() === true;
        document.getElementById('connectionStatus').textContent = isConnected ? '✓' : '✗';
        document.getElementById('connectionStatus').style.color = isConnected ? '#00ff80' : '#ff6666';
        
        if (isConnected) {
            console.log('✅ ПОДКЛЮЧЕНО К FIREBASE');
            updateOnlineStatus();
            monitorOnlineUsers();
            loadMessages();
        } else {
            console.log('❌ ОТКЛЮЧЕНО ОТ FIREBASE');
            alert('❌ НЕТ ПОДКЛЮЧЕНИЯ К FIREBASE!');
        }
    });
}

function loadMessages() {
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
                <span style="color: #00ff80;">(Ты)</span>
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
    onlineCount.textContent = totalOnline;
    onlineCount2.textContent = totalOnline;
    
    if (totalOnline === 1) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        emptyDiv.style.color = 'rgba(255,255,255,0.5)';
        emptyDiv.innerHTML = `
            <i class="fas fa-user-friends" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
            Ты один здесь... грустно 😔
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
                Кричи что-нибудь в пустоту!
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
    const text = input.value.trim();
    
    if (!text) {
        input.focus();
        return;
    }
    
    if (!currentUser) {
        alert('СНАЧАЛА ВОЙДИ, ДУРАК!');
        return;
    }
    
    if (!database) {
        alert('FIREBASE НЕ РАБОТАЕТ!');
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
        alert('❌ НЕ ОТПРАВИЛОСЬ! Проверь интернет!');
    }
}

// ==================== ЯНДЕКС ТЕЛЕМОСТ ====================
function startCall() {
    if (!currentUser) {
        alert('❌ СНАЧАЛА ВОЙДИ!');
        return;
    }
    
    if (!navigator.onLine) {
        alert('❌ НЕТ ИНТЕРНЕТА!');
        return;
    }
    
    const meetingId = generateMeetingId();
    const telemostUrl = `${TELEMOST_BASE_URL}/${meetingId}`;
    
    const callMessage = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '🎥 ЗВОНОК',
        userAvatar: '🎥',
        text: `📞 <div style="
            background: linear-gradient(135deg, rgba(255, 0, 128, 0.2), rgba(255, 102, 0, 0.2));
            padding: 20px;
            border-radius: 15px;
            border: 2px solid #ff0080;
            margin: 10px 0;
            text-align: center;
        ">
            <div style="color: #ff0080; font-size: 1.4em; font-weight: bold; margin-bottom: 15px;">
                <i class="fas fa-video"></i> СОЗДАН ЗВОНОК
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
            ">
                <i class="fas fa-video"></i> ПРИСОЕДИНИТЬСЯ
            </a>
            
            <div style="margin-top: 20px; font-size: 0.9em; color: #aaa;">
                <div><strong>Создатель:</strong> ${currentUser.name}</div>
                <div><strong>Время:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div style="margin-top: 10px; color: #88aaff;">
                    <i class="fas fa-info-circle"></i> Нажми на кнопку!
                </div>
            </div>
        </div>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    // Отправляем сообщение в Firebase
    database.ref('messages/' + callMessage.id).set(callMessage);
    
    // Открываем звонок
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
    
    // Показываем сообщение пользователя
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
    
    // Индикатор набора
    showAITyping();
    
    setTimeout(async () => {
        hideAITyping();
        
        const aiResponse = await getAIResponse(text);
        
        const aiMessage = {
            id: (Date.now() + 1).toString(),
            userId: 'ai_assistant',
            userName: '🤖 AI',
            userAvatar: '🤖',
            text: aiResponse,
            channel: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            isAI: true
        };
        
        database.ref('messages/' + aiMessage.id).set(aiMessage);
    }, 1000);
}

async function getAIResponse(message) {
    const lowerMsg = message.toLowerCase().trim();
    
    // МАТЕМАТИКА
    if (/(сколько будет|посчитай|реши|сколько)/i.test(lowerMsg)) {
        try {
            const clean = message.replace(/[^\d+\-*/().,]/g, '').replace(/,/g, '.');
            if (clean) {
                const result = eval(clean);
                return `🧮 ${message} = ${result}`;
            }
        } catch (e) {}
    }
    
    // ПРИВЕТСТВИЯ
    if (/(привет|здравств|hi|hello)/i.test(lowerMsg)) {
        const responses = [
            "Привет, шизофреник! 👋",
            "Здарова, дебил! 😄",
            "О, привет! Ты опять один? 🥲",
            "Приветствую, одинокий волк! 🐺"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // ВОПРОСЫ
    if (/(как дела|как ты|how are)/i.test(lowerMsg)) {
        return "У меня всё норм, а у тебя как, одиночка? 😏";
    }
    
    // ВРЕМЯ
    if (/(который час|сколько времени|time)/i.test(lowerMsg)) {
        return `🕐 ${new Date().toLocaleTimeString('ru-RU')}`;
    }
    
    // ШУТКИ
    if (/(шутк|анекдот|пошути|joke)/i.test(lowerMsg)) {
        const jokes = [
            "Почему программист не спит? Он отлаживает свою жизнь! 😂",
            "Что сказал один шизофреник другому? Давай поговорим втроём! 👥",
            "Почему ты один в чате? Потому что у тебя нет друзей! 🥲"
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // ОБЫЧНЫЕ ОТВЕТЫ
    const responses = [
        "Интересно... А ты точно не шизофреник? 🤔",
        "Хм, хороший вопрос для одинокого человека! 💭",
        "Я бы ответил, но ты всё равно один тут... 😔",
        "Слушай, может тебе найти кого-то для общения? 👥",
        "Ты опять говоришь сам с собой? Не здорово... 🏥",
        "Интересная мысль! Жаль, что некому её оценить кроме меня! 🤖",
        "Давай поговорим о чём-нибудь весёлом! Одиночество уже надоело? 🎉"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

function showAITyping() {
    const container = document.getElementById('messagesContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-typing';
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.innerHTML = `
        <i class="fas fa-robot"></i>
        <span>🤖 AI думает...</span>
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
                sendSystemMessage('❌ ТЫ НЕ АДМИН, ЛОХ!');
            }
            break;
            
        case '/announce':
            if (isAdmin) {
                const text = args.join(' ');
                if (text) {
                    adminSendAnnouncement(text);
                }
            } else {
                sendSystemMessage('❌ ТЫ НЕ АДМИН, ЛОХ!');
            }
            break;
            
        case '/kickall':
            if (isAdmin) {
                adminKickAll();
            } else {
                sendSystemMessage('❌ ТЫ НЕ АДМИН, ЛОХ!');
            }
            break;
            
        case '/online':
            sendSystemMessage(`👥 Онлайн: ${onlineUsers.size} шизофреников`);
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
            sendSystemMessage('❌ ЧЁ ТЫ НЕСЁШЬ? /help для команд');
    }
}

function showHelp() {
    let helpText = '📋 <strong>КОМАНДЫ:</strong><br>';
    helpText += '<div style="margin-left: 15px; font-size: 0.9em;">';
    helpText += '/help - помощь<br>';
    helpText += '/online - кто онлайн<br>';
    helpText += '/call - звонок<br>';
    helpText += '/ai [текст] - поговорить с AI<br>';
    
    if (isAdmin) {
        helpText += '<br><strong style="color:gold;">👑 АДМИН:</strong><br>';
        helpText += '/clean - очистить чат<br>';
        helpText += '/announce [текст] - объявление<br>';
        helpText += '/kickall - кикнуть всех<br>';
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
    
    database.ref('messages/' + message.id).set(message);
}

// ==================== АДМИН ФУНКЦИИ ====================
async function adminClearChat() {
    if (!confirm('💀 ОЧИСТИТЬ ВЕСЬ ЧАТ?')) return;
    
    try {
        await database.ref('messages').remove();
        sendSystemMessage('🧹 ЧАТ ОЧИЩЕН АДМИНОМ!');
    } catch (error) {
        alert('❌ ОШИБКА: ' + error.message);
    }
}

async function adminSendAnnouncement(text) {
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '📢 ОБЪЯВЛЕНИЕ',
        userAvatar: '📢',
        text: `📣 <div style="
            background: linear-gradient(45deg, rgba(255, 153, 0, 0.3), rgba(255, 255, 0, 0.3));
            padding: 20px;
            border-radius: 12px;
            color: #ff9900;
            font-weight: bold;
            border: 3px solid #ff9900;
            text-align: center;
            margin: 10px 0;
        ">
            <div style="font-size: 1.3em; margin-bottom: 10px;">⚡ ВНИМАНИЕ!</div>
            <div style="font-size: 1.1em; margin-bottom: 10px;">${text}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #ffcc88;">
                👑 От админа <strong>${currentUser.name}</strong>
            </div>
        </div>`,
        channel: 'main',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    await database.ref('messages/' + message.id).set(message);
}

async function adminKickAll() {
    if (!confirm('🚨 КИКНУТЬ ВСЕХ?')) return;
    
    try {
        await database.ref('online').remove();
        sendSystemMessage('🚪 ВСЕХ ВЫШЛИЛИ!');
    } catch (error) {
        alert('❌ ОШИБКА: ' + error.message);
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
        'main': 'ОСНОВНОЙ',
        'games': 'ИГРЫ',
        'music': 'МУЗЫКА',
        'ai': '🤖 AI'
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

function logout() {
    if (confirm('Выйти?')) {
        if (database && myUserId) {
            database.ref('online/' + myUserId).remove();
        }
        
        localStorage.removeItem('neonchat_current_user');
        location.reload();
    }
}

// Уведомления
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}// ==================== КОНФИГУРАЦИЯ ====================
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

// Яндекс Телемост конфигурация
const TELEMOST_BASE_URL = "https://telemost.yandex.ru";

// Hugging Face AI
const HF_API_KEY = "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"; // Твой API ключ
const HF_MODEL = "microsoft/DialoGPT-medium"; // Бесплатная модель для чата

// Глобальные переменные
let isRegisterMode = false;
let telegramEnabled = true;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;
let aiConversations = new Map();
let isAITyping = false;

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
    
    // Настройка обработчиков
    setupEventListeners();
};

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    document.getElementById('currentTime').textContent = timeStr;
}

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
        isSpecialAdmin: true
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
        showFirebaseError();
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

function showFirebaseError() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#ff5555;">
                <i class="fas fa-exclamation-triangle" style="font-size:3em; margin-bottom:15px;"></i>
                <strong>Ошибка Firebase</strong><br>
                <span style="color:#ff8888;">Нет подключения к базе данных.</span><br>
                <div style="margin-top:20px; font-size:0.9em; color:#aaa;">
                    Чат работает в локальном режиме<br>
                    Сообщения сохраняются только у вас
                </div>
            </div>
        `;
    }
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

function addMessageToDisplay(message) {
    const container = document.getElementById('messagesContainer');
    const isOwn = currentUser && message.userId === currentUser.id;
    const isSystem = message.userId === 'system';
    const isAdminMsg = message.isAdmin || message.userId.includes('admin');
    const isAI = message.isAI || message.userId.includes('ai');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''} ${isAI ? 'ai' : ''}`;
    messageDiv.style.animation = 'fadeIn 0.3s ease';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user ${isAdminMsg ? 'admin' : ''} ${isAI ? 'ai' : ''}">
                ${message.userAvatar || ''} ${message.userName}
                ${isAdminMsg ? '👑' : ''}
            </span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-content">${message.text}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
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
    
    // Проверка на команды
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        input.focus();
        return;
    }
    
    // Если в канале AI
    if (currentChannel === 'ai') {
        await handleAIChat(text);
        input.value = '';
        input.focus();
        return;
    }
    
    // Обычное сообщение
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
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            // Локальное сохранение если Firebase недоступен
            messages.push(message);
            addMessageToDisplay(message);
        }
        
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
    // Проверяем есть ли пользователь
    if (!currentUser) {
        alert('❌ Сначала войдите в чат!');
        return;
    }
    
    // Проверяем подключение к интернету
    if (!navigator.onLine) {
        alert('❌ Нет подключения к интернету!');
        return;
    }
    
    // Генерируем уникальный ID для встречи
    const meetingId = generateMeetingId();
    const telemostUrl = `${TELEMOST_BASE_URL}/${meetingId}`;
    
    // Создаем сообщение о звонке
    const callMessage = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '🎥 Яндекс Телемост',
        userAvatar: '🎥',
        text: `📞 <div class="call-announcement" style="
            background: linear-gradient(135deg, rgba(255, 0, 128, 0.15), rgba(255, 102, 0, 0.15));
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
                transition: all 0.3s;
                animation: pulse 1.5s infinite;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 25px rgba(255, 0, 128, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 0 20px rgba(255, 0, 128, 0.4)'">
                <i class="fas fa-video"></i> ПРИСОЕДИНИТЬСЯ К ЗВОНКУ
            </a>
            
            <div style="margin-top: 20px; font-size: 0.9em; color: #aaa;">
                <div style="margin-bottom: 8px;">
                    <strong>Ссылка для подключения:</strong>
                </div>
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    padding: 12px;
                    border-radius: 8px;
                    font-family: monospace;
                    word-break: break-all;
                    font-size: 0.85em;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 10px;
                ">
                    ${telemostUrl}
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <div><strong>Создатель:</strong> ${currentUser.name}</div>
                    <div><strong>Платформа:</strong> Яндекс Телемост 🇷🇺</div>
                    <div><strong>Время:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        </div>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    // Показываем сообщение сразу
    addMessageToDisplay(callMessage);
    
    // Сохраняем в Firebase если доступен
    if (database) {
        database.ref('messages/' + callMessage.id).set(callMessage).catch(() => {
            console.log('Firebase недоступен, сообщение только локально');
        });
    }
    
    // Открываем звонок в новом окне
    window.open(telemostUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    
    // Показываем уведомление
    showNotification('🎥 Яндекс Телемост', 'Звонок создан! Нажмите, чтобы присоединиться');
}

function generateMeetingId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'j/';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "https://telemost.yandex.ru/favicon.ico" });
    }
}

// ==================== HUGGING FACE AI ====================
async function handleAIChat(text) {
    if (!text.trim()) return;
    
    // Сразу показываем сообщение пользователя
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
    
    addMessageToDisplay(userMessage);
    
    // Показываем индикатор набора
    showAITyping();
    
    try {
        const aiResponse = await chatWithHuggingFace(text, myUserId);
        hideAITyping();
        
        // Показываем ответ AI
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
        
        addMessageToDisplay(aiMessage);
        
    } catch (error) {
        hideAITyping();
        console.error('Ошибка AI:', error);
        
        // Показываем сообщение об ошибке
        const errorMessage = {
            id: (Date.now() + 1).toString(),
            userId: 'ai_assistant',
            userName: '🤖 AI Помощник',
            userAvatar: '🤖',
            text: 'Извините, я временно недоступен 😔<br><small style="color:#888;">Попробуйте позже или используйте обычный чат</small>',
            channel: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            isAI: true
        };
        
        addMessageToDisplay(errorMessage);
    }
}

async function chatWithHuggingFace(message, userId) {
    // Инициализируем историю если нужно
    if (!aiConversations.has(userId)) {
        aiConversations.set(userId, []);
    }
    
    const history = aiConversations.get(userId);
    
    // Добавляем новое сообщение в историю
    history.push({ role: "user", content: message });
    
    // Ограничиваем историю
    if (history.length > 10) {
        history.splice(0, history.length - 5);
    }
    
    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: {
                        past_user_inputs: history.slice(-5).filter(h => h.role === "user").map(h => h.content),
                        generated_responses: history.slice(-5).filter(h => h.role === "assistant").map(h => h.content),
                        text: message
                    },
                    parameters: {
                        max_length: 100,
                        temperature: 0.7,
                        repetition_penalty: 1.2
                    }
                })
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        let aiText = data.generated_text || "Извините, не могу сгенерировать ответ.";
        
        // Если ответ слишком короткий, добавляем вариант
        if (aiText.length < 10) {
            const fallbackResponses = [
                "Интересный вопрос! Можете уточнить?",
                "Я пока учусь отвечать на такие вопросы!",
                "Попробуйте задать вопрос по-другому.",
                "Это сложный вопрос, дайте подумать...",
                "Мне нужно больше информации чтобы ответить."
            ];
            aiText = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
        
        // Сохраняем ответ в историю
        history.push({ role: "assistant", content: aiText });
        
        return aiText;
        
    } catch (error) {
        console.error('Hugging Face ошибка:', error);
        return "Произошла ошибка при обработке запроса. Попробуйте позже.";
    }
}

function showAITyping() {
    const container = document.getElementById('messagesContainer');
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
        case '/телефон':
            startCall();
            break;
            
        case '/ai':
            if (args.length > 0) {
                handleAIChat(args.join(' '));
            } else {
                sendSystemMessage('Используйте: /ai [ваш вопрос]');
            }
            break;
            
        case '/time':
            sendSystemMessage(`🕐 Текущее время: ${new Date().toLocaleTimeString()}`);
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
    helpText += '/time - Показать время<br>';
    helpText += '/call - Создать видеозвонок (Яндекс Телемост)<br>';
    helpText += '/ai [вопрос] - Задать вопрос AI (или перейти в канал AI)<br>';
    
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
    
    addMessageToDisplay(message);
    
    if (database) {
        database.ref('messages/' + message.id).set(message).catch(() => {
            // Игнорируем ошибку если Firebase недоступен
        });
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
    
    addMessageToDisplay(message);
    
    if (database) {
        database.ref('messages/' + message.id).set(message).catch(() => {
            // Игнорируем ошибку если Firebase недоступен
        });
    }
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
    
    addMessageToDisplay(message);
    
    if (database) {
        await database.ref('messages/' + message.id).set(message);
    }
    
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
        'ai': '🤖 Нейросеть'
    };
    
    document.getElementById('channelName').textContent = channelNames[channel] || channel;
    updateMessagesDisplay();
    hideMobilePanels();
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
    updateOnlineDisplay();
    
    if (database) {
        sendSystemMessage('🔄 Синхронизация выполнена');
    }
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

// Запрос разрешения на уведомления
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}

