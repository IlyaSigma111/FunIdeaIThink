// Данные пользователя
let currentUser = null;
let currentChannel = 'main';

// Загрузка при старте
window.onload = function() {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showChat();
    }
    loadMessages();
    updateMembers();
}

// Вход в чат
function enterChat() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Введи крутой ник!');
        usernameInput.focus();
        return;
    }
    
    // Создаем аватарку из первой буквы
    const avatars = ['🦊', '🐯', '🐼', '🐨', '🦁', '🐲', '🐵', '🐸'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    currentUser = {
        name: username,
        avatar: randomAvatar,
        id: Date.now()
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
    
    // Показываем чат
    showChat();
    
    // Добавляем приветственное сообщение
    addSystemMessage(`${username} вошел в чат! 🎉`);
}

// Показать экран чата
function showChat() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('chatScreen').style.display = 'flex';
    
    // Устанавливаем данные пользователя
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
}

// Отправить сообщение
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Создаем сообщение
    const message = {
        id: Date.now(),
        user: currentUser,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: currentChannel
    };
    
    // Сохраняем
    saveMessage(message);
    
    // Отображаем
    displayMessage(message);
    
    // Очищаем поле ввода
    input.value = '';
    input.focus();
}

// Сохранить сообщение
function saveMessage(message) {
    let messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    messages.push(message);
    localStorage.setItem('neonchat_messages', JSON.stringify(messages));
}

// Загрузить сообщения
function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('neonchat_messages') || '[]');
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    // Показываем только сообщения для текущего канала
    messages
        .filter(msg => msg.channel === currentChannel)
        .forEach(displayMessage);
}

// Отобразить сообщение
function displayMessage(message) {
    const container = document.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.user.id === currentUser.id ? 'own' : ''}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">
                ${message.user.avatar} ${message.user.name}
            </span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-content">${formatMessageText(message.text)}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Форматирование текста (эмодзи, ссылки)
function formatMessageText(text) {
    let formatted = text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/<3/g, '❤️')
        .replace(/lol/g, '😂');
    
    return formatted;
}

// Системное сообщение
function addSystemMessage(text) {
    const container = document.getElementById('messagesContainer');
    
    const systemDiv = document.createElement('div');
    systemDiv.className = 'message system';
    systemDiv.innerHTML = `
        <div style="text-align: center; color: #00ffff; font-style: italic;">
            ⚡ ${text}
        </div>
    `;
    
    container.appendChild(systemDiv);
    container.scrollTop = container.scrollHeight;
}

// Сменить канал
function switchChannel(channel) {
    currentChannel = channel;
    
    // Обновляем активный канал
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    event.target.closest('.channel').classList.add('active');
    
    // Обновляем название канала
    const channelNames = {
        'main': 'Основной чат',
        'news': 'Новости',
        'memes': 'Мемы',
        'games': 'Игры'
    };
    document.getElementById('channelName').textContent = channelNames[channel];
    
    // Загружаем сообщения для этого канала
    loadMessages();
}

// Добавить эмодзи
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// Обновить список участников
function updateMembers() {
    const membersList = document.getElementById('membersList');
    const members = JSON.parse(localStorage.getItem('neonchat_members') || '[]');
    
    // Добавляем текущего пользователя если его нет
    if (currentUser && !members.find(m => m.id === currentUser.id)) {
        members.push(currentUser);
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
                <div style="color: #00ff80; font-size: 0.9em;">Online</div>
            </div>
        `;
        membersList.appendChild(memberDiv);
    });
    
    // Обновляем счетчик онлайн
    document.getElementById('onlineCount').textContent = members.length;
}

// Созвать всех на звонок (Jitsi)
function startCall() {
    const roomName = `neonchat-${Date.now()}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    // Создаем сообщение со ссылкой
    const message = {
        id: Date.now(),
        user: {name: '📞 Система', avatar: '📞'},
        text: `🚀 ВСЕ НА ЗВОНОК! ${jitsiUrl}`,
        time: new Date().toLocaleTimeString(),
        channel: currentChannel
    };
    
    saveMessage(message);
    displayMessage(message);
    
    // Открываем звонок в новом окне
    window.open(jitsiUrl, '_blank');
}

// Отправка по Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'messageInput') {
        sendMessage();
    }
});

// Обновляем список участников каждые 10 секунд
setInterval(updateMembers, 10000);
