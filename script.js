// ==================== КОНФИГУРАЦИЯ GIST ====================
const GIST_ID = ''; // Оставим пустым, создадим новый
const GITHUB_TOKEN = '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';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentChannel = 'main';
let allMessages = [];
let onlineUsers = new Map();
let myUserId = null;
let currentGistId = null;
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

// ==================== РАБОТА С GIST ====================
async function createNewGist() {
    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                description: 'NeonChat Data Storage',
                public: false,
                files: {
                    'chat_data.json': {
                        content: JSON.stringify({
                            messages: [],
                            users: {},
                            created: new Date().toISOString()
                        }, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to create Gist');
        
        const data = await response.json();
        currentGistId = data.id;
        localStorage.setItem('neonchat_gist_id', currentGistId);
        
        console.log('✅ Created new Gist:', currentGistId);
        return data;
    } catch (error) {
        console.error('Error creating Gist:', error);
        throw error;
    }
}

async function getGistData() {
    try {
        let gistId = localStorage.getItem('neonchat_gist_id');
        
        // Если нет Gist ID, создаем новый
        if (!gistId) {
            const newGist = await createNewGist();
            gistId = newGist.id;
        }
        
        currentGistId = gistId;
        
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            // Если Gist не найден, создаем новый
            if (response.status === 404) {
                localStorage.removeItem('neonchat_gist_id');
                const newGist = await createNewGist();
                return newGist;
            }
            throw new Error('Failed to fetch Gist');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error getting Gist:', error);
        throw error;
    }
}

async function saveToGist(data) {
    try {
        if (!currentGistId) {
            const gist = await createNewGist();
            currentGistId = gist.id;
        }
        
        const response = await fetch(`https://api.github.com/gists/${currentGistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                description: `NeonChat - Last update: ${new Date().toLocaleString()}`,
                files: {
                    'chat_data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to save Gist');
        
        return await response.json();
    } catch (error) {
        console.error('Error saving to Gist:', error);
        throw error;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = async function() {
    console.log('🚀 Starting NeonChat...');
    
    // Показываем загрузку
    document.getElementById('loadingMessages').innerHTML = 
        '<i class="fas fa-spinner fa-spin"></i> Подключаемся к чату...';
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        myUserId = currentUser.id;
        showChat();
    }
    
    // Загружаем данные
    try {
        await loadChatData();
        document.getElementById('loadingMessages').remove();
        startSyncLoop();
        console.log('✅ Chat loaded successfully');
    } catch (error) {
        console.error('Failed to load chat:', error);
        document.getElementById('loadingMessages').innerHTML = 
            '<div style="text-align:center; color:#ff5555; padding:20px;">' +
            '<i class="fas fa-exclamation-triangle"></i><br>' +
            'Ошибка загрузки чата<br>' +
            '<button onclick="location.reload()" class="neon-btn" style="margin-top:10px; padding:10px;">Повторить</button>' +
            '</div>';
    }
    
    // Обновляем онлайн статус
    setInterval(updateMyOnlineStatus, 30000);
    
    document.querySelector('.main').addEventListener('click', hideMobilePanels);
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
    
    // Загружаем данные
    try {
        await loadChatData();
        document.getElementById('loadingMessages').remove();
        startSyncLoop();
        
        // Добавляем системное сообщение
        addSystemMessage(`${username} вошел в чат! 👋`);
    } catch (error) {
        console.error('Error entering chat:', error);
        alert('Ошибка входа. Обнови страницу и попробуй снова.');
    }
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
        const gist = await getGistData();
        const file = gist.files['chat_data.json'];
        
        if (!file || !file.content) {
            throw new Error('No chat data found');
        }
        
        const data = JSON.parse(file.content);
        
        // Обновляем сообщения
        if (data.messages && Array.isArray(data.messages)) {
            allMessages = data.messages;
            updateMessagesDisplay();
        }
        
        // Обновляем онлайн пользователей
        if (data.users && typeof data.users === 'object') {
            onlineUsers = new Map(Object.entries(data.users));
            
            // Удаляем неактивных (больше 5 минут)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            for (const [userId, user] of onlineUsers.entries()) {
                if (user.lastSeen < fiveMinutesAgo) {
                    onlineUsers.delete(userId);
                }
            }
            
            updateOnlineList();
        }
        
        // Обновляем счетчики
        document.getElementById('messageCount').textContent = allMessages.length;
        document.getElementById('onlineCount').textContent = onlineUsers.size;
        document.getElementById('lastSync').textContent = 'только что';
        document.getElementById('lastUpdate').textContent = formatTime(new Date());
        document.getElementById('syncStatus').style.color = '#00ff80';
        document.getElementById('syncStatus').textContent = '✓';
        
        return data;
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('syncStatus').style.color = '#ff5555';
        document.getElementById('syncStatus').textContent = '✗';
        throw error;
    }
}

// ==================== ОБНОВЛЕНИЕ ОНЛАЙН СТАТУСА ====================
async function updateMyOnlineStatus() {
    if (!currentUser) return;
    
    try {
        const data = await loadChatData();
        
        // Обновляем свой статус
        data.users = data.users || {};
        data.users[myUserId] = {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        };
        
        // Сохраняем
        await saveToGist(data);
        
        // Обновляем локально
        onlineUsers.set(myUserId, data.users[myUserId]);
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
        const data = await loadChatData();
        
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
        
        // Сохраняем
        await saveToGist(data);
        
        // Обновляем локально
        allMessages = data.messages;
        onlineUsers.set(myUserId, data.users[myUserId]);
        
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
    
    return text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/<3/g, '❤️')
        .replace(/http[^\s]+/g, url => 
            `<a href="${url}" target="_blank" style="color:#00ffff; text-decoration:underline;">${url}</a>`
        );
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
    if (syncInterval) clearInterval(syncInterval);
    
    syncInterval = setInterval(async () => {
        try {
            await loadChatData();
        } catch (error) {
            console.error('Sync error:', error);
        }
    }, 5000);
}

async function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    
    try {
        await loadChatData();
    } catch (error) {
        console.error('Force sync error:', error);
    }
    
    setTimeout(() => {
        btn.style.transform = 'rotate(0deg)';
    }, 300);
}

// ==================== ЗВОНКИ ====================
async function startCall() {
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
    
    try {
        // Получаем данные
        const data = await loadChatData();
        
        // Добавляем сообщение
        data.messages = data.messages || [];
        data.messages.push(message);
        
        if (data.messages.length > 500) {
            data.messages = data.messages.slice(-500);
        }
        
        // Сохраняем
        await saveToGist(data);
        
        // Обновляем локально
        allMessages = data.messages;
        displayMessage(message);
        
        // Открываем звонок
        window.open(jitsiUrl, '_blank');
        scrollToBottom();
        
    } catch (error) {
        console.error('Call error:', error);
        alert('Ошибка создания звонка. Попробуй еще раз.');
    }
}

// ==================== СИСТЕМНЫЕ СООБЩЕНИЯ ====================
async function addSystemMessage(text) {
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
    
    try {
        const data = await loadChatData();
        data.messages = data.messages || [];
        data.messages.push(message);
        
        if (data.messages.length > 500) {
            data.messages = data.messages.slice(-500);
        }
        
        await saveToGist(data);
        allMessages = data.messages;
        displayMessage(message);
        scrollToBottom();
        
    } catch (error) {
        console.error('System message error:', error);
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'messageInput') {
        sendMessage();
    }
});

// При закрытии вкладки
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        // Пытаемся обновить статус, но не блокируем закрытие
        updateMyOnlineStatus().catch(() => {});
    }
});
