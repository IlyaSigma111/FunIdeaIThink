// ==================== КОНФИГУРАЦИЯ ====================
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'IlyaSigma111';
const REPO_NAME = 'FunIdeaIThink';
const DATA_FILE = 'chat_data.json';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentChannel = 'main';
let allMessages = [];
let onlineUsers = new Map();
let lastUpdateTime = 0;
let syncInterval;
let myUserId = null;

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

// ==================== GITHUB API ====================
async function fetchFromGitHub(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('GitHub fetch error:', error);
        throw error;
    }
}

async function getDataFile() {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`;
        const data = await fetchFromGitHub(url);
        
        if (data.content) {
            const content = atob(data.content);
            return JSON.parse(content);
        }
    } catch (error) {
        // Файла нет, создадим его позже
        return { messages: [], users: {} };
    }
}

async function saveDataToGitHub(data) {
    try {
        // Сначала получаем текущий файл чтобы узнать sha
        let sha = null;
        try {
            const current = await getDataFile();
            if (current.sha) sha = current.sha;
        } catch (e) {}
        
        const content = btoa(JSON.stringify(data, null, 2));
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`;
        
        const response = await fetchFromGitHub(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Chat update at ${new Date().toISOString()}`,
                content: content,
                sha: sha
            })
        });
        
        return response;
    } catch (error) {
        console.error('Save error:', error);
        throw error;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = async function() {
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        myUserId = currentUser.id;
        showChat();
    }
    
    // Загружаем данные
    await loadChatData();
    startSyncLoop();
    
    // Обновляем онлайн статус
    updateMyOnlineStatus();
    setInterval(updateMyOnlineStatus, 30000); // Каждые 30 секунд
    
    document.querySelector('.main').addEventListener('click', hideMobilePanels);
    
    console.log('🚀 NeonChat запущен с синхронизацией!');
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
    
    // Создаем пользователя
    myUserId = generateUserId();
    currentUser = {
        id: myUserId,
        name: username,
        avatar: getRandomAvatar(),
        lastSeen: Date.now()
    };
    
    // Сохраняем локально
    localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
    
    // Показываем чат
    showChat();
    
    // Обновляем онлайн статус
    await updateMyOnlineStatus();
    
    // Добавляем системное сообщение
    addSystemMessage(`${username} вошел в чат! 👋`);
}

// ==================== ПОКАЗАТЬ ЧАТ ====================
function showChat() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('chatScreen').style.display = 'flex';
    
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    hideMobilePanels();
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadChatData() {
    try {
        const data = await getDataFile();
        
        // Обновляем сообщения если есть новые
        if (data.messages && Array.isArray(data.messages)) {
            const newMessages = data.messages.filter(msg => msg.id > lastUpdateTime);
            
            if (newMessages.length > 0) {
                allMessages = data.messages;
                lastUpdateTime = Math.max(...data.messages.map(m => m.id));
                updateMessagesDisplay();
            }
        }
        
        // Обновляем онлайн пользователей
        if (data.users && typeof data.users === 'object') {
            onlineUsers = new Map(Object.entries(data.users));
            updateOnlineList();
        }
        
        // Обновляем счетчики
        document.getElementById('messageCount').textContent = allMessages.length;
        document.getElementById('onlineCount').textContent = onlineUsers.size;
        document.getElementById('lastSync').textContent = 'только что';
        document.getElementById('lastUpdate').textContent = formatTime(new Date());
        document.getElementById('syncStatus').style.color = '#00ff80';
        document.getElementById('syncStatus').textContent = '✓';
        
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('syncStatus').style.color = '#ff5555';
        document.getElementById('syncStatus').textContent = '✗';
    }
}

// ==================== ОБНОВЛЕНИЕ ОНЛАЙН СТАТУСА ====================
async function updateMyOnlineStatus() {
    if (!currentUser) return;
    
    try {
        const data = await getDataFile();
        
        // Обновляем свой статус
        data.users = data.users || {};
        data.users[myUserId] = {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        };
        
        // Удаляем неактивных (больше 2 минут)
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        for (const userId in data.users) {
            if (data.users[userId].lastSeen < twoMinutesAgo) {
                delete data.users[userId];
            }
        }
        
        // Сохраняем
        await saveDataToGitHub(data);
        
        // Обновляем локально
        onlineUsers = new Map(Object.entries(data.users));
        updateOnlineList();
        
    } catch (error) {
        console.error('Online status update error:', error);
    }
}

// ==================== ОТПРАВКА СООБЩЕНИЯ ====================
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
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
    
    try {
        // Получаем текущие данные
        const data = await getDataFile();
        
        // Добавляем сообщение
        data.messages = data.messages || [];
        data.messages.push(message);
        
        // Ограничиваем историю (последние 500 сообщений)
        if (data.messages.length > 500) {
            data.messages = data.messages.slice(-500);
        }
        
        // Обновляем свой онлайн статус
        data.users = data.users || {};
        data.users[myUserId] = {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        };
        
        // Сохраняем на GitHub
        await saveDataToGitHub(data);
        
        // Обновляем локально
        allMessages = data.messages;
        onlineUsers = new Map(Object.entries(data.users));
        
        // Показываем сообщение
        displayMessage(message);
        
        // Очищаем поле ввода
        input.value = '';
        input.focus();
        
        // Обновляем UI
        updateOnlineList();
        document.getElementById('messageCount').textContent = allMessages.length;
        document.getElementById('onlineCount').textContent = onlineUsers.size;
        
        // Прокручиваем вниз
        scrollToBottom();
        
    } catch (error) {
        console.error('Send message error:', error);
        alert('Ошибка отправки сообщения. Попробуй еще раз.');
    }
}

// ==================== ОТОБРАЖЕНИЕ СООБЩЕНИЙ ====================
function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
    const loading = document.getElementById('loadingMessages');
    
    if (loading) loading.remove();
    
    // Фильтруем сообщения по каналу
    const channelMessages = allMessages.filter(msg => msg.channel === currentChannel);
    
    // Очищаем и добавляем заново
    container.innerHTML = '';
    channelMessages.forEach(displayMessage);
    
    // Прокручиваем вниз
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
    if (text.includes('call-link')) {
        return text; // Не форматируем HTML звонков
    }
    
    return text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/<3/g, '❤️')
        .replace(/http[^\s]+/g, url => 
            `<a href="${url}" target="_blank" style="color:#00ffff;">${url}</a>`
        );
}

// ==================== ОБНОВЛЕНИЕ СПИСКА ОНЛАЙН ====================
function updateOnlineList() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    // Сортируем по последней активности
    const sortedUsers = Array.from(onlineUsers.entries())
        .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
        .slice(0, 20); // Ограничиваем 20 пользователями
    
    membersList.innerHTML = '';
    
    if (sortedUsers.length === 0) {
        membersList.innerHTML = `
            <div style="text-align:center; color:#888; padding:20px;">
                <i class="fas fa-users" style="font-size:2em; display:block; margin-bottom:10px;"></i>
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
    // Синхронизируем каждые 5 секунд
    syncInterval = setInterval(async () => {
        await loadChatData();
    }, 5000);
}

async function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    
    await loadChatData();
    
    setTimeout(() => {
        btn.style.transform = 'rotate(0deg)';
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
    
    // Добавляем локально
    allMessages.push(message);
    displayMessage(message);
    
    // Сохраняем асинхронно
    saveMessageAsync(message);
    
    // Открываем звонок
    window.open(jitsiUrl, '_blank');
    scrollToBottom();
}

async function saveMessageAsync(message) {
    try {
        const data = await getDataFile();
        data.messages = data.messages || [];
        data.messages.push(message);
        
        if (data.messages.length > 500) {
            data.messages = data.messages.slice(-500);
        }
        
        await saveDataToGitHub(data);
        allMessages = data.messages;
        
    } catch (error) {
        console.error('Save call message error:', error);
    }
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
    
    saveMessageAsync(message);
    scrollToBottom();
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'messageInput') {
        sendMessage();
    }
});

// При закрытии вкладки обновляем последний раз
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        updateMyOnlineStatus();
    }
});

// Периодическая чистка старых сообщений (раз в минуту)
setInterval(async () => {
    try {
        const data = await getDataFile();
        if (data.messages && data.messages.length > 1000) {
            data.messages = data.messages.slice(-500);
            await saveDataToGitHub(data);
            allMessages = data.messages;
        }
    } catch (error) {
        // Игнорируем ошибки очистки
    }
}, 60000);
