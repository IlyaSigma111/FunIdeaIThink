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

// Проверяем, что Firebase загружен
if (typeof firebase === 'undefined') {
    console.error('Firebase не загружен! Добавь скрипты в HTML.');
} else {
    try {
        // Инициализируем Firebase
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
                
                // Показываем чат
                document.getElementById('loginScreen').classList.remove('active');
                document.getElementById('chatScreen').style.display = 'flex';
                
                // Обновляем UI
                document.getElementById('currentUserName').textContent = currentUser.name;
                document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
                
                // РАЗБЛОКИРОВКА ПОЛЯ ВВОДА
                const messageInput = document.getElementById('messageInput');
                const sendBtn = document.querySelector('.send-btn');
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.placeholder = "Напиши сообщение...";
                    messageInput.focus();
                    console.log('✅ Поле ввода разблокировано');
                }
                if (sendBtn) {
                    sendBtn.disabled = false;
                }
                
                // Инициализируем Firebase через секунду
                setTimeout(() => {
                    initFirebaseListeners();
                    
                    // Убираем загрузку
                    setTimeout(() => {
                        if (loadingEl) loadingEl.remove();
                    }, 1500);
                }, 500);
                
                // Добавляем обработчик Enter
                if (messageInput) {
                    messageInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    });
                }
                
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
                
            } else {
                console.log('Невалидные данные пользователя');
                document.getElementById('loginScreen').classList.add('active');
            }
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
            document.getElementById('loginScreen').classList.add('active');
        }
    }
    
    // Обновляем статус каждые 30 секунд
    setInterval(() => {
        if (currentUser && isConnected) {
            updateMyOnlineStatus();
        }
    }, 30000);
    
    // Обработчик кликов
    document.querySelector('.main')?.addEventListener('click', hideMobilePanels);
};

// ==================== ВХОД В ЧАТ ====================
function enterChat() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Введи крутой ник!');
        usernameInput.focus();
        return;
    }
    
    // Показываем загрузку
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('chatScreen').style.display = 'flex';
    
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
    
    // Обновляем UI
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    // РАЗБЛОКИРОВКА ПОЛЯ ВВОДА
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.querySelector('.send-btn');
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = "Напиши сообщение...";
        messageInput.focus();
        console.log('✅ Поле ввода разблокировано после входа');
    }
    if (sendBtn) {
        sendBtn.disabled = false;
    }
    
    // Инициализируем Firebase
    setTimeout(() => {
        initFirebaseListeners();
        
        // Добавляем обработчик Enter
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Добавляем системное сообщение
        setTimeout(() => {
            addSystemMessage(`${username} вошел в чат! 👋`);
        }, 1000);
        
        console.log('✅ Успешный вход:', username);
        
    }, 500);
    
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
        'games': 'Игры'
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

// ==================== ОЧИСТКА ЛОКАЛЬНЫХ ДАННЫХ ====================
function clearLocalData() {
    if (confirm('Очистить все локальные данные (ник, история)?')) {
        localStorage.clear();
        location.reload();
    }
}

// ==================== ЭКСПОРТ ДАННЫХ ====================
function exportChatData() {
    const chatData = {
        messages: allMessages,
        users: Object.fromEntries(onlineUsers),
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'neonchat_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('✅ Данные экспортированы');
}

// ==================== ДЕБАГ И МОНИТОРИНГ ====================
function checkInputStatus() {
    const input = document.getElementById('messageInput');
    if (input && input.disabled) {
        console.warn('ВНИМАНИЕ: Поле ввода заблокировано!');
        // Автоматически разблокируем
        input.disabled = false;
        input.placeholder = "Напиши сообщение...";
        input.focus();
    }
}

// Проверяем каждые 2 секунды
setInterval(checkInputStatus, 2000);

// Принудительная разблокировка при клике
document.addEventListener('click', function(e) {
    const input = document.getElementById('messageInput');
    if (input && input.disabled) {
        input.disabled = false;
        console.log('Поле ввода разблокировано принудительно при клике');
    }
});

// Автоматическая разблокировка при загрузке
setTimeout(function() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.disabled = false;
        console.log('Автоматическая разблокировка поля ввода при загрузке');
    }
}, 1000);
