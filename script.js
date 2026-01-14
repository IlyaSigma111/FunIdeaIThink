/* ========== КОНФИГУРАЦИЯ FIREBASE ========== */
const firebaseConfig = {
    apiKey: "AIzaSyA2z8k8J5t7vQh5q5L8k7M6n5J4k3L2m1N0",
    authDomain: "neonchat-12345.firebaseapp.com",
    databaseURL: "https://neonchat-12345-default-rtdb.firebaseio.com",
    projectId: "neonchat-12345",
    storageBucket: "neonchat-12345.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ========== */
let currentUser = null;
let currentChannel = 'main';
let isAdmin = false;
let isRegisteredMode = false;
let onlineUsers = {};
let messageCount = 0;

/* ========== ИНИЦИАЛИЗАЦИЯ ========== */
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    updateTime();
    setInterval(updateTime, 60000); // Обновлять время каждую минуту
});

function initApp() {
    // Проверка сохраненной сессии
    const savedUser = localStorage.getItem('neonchat_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAdmin = currentUser.name.toLowerCase() === 'admin';
            showChatScreen();
            loadMessages();
            startPresence();
        } catch (e) {
            console.error('Ошибка загрузки сессии:', e);
            localStorage.removeItem('neonchat_user');
        }
    }
    
    // События ввода
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('password').focus();
    });
    
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleAuth();
    });
    
    // Начальный фокус
    document.getElementById('username').focus();
}

/* ========== АУТЕНТИФИКАЦИЯ ========== */
function toggleRegister() {
    isRegisteredMode = !isRegisteredMode;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const registerBtn = document.getElementById('registerToggleBtn');
    const loginHint = document.getElementById('loginHint');
    
    if (isRegisteredMode) {
        confirmGroup.style.display = 'flex';
        authButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        registerBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти в аккаунт';
        loginHint.style.display = 'block';
    } else {
        confirmGroup.style.display = 'none';
        authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Создать аккаунт';
        loginHint.style.display = 'none';
    }
}

function toggleLogin() {
    isRegisteredMode = false;
    toggleRegister();
}

function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    if (!username) {
        showAlert('Введите никнейм!', 'error');
        return;
    }
    
    if (username.length < 3) {
        showAlert('Никнейм должен быть минимум 3 символа!', 'error');
        return;
    }
    
    if (!password) {
        showAlert('Введите пароль!', 'error');
        return;
    }
    
    if (isRegisteredMode) {
        // Регистрация
        if (password.length < 6) {
            showAlert('Пароль должен быть минимум 6 символов!', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Пароли не совпадают!', 'error');
            return;
        }
        
        registerUser(username, password);
    } else {
        // Вход
        loginUser(username, password);
    }
}

function registerUser(username, password) {
    const userRef = database.ref('users/' + username.toLowerCase());
    
    userRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            showAlert('Пользователь уже существует!', 'error');
        } else {
            // Сохраняем пользователя
            const userData = {
                name: username,
                password: btoa(password), // Простое шифрование (в реальном приложении используй хеширование)
                createdAt: Date.now(),
                isAdmin: username.toLowerCase() === 'admin'
            };
            
            userRef.set(userData).then(() => {
                showAlert('Регистрация успешна!', 'success');
                completeAuth(userData);
            });
        }
    });
}

function loginUser(username, password) {
    const userRef = database.ref('users/' + username.toLowerCase());
    
    userRef.once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            showAlert('Пользователь не найден!', 'error');
            return;
        }
        
        const userData = snapshot.val();
        if (btoa(password) !== userData.password) {
            showAlert('Неверный пароль!', 'error');
            return;
        }
        
        completeAuth(userData);
    });
}

function completeAuth(userData) {
    currentUser = {
        name: userData.name,
        isAdmin: userData.name.toLowerCase() === 'admin'
    };
    
    isAdmin = currentUser.isAdmin;
    
    // Сохраняем в localStorage
    localStorage.setItem('neonchat_user', JSON.stringify(currentUser));
    
    // Показываем чат
    showChatScreen();
    
    // Загружаем сообщения
    loadMessages();
    
    // Запускаем отслеживание присутствия
    startPresence();
    
    // Показываем приветствие
    setTimeout(() => {
        addSystemMessage(`Добро пожаловать, ${currentUser.name}!`);
    }, 500);
}

/* ========== УПРАВЛЕНИЕ ЭКРАНАМИ ========== */
function showChatScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    const userNameElement = document.getElementById('currentUserName');
    const userAvatar = document.getElementById('userAvatar');
    const adminPanel = document.getElementById('adminPanel');
    
    // Обновляем информацию о пользователе
    userNameElement.textContent = currentUser.name;
    
    if (currentUser.isAdmin) {
        userNameElement.classList.add('admin-name');
        userAvatar.classList.add('admin-avatar');
        userAvatar.textContent = '👑';
        adminPanel.style.display = 'block';
    } else {
        userNameElement.classList.remove('admin-name');
        userAvatar.classList.remove('admin-avatar');
        userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    }
    
    // Переключаем экраны с анимацией
    loginScreen.style.opacity = '0';
    loginScreen.style.pointerEvents = 'none';
    
    setTimeout(() => {
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'flex';
        
        setTimeout(() => {
            chatScreen.style.opacity = '1';
            chatScreen.style.transform = 'translateY(0)';
        }, 50);
    }, 300);
}

function logout() {
    if (currentUser) {
        // Удаляем из онлайн
        const userStatusRef = database.ref('status/' + currentUser.name);
        userStatusRef.remove();
    }
    
    // Сбрасываем состояние
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('neonchat_user');
    
    // Показываем экран логина
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    chatScreen.style.opacity = '0';
    chatScreen.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        chatScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        
        setTimeout(() => {
            loginScreen.style.opacity = '1';
            loginScreen.style.pointerEvents = 'all';
        }, 50);
        
        // Очищаем поля
        document.getElementById('password').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('username').value = '';
        document.getElementById('username').focus();
    }, 300);
    
    // Очищаем сообщения
    document.getElementById('messagesContainer').innerHTML = '';
}

/* ========== ЯНДЕКС ТЕЛЕМОСТ ========== */
function startCall() {
    if (!currentUser) return;
    
    // Создаем уникальный ID комнаты
    const roomId = generateRoomId();
    
    // Два варианта ссылок (оба рабочие)
    const telemostLink = `https://telemost.yandex.ru/j/${roomId}`;
    // Альтернатива: https://telemost.yandex.ru/${roomId}
    
    // Создаем сообщение со ссылкой
    const message = {
        text: `🎥 ${currentUser.name} создал видеозвонок! Присоединяйтесь: ${telemostLink}`,
        user: 'system',
        timestamp: Date.now()
    };
    
    // Отправляем в чат
    database.ref('messages/' + currentChannel).push(message);
    
    // Открываем ссылку в новом окне
    window.open(telemostLink, '_blank', 'noopener,noreferrer');
    
    // Показываем уведомление
    showAlert('Ссылка на видеозвонок отправлена в чат!', 'success');
}

function generateRoomId() {
    // Генерируем случайную строку для комнаты
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/* ========== УПРАВЛЕНИЕ ЧАТОМ ========== */
function switchChannel(channel) {
    if (channel === currentChannel) return;
    
    // Обновляем активный канал
    document.querySelectorAll('.channel').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelector(`.channel[onclick*="${channel}"]`).classList.add('active');
    
    // Обновляем название канала
    const channelNames = {
        'main': 'Основной чат',
        'games': 'Игры',
        'music': 'Музыка',
        'ai': '🤖 Нейросеть'
    };
    
    document.getElementById('channelName').textContent = channelNames[channel] || channel;
    
    // Меняем канал
    currentChannel = channel;
    
    // Загружаем сообщения нового канала
    loadMessages();
    
    // Закрываем боковые панели на мобильных
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
        document.querySelector('.right-sidebar').classList.remove('active');
    }
}

function sendMessage() {
    if (!currentUser) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Проверка команд
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        return;
    }
    
    // Создаем сообщение
    const message = {
        text: text,
        user: currentUser.name,
        userId: currentUser.name.toLowerCase(),
        timestamp: Date.now(),
        isAdmin: currentUser.isAdmin
    };
    
    // Отправляем в Firebase
    database.ref('messages/' + currentChannel).push(message)
        .then(() => {
            input.value = '';
            messageCount++;
            updateMessageCount();
        })
        .catch((error) => {
            showAlert('Ошибка отправки: ' + error.message, 'error');
        });
}

function handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch(cmd) {
        case '/help':
            showCommandHelp();
            break;
        case '/clear':
            clearMyMessages();
            break;
        case '/call':
            startCall();
            break;
        case '/emoji':
            if (parts[1]) addEmoji(parts[1]);
            break;
        case '/ai':
            if (parts.slice(1).join(' ')) askAI(parts.slice(1).join(' '));
            break;
        case '/admin':
            if (isAdmin) showAdminCommands();
            else addSystemMessage('У вас нет прав администратора!');
            break;
        default:
            addSystemMessage(`Неизвестная команда. Введите /help для списка команд.`);
    }
}

function showCommandHelp() {
    const helpMsg = `
        📋 <strong>Доступные команды:</strong><br>
        • <code>/help</code> - показать это сообщение<br>
        • <code>/clear</code> - очистить свои сообщения<br>
        • <code>/call</code> - создать видеозвонок<br>
        • <code>/emoji 😊</code> - отправить эмодзи<br>
        • <code>/ai вопрос</code> - спросить у ИИ<br>
        • <code>/admin</code> - команды админа
    `;
    
    addSystemMessage(helpMsg);
}

/* ========== РАБОТА С СООБЩЕНИЯМИ ========== */
function loadMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    
    // Очищаем контейнер
    messagesContainer.innerHTML = '<div class="ai-typing" style="display:none;" id="aiTyping"><i class="fas fa-robot"></i> Нейросеть печатает...</div>';
    
    // Слушаем новые сообщения
    database.ref('messages/' + currentChannel).limitToLast(50).on('value', (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Сортируем по времени
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Отображаем сообщения
        messagesContainer.innerHTML = '<div class="ai-typing" style="display:none;" id="aiTyping"><i class="fas fa-robot"></i> Нейросеть печатает...</div>';
        
        messages.forEach(msg => {
            addMessageToUI(msg);
        });
        
        // Прокручиваем вниз
        scrollToBottom();
        
        // Обновляем счетчик
        messageCount = messages.length;
        updateMessageCount();
    });
}

function addMessageToUI(msg) {
    const container = document.getElementById('messagesContainer');
    const aiTyping = document.getElementById('aiTyping');
    
    // Пропускаем если это AI и он печатает
    if (msg.user === 'AI' && aiTyping.style.display !== 'none') {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Определяем тип сообщения
    if (msg.user === 'system') {
        messageDiv.classList.add('system');
    } else if (msg.isAdmin) {
        messageDiv.classList.add('admin');
    } else if (msg.user === 'AI') {
        messageDiv.classList.add('ai');
    } else if (msg.user === currentUser?.name) {
        messageDiv.classList.add('own');
    }
    
    // Форматируем время
    const time = new Date(msg.timestamp);
    const timeStr = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Форматируем текст (заменяем переносы строк на <br>)
    let formattedText = msg.text.replace(/\n/g, '<br>');
    
    // Распознаем ссылки
    formattedText = formattedText.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" style="color: #00ccff;">$1</a>'
    );
    
    // Определяем иконку пользователя
    let userIcon = '👤';
    if (msg.isAdmin) userIcon = '👑';
    if (msg.user === 'AI') userIcon = '🤖';
    if (msg.user === 'system') userIcon = '📢';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="message-user ${msg.isAdmin ? 'admin' : ''} ${msg.user === 'AI' ? 'ai' : ''}">
                ${userIcon} ${msg.user}
            </div>
            <div class="message-time">${timeStr}</div>
        </div>
        <div class="message-content">${formattedText}</div>
    `;
    
    // Добавляем в контейнер, но перед индикатором набора AI
    if (aiTyping && aiTyping.style.display !== 'none') {
        container.insertBefore(messageDiv, aiTyping);
    } else {
        container.appendChild(messageDiv);
    }
}

function addSystemMessage(text) {
    const message = {
        text: text,
        user: 'system',
        timestamp: Date.now()
    };
    
    database.ref('messages/' + currentChannel).push(message);
}

function clearMyMessages() {
    if (!currentUser) return;
    
    // Находим и удаляем свои сообщения
    database.ref('messages/' + currentChannel).once('value').then((snapshot) => {
        const updates = {};
        
        snapshot.forEach((childSnapshot) => {
            const msg = childSnapshot.val();
            if (msg.user === currentUser.name) {
                updates[childSnapshot.key] = null;
            }
        });
        
        database.ref('messages/' + currentChannel).update(updates);
        addSystemMessage(`${currentUser.name} очистил свои сообщения.`);
    });
}

/* ========== ИНТЕГРАЦИЯ С ИИ ========== */
function askAI(question) {
    if (!question.trim()) return;
    
    const aiTyping = document.getElementById('aiTyping');
    aiTyping.style.display = 'flex';
    
    // Имитация ответа ИИ (в реальном приложении здесь API запрос)
    setTimeout(() => {
        aiTyping.style.display = 'none';
        
        // Примеры ответов
        const responses = [
            `На ваш вопрос "${question}" я могу ответить, что это интересная тема для обсуждения в чате!`,
            `🤖 Как ИИ, я рекомендую обсудить "${question}" с другими участниками чата.`,
            `Мой ответ на "${question}": в нашем чате много экспертов, которые могут помочь!`,
            `По теме "${question}" - советую создать отдельную комнату для обсуждения.`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const aiMessage = {
            text: randomResponse,
            user: 'AI',
            timestamp: Date.now()
        };
        
        database.ref('messages/' + currentChannel).push(aiMessage);
    }, 1500 + Math.random() * 2000);
}

/* ========== ОНЛАЙН ПОЛЬЗОВАТЕЛИ ========== */
function startPresence() {
    if (!currentUser) return;
    
    const userId = currentUser.name.toLowerCase();
    const userStatusRef = database.ref('status/' + currentUser.name);
    
    // Устанавливаем статус онлайн
    userStatusRef.set({
        name: currentUser.name,
        isAdmin: currentUser.isAdmin,
        lastSeen: Date.now(),
        online: true
    });
    
    // При отключении страницы - ставим оффлайн
    window.addEventListener('beforeunload', () => {
        userStatusRef.remove();
    });
    
    // Слушаем изменения статусов
    database.ref('status').on('value', (snapshot) => {
        onlineUsers = {};
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = '';
        
        let onlineCount = 0;
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            onlineUsers[user.name] = user;
            onlineCount++;
            
            // Добавляем в список онлайн
            if (membersList) {
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member';
                
                const avatarText = user.isAdmin ? '👑' : user.name.charAt(0).toUpperCase();
                
                memberDiv.innerHTML = `
                    <div class="member-avatar">${avatarText}</div>
                    <div class="member-name">
                        ${user.name}
                        ${user.isAdmin ? '<i class="fas fa-crown admin-badge"></i>' : ''}
                        <div class="online-dot"></div>
                    </div>
                `;
                
                membersList.appendChild(memberDiv);
            }
        });
        
        // Обновляем счетчики онлайн
        document.getElementById('onlineCount').textContent = onlineCount;
        document.getElementById('onlineCount2').textContent = onlineCount;
    });
    
    // Периодическое обновление времени присутствия
    setInterval(() => {
        if (currentUser) {
            userStatusRef.update({
                lastSeen: Date.now()
            });
        }
    }, 30000);
}

/* ========== АДМИН ФУНКЦИИ ========== */
function showAdminCommands() {
    const commands = `
        👑 <strong>Админ команды:</strong><br>
        • <code>/admin clear all</code> - очистить весь чат<br>
        • <code>/admin kick [имя]</code> - кикнуть пользователя<br>
        • <code>/admin announcement текст</code> - объявление
    `;
    addSystemMessage(commands);
}

function adminClearChat() {
    if (!isAdmin) {
        addSystemMessage('У вас нет прав администратора!');
        return;
    }
    
    if (confirm('Вы уверены? Весь чат будет очищен!')) {
        database.ref('messages/' + currentChannel).remove();
        addSystemMessage('💥 Администратор очистил чат!');
    }
}

function adminAnnouncement() {
    if (!isAdmin) return;
    
    const text = prompt('Введите текст объявления:');
    if (text) {
        addSystemMessage(`📢 АДМИНИСТРАТОР: ${text}`);
    }
}

function adminKickAll() {
    if (!isAdmin) return;
    
    if (confirm('Кикнуть всех пользователей? Они смогут зайти снова.')) {
        database.ref('status').remove();
        addSystemMessage('⚡ Администратор кикнул всех пользователей!');
    }
}

/* ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========== */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
    
    // Добавляем оверлей на мобильных
    if (window.innerWidth <= 768) {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.remove();
        };
        
        if (sidebar.classList.contains('active')) {
            document.body.appendChild(overlay);
        } else {
            document.querySelector('.mobile-overlay')?.remove();
        }
    }
}

function toggleMembers() {
    const rightSidebar = document.querySelector('.right-sidebar');
    rightSidebar.classList.toggle('active');
    
    if (window.innerWidth <= 768) {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.onclick = () => {
            rightSidebar.classList.remove('active');
            overlay.remove();
        };
        
        if (rightSidebar.classList.contains('active')) {
            document.body.appendChild(overlay);
        } else {
            document.querySelector('.mobile-overlay')?.remove();
        }
    }
}

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
        loadMessages();
        btn.style.transform = '';
    }, 500);
    
    showAlert('Чат обновлен!', 'success');
}

function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += ' ' + emoji;
    input.focus();
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    document.getElementById('currentTime').textContent = timeStr;
}

function updateMessageCount() {
    document.getElementById('messageCount').textContent = messageCount;
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function showAlert(message, type) {
    // Создаем элемент уведомления
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'rgba(255, 60, 60, 0.9)' : 'rgba(0, 200, 80, 0.9)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        ">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 899;
        backdrop-filter: blur(5px);
    }
`;
document.head.appendChild(style);
