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
    updateMembers();
    startAutoRefresh();
    updateLastUpdateTime();
    
    // Скрываем мобильные панели при клике на основной контент
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
        id: Date.now()
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
    
    // На мобильных скрываем панели
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
}

function saveMessage(message) {
    let messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    messages.push(message);
    // Храним только последние 500 сообщений
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
    
    // Находим последнее ID
    if (currentMessages.length > 0) {
        lastMessageId = Math.max(...currentMessages.map(m => m.id));
    }
    
    container.innerHTML = '';
    currentMessages.forEach(displayMessage);
    
    // Прокручиваем вниз если нужно
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
    const isOwn = message.user.id === currentUser?.id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.dataset.id = message.id;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">
                ${message.user.avatar} ${message.user.name}
            </span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-content">${formatMessageText(message.text)}</div>
    `;
    
    // Если это новое сообщение - анимация
    if (message.id > lastMessageId) {
        messageDiv.style.animation = 'fadeIn 0.3s';
        lastMessageId = message.id;
    }
    
    container.appendChild(messageDiv);
}

function formatMessageText(text) {
    return text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/;\)/g, '😉')
        .replace(/<3/g, '❤️')
        .replace(/lol/gi, '😂')
        .replace(/http[^\s]+/g, url => `<a href="${url}" target="_blank" style="color: #00ffff;">${url}</a>`);
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
    
    // Обновляем активный канал
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    event.target.closest('.channel').classList.add('active');
    
    // Обновляем название
    const channelNames = {
        'main': 'Основной чат',
        'news': 'Новости',
        'memes': 'Мемы',
        'games': 'Игры'
    };
    document.getElementById('channelName').textContent = channelNames[channel];
    
    // Загружаем сообщения
    loadMessages();
    updateLastUpdateTime();
    
    // На мобильных скрываем меню
    hideMobilePanels();
}

// ==================== ЭМОДЗИ ====================
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ==================== УЧАСТНИКИ ====================
function updateMembers() {
    const membersList = document.getElementById('membersList');
    let members = JSON.parse(localStorage.getItem('neonchat_members') || '[]');
    
    // Добавляем текущего пользователя
    if (currentUser) {
        const existingIndex = members.findIndex(m => m.id === currentUser.id);
        if (existingIndex === -1) {
            members.push(currentUser);
        } else {
            members[existingIndex] = currentUser;
        }
        
        // Удаляем старые записи (старше 24 часа)
        const now = Date.now();
        members = members.filter(m => now - (m.lastSeen || now) < 24 * 60 * 60 * 1000);
        
        // Обновляем время последней активности
        members.forEach(m => {
            if (m.id === currentUser.id) {
                m.lastSeen = now;
            }
        });
        
        localStorage.setItem('neonchat_members', JSON.stringify(members));
    }
    
    membersList.innerHTML = '';
    members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member';
        memberDiv.innerHTML = `
            <div class="member-avatar">${member.avatar}</div>
            <div>
                <div class="member-name">${member.name}</div>
                <div style="color: #00ff80; font-size: 0.85em;">
                    ${member.id === currentUser?.id ? 'Вы' : 'Online'}
                </div>
            </div>
        `;
        membersList.appendChild(memberDiv);
    });
    
    document.getElementById('onlineCount').textContent = members.length;
}

// ==================== ЗВОНКИ ====================
function startCall() {
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    const message = {
        id: Date.now(),
        user: {name: '📞 Система', avatar: '📞'},
        text: `🚀 ВСЕ НА ЗВОНОК! Ссылка: ${jitsiUrl}`,
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
            updateMembers();
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

function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    if (autoRefreshEnabled) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

function manualRefresh() {
    loadMessages();
    updateMembers();
    updateLastUpdateTime();
    
    // Анимация кнопки
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
    
    // Находим последнее отображенное сообщение
    const displayedMessages = container.querySelectorAll('.message[data-id]');
    let lastDisplayedId = 0;
    
    if (displayedMessages.length > 0) {
        const lastMessage = displayedMessages[displayedMessages.length - 1];
        lastDisplayedId = parseInt(lastMessage.dataset.id) || 0;
    }
    
    // Ищем новые сообщения
    const newMessages = channelMessages.filter(msg => msg.id > lastDisplayedId);
    
    if (newMessages.length > 0) {
        newMessages.forEach(displayMessage);
        
        // Проверяем, находится ли пользователь внизу чата
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
        
        // Автоскрытие через 10 секунд
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
    
    // Закрываем другую панель если открыта
    const rightSidebar = document.querySelector('.right-sidebar');
    rightSidebar.classList.remove('active');
}

function toggleMembers() {
    const rightSidebar = document.querySelector('.right-sidebar');
    rightSidebar.classList.toggle('active');
    
    // Закрываем другую панель если открыта
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('active');
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

// Обновляем при фокусе на окне
window.addEventListener('focus', function() {
    checkForNewMessages();
    updateMembers();
});

// Обновляем статус соединения
window.addEventListener('online', function() {
    document.getElementById('connectionStatus').textContent = '✓';
    document.getElementById('connectionStatus').style.color = '#00ff80';
});

window.addEventListener('offline', function() {
    document.getElementById('connectionStatus').textContent = '✗';
    document.getElementById('connectionStatus').style.color = '#ff5555';
});

// Инициализация
console.log('🚀 NeonChat загружен! Автообновление каждые 3 секунды.');
