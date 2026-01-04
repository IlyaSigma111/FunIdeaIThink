// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
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

// Инициализируем Firebase
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase инициализирован');
    } catch (error) {
        console.log('Firebase уже инициализирован');
    }
}

const database = firebase.database ? firebase.database() : null;

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentChannel = 'main';
let allMessages = [];
let onlineUsers = new Map();
let myUserId = null;
let isConnected = false;

// ==================== УТИЛИТЫ ====================
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getRandomAvatar() {
    const avatars = ['🦊', '🐯', '🐼', '🐨', '🦁', '🐲', '🐵', '🐸', '🦄', '🐙', '🦉', '🐷'];
    return avatars[Math.floor(Math.random() * avatars.length)];
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==================== РАБОТА С FIREBASE ====================
function initFirebaseListeners() {
    if (!database) {
        console.error('Firebase Database не доступен!');
        showFirebaseError();
        return;
    }
    
    console.log('Инициализируем Firebase слушатели...');
    
    // Слушаем подключение
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        isConnected = snap.val() === true;
        
        if (isConnected && currentUser) {
            console.log('✅ Подключено к Firebase');
            document.getElementById('connectionStatus').style.color = '#00ff80';
            document.getElementById('connectionStatus').textContent = '✓';
            document.getElementById('syncStatus').style.color = '#00ff80';
            document.getElementById('syncStatus').textContent = '✓';
            
            // Добавляем пользователя в онлайн
            updateMyOnlineStatus();
        } else {
            document.getElementById('connectionStatus').style.color = '#ff5555';
            document.getElementById('connectionStatus').textContent = '✗';
            document.getElementById('syncStatus').style.color = '#ff9900';
            document.getElementById('syncStatus').textContent = '!';
            console.log('❌ Отключено от Firebase');
        }
    });
    
    // Слушаем сообщения
    const messagesRef = database.ref('messages');
    messagesRef.on('value', (snapshot) => {
        console.log('Получены сообщения из Firebase');
        const messagesData = snapshot.val();
        
        if (messagesData) {
            // Конвертируем объект в массив
            const messagesArray = Object.values(messagesData);
            
            // Сортируем по времени
            messagesArray.sort((a, b) => a.timestamp - b.timestamp);
            
            allMessages = messagesArray;
            updateMessagesDisplay();
            document.getElementById('messageCount').textContent = allMessages.length;
            
            document.getElementById('syncStatus').style.color = '#00ff80';
            document.getElementById('syncStatus').textContent = '✓';
            document.getElementById('lastSync').textContent = 'только что';
            document.getElementById('lastUpdate').textContent = formatTime(new Date());
        } else {
            allMessages = [];
            updateMessagesDisplay();
        }
    }, (error) => {
        console.error('Ошибка загрузки сообщений:', error);
        document.getElementById('syncStatus').style.color = '#ff5555';
        document.getElementById('syncStatus').textContent = '✗';
    });
    
    // Слушаем онлайн пользователей
    const usersRef = database.ref('users');
    usersRef.on('value', (snapshot) => {
        console.log('Получены пользователи из Firebase');
        const usersData = snapshot.val();
        
        if (usersData) {
            onlineUsers = new Map(Object.entries(usersData));
            
            // Фильтруем неактивных (больше 5 минут)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            for (const [userId, user] of onlineUsers.entries()) {
                if (user.lastSeen < fiveMinutesAgo) {
                    onlineUsers.delete(userId);
                    // Удаляем из Firebase
                    database.ref('users/' + userId).remove();
                }
            }
            
            updateOnlineList();
            document.getElementById('onlineCount').textContent = onlineUsers.size;
        } else {
            onlineUsers = new Map();
            updateOnlineList();
        }
    }, (error) => {
        console.error('Ошибка загрузки пользователей:', error);
    });
}

function showFirebaseError() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; color:#ff5555; padding:40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:3em; margin-bottom:15px; display:block;"></i>
                <strong style="font-size:1.1em;">Ошибка Firebase</strong><br>
                <span style="font-size:0.9em; color:#ff8888;">Не удалось подключиться к базе данных.</span><br><br>
                <div style="background: rgba(255, 85, 85, 0.1); padding: 15px; border-radius: 10px; text-align: left; font-size: 0.85em; margin: 15px 0;">
                    <strong>Проверь:</strong><br>
                    1. Добавил ли ты Firebase SDK в HTML?<br>
                    2. Правильно ли настроен Realtime Database?<br>
                    3. Включен ли тестовый режим в Firebase?
                </div>
                <button onclick="location.reload()" class="neon-btn" style="margin-top:10px; padding:10px 20px; font-size:1em;">
                    <i class="fas fa-sync-alt"></i> Перезагрузить страницу
                </button>
            </div>
        `;
    }
}

// ==================== ОБНОВЛЕНИЕ ОНЛАЙН СТАТУСА ====================
function updateMyOnlineStatus() {
    if (!currentUser || !isConnected || !database) return;
    
    try {
        const userStatusRef = database.ref('users/' + myUserId);
        const userData = {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now(),
            isOnline: true
        };
        
        userStatusRef.set(userData);
        
        // Устанавливаем автоудаление при отключении
        userStatusRef.onDisconnect().remove();
        
        console.log('✅ Статус обновлен в Firebase');
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
    }
}

// ==================== ОТПРАВКА СООБЩЕНИЯ ====================
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) {
        input.focus();
        return;
    }
    
    if (!database || !isConnected) {
        alert('❌ Нет подключения к Firebase. Проверь интернет соединение.');
        return;
    }
    
    const message = {
        id: Date.now().toString(),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text,
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    try {
        // Добавляем в Firebase
        await database.ref('messages/' + message.id).set(message);
        
        // Обновляем свой онлайн статус
        updateMyOnlineStatus();
        
        // Очищаем поле ввода
        input.value = '';
        input.focus();
        
        // Прокручиваем вниз
        scrollToBottom();
        
        console.log('✅ Сообщение отправлено в Firebase:', text.substring(0, 50));
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert('❌ Ошибка отправки сообщения: ' + error.message);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = function() {
    console.log('🚀 Запускаем NeonChat...');
    
    // Показываем загрузку
    const loadingEl = document.getElementById('loadingMessages');
    if (loadingEl) {
        loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Инициализируем чат...';
    }
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            
            if (currentUser && currentUser.id && currentUser.name) {
                console.log('Найден сохраненный пользователь:', currentUser.name);
                
                // Показываем кнопку выхода на экране логина
                const logoutBtn = document.getElementById('logoutFromLoginButton');
                if (logoutBtn) logoutBtn.style.display = 'block';
                
                // Автозаполняем поле логина
                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    usernameInput.value = currentUser.name;
                    usernameInput.focus();
                    usernameInput.select();
                }
                
                // Запускаем автоматический вход для сохраненного пользователя
                setTimeout(autoLogin, 100);
            } else {
                console.log('Невалидные данные пользователя');
                document.getElementById('loginScreen').classList.add('active');
            }
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
            document.getElementById('loginScreen').classList.add('active');
        }
    }
    
    // Автофокус на поле логина
    setTimeout(function() {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
            usernameInput.select();
        }
    }, 500);
    
    // Устанавливаем обработчик Enter сразу при загрузке
    setupEnterHandler();
};

// ==================== АВТОМАТИЧЕСКИЙ ВХОД ====================
function autoLogin() {
    console.log('Автоматический вход для сохраненного пользователя...');
    
    // Показываем чат
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('chatScreen').style.display = 'flex';
    
    // Обновляем UI
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    // РАЗБЛОКИРОВКА ПОЛЯ ВВОДА
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.querySelector('.send-btn');
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = "Напиши сообщение...";
        setTimeout(() => {
            messageInput.focus();
        }, 300);
        console.log('✅ Поле ввода разблокировано');
    }
    if (sendBtn) {
        sendBtn.disabled = false;
    }
    
    // УСТАНАВЛИВАЕМ ОБРАБОТЧИК ENTER
    setupEnterHandler();
    
    // ПРОВЕРКА АДМИН СТАТУСА
    if (currentUser.name === 'Артур Пирожков') {
        setTimeout(() => {
            activateAdminMode();
        }, 1000);
    }
    
    // Инициализируем Firebase
    setTimeout(() => {
        initFirebaseListeners();
        
        // Убираем загрузку
        setTimeout(() => {
            const loadingEl = document.getElementById('loadingMessages');
            if (loadingEl) loadingEl.remove();
        }, 1500);
    }, 500);
}

// ==================== ОБРАБОТЧИК КЛАВИШИ ENTER (ИСПРАВЛЕННЫЙ) ====================
function setupEnterHandler() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
        console.error('Поле ввода не найдено!');
        return;
    }
    
    // Удаляем все старые обработчики
    const newInput = messageInput.cloneNode(true);
    messageInput.parentNode.replaceChild(newInput, messageInput);
    
    // Получаем новую ссылку
    const newMessageInput = document.getElementById('messageInput');
    
    // Устанавливаем обработчик напрямую в атрибуте (самый надежный способ)
    newMessageInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Отменяем перенос строки
            sendMessage(); // Отправляем сообщение
            return false;
        }
    };
    
    console.log('✅ Обработчик Enter установлен напрямую в onkeydown');
}

// ==================== ВХОД В ЧАТ ====================
function enterChat() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    const loginButton = document.getElementById('loginButton');
    
    if (!username) {
        alert('Введи крутой ник!');
        usernameInput.focus();
        return;
    }
    
    // Блокируем кнопку чтобы не нажимали дважды
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Входим...';
    }
    
    // Задержка 0.3 секунды чтобы увидеть переход
    setTimeout(() => {
        // Создаем пользователя
        myUserId = generateUserId();
        currentUser = {
            id: myUserId,
            name: username,
            avatar: getRandomAvatar(),
            lastSeen: Date.now()
        };
        
        // Сохраняем пользователя
        localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
        
        // Показываем чат
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('chatScreen').style.display = 'flex';
        
        // Обновляем UI
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('userAvatar').textContent = currentUser.avatar;
        
        // РАЗБЛОКИРОВКА ПОЛЯ ВВОДА
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-btn');
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = "Напиши сообщение...";
            setTimeout(() => {
                messageInput.focus();
            }, 300);
            console.log('✅ Поле ввода разблокировано');
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        
        // УСТАНАВЛИВАЕМ ОБРАБОТЧИК ENTER (ВАЖНО!)
        setupEnterHandler();
        
        // ПРОВЕРКА АДМИН СТАТУСА
        if (username === 'Артур Пирожков') {
            setTimeout(() => {
                activateAdminMode();
            }, 1000);
        }
        
        // Инициализируем Firebase через секунду
        setTimeout(() => {
            initFirebaseListeners();
            
            // Убираем загрузку
            setTimeout(() => {
                const loadingEl = document.getElementById('loadingMessages');
                if (loadingEl) loadingEl.remove();
            }, 1500);
        }, 500);
        
        // Показываем приветственное сообщение
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            if (container && container.children.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; color:#888; padding:40px 20px;">
                        <i class="fas fa-rocket" style="font-size:3em; margin-bottom:15px; display:block; color:#00ffff;"></i>
                        <strong style="color:#00ffff; font-size:1.1em;">Добро пожаловать в NeonChat!</strong><br>
                        <span style="font-size:0.9em; color:#666;">Чат синхронизируется между всеми устройствами</span>
                    </div>
                `;
            }
        }, 2000);
        
        console.log('✅ Успешный вход:', username);
        
    }, 300); // Задержка перед переходом
    
    hideMobilePanels();
}

// ==================== ОТОБРАЖЕНИЕ СООБЩЕНИЙ ====================
function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const loading = document.getElementById('loadingMessages');
    if (loading && container.contains(loading)) {
        loading.remove();
    }
    
    // Фильтруем сообщения по каналу
    const channelMessages = allMessages.filter(msg => msg.channel === currentChannel);
    
    container.innerHTML = '';
    
    if (channelMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#888; padding:40px 20px;">
                <i class="fas fa-comments" style="font-size:3em; margin-bottom:15px; display:block;"></i>
                Здесь пока нет сообщений...<br>
                <span style="font-size:0.9em; color:#666;">Будь первым!</span>
            </div>
        `;
        return;
    }
    
    channelMessages.forEach(displayMessage);
    scrollToBottom();
}

function displayMessage(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const isOwn = message.userId === myUserId;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.dataset.id = message.id;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">
                ${message.userAvatar} ${message.userName}
            </span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-content">${formatMessageText(message.text)}</div>
    `;
    
    container.appendChild(messageDiv);
}

function formatMessageText(text) {
    if (text.includes('call-link') || text.includes('call-announcement')) {
        return text;
    }
    
    let formattedText = text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/<3/g, '❤️')
        .replace(/:P/gi, '😛')
        .replace(/:O/gi, '😮')
        .replace(/;\)/g, '😉');
    
    formattedText = formattedText.replace(
        /(https?:\/\/[^\s]+)/g, 
        url => `<a href="${url}" target="_blank" style="color:#00ffff; text-decoration:underline;">${url}</a>`
    );
    
    return formattedText;
}

// ==================== ОБНОВЛЕНИЕ СПИСКА ОНЛАЙН ====================
function updateOnlineList() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    // Сортируем по последней активности
    const sortedUsers = Array.from(onlineUsers.entries())
        .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
        .slice(0, 20);
    
    membersList.innerHTML = '';
    
    if (sortedUsers.length === 0) {
        membersList.innerHTML = `
            <div style="text-align:center; color:#888; padding:20px;">
                <i class="fas fa-user" style="font-size:2em; display:block; margin-bottom:10px;"></i>
                Здесь пока никого нет...
            </div>
        `;
        return;
    }
    
    sortedUsers.forEach(([userId, user]) => {
        const isYou = userId === myUserId;
        const minutesAgo = Math.floor((Date.now() - user.lastSeen) / 60000);
        
        let status = 'Online';
        if (minutesAgo > 0) {
            status = minutesAgo < 2 ? 'Только что' : `${minutesAgo} мин назад`;
        }
        
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member';
        memberDiv.innerHTML = `
            <div class="member-avatar">${user.avatar}</div>
            <div>
                <div class="member-name">
                    ${user.name} ${isYou ? '<span style="color:#00ff80;">(Вы)</span>' : ''}
                </div>
                <div style="color: #88aaff; font-size: 0.8em;">
                    ${status}
                </div>
            </div>
        `;
        membersList.appendChild(memberDiv);
    });
    
    document.getElementById('onlineCount').textContent = sortedUsers.length;
}

// ==================== СИСТЕМНЫЕ СООБЩЕНИЯ ====================
function addSystemMessage(text) {
    if (!isConnected || !database) {
        console.log('Не могу отправить системное сообщение: нет подключения');
        return;
    }
    
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    database.ref('messages/' + message.id).set(message);
}

// ==================== ЗВОНКИ ====================
function startCall() {
    if (!database || !isConnected) {
        alert('❌ Нет подключения к Firebase для создания звонка');
        return;
    }
    
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '📞 Система',
        userAvatar: '📞',
        text: `🚀 <div class="call-announcement">
               <strong style="color:#00ffff; font-size:1.2em; display:block; margin-bottom:10px;">📢 ВСЕ НА ЗВОНОК!</strong>
               <a href="${jitsiUrl}" target="_blank" class="call-link">
               <i class="fas fa-phone-alt"></i> НАЖМИ ДЛЯ ПОДКЛЮЧЕНИЯ
               </a>
               <div style="margin-top:12px; font-size:0.9em; color:#aaa;">
               Или скопируй ссылку:<br>
               <code style="background:#222; padding:8px 12px; border-radius:6px; display:inline-block; margin-top:5px; font-size:0.85em; word-break:break-all; max-width:100%;">${jitsiUrl}</code>
               </div>
               </div>`,
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    database.ref('messages/' + message.id).set(message);
    window.open(jitsiUrl, '_blank');
}

// ==================== СИНХРОНИЗАЦИЯ ====================
function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        
        // Обновляем статус
        updateMyOnlineStatus();
        
        setTimeout(() => {
            btn.style.transform = 'rotate(0deg)';
        }, 300);
    }
}

// ==================== СМЕНА КАНАЛОВ ====================
function switchChannel(channel) {
    currentChannel = channel;
    
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    event.target.closest('.channel').classList.add('active');
    
    const channelNames = {
        'main': 'Основной чат',
        'news': 'Новости',
        'memes': 'Мемы',
        'games': 'Игры',
        'secret': 'Секретный',
        'admin': '👑 Админ-чат'
    };
    
    document.getElementById('channelName').textContent = channelNames[channel];
    updateMessagesDisplay();
    hideMobilePanels();
}

// ==================== ЭМОДЗИ ====================
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ==================== МОБИЛЬНЫЕ ФУНКЦИИ ====================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
    document.querySelector('.right-sidebar').classList.remove('active');
}

function toggleMembers() {
    const rightSidebar = document.querySelector('.right-sidebar');
    rightSidebar.classList.toggle('active');
    document.querySelector('.sidebar').classList.remove('active');
}

function hideMobilePanels() {
    document.querySelectorAll('.sidebar, .right-sidebar').forEach(panel => {
        panel.classList.remove('active');
    });
}

// ==================== УТИЛИТЫ ====================
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// ==================== ВЫХОД ====================
function logout() {
    if (confirm('Точно выйти из чата?')) {
        localStorage.removeItem('neonchat_user');
        location.reload();
    }
}

function logoutFromLogin() {
    if (confirm('Выйти и ввести новый ник?')) {
        localStorage.removeItem('neonchat_user');
        const logoutBtn = document.getElementById('logoutFromLoginButton');
        if (logoutBtn) logoutBtn.style.display = 'none';
        
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = '';
            usernameInput.focus();
        }
    }
}

// ==================== ТЕСТОВЫЙ ВХОД ====================
function quickTestLogin() {
    const usernameInput = document.getElementById('username');
    const testName = 'Тест' + Math.floor(Math.random() * 1000);
    usernameInput.value = testName;
    console.log('Тестовый вход как:', testName);
    enterChat();
}

// ==================== АДМИН ФУНКЦИИ ====================
function activateAdminMode() {
    console.log('🎯 Активация админ-режима для Артур Пирожков');
    
    // Добавляем админ-класс
    document.body.classList.add('admin-mode');
    
    // Показываем админ канал
    const adminChannel = document.getElementById('adminChannel');
    if (adminChannel) {
        adminChannel.style.display = 'flex';
    }
    
    // Показываем админ панель
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
    }
    
    // Отправляем системное сообщение
    setTimeout(() => {
        addSystemMessage('👑 Администратор <strong>Артур Пирожков</strong> в сети!');
    }, 2000);
    
    // Добавляем специальный аватар
    document.getElementById('userAvatar').textContent = '👑';
    document.getElementById('userAvatar').style.background = 'linear-gradient(45deg, #ff0000, #ff8800)';
}

async function adminClearChat() {
    if (!confirm('💀 ТОЧНО ОЧИСТИТЬ ВЕСЬ ЧАТ?\nЭто удалит ВСЕ сообщения у всех пользователей!')) {
        return;
    }
    
    if (!database) {
        alert('❌ Нет подключения к Firebase');
        return;
    }
    
    try {
        await database.ref('messages').remove();
        addSystemMessage('🧹 <strong style="color:#ff0000;">АДМИНИСТРАТОР</strong> очистил весь чат!');
        console.log('✅ Чат очищен админом');
    } catch (error) {
        console.error('Ошибка очистки чата:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function adminBanUser() {
    const userName = prompt('Введите ник пользователя для бана:');
    if (!userName) return;
    
    const reason = prompt('Причина бана (необязательно):') || 'Нарушение правил';
    const duration = prompt('Длительность (минут, 0=навсегда):', '60') || '60';
    
    if (!database) {
        alert('❌ Нет подключения к Firebase');
        return;
    }
    
    // Ищем пользователя в онлайн
    let foundUser = null;
    for (const [userId, user] of onlineUsers.entries()) {
        if (user.name === userName) {
            foundUser = { userId, ...user };
            break;
        }
    }
    
    if (!foundUser) {
        alert('❌ Пользователь не найден онлайн');
        return;
    }
    
    try {
        // Отправляем сообщение о бане
        const banMessage = {
            id: Date.now().toString(),
            userId: 'system',
            userName: '🚫 АДМИНИСТРАТОР',
            userAvatar: '🚫',
            text: `🚨 <div style="background: linear-gradient(45deg, rgba(255,0,0,0.2), rgba(255,68,0,0.2)); padding: 15px; border-radius: 10px; border: 2px solid #ff0000;">
                   <strong style="color:#ff0000; font-size:1.2em;">🚫 ПОЛЬЗОВАТЕЛЬ ЗАБАНЕН!</strong><br><br>
                   👤 <strong>${userName}</strong><br>
                   📝 <strong>Причина:</strong> ${reason}<br>
                   ⏰ <strong>Длительность:</strong> ${duration === '0' ? 'НАВСЕГДА' : duration + ' минут'}<br><br>
                   <div style="font-size:0.9em; color:#ff8888;">
                   👑 Забанен администратором <strong>Артур Пирожков</strong>
                   </div>
                   </div>`,
            channel: 'main',
            time: formatTime(new Date()),
            timestamp: Date.now()
        };
        
        await database.ref('messages/' + banMessage.id).set(banMessage);
        
        // Удаляем пользователя из онлайн
        await database.ref('users/' + foundUser.userId).remove();
        
        console.log(`✅ Пользователь ${userName} забанен`);
        alert(`✅ Пользователь ${userName} забанен!`);
        
    } catch (error) {
        console.error('Ошибка бана:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function adminSendAnnouncement() {
    const text = prompt('Текст объявления:');
    if (!text) return;
    
    const message = {
        id: Date.now().toString(),
        userId: 'system',
        userName: '📢 АДМИН-ОБЪЯВЛЕНИЕ',
        userAvatar: '📢',
        text: `📣 <div style="
            background: linear-gradient(45deg, #ff9900, #ffff00);
            padding: 20px;
            border-radius: 12px;
            color: #000;
            font-weight: bold;
            border: 3px solid #ff5500;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 153, 0, 0.5);
            margin: 10px 0;
        ">
            <div style="font-size: 1.3em; margin-bottom: 15px; color: #ff0000;">⚡ ВНИМАНИЕ ВСЕМ!</div>
            <div style="font-size: 1.1em; margin-bottom: 15px;">${text}</div>
            <div style="margin-top: 15px; font-size: 0.9em; color: #666; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 10px;">
                👑 От администратора <strong>Артур Пирожков</strong>
            </div>
        </div>`,
        channel: 'main',
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    if (database) {
        await database.ref('messages/' + message.id).set(message);
        console.log('✅ Объявление отправлено');
        alert('✅ Объявление отправлено всем пользователям!');
    }
}

async function adminTestMessage() {
    const message = {
        id: Date.now().toString(),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: '👑',
        text: '🔧 <span style="color:#00ffff;">[ТЕСТОВОЕ СООБЩЕНИЕ АДМИНИСТРАТОРА]</span> 🌟 Всё работает отлично! 👑<br><div style="background:rgba(255,0,0,0.1); padding:10px; border-radius:8px; margin-top:10px; font-size:0.9em;">Это тестовое сообщение от администратора чата</div>',
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    if (database) {
        await database.ref('messages/' + message.id).set(message);
        console.log('✅ Тестовое сообщение отправлено');
    }
}

async function adminExportData() {
    if (!database) return;
    
    try {
        const snapshot = await database.ref().once('value');
        const allData = snapshot.val();
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `neonchat_admin_backup_${new Date().toISOString().slice(0,10)}.json`);
        link.click();
        
        console.log('✅ Данные экспортированы админом');
        alert('✅ Все данные экспортированы в JSON файл!');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        alert('❌ Ошибка экспорта: ' + error.message);
    }
}

async function adminKickAll() {
    if (!confirm('🚨 КИКНУТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ?\nВсе онлайн пользователи будут отключены!')) {
        return;
    }
    
    if (!database) {
        alert('❌ Нет подключения к Firebase');
        return;
    }
    
    try {
        // Удаляем всех пользователей из онлайн
        await database.ref('users').remove();
        
        // Отправляем сообщение
        const message = {
            id: Date.now().toString(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: `🚨 <div style="background: linear-gradient(45deg, rgba(255,0,0,0.3), rgba(255,68,0,0.3)); padding: 20px; border-radius: 12px; border: 3px solid #ff0000; text-align: center;">
                   <strong style="color:#ff0000; font-size:1.3em;">⚠️ ВСЕ ПОЛЬЗОВАТЕЛИ ОТКЛЮЧЕНЫ!</strong><br><br>
                   🔥 Администратор <strong>Артур Пирожков</strong> отключил всех пользователей!<br><br>
                   <div style="font-size:0.9em; color:#ffaaaa;">
                   Перезайдите в чат для продолжения общения
                   </div>
                   </div>`,
            channel: 'main',
            time: formatTime(new Date()),
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

// ==================== ДЕБАГ ====================
window.debugChat = function() {
    console.log('=== ДЕБАГ CHAT ===');
    console.log('currentUser:', window.currentUser);
    console.log('myUserId:', window.myUserId);
    console.log('isConnected:', window.isConnected);
    
    const input = document.getElementById('messageInput');
    console.log('input.disabled:', input.disabled);
    console.log('input.value:', input.value);
    
    // Принудительно разблокируем
    input.disabled = false;
    input.placeholder = "Теперь можно писать!";
    input.focus();
    
    alert('Поле ввода разблокировано!\nПроверь консоль для деталей.');
};

// ==================== ДОБАВИТЬ НОВОСТИ ПРАВОЙ ПАНЕЛИ ====================
function initNewsPanel() {
    const newsBox = document.querySelector('.news-box');
    if (!newsBox) {
        console.error('Блок новостей не найден!');
        return;
    }
    
    // Добавляем новости если их нет
    if (!newsBox.querySelector('.news-item')) {
        newsBox.innerHTML = `
            <h4><i class="fas fa-info-circle"></i> Информация</h4>
            <div class="news-item">
                <strong>NeonChat v1.2 🎉</strong>
                <p>Обновленный чат с админ-панелью и мобильной версией</p>
                <small id="lastUpdate">Загрузка...</small>
            </div>
            <div class="news-item" style="margin-top: 10px;">
                <strong>Российский сервер 🇷🇺</strong>
                <p>Все данные хранятся на российских серверах</p>
                <small>Безопасно и быстро</small>
            </div>
        `;
    }
}

// Инициализируем новости при загрузке
setTimeout(initNewsPanel, 1000);
