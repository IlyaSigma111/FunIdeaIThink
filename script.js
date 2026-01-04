// ==================== КОНФИГУРАЦИЯ ====================
// Твой GitHub репозиторий где будет храниться chat.json
const GITHUB_USERNAME = 'ilyasigma111'; // Твой GitHub username
const REPO_NAME = 'FunIdeaIthink'; // Твой репозиторий
const JSON_FILE_PATH = 'chat.json';
const GITHUB_TOKEN = ''; // Оставь пустым для публичного доступа

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentChannel = 'main';
let allMessages = [];
let onlineUsers = new Map();
let myUserId = null;
let syncInterval;

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

// ==================== РАБОТА С GITHUB JSON ====================
async function loadChatFromGitHub() {
    try {
        console.log('Загружаем чат с GitHub...');
        
        // Пробуем загрузить напрямую из репозитория
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${JSON_FILE_PATH}?t=${Date.now()}`;
        console.log('Загружаем с URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('JSON файл не найден (статус:', response.status, '), создаем новый чат...');
            return {
                messages: [],
                users: {},
                lastUpdated: Date.now()
            };
        }
        
        const data = await response.json();
        
        console.log(`✅ Загружено ${data.messages?.length || 0} сообщений с GitHub`);
        return data;
        
    } catch (error) {
        console.error('Ошибка загрузки с GitHub:', error);
        
        // Возвращаем пустые данные при ошибке
        return {
            messages: [],
            users: {},
            lastUpdated: Date.now()
        };
    }
}

async function saveChatToGitHub(chatData) {
    // НЕ сохраняем на GitHub без токена (только для чтения)
    // Вместо этого сохраняем локально
    saveToLocalStorage(chatData);
    return true;
}

function saveToLocalStorage(chatData) {
    try {
        localStorage.setItem('neonchat_backup', JSON.stringify(chatData));
        localStorage.setItem('neonchat_last_save', Date.now().toString());
        
        document.getElementById('syncStatus').style.color = '#00ff80';
        document.getElementById('syncStatus').textContent = '✓';
        document.getElementById('lastSync').textContent = 'локально';
        document.getElementById('lastUpdate').textContent = formatTime(new Date());
        
        console.log('✅ Данные сохранены локально');
        return true;
    } catch (error) {
        console.error('Ошибка локального сохранения:', error);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('neonchat_backup');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
    }
    return null;
}

// ==================== СИНХРОНИЗАЦИЯ ДАННЫХ ====================
async function loadChatData() {
    try {
        // 1. Пробуем загрузить с GitHub (новые сообщения от других)
        const githubData = await loadChatFromGitHub();
        
        // 2. Загружаем локальные данные (наши неотправленные сообщения)
        const localData = loadFromLocalStorage();
        
        // 3. Объединяем данные
        let mergedMessages = [];
        let mergedUsers = {};
        
        // Берем сообщения с GitHub
        if (githubData.messages && Array.isArray(githubData.messages)) {
            mergedMessages = githubData.messages;
        }
        
        // Берем пользователей с GitHub
        if (githubData.users && typeof githubData.users === 'object') {
            mergedUsers = githubData.users;
        }
        
        // Если есть локальные данные, объединяем
        if (localData) {
            // Добавляем локальные сообщения (если их нет на GitHub)
            if (localData.messages && Array.isArray(localData.messages)) {
                const githubMessageIds = new Set(mergedMessages.map(m => m.id));
                
                localData.messages.forEach(localMsg => {
                    if (!githubMessageIds.has(localMsg.id)) {
                        mergedMessages.push(localMsg);
                    }
                });
            }
            
            // Обновляем пользователей
            if (localData.users && typeof localData.users === 'object') {
                mergedUsers = { ...mergedUsers, ...localData.users };
            }
        }
        
        // Сортируем сообщения по времени
        mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Ограничиваем историю (последние 300 сообщений)
        if (mergedMessages.length > 300) {
            mergedMessages = mergedMessages.slice(-300);
        }
        
        // Сохраняем объединенные данные
        allMessages = mergedMessages;
        onlineUsers = new Map(Object.entries(mergedUsers));
        
        // Удаляем неактивных пользователей (больше 10 минут)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        for (const [userId, user] of onlineUsers.entries()) {
            if (user.lastSeen < tenMinutesAgo) {
                onlineUsers.delete(userId);
            }
        }
        
        // Обновляем UI
        updateMessagesDisplay();
        updateOnlineList();
        
        document.getElementById('messageCount').textContent = allMessages.length;
        document.getElementById('onlineCount').textContent = onlineUsers.size;
        document.getElementById('syncStatus').style.color = '#00ff80';
        document.getElementById('syncStatus').textContent = '✓';
        document.getElementById('lastSync').textContent = 'синхронизировано';
        document.getElementById('lastUpdate').textContent = formatTime(new Date());
        
        console.log(`✅ Данные загружены: ${allMessages.length} сообщений`);
        
        return {
            messages: allMessages,
            users: Object.fromEntries(onlineUsers),
            lastUpdated: Date.now()
        };
        
    } catch (error) {
        console.error('Ошибка загрузки чата:', error);
        
        // Используем локальные данные при ошибке
        const localData = loadFromLocalStorage();
        if (localData) {
            allMessages = localData.messages || [];
            onlineUsers = new Map(Object.entries(localData.users || {}));
        }
        
        updateMessagesDisplay();
        updateOnlineList();
        
        document.getElementById('syncStatus').style.color = '#ff9900';
        document.getElementById('syncStatus').textContent = '!';
        document.getElementById('lastSync').textContent = 'оффлайн';
        
        return null;
    }
}

async function saveChatData() {
    try {
        const chatData = {
            messages: allMessages,
            users: Object.fromEntries(onlineUsers),
            lastUpdated: Date.now()
        };
        
        // Сохраняем локально
        saveToLocalStorage(chatData);
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        return false;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = async function() {
    console.log('🚀 Запускаем NeonChat (мультиустройственная версия)...');
    
    // Показываем загрузку
    document.getElementById('loadingMessages').innerHTML = 
        '<i class="fas fa-spinner fa-spin"></i> Подключаемся к чату...';
    
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
                
                // Загружаем данные
                await loadChatData();
                
                // Запускаем синхронизацию
                startSyncLoop();
                
                // Добавляем обработчик Enter
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    });
                }
                
                // Добавляем себя в онлайн
                onlineUsers.set(myUserId, {
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    lastSeen: Date.now()
                });
                
                updateOnlineList();
                await saveChatData();
                
            } else {
                console.log('Невалидные данные пользователя');
                document.getElementById('loginScreen').classList.add('active');
            }
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
            document.getElementById('loginScreen').classList.add('active');
        }
    }
    
    // Обновляем онлайн статус
    setInterval(updateMyOnlineStatus, 30000);
    
    document.querySelector('.main')?.addEventListener('click', hideMobilePanels);
};

// ==================== ВХОД В ЧАТ ====================
async function enterChat() {
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
    document.getElementById('loadingMessages').innerHTML = 
        '<i class="fas fa-spinner fa-spin"></i> Входим в чат...';
    
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
    
    try {
        // Загружаем данные
        await loadChatData();
        
        // Добавляем себя в онлайн
        onlineUsers.set(myUserId, {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        });
        
        // Убираем загрузку
        const loadingEl = document.getElementById('loadingMessages');
        if (loadingEl) loadingEl.remove();
        
        // Запускаем синхронизацию
        startSyncLoop();
        
        // Добавляем системное сообщение
        addSystemMessage(`${username} вошел в чат! 👋`);
        
        // Добавляем обработчик Enter
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        console.log('✅ Успешный вход:', username);
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        
        // Все равно показываем чат
        const loadingEl = document.getElementById('loadingMessages');
        if (loadingEl) loadingEl.remove();
    }
    
    hideMobilePanels();
}

// ==================== ОБНОВЛЕНИЕ ОНЛАЙН СТАТУСА ====================
async function updateMyOnlineStatus() {
    if (!currentUser) return;
    
    try {
        // Обновляем свой статус
        onlineUsers.set(myUserId, {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        });
        
        updateOnlineList();
        await saveChatData();
        await loadChatData(); // Обновляем данные с сервера
        
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
    
    const message = {
        id: Date.now(),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text,
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    // Сразу показываем сообщение
    allMessages.push(message);
    displayMessage(message);
    
    // Очищаем поле ввода
    input.value = '';
    input.focus();
    
    // Прокручиваем вниз
    scrollToBottom();
    
    // Обновляем счетчики
    document.getElementById('messageCount').textContent = allMessages.length;
    
    // Обновляем свой статус
    onlineUsers.set(myUserId, {
        name: currentUser.name,
        avatar: currentUser.avatar,
        lastSeen: Date.now()
    });
    
    updateOnlineList();
    
    // Сохраняем данные
    await saveChatData();
    
    console.log('✅ Сообщение отправлено');
}

// ==================== ОТОБРАЖЕНИЕ СООБЩЕНИЙ ====================
function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
    const loading = document.getElementById('loadingMessages');
    
    if (loading) loading.remove();
    
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
        .replace(/<3/g, '❤️');
    
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

// ==================== СИНХРОНИЗАЦИЯ ====================
function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);
    
    syncInterval = setInterval(async () => {
        try {
            await loadChatData();
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }, 5000);
}

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
    }
    
    loadChatData();
    
    setTimeout(() => {
        if (btn) {
            btn.style.transform = 'rotate(0deg)';
        }
    }, 300);
}

// ==================== ЗВОНКИ ====================
function startCall() {
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    const message = {
        id: Date.now(),
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
    
    allMessages.push(message);
    displayMessage(message);
    scrollToBottom();
    saveChatData();
    
    window.open(jitsiUrl, '_blank');
}

// ==================== СИСТЕМНЫЕ СООБЩЕНИЯ ====================
function addSystemMessage(text) {
    const message = {
        id: Date.now(),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: formatTime(new Date()),
        timestamp: Date.now()
    };
    
    allMessages.push(message);
    displayMessage(message);
    scrollToBottom();
    saveChatData();
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
