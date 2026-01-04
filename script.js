// ==================== ОСНОВНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentChannel = 'main';
let autoRefreshEnabled = true;
let lastMessageId = 0;

// ==================== ЗАГРУЗКА ====================
window.onload = function() {
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showChat();
    }
    loadMessages();
    updateMembersList();
    startAutoRefresh();
    updateLastUpdateTime();
    
    document.querySelector('.main').addEventListener('click', function() {
        hideMobilePanels();
    });
}

// ==================== ВХОД В ЧАТ ====================
function enterChat() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Введи крутой ник!');
        usernameInput.focus();
        return;
    }
    
    const avatars = ['🦊', '🐯', '🐼', '🐨', '🦁', '🐲', '🐵', '🐸', '🦄', '🐙', '🦉', '🐷'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    currentUser = {
        name: username,
        avatar: randomAvatar,
        id: Date.now().toString(),
        lastActive: Date.now()
    };
    
    localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
    showChat();
    addSystemMessage(`${username} вошел в чат! 🎉`);
}

// ==================== ПОКАЗАТЬ ЧАТ ====================
function showChat() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('chatScreen').style.display = 'flex';
    
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    hideMobilePanels();
}

// ==================== ОТПРАВКА СООБЩЕНИЙ ====================
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    const message = {
        id: Date.now(),
        user: currentUser,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: currentChannel,
        timestamp: Date.now()
    };
    
    saveMessage(message);
    displayMessage(message);
    input.value = '';
    input.focus();
    updateLastUpdateTime();
    
    currentUser.lastActive = Date.now();
    localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
}

function saveMessage(message) {
    let messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    messages.push(message);
    if (messages.length > 500) {
        messages = messages.slice(-500);
    }
    localStorage.setItem('neonchat_messages', JSON.stringify(messages));
}

// ==================== ЗАГРУЗКА СООБЩЕНИЙ ====================
function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    const container = document.getElementById('messagesContainer');
    const currentMessages = messages.filter(msg => msg.channel === currentChannel);
    
    if (currentMessages.length > 0) {
        lastMessageId = Math.max(...currentMessages.map(m => m.id));
    }
    
    container.innerHTML = '';
    currentMessages.forEach(displayMessage);
    
    setTimeout(() => {
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }, 100);
}

// ==================== ОТОБРАЖЕНИЕ СООБЩЕНИЙ ====================
function displayMessage(message) {
    const container = document.getElementById('messagesContainer');
    const isOwn = message.user && currentUser && message.user.id === currentUser.id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.dataset.id = message.id;
    
    const userName = message.user?.name || 'Аноним';
    const userAvatar = message.user?.avatar || '👤';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">
                ${userAvatar} ${userName}
            </span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-content">${formatMessageText(message.text)}</div>
    `;
    
    if (message.id > lastMessageId) {
        messageDiv.style.animation = 'fadeIn 0.3s';
        lastMessageId = message.id;
    }
    
    container.appendChild(messageDiv);
}

function formatMessageText(text) {
    // Обрабатываем HTML в системных сообщениях (звонки)
    if (text.includes('call-link') || text.includes('call-announcement')) {
        return text;
    }
    
    return text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/;\)/g, '😉')
        .replace(/<3/g, '❤️')
        .replace(/lol/gi, '😂')
        .replace(/http[^\s]+/g, url => `<a href="${url}" target="_blank" class="message-link">${url}</a>`);
}

// ==================== СИСТЕМНЫЕ СООБЩЕНИЯ ====================
function addSystemMessage(text) {
    const container = document.getElementById('messagesContainer');
    
    const systemDiv = document.createElement('div');
    systemDiv.className = 'message system';
    systemDiv.innerHTML = `
        <div style="text-align: center; color: #00ffff; font-style: italic; padding: 5px;">
            ⚡ ${text}
        </div>
    `;
    
    container.appendChild(systemDiv);
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
    
    loadMessages();
    updateLastUpdateTime();
    hideMobilePanels();
}

// ==================== ЭМОДЗИ ====================
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ==================== УЧАСТНИКИ ====================
function updateMembersList() {
    const messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    const membersList = document.getElementById('membersList');
    
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const activeUsers = {};
    
    messages.forEach(msg => {
        if (msg.user && msg.timestamp > twoHoursAgo) {
            const userId = msg.user.id;
            if (!activeUsers[userId] || msg.timestamp > activeUsers[userId].lastSeen) {
                activeUsers[userId] = {
                    name: msg.user.name,
                    avatar: msg.user.avatar,
                    lastSeen: msg.timestamp
                };
            }
        }
    });
    
    if (currentUser) {
        activeUsers[currentUser.id] = {
            name: currentUser.name,
            avatar: currentUser.avatar,
            lastSeen: Date.now()
        };
    }
    
    const activeUsersArray = Object.values(activeUsers).sort((a, b) => b.lastSeen - a.lastSeen);
    const displayUsers = activeUsersArray.slice(0, 20);
    
    membersList.innerHTML = '';
    
    if (displayUsers.length === 0) {
        membersList.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <i class="fas fa-users" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                Здесь пока никого нет...
            </div>
        `;
    } else {
        displayUsers.forEach(user => {
            const isYou = currentUser && user.name === currentUser.name;
            const minutesAgo = Math.floor((Date.now() - user.lastSeen) / 60000);
            let statusText = 'Только что';
            
            if (minutesAgo > 0) {
                if (minutesAgo < 60) {
                    statusText = `${minutesAgo} мин назад`;
                } else {
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    statusText = `${hoursAgo} ч назад`;
                }
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
                        ${isYou ? 'Online' : statusText}
                    </div>
                </div>
            `;
            membersList.appendChild(memberDiv);
        });
    }
    
    document.getElementById('onlineCount').textContent = displayUsers.length;
}

// ==================== ЗВОНКИ ====================
function startCall() {
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    const message = {
        id: Date.now(),
        user: {name: '📞 Система', avatar: '📞'},
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
        time: new Date().toLocaleTimeString(),
        channel: currentChannel
    };
    
    saveMessage(message);
    displayMessage(message);
    window.open(jitsiUrl, '_blank');
    updateLastUpdateTime();
}

// ==================== АВТООБНОВЛЕНИЕ ====================
let refreshInterval;

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
        if (autoRefreshEnabled) {
            checkForNewMessages();
            updateMembersList();
        }
    }, 3000);
    
    document.getElementById('refreshStatus').textContent = 'ВКЛ';
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    document.getElementById('refreshStatus').textContent = 'ВЫКЛ';
}

function manualRefresh() {
    loadMessages();
    updateMembersList();
    updateLastUpdateTime();
    
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        btn.style.transform = 'rotate(0deg)';
    }, 300);
}

// ==================== ПРОВЕРКА НОВЫХ СООБЩЕНИЙ ====================
function checkForNewMessages() {
    const messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    const channelMessages = messages.filter(msg => msg.channel === currentChannel);
    const container = document.getElementById('messagesContainer');
    
    const displayedMessages = container.querySelectorAll('.message[data-id]');
    let lastDisplayedId = 0;
    
    if (displayedMessages.length > 0) {
        const lastMessage = displayedMessages[displayedMessages.length - 1];
        lastDisplayedId = parseInt(lastMessage.dataset.id) || 0;
    }
    
    const newMessages = channelMessages.filter(msg => msg.id > lastDisplayedId);
    
    if (newMessages.length > 0) {
        newMessages.forEach(displayMessage);
        
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;
        
        if (isScrolledToBottom) {
            scrollToBottom();
        } else {
            showNewMessagesAlert(newMessages.length);
        }
        
        updateLastUpdateTime();
    }
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNewMessagesAlert(count) {
    const alertDiv = document.getElementById('newMessagesAlert');
    
    if (count > 0) {
        alertDiv.style.display = 'flex';
        alertDiv.innerHTML = `
            <i class="fas fa-comment-alt"></i>
            ${count} нов${count === 1 ? 'ое' : 'ых'} сообщени${count === 1 ? 'е' : 'я'}
            <i class="fas fa-arrow-down" style="margin-left: auto;"></i>
        `;
        
        alertDiv.onclick = function() {
            scrollToBottom();
            alertDiv.style.display = 'none';
        };
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 10000);
    }
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
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
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('updateTime').textContent = timeStr;
    document.getElementById('lastUpdate').textContent = timeStr;
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'messageInput') {
        sendMessage();
    }
});

window.addEventListener('focus', function() {
    checkForNewMessages();
    updateMembersList();
});

setInterval(updateMembersList, 10000);

console.log('🚀 NeonChat загружен! Все видят одних и тех же участников.');
