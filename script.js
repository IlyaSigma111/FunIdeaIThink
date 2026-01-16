/* ========== КОНФИГУРАЦИЯ ========== */
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

const ADMIN_USERNAME = "ArturPirozhkov";
const ADMIN_PASSWORD = "JojoTop1";
const TEACHER_USERNAME = "Алсу Рашидовна";
const TEACHER_PASSWORD = "1234";

/* ========== TELEGRAM БОТ ========== */
const TELEGRAM_BOT_TOKEN = "8375108387:AAEVrbh4T-vrSzaK5M2OSNeHaNppsCdpfW0";
const TELEGRAM_CHAT_ID = "8375108387";

// Функция для отправки в Telegram через прокси (обход CORS)
async function sendToTelegram(messageData) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('⚠️ Telegram не настроен');
        return false;
    }
    
    try {
        // Формируем текст сообщения
        const timestamp = new Date(messageData.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let telegramMessage = `📨 <b>Новое сообщение из NeonChat</b>\n`;
        telegramMessage += `👤 <b>Пользователь:</b> ${messageData.userName || 'Аноним'}\n`;
        
        if (messageData.channel) {
            const channelNames = {
                'main': 'Основной чат',
                'games': 'Игры',
                'lessons': 'Уроки',
                'ai': 'Нейросеть'
            };
            telegramMessage += `📂 <b>Раздел:</b> ${channelNames[messageData.channel] || messageData.channel}\n`;
        }
        
        telegramMessage += `🕒 <b>Время:</b> ${timestamp}\n`;
        telegramMessage += `📝 <b>Сообщение:</b>\n<code>${messageData.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
        telegramMessage += `\n🔗 <i>ID: ${messageData.id}</i>`;
        
        console.log('📤 Отправляю в Telegram:', messageData.text.substring(0, 50) + '...');
        
        // Используем прокси для обхода CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(proxyUrl + telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'HTML',
                disable_notification: false
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Сообщение отправлено в Telegram');
            return true;
        } else {
            console.error('❌ Ошибка Telegram:', result.description);
            
            // Пробуем альтернативный метод без прокси
            try {
                await sendToTelegramAlternative(messageData);
                return true;
            } catch (altError) {
                console.error('❌ Альтернативный метод тоже не сработал:', altError);
                return false;
            }
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error);
        
        // Пробуем альтернативный метод
        try {
            await sendToTelegramAlternative(messageData);
            return true;
        } catch (altError) {
            console.error('❌ Альтернативный метод тоже не сработал:', altError);
            return false;
        }
    }
}

// Альтернативный метод отправки через JSONP
function sendToTelegramAlternative(messageData) {
    return new Promise((resolve, reject) => {
        // Формируем текст сообщения
        const timestamp = new Date(messageData.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let telegramMessage = `📨 Новое сообщение из NeonChat%0A`;
        telegramMessage += `👤 Пользователь: ${messageData.userName || 'Аноним'}%0A`;
        
        if (messageData.channel) {
            const channelNames = {
                'main': 'Основной чат',
                'games': 'Игры',
                'lessons': 'Уроки',
                'ai': 'Нейросеть'
            };
            telegramMessage += `📂 Раздел: ${channelNames[messageData.channel] || messageData.channel}%0A`;
        }
        
        telegramMessage += `🕒 Время: ${timestamp}%0A`;
        telegramMessage += `📝 Сообщение:%0A${encodeURIComponent(messageData.text)}%0A`;
        telegramMessage += `%0A🔗 ID: ${messageData.id}`;
        
        // Создаем скрытый iframe для отправки
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${telegramMessage}&parse_mode=HTML`;
        
        iframe.onload = function() {
            console.log('✅ Сообщение отправлено через альтернативный метод');
            document.body.removeChild(iframe);
            resolve(true);
        };
        
        iframe.onerror = function() {
            document.body.removeChild(iframe);
            reject(new Error('Ошибка альтернативного метода'));
        };
        
        document.body.appendChild(iframe);
        
        // Таймаут на случай если iframe не загрузится
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            resolve(true); // Все равно считаем отправленным
        }, 5000);
    });
}

// Функция для отправки всех сообщений в Telegram
function sendAllToTelegram(messageData) {
    // Не отправляем системные сообщения, команды или действия
    if (messageData.userId === 'system' || 
        messageData.text.startsWith('/') ||
        messageData.isAction ||
        messageData.isCall ||
        messageData.userId === 'admin_ArturPirozhkov') { // не отправляем свои же сообщения
        console.log('⏭️ Пропускаем сообщение для Telegram:', messageData.userName);
        return;
    }
    
    console.log('📨 Отправляю сообщение в Telegram от:', messageData.userName);
    // Отправляем асинхронно, не ждем ответа
    sendToTelegram(messageData).then(success => {
        if (success) {
            console.log('✅ Успешно отправлено в Telegram');
        } else {
            console.log('❌ Не удалось отправить в Telegram');
        }
    }).catch(error => {
        console.error('Ошибка отправки в Telegram:', error);
    });
}

let isRegisterMode = false;
let database = null;
let currentUser = null;
let currentChannel = 'main';
let messages = [];
let onlineUsers = new Map();
let myUserId = null;
let onlineTimeout = null;
let isAdmin = false;
let isTeacher = false;
let messageSendLock = false;
let lastMessageTime = 0;
let notificationsEnabled = false;
let soundEnabled = true;
let dmFolderOpen = false;

/* ========== TELEGRAM ИНФО ========== */
function showTelegramInfo() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: rgba(15,15,35,0.98);
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 100%;
            border: 2px solid #00ccff;
            box-shadow: 0 0 50px rgba(0,200,255,0.5);
            color: white;
            animation: slideUp 0.3s ease;
            text-align: center;
        ">
            <div style="margin-bottom: 25px;">
                <div style="
                    background: #0088cc;
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.2em;
                    color: white;
                    margin: 0 auto 20px;
                    box-shadow: 0 8px 25px rgba(0,136,204,0.5);
                ">
                    <i class="fab fa-telegram"></i>
                </div>
                <h2 style="color: #00ccff; margin: 0 0 10px 0; font-size: 1.8em; font-weight: 800;">
                    📱 Telegram-бот
                </h2>
                <p style="color: rgba(255,255,255,0.9); margin: 0;">
                    Все сообщения приходят мне в Telegram
                </p>
            </div>
            
            <div style="
                background: rgba(0,0,0,0.3);
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid rgba(255,255,255,0.1);
                text-align: left;
            ">
                <p style="color: #00ffaa; font-weight: 600; margin-bottom: 15px;">
                    <i class="fas fa-graduation-cap"></i> Статус:
                </p>
                
                <div style="color: rgba(255,255,255,0.9); line-height: 1.6;">
                    <p>✅ Токен бота: ${TELEGRAM_BOT_TOKEN ? 'Настроен' : 'Не настроен'}</p>
                    <p>✅ Chat ID: ${TELEGRAM_CHAT_ID ? 'Настроен' : 'Не настроен'}</p>
                    <p>✅ Все сообщения дублируются в Telegram</p>
                    <p>✅ Работает даже при блокировке CORS</p>
                </div>
            </div>
            
            <div style="
                background: rgba(0,136,204,0.1);
                border-radius: 12px;
                padding: 15px;
                margin: 15px 0;
                border: 1px solid rgba(0,136,204,0.3);
                color: #88aaff;
                font-size: 0.9em;
            ">
                <i class="fas fa-info-circle"></i> 
                Если сообщения не приходят, проверь консоль браузера (F12)
            </div>
            
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: linear-gradient(135deg, #0066ff 0%, #00ccff 100%);
                color: white;
                border: none;
                padding: 14px 40px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 700;
                font-size: 1.1em;
                transition: all 0.3s ease;
                margin-top: 10px;
            ">
                Понятно
            </button>
            
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            </style>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику вне окна
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

/* ========== ПРОСТАЯ ФУНКЦИЯ ЗВОНКА ========== */
function startCall() {
    console.log('📞 Кнопка звонка нажата!');
    
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Создаем простое модальное окно
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(15,15,35,0.98);
        border-radius: 20px;
        padding: 30px;
        max-width: 800px;
        width: 100%;
        border: 2px solid #00ccff;
        box-shadow: 0 0 50px rgba(0,200,255,0.5);
        color: white;
        animation: slideUp 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #00ccff; margin: 0; font-size: 2em; font-weight: 800;">Видеозвонок</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Выберите платформу</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <button id="discordBtn" style="background: linear-gradient(135deg, #5865F2, #7289DA); color: white; border: none; padding: 20px; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1em; transition: all 0.3s ease;">
                <i class="fab fa-discord"></i><br>Discord
            </button>
            <button id="googleBtn" style="background: linear-gradient(135deg, #4285f4, #34a853); color: white; border: none; padding: 20px; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1em; transition: all 0.3s ease;">
                <i class="fab fa-google"></i><br>Google Meet
            </button>
            <button id="zoomBtn" style="background: linear-gradient(135deg, #2d8cff, #0066ff); color: white; border: none; padding: 20px; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1em; transition: all 0.3s ease;">
                <i class="fas fa-video"></i><br>Zoom
            </button>
            <button id="customBtn" style="background: linear-gradient(135deg, #ff3366, #ff9966); color: white; border: none; padding: 20px; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1em; transition: all 0.3s ease;">
                <i class="fas fa-link"></i><br>Своя ссылка
            </button>
        </div>
        
        <button id="closeModalBtn" style="background: rgba(255,60,60,0.2); border: 2px solid rgba(255,100,100,0.6); color: #ff6666; padding: 14px 40px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 1.1em; transition: all 0.3s ease; display: block; margin: 0 auto;">
            Отмена
        </button>
        
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            button:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            }
        </style>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Добавляем обработчики кнопок
    setTimeout(() => {
        document.getElementById('discordBtn').onclick = function() {
            createDiscordCall();
            overlay.remove();
        };
        
        document.getElementById('googleBtn').onclick = function() {
            createGoogleMeetCall();
            overlay.remove();
        };
        
        document.getElementById('zoomBtn').onclick = function() {
            createZoomCall();
            overlay.remove();
        };
        
        document.getElementById('customBtn').onclick = function() {
            createCustomCall();
            overlay.remove();
        };
        
        document.getElementById('closeModalBtn').onclick = function() {
            overlay.remove();
        };
        
        // Закрытие по клику на оверлей
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }, 100);
}

/* ========== ИНИЦИАЛИЗАЦИЯ ========== */
window.onload = function() {
    console.log('🚀 NeonChat запущен');
    console.log('🤖 Telegram бот настроен:', TELEGRAM_BOT_TOKEN ? '✅' : '❌');
    console.log('👤 Chat ID:', TELEGRAM_CHAT_ID ? '✅' : '❌');
    
    // Проверяем загрузку Firebase
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase не загружен!');
        setupLocalStorageFallback();
    } else {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            database = firebase.database();
            console.log('✅ Firebase подключен');
        } catch (e) {
            console.error('⚠️ Ошибка Firebase:', e);
            setupLocalStorageFallback();
        }
    }
    
    // Назначаем обработчики событий
    setupEventListeners();
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('neonchat_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            myUserId = currentUser.id;
            isAdmin = currentUser.isAdmin || false;
            isTeacher = currentUser.isTeacher || false;
            
            // Автозаполняем поле логина
            const usernameInput = document.getElementById('username');
            if (usernameInput && currentUser.name) {
                usernameInput.value = currentUser.name;
            }
            
            console.log('Найден сохраненный пользователь:', currentUser.name);
            
            // Показываем чат после небольшой задержки
            setTimeout(() => {
                if (currentUser && currentUser.name) {
                    showChatInterface();
                }
            }, 300);
            
        } catch (e) {
            console.error('Ошибка загрузки пользователя:', e);
        }
    }
    
    // Запрашиваем разрешение на уведомления
    requestNotificationPermission();
    
    // Автофокус
    setTimeout(() => {
        const input = document.getElementById('username');
        if (input) input.focus();
    }, 500);
    
    // Обновление времени
    updateTime();
    setInterval(updateTime, 60000);
    
    // Проверяем уведомления
    checkNotificationSettings();
    
    // Настраиваем мобильный ввод и меню
    setTimeout(() => {
        setupMobileInput();
        updateChannelLayout();
        adjustMobileLayout();
    }, 500);
    
    // Слушаем изменения размера окна
    window.addEventListener('resize', function() {
        setupMobileInput();
        updateChannelLayout();
        adjustMobileLayout();
    });
};

function setupEventListeners() {
    console.log('📌 Настройка обработчиков событий');
    
    // Enter для отправки сообщений
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Enter для авторизации
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen && loginScreen.style.display !== 'none') {
                handleAuth();
            }
        }
    });
    
    // Клик вне эмодзи-панели
    document.addEventListener('click', function(e) {
        const emojiPanel = document.getElementById('emojiPanel');
        const emojiBtn = document.querySelector('.action-btn[title="Ещё эмодзи"]');
        
        if (emojiPanel && emojiBtn) {
            if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) {
                if (emojiPanel.style.display === 'block') {
                    emojiPanel.style.display = 'none';
                }
            }
        }
    });
}

function setupLocalStorageFallback() {
    console.log('⚠️ Используем локальное хранилище');
    
    database = {
        ref: function(path) {
            return {
                set: function(data) {
                    return new Promise((resolve) => {
                        if (path.startsWith('messages/')) {
                            const messagesKey = 'firebase_messages';
                            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
                            const messageId = path.split('/')[1] || Date.now().toString();
                            data.id = messageId;
                            messages.push(data);
                            if (messages.length > 100) {
                                messages = messages.slice(-100);
                            }
                            localStorage.setItem(messagesKey, JSON.stringify(messages));
                            updateMessagesDisplay();
                            
                            // ОТПРАВЛЯЕМ В TELEGRAM ДАЖЕ В ЛОКАЛЬНОМ РЕЖИМЕ
                            if (data.userId !== 'system' && !data.text.startsWith('/') && !data.isAction) {
                                console.log('📨 Отправляю в Telegram из localStorage:', data.text);
                                sendAllToTelegram(data);
                            }
                            
                        } else if (path.startsWith('online/')) {
                            const onlineKey = 'firebase_online';
                            let online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            const userId = path.split('/')[1];
                            online[userId] = data;
                            localStorage.setItem(onlineKey, JSON.stringify(online));
                            updateOnlineDisplay();
                        }
                        setTimeout(resolve, 50);
                    });
                },
                on: function(event, callback) {
                    if (event === 'value') {
                        if (path === 'messages') {
                            const messagesKey = 'firebase_messages';
                            const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
                            const obj = {};
                            messages.forEach(msg => {
                                obj[msg.id] = msg;
                            });
                            setTimeout(() => callback({ val: () => obj }), 100);
                        } else if (path === 'online') {
                            const onlineKey = 'firebase_online';
                            const online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            setTimeout(() => callback({ val: () => online }), 100);
                        }
                    }
                    return () => {};
                },
                remove: function() {
                    return new Promise((resolve) => {
                        if (path === 'messages') {
                            localStorage.removeItem('firebase_messages');
                        } else if (path === 'online') {
                            localStorage.removeItem('firebase_online');
                        } else if (path.startsWith('online/')) {
                            const onlineKey = 'firebase_online';
                            let online = JSON.parse(localStorage.getItem(onlineKey) || '{}');
                            const userId = path.split('/')[1];
                            delete online[userId];
                            localStorage.setItem(onlineKey, JSON.stringify(online));
                        }
                        setTimeout(resolve, 50);
                    });
                },
                onDisconnect: function() {
                    return {
                        remove: function() {
                            return Promise.resolve();
                        }
                    };
                }
            };
        }
    };
}

/* ========== УВЕДОМЛЕНИЯ БРАУЗЕРА ========== */
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Браузер не поддерживает уведомления");
        return;
    }
    
    if (Notification.permission === "granted") {
        notificationsEnabled = true;
        updateNotificationUI(true);
        console.log("Уведомления уже разрешены");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            if (permission === "granted") {
                notificationsEnabled = true;
                updateNotificationUI(true);
                console.log("Уведомления разрешены");
                showBrowserNotification("NeonChat", "Уведомления включены!");
            } else {
                updateNotificationUI(false);
                console.log("Уведомления запрещены");
            }
        });
    }
}

function showBrowserNotification(title, body) {
    if (!notificationsEnabled) return;
    
    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1256/1256650.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1256/1256650.png',
        tag: 'neonchat-notification',
        vibrate: [200, 100, 200],
        renotify: true,
        actions: [
            {
                action: 'open',
                title: 'Открыть чат'
            }
        ]
    };
    
    if (soundEnabled) {
        playNotificationSound();
    }
    
    // Проверяем видимость страницы
    if (document.hidden) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, options);
        }
    }
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.volume = 0.3;
        audio.play();
    } catch (e) {
        console.log("Не удалось воспроизвести звук уведомления");
    }
}

function updateNotificationUI(enabled) {
    const notifStatus = document.getElementById('notifStatusText');
    const notifBtn = document.getElementById('notifStatus');
    
    if (notifStatus) {
        notifStatus.textContent = enabled ? '🔔' : '🔕';
        notifStatus.style.color = enabled ? '#00ffaa' : '#ff6666';
    }
    
    if (notifBtn) {
        notifBtn.innerHTML = enabled ? 
            '<i class="fas fa-bell"></i> Уведомления' :
            '<i class="fas fa-bell-slash"></i> Уведомления';
    }
}

function checkNotificationSettings() {
    const soundEnabled = localStorage.getItem('neonchat_sound_enabled');
    if (soundEnabled !== null) {
        soundEnabled = soundEnabled === 'true';
    }
}

/* ========== АВТОРИЗАЦИЯ ========== */
function toggleRegister() {
    isRegisterMode = true;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const loginHint = document.getElementById('loginHint');
    
    if (confirmGroup) confirmGroup.style.display = 'flex';
    if (authButton) authButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    if (registerToggleBtn) registerToggleBtn.style.display = 'none';
    if (loginHint) loginHint.style.display = 'block';
    
    setTimeout(() => {
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.focus();
    }, 100);
}

function toggleLogin() {
    isRegisterMode = false;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const loginHint = document.getElementById('loginHint');
    
    if (confirmGroup) confirmGroup.style.display = 'none';
    if (authButton) authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
    if (registerToggleBtn) registerToggleBtn.style.display = 'block';
    if (loginHint) loginHint.style.display = 'none';
    
    setTimeout(() => {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

function teacherLogin() {
    document.getElementById('username').value = TEACHER_USERNAME;
    document.getElementById('password').value = TEACHER_PASSWORD;
    
    showAlert('Готово! Нажмите "Войти"', 'info');
}

function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = document.getElementById('authButton');
    
    if (!username) {
        showAlert('Введи никнейм!', 'error');
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.focus();
        return;
    }
    
    // Блокируем кнопку
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + 
                          (isRegisterMode ? 'Регистрируем...' : 'Входим...');
    }
    
    if (isRegisterMode) {
        if (!password) {
            showAlert('Придумай пароль!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        if (password.length < 4) {
            showAlert('Пароль должен быть минимум 4 символа!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Пароли не совпадают!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const confirmInput = document.getElementById('confirmPassword');
            if (confirmInput) {
                confirmInput.value = '';
                confirmInput.focus();
            }
            return;
        }
        
        // Проверяем, не занят ли ник
        if (localStorage.getItem('neonchat_user_' + username.toLowerCase())) {
            showAlert('Этот ник уже занят! Выбери другой.', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
            }
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.focus();
                usernameInput.select();
            }
            return;
        }
        
        // Регистрируем
        registerUser(username, password, button);
        
    } else {
        // Вход
        if (!password) {
            showAlert('Введи пароль!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.focus();
            return;
        }
        
        // Проверяем админ аккаунт
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('👑 Вход как администратор');
            isAdmin = true;
            createAdminUser(button);
            return;
        }
        
        // Проверяем учительский аккаунт
        if (username === TEACHER_USERNAME && password === TEACHER_PASSWORD) {
            console.log('👨‍🏫 Вход как учитель');
            isTeacher = true;
            createTeacherUser(button);
            return;
        }
        
        // Обычный вход
        loginUser(username, password, button);
    }
}

function registerUser(username, password, button) {
    myUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const avatars = ['😎', '🐱', '🚀', '🦊', '🐯', '🦁', '🐼', '🐨'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    currentUser = {
        id: myUserId,
        name: username,
        avatar: avatar,
        passwordHash: simpleHash(password),
        registeredAt: Date.now(),
        isAdmin: false,
        isTeacher: false
    };
    
    // Сохраняем
    localStorage.setItem('neonchat_user_' + username.toLowerCase(), JSON.stringify(currentUser));
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ Новый пользователь:', username);
    
    // Отправляем в Telegram о новом пользователе
    const telegramMessage = `👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ В NEONCHAT!</b>\n\n` +
                           `Имя: ${username}\n` +
                           `Время: ${new Date().toLocaleString('ru-RU')}`;
    
    sendToTelegram({
        id: 'new_user_' + Date.now(),
        userName: '📋 Система',
        text: telegramMessage,
        timestamp: Date.now(),
        channel: 'system'
    }).catch(() => {});
    
    showAlert(`Добро пожаловать, ${username}!`, 'success');
    showChatInterface();
    
    // Разблокируем кнопку
    if (button) {
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        }, 1000);
    }
}

function loginUser(username, password, button) {
    const userData = localStorage.getItem('neonchat_user_' + username.toLowerCase());
    
    if (!userData) {
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }
        showAlert('Пользователь не найден! Зарегистрируйся сначала.', 'error');
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
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }
            showAlert('Неверный пароль!', 'error');
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            return;
        }
        
        myUserId = user.id;
        currentUser = user;
        isAdmin = user.isAdmin || false;
        isTeacher = user.isTeacher || false;
        
        localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
        
        console.log('✅ Успешный вход:', username);
        showAlert(`С возвращением, ${username}!`, 'success');
        showChatInterface();
        
        // Разблокируем кнопку
        if (button) {
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }
        showAlert('Ошибка входа. Попробуй снова.', 'error');
    }
}

function createAdminUser(button) {
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
    showAlert('👑 Вход как администратор!', 'success');
    showChatInterface();
    
    if (button) {
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }, 1000);
    }
}

function createTeacherUser(button) {
    myUserId = 'teacher_' + TEACHER_USERNAME;
    
    currentUser = {
        id: myUserId,
        name: TEACHER_USERNAME,
        avatar: '👨‍🏫',
        isTeacher: true,
        isSpecialTeacher: true
    };
    
    localStorage.setItem('neonchat_current_user', JSON.stringify(currentUser));
    
    console.log('✅ Вход как учитель');
    showAlert('👨‍🏫 Вход как учитель!', 'success');
    showChatInterface();
    
    if (button) {
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }, 1000);
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/* ========== ОТОБРАЖЕНИЕ ЧАТА ========== */
function showChatInterface() {
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    const currentUserName = document.getElementById('currentUserName');
    const userAvatar = document.getElementById('userAvatar');
    const userRoleTag = document.getElementById('userRoleTag');
    const adminPanel = document.getElementById('adminPanel');
    const teacherPanel = document.getElementById('teacherPanel');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (chatScreen) chatScreen.style.display = 'flex';
    
    // Обновляем UI
    if (currentUserName && currentUser) {
        currentUserName.textContent = currentUser.name;
    }
    
    if (userAvatar && currentUser) {
        userAvatar.textContent = currentUser.avatar;
    }
    
    // Если админ - меняем стили
    if (isAdmin && currentUser) {
        if (userAvatar) userAvatar.classList.add('admin-avatar');
        if (currentUserName) {
            currentUserName.classList.add('admin-name');
            currentUserName.innerHTML = currentUser.name + ' <span style="color:gold; font-size:0.8em;">👑</span>';
        }
        if (userRoleTag) {
            userRoleTag.textContent = 'Администратор';
            userRoleTag.className = 'user-role role-admin';
        }
        if (adminPanel) adminPanel.style.display = 'block';
    }
    
    // Если учитель - меняем стили
    if (isTeacher && currentUser) {
        if (userAvatar) userAvatar.classList.add('teacher-avatar');
        if (currentUserName) {
            currentUserName.classList.add('teacher-name');
            currentUserName.innerHTML = currentUser.name + ' <span style="color:#ff9900; font-size:0.8em;">👨‍🏫</span>';
        }
        if (userRoleTag) {
            userRoleTag.textContent = 'Учитель';
            userRoleTag.className = 'user-role role-teacher';
        }
        if (teacherPanel) teacherPanel.style.display = 'block';
    }
    
    // Если обычный пользователь
    if (!isAdmin && !isTeacher && currentUser) {
        if (userRoleTag) {
            userRoleTag.textContent = currentUser.role || 'Ученик';
            userRoleTag.className = 'user-role role-student';
        }
    }
    
    // Фокус на поле ввода
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
            messageInput.value = '';
        }
    }, 300);
    
    initFirebase();
}

function initFirebase() {
    if (!database) {
        console.error('База данных не доступна');
        loadLocalMessages();
        return;
    }
    
    try {
        database.ref('.info/connected').on('value', (snap) => {
            const isConnected = snap.val() === true;
            const connectionStatus = document.getElementById('connectionStatus');
            if (connectionStatus) {
                connectionStatus.textContent = isConnected ? '✓' : '✗';
                connectionStatus.style.color = isConnected ? '#00ff80' : '#ff6666';
            }
            
            if (isConnected) {
                updateOnlineStatus();
                monitorOnlineUsers();
                
                if (onlineTimeout) clearInterval(onlineTimeout);
                onlineTimeout = setInterval(() => {
                    updateOnlineStatus();
                }, 30000);
            } else if (onlineTimeout) {
                clearInterval(onlineTimeout);
                onlineTimeout = null;
            }
        });
    } catch (error) {
        console.log('Мониторинг подключения недоступен');
    }
    
    try {
        database.ref('messages').orderByChild('timestamp').limitToLast(100).on('value', (snapshot) => {
            const data = snapshot.val();
            messages = data ? Object.values(data) : [];
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            updateMessagesDisplay();
            const messageCountElement = document.getElementById('messageCount');
            if (messageCountElement) {
                messageCountElement.textContent = messages.length;
            }
        });
    } catch (error) {
        console.log('Загрузка сообщений недоступна');
        loadLocalMessages();
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeStr;
    }
}

/* ========== СИСТЕМА ОНЛАЙН ========== */
function updateOnlineStatus() {
    if (!database || !currentUser || !myUserId) return;
    
    try {
        const userRef = database.ref('online/' + myUserId);
        userRef.set({
            id: myUserId,
            name: currentUser.name,
            avatar: currentUser.avatar,
            isAdmin: isAdmin,
            isTeacher: isTeacher,
            lastSeen: Date.now()
        });
        
        userRef.onDisconnect().remove();
    } catch (error) {
        console.error('Ошибка обновления онлайн статуса:', error);
    }
}

function monitorOnlineUsers() {
    if (!database) return;
    
    try {
        database.ref('online').on('value', (snapshot) => {
            const data = snapshot.val();
            onlineUsers.clear();
            
            if (data) {
                const now = Date.now();
                const thirtySecondsAgo = now - 30000;
                
                Object.entries(data).forEach(([userId, user]) => {
                    if (user.lastSeen > thirtySecondsAgo) {
                        onlineUsers.set(userId, user);
                    } else {
                        try {
                            database.ref('online/' + userId).remove();
                        } catch (e) {}
                    }
                });
            }
            
            updateOnlineDisplay();
        });
    } catch (error) {
        console.error('Ошибка мониторинга онлайн пользователей:', error);
    }
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
                <span style="color: #00ff80; font-size: 0.8em;">(Вы)</span>
                ${isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                ${isTeacher ? '<span class="teacher-badge">👨‍🏫</span>' : ''}
                <div class="online-dot"></div>
            </div>
        `;
        container.appendChild(userDiv);
    }
    
    // Добавляем остальных
    let otherUsersCount = 0;
    onlineUsers.forEach((user, userId) => {
        if (userId === myUserId) return;
        otherUsersCount++;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'member';
        userDiv.innerHTML = `
            <div class="member-avatar">${user.avatar}</div>
            <div class="member-name">
                ${user.name}
                ${user.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                ${user.isTeacher ? '<span class="teacher-badge">👨‍🏫</span>' : ''}
                <div class="online-dot"></div>
            </div>
        `;
        container.appendChild(userDiv);
    });
    
    const totalOnline = onlineUsers.size;
    if (onlineCount) onlineCount.textContent = totalOnline;
    if (onlineCount2) onlineCount2.textContent = totalOnline;
    
    if (otherUsersCount === 0 && currentUser) {
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

/* ========== СООБЩЕНИЯ ========== */
function loadLocalMessages() {
    try {
        const messagesKey = 'firebase_messages';
        const savedMessages = localStorage.getItem(messagesKey);
        
        if (savedMessages) {
            messages = JSON.parse(savedMessages);
            messages.sort((a, b) => a.timestamp - b.timestamp);
            updateMessagesDisplay();
            
            const messageCountElement = document.getElementById('messageCount');
            if (messageCountElement) {
                messageCountElement.textContent = messages.length;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки локальных сообщений:', error);
    }
}

function updateMessagesDisplay() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
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
        const isOwn = currentUser && msg.userId === currentUser.id;
        const isSystem = msg.userId === 'system';
        const isAdminMsg = msg.isAdmin || (msg.userId && msg.userId.includes('admin'));
        const isTeacherMsg = msg.isTeacher || (msg.userId && msg.userId.includes('teacher'));
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isAdminMsg ? 'admin' : ''} ${isTeacherMsg ? 'teacher' : ''}`;
        
        let safeText = msg.text || '';
        safeText = safeText.replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user ${isAdminMsg ? 'admin' : ''} ${isTeacherMsg ? 'teacher' : ''}">
                    ${msg.userAvatar || ''} ${msg.userName || 'Неизвестный'}
                    ${isAdminMsg ? '👑' : ''}
                    ${isTeacherMsg ? '👨‍🏫' : ''}
                </span>
                <span class="message-time">${msg.time || '00:00'}</span>
            </div>
            <div class="message-content">${safeText}</div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

/* ========== ОТПРАВКА СООБЩЕНИЙ ========== */
async function sendMessage() {
    if (messageSendLock) {
        console.log('⏳ Сообщение уже отправляется...');
        return;
    }
    
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const text = input.value.trim();
    
    if (!text) {
        input.focus();
        return;
    }
    
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Проверка на спам
    const now = Date.now();
    if (now - lastMessageTime < 1000) {
        showAlert('⏳ Отправляй сообщения немного медленнее!', 'warning');
        return;
    }
    lastMessageTime = now;
    
    // Проверка команд
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        input.focus();
        return;
    }
    
    messageSendLock = true;
    
    const sendBtn = document.querySelector('.send-btn');
    const originalBtnHtml = sendBtn ? sendBtn.innerHTML : null;
    
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.style.opacity = '0.7';
        sendBtn.disabled = true;
    }
    
    const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAdmin: isAdmin,
        isTeacher: isTeacher
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
            
            // ОТПРАВЛЯЕМ В TELEGRAM ПОСЛЕ УСПЕШНОЙ ЗАПИСИ В FIREBASE
            console.log('📤 Отправляю сообщение в Telegram:', text);
            sendAllToTelegram(message);
            
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            if (messages.length > 100) {
                messages = messages.slice(-100);
            }
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
            
            // ОТПРАВЛЯЕМ В TELEGRAM И В ЛОКАЛЬНОМ РЕЖИМЕ
            console.log('📤 Отправляю сообщение в Telegram (локально):', text);
            sendAllToTelegram(message);
        }
        
        input.value = '';
        input.focus();
        updateOnlineStatus();
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('❌ Ошибка отправки сообщения', 'error');
    } finally {
        messageSendLock = false;
        
        if (sendBtn && originalBtnHtml) {
            setTimeout(() => {
                sendBtn.innerHTML = originalBtnHtml;
                sendBtn.style.opacity = '';
                sendBtn.disabled = false;
            }, 300);
        }
    }
}

/* ========== ФУНКЦИИ ЗВОНКОВ ========== */
function createDiscordCall() {
    const discordInvite = "https://discord.gg/neonchat";
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(88,101,242,0.15), rgba(88,101,242,0.25)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(88,101,242,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: #5865F2; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(88,101,242,0.5);">
                    <i class="fab fa-discord"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🎮 DISCORD ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #fbbc05; font-weight: 700; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-graduation-cap"></i> Как присоединиться:
                </div>
                
                <div style="color: rgba(255,255,255,0.9); line-height: 1.6; margin-bottom: 20px;">
                    1. <strong>Нажмите на ссылку ниже</strong><br>
                    2. Присоединитесь к серверу NeonChat<br>
                    3. Создайте голосовой канал<br>
                    4. Пригласите друзей
                </div>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
                    <a href="${discordInvite}" target="_blank" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #5865F2, #7289DA); color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(88,101,242,0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        <i class="fab fa-discord"></i>
                        Присоединиться к серверу
                    </a>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Discord');
    showAlert('✅ Инструкция по Discord отправлена в чат!', 'success');
}

function createGoogleMeetCall() {
    const meetCode = generateMeetCode();
    const meetLink = `https://meet.google.com/${meetCode}`;
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(66,133,244,0.15), rgba(52,168,83,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(66,133,244,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #4285f4, #34a853); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(66,133,244,0.5);">
                    <i class="fab fa-google"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">📞 GOOGLE MEET ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #00ffaa; font-weight: 700; margin-bottom: 10px;">Код встречи:</div>
                <div style="background: rgba(66,133,244,0.2); padding: 12px; border-radius: 8px; font-family: monospace; font-weight: 800; color: white; font-size: 1.3em; letter-spacing: 2px; margin-bottom: 15px; border: 1px solid rgba(66,133,244,0.5);">
                    ${meetCode}
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${meetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4285f4, #34a853); color: white; padding: 16px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.2em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(66,133,244,0.4); transition: all 0.3s ease;">
                        <i class="fas fa-video"></i> Присоединиться к звонку
                    </a>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Google Meet');
    showAlert('✅ Ссылка на Google Meet отправлена в чат!', 'success');
}

function createZoomCall() {
    const zoomLink = "https://zoom.us/meeting#/create";
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(45,140,255,0.15), rgba(0,102,255,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(45,140,255,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #2d8cff, #0066ff); width: 70px; height: 70px; border-radius: 50%; display: flex;
                                    align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(45,140,255,0.5);">
                    <i class="fas fa-video"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🎥 ZООМ ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <a href="${zoomLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2d8cff, #0066ff); color: white; padding: 16px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(45,140,255,0.4); transition: all 0.3s ease;">
                    <i class="fas fa-plus-circle"></i> Создать Zoom встречу
                </a>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Zoom');
}

function createCustomCall() {
    const customLink = prompt('Введите ссылку на ваш видеозвонок (Discord, Zoom, Google Meet и т.д.):');
    
    if (!customLink) {
        showAlert('❌ Ссылка не была введена', 'error');
        return;
    }
    
    if (!customLink.startsWith('http://') && !customLink.startsWith('https://')) {
        showAlert('❌ Введите корректную ссылку (начинается с http:// или https://)', 'error');
        return;
    }
    
    const messageText = `
        <div style="background: linear-gradient(135deg, rgba(255,51,102,0.15), rgba(255,153,102,0.15)); border-radius: 16px; padding: 25px; margin: 12px 0; border: 2px solid rgba(255,51,102,0.4);">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #ff3366, #ff9966); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: white; box-shadow: 0 8px 25px rgba(255,51,102,0.5);">
                    <i class="fas fa-link"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.5em; font-weight: 800; color: white; margin-bottom: 8px;">🔗 ССЫЛКА НА ЗВОНОК</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 1.1em;">Создал: <strong style="color: #00ffaa;">${currentUser.name}</strong></div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #00ccff; font-weight: 700; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-external-link-alt"></i> Ссылка на видеозвонок:
                </div>
                
                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 10px; margin: 15px 0; word-break: break-all; font-family: monospace; color: #00ffaa; font-size: 1.1em; border: 1px solid rgba(0,200,255,0.3);">
                    ${customLink}
                </div>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
                    <a href="${customLink}" target="_blank" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #ff3366, #ff9966); color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1.1em; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 8px 25px rgba(255,51,102,0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        <i class="fas fa-video"></i>
                        Присоединиться
                    </a>
                </div>
            </div>
        </div>
    `;
    
    sendCallMessage(messageText, 'Пользовательская ссылка');
    showAlert('✅ Ссылка на звонок отправлена в чат!', 'success');
}

function generateMeetCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    for (let i = 0; i < 11; i++) {
        if (i === 3 || i === 7) {
            code += '-';
        } else {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return code;
}

function sendCallMessage(messageText, platform) {
    const message = {
        id: 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '📞 Система звонков',
        userAvatar: '📞',
        text: messageText,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isCall: true,
        platform: platform
    };
    
    try {
        if (database) {
            database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки сообщения о звонке:', error);
    }
}

/* ========== КОМАНДЫ ========== */
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
            startCall();
            break;
            
        case '/time':
            const now = new Date();
            const timeStr = now.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            sendSystemMessage(`🕒 Текущее время: ${timeStr}`);
            break;
            
        case '/ping':
            sendSystemMessage('🏓 Понг! Чат работает нормально.');
            break;
            
        case '/users':
            sendSystemMessage(`👤 Всего пользователей: ${Object.keys(localStorage).filter(k => k.startsWith('neonchat_user_')).length}`);
            break;
            
        case '/telegram':
        case '/tg':
            showTelegramInfo();
            break;
            
        case '/testtelegram':
            // Тестовая команда для проверки Telegram
            const testMessage = {
                id: 'test_' + Date.now(),
                userName: 'Тестовая система',
                text: 'Тестовое сообщение для проверки Telegram бота',
                timestamp: Date.now(),
                channel: 'test'
            };
            sendToTelegram(testMessage).then(success => {
                if (success) {
                    sendSystemMessage('✅ Тестовое сообщение отправлено в Telegram! Проверь бота.');
                } else {
                    sendSystemMessage('❌ Не удалось отправить тестовое сообщение в Telegram');
                }
            });
            break;
            
        default:
            sendSystemMessage(`❌ Неизвестная команда "${cmd}". Введи /help для списка команд`);
    }
    
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function showHelp() {
    let helpText = '📋 <strong>Доступные команды:</strong><br>';
    helpText += '<div style="margin-left: 15px; font-size: 0.9em;">';
    helpText += '/help - Показать это сообщение<br>';
    helpText += '/online - Показать кто онлайн<br>';
    helpText += '/me [действие] - Отправить действие<br>';
    helpText += '/call - Создать видеозвонок (выбор платформы)<br>';
    helpText += '/time - Показать точное время<br>';
    helpText += '/ping - Проверить связь с сервером<br>';
    helpText += '/users - Показать статистику<br>';
    helpText += '/telegram - Информация о Telegram-боте<br>';
    helpText += '/testtelegram - Тест отправки в Telegram<br>';
    
    if (isAdmin) {
        helpText += '<br><strong style="color:gold;">👑 Админ команды:</strong><br>';
        helpText += '/clean - Очистить весь чат<br>';
        helpText += '/announce [текст] - Сделать объявление<br>';
        helpText += '/kickall - Кикнуть всех пользователей<br>';
    }
    
    if (isTeacher) {
        helpText += '<br><strong style="color:#ff9900;">👨‍🏫 Учительские команды:</strong><br>';
        helpText += '/teacher - Панель учителя<br>';
        helpText += '/announce - Сделать объявление<br>';
    }
    
    helpText += '</div>';
    
    sendSystemMessage(helpText);
}

function sendSystemMessage(text) {
    const message = {
        id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '⚡ Система',
        userAvatar: '⚡',
        text: text,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    try {
        if (database) {
            database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки системного сообщения:', error);
    }
}

function sendActionMessage(action) {
    if (!currentUser) return;
    
    const message = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userId: myUserId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: `<i style="color: #88aaff;">* ${currentUser.name} ${action}</i>`,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isAction: true
    };
    
    try {
        if (database) {
            database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
    } catch (error) {
        console.error('Ошибка отправки действия:', error);
    }
}

/* ========== АДМИН ФУНКЦИИ ========== */
async function adminClearChat() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может очищать чат', 'error');
        return;
    }
    
    if (!confirm('💀 ТОЧНО ОЧИСТИТЬ ВЕСЬ ЧАТ?\nЭто удалит ВСЕ сообщения у всех пользователей!')) {
        return;
    }
    
    try {
        if (database) {
            await database.ref('messages').remove();
        } else {
            localStorage.removeItem('firebase_messages');
            messages = [];
            updateMessagesDisplay();
        }
        
        // Отправляем в Telegram об очистке чата
        const telegramMessage = `🧹 <b>ЧАТ ОЧИЩЕН АДМИНИСТРАТОРОМ!</b>\n\n` +
                               `👤 Администратор: ${currentUser.name}\n` +
                               `🕒 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                               `⚠️ Все сообщения удалены`;
        
        sendToTelegram({
            id: 'clear_notif_' + Date.now(),
            userName: '⚠️ Система',
            text: telegramMessage,
            timestamp: Date.now(),
            channel: 'system'
        }).catch(() => {});
        
        const message = {
            id: 'clear_' + Date.now(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: '🧹 <strong style="color:#ff0000;">ЧАТ ОЧИЩЕН АДМИНИСТРАТОРОМ!</strong> Все сообщения удалены.',
            channel: 'main',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        console.log('✅ Чат очищен админом');
        showAlert('✅ Чат полностью очищен!', 'success');
        
    } catch (error) {
        console.error('Ошибка очистки чата:', error);
        showAlert('❌ Ошибка: ' + error.message, 'error');
    }
}

function adminAnnouncement() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может делать объявления', 'error');
        return;
    }
    
    const text = prompt('Текст объявления для всех пользователей:');
    if (!text) return;
    
    adminSendAnnouncement(text);
}

async function adminSendAnnouncement(text) {
    const message = {
        id: 'announce_' + Date.now(),
        userId: 'system',
        userName: '📢 АДМИН-ОБЪЯВЛЕНИЕ',
        userAvatar: '📢',
        text: `📣 <div style="background: linear-gradient(45deg, rgba(255,153,0,0.2), rgba(255,255,0,0.2)); padding: 20px; border-radius: 12px; color: #ffcc00; font-weight: bold; border: 2px solid #ff9900; text-align: center; margin: 10px 0;">
            <div style="font-size: 1.3em; margin-bottom: 10px; color: #ff9900;">⚡ ВНИМАНИЕ ВСЕМ!</div>
            <div style="font-size: 1.1em; margin-bottom: 10px;">${text}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #ffcc88;">👑 От администратора <strong>${currentUser.name}</strong></div>
        </div>`,
        channel: 'main',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        // Отправляем в Telegram об объявлении
        const telegramMessage = `📢 <b>АДМИНИСТРАТОРСКОЕ ОБЪЯВЛЕНИЕ</b>\n\n` +
                               `👤 Администратор: ${currentUser.name}\n` +
                               `📝 Текст:\n<code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n` +
                               `🕒 Время: ${new Date().toLocaleTimeString('ru-RU')}`;
        
        sendToTelegram({
            id: 'announce_notif_' + Date.now(),
            userName: '📢 Система',
            text: telegramMessage,
            timestamp: Date.now(),
            channel: 'system'
        }).catch(() => {});
        
        console.log('✅ Объявление отправлено');
        showAlert('✅ Объявление отправлено всем пользователям!', 'success');
    } catch (error) {
        console.error('Ошибка отправки объявления:', error);
        showAlert('❌ Ошибка отправки объявления', 'error');
    }
}

/* ========== ФУНКЦИИ УЧИТЕЛЯ ========== */
function teacherAnnounce() {
    if (!isTeacher) {
        showAlert('❌ Только учитель может делать объявления', 'error');
        return;
    }
    
    const modal = document.getElementById('teacherAnnounceModal');
    if (modal) {
        modal.style.display = 'flex';
        const textarea = document.getElementById('teacherAnnounceText');
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }
    }
}

function closeTeacherAnnounce() {
    const modal = document.getElementById('teacherAnnounceModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function sendTeacherAnnouncement() {
    if (!isTeacher) return;
    
    const textarea = document.getElementById('teacherAnnounceText');
    if (!textarea) return;
    
    const text = textarea.value.trim();
    if (!text) {
        showAlert('Введите текст объявления!', 'error');
        return;
    }
    
    const message = {
        id: 'teacher_announce_' + Date.now(),
        userId: 'system',
        userName: '👨‍🏫 УЧИТЕЛЬСКОЕ ОБЪЯВЛЕНИЕ',
        userAvatar: '👨‍🏫',
        text: `📚 <div style="background: linear-gradient(45deg, rgba(255,153,0,0.2), rgba(255,204,0,0.2)); padding: 20px; border-radius: 12px; color: #ff9900; font-weight: bold; border: 2px solid #ff9900; text-align: center; margin: 10px 0;">
            <div style="font-size: 1.3em; margin-bottom: 10px; color: #ff9900;">👨‍🏫 ВНИМАНИЕ УЧЕНИКАМ!</div>
            <div style="font-size: 1.1em; margin-bottom: 10px;">${text}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #ffcc66;">👨‍🏫 От учителя <strong>${currentUser.name}</strong></div>
        </div>`,
        channel: 'lessons',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isTeacher: true
    };
    
    try {
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        // Отправляем в Telegram
        const telegramMessage = `👨‍🏫 <b>УЧИТЕЛЬСКОЕ ОБЪЯВЛЕНИЕ</b>\n\n` +
                               `👤 Учитель: ${currentUser.name}\n` +
                               `📝 Текст:\n<code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n` +
                               `🕒 Время: ${new Date().toLocaleTimeString('ru-RU')}`;
        
        sendToTelegram({
            id: 'teacher_announce_' + Date.now(),
            userName: '👨‍🏫 Система',
            text: telegramMessage,
            timestamp: Date.now(),
            channel: 'system'
        }).catch(() => {});
        
        closeTeacherAnnounce();
        showAlert('✅ Учительское объявление отправлено!', 'success');
        
    } catch (error) {
        console.error('Ошибка отправки учительского объявления:', error);
        showAlert('❌ Ошибка отправки объявления', 'error');
    }
}

function teacherPinMessage() {
    if (!isTeacher) {
        showAlert('❌ Только учитель может закреплять сообщения', 'error');
        return;
    }
    showAlert('Функция закрепления сообщений в разработке', 'info');
}

function teacherLessonPlan() {
    if (!isTeacher) {
        showAlert('❌ Только учитель может создавать планы уроков', 'error');
        return;
    }
    showAlert('Функция плана уроков в разработке', 'info');
}

async function adminKickAll() {
    if (!isAdmin) {
        showAlert('❌ Только администратор может кикать пользователей', 'error');
        return;
    }
    
    if (!confirm('🚨 КИКНУТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ?\nВсе онлайн пользователи будут отключены!')) {
        return;
    }
    
    try {
        if (database) {
            await database.ref('online').remove();
        }
        
        // Отправляем в Telegram о кике всех
        const telegramMessage = `🚨 <b>ВСЕ ПОЛЬЗОВАТЕЛИ ОТКЛЮЧЕНЫ АДМИНИСТРАТОРОМ!</b>\n\n` +
                               `👤 Администратор: ${currentUser.name}\n` +
                               `🕒 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                               `👥 Онлайн пользователей: 0\n` +
                               `⚠️ Принудительное отключение всех пользователей`;
        
        sendToTelegram({
            id: 'kickall_notif_' + Date.now(),
            userName: '🚨 Система',
            text: telegramMessage,
            timestamp: Date.now(),
            channel: 'system'
        }).catch(() => {});
        
        const message = {
            id: 'kickall_' + Date.now(),
            userId: 'system',
            userName: '👑 АДМИНИСТРАТОР',
            userAvatar: '👑',
            text: `🚨 <div style="background: linear-gradient(45deg, rgba(255,0,0,0.2), rgba(255,68,0,0.2)); padding: 20px; border-radius: 12px; border: 2px solid #ff0000; text-align: center;">
                   <strong style="color:#ff0000; font-size:1.3em;">⚠️ ВСЕ ПОЛЬЗОВАТЕЛИ ОТКЛЮЧЕНЫ!</strong><br><br>
                   🔥 Администратор <strong>${currentUser.name}</strong> отключил всех пользователей!<br><br>
                   <div style="font-size:0.9em; color:#ffaaaa;">Перезайдите в чат для продолжения общения</div>
                   </div>`,
            channel: 'main',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        if (database) {
            await database.ref('messages/' + message.id).set(message);
        } else {
            const messagesKey = 'firebase_messages';
            let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            messages.push(message);
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            updateMessagesDisplay();
        }
        
        console.log('✅ Все пользователи отключены');
        showAlert('✅ Все онлайн пользователи отключены!', 'success');
        
    } catch (error) {
        console.error('Ошибка кика всех:', error);
        showAlert('❌ Ошибка: ' + error.message, 'error');
    }
}

/* ========== ЛИЧНЫЕ СООБЩЕНИЯ (ПАПКА) ========== */
function toggleDMFolder() {
    const folderContent = document.getElementById('dmFolderContent');
    const folderArrow = document.querySelector('.folder-arrow');
    
    dmFolderOpen = !dmFolderOpen;
    
    if (folderContent) {
        if (dmFolderOpen) {
            folderContent.classList.add('open');
            folderContent.style.maxHeight = '250px';
            folderArrow.classList.add('open');
            loadDMDialogs();
        } else {
            folderContent.classList.remove('open');
            folderContent.style.maxHeight = '0';
            folderArrow.classList.remove('open');
        }
    }
}

function loadDMDialogs() {
    const dmList = document.getElementById('dmList');
    if (!dmList) return;
    
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    dmList.innerHTML = '';
    
    let hasDialogs = false;
    let unreadCount = 0;
    
    Object.entries(dialogs).forEach(([userId, dialog]) => {
        if (dialog.messages && dialog.messages.length > 0) {
            hasDialogs = true;
            const lastMessage = dialog.messages[dialog.messages.length - 1];
            const isUnread = lastMessage && !lastMessage.read && lastMessage.userId !== myUserId;
            
            if (isUnread) unreadCount++;
            
            const dmItem = document.createElement('div');
            dmItem.className = `dm-item ${isUnread ? 'unread' : ''}`;
            dmItem.onclick = () => openDM(userId);
            
            dmItem.innerHTML = `
                <div class="dm-avatar">${dialog.avatar || '👤'}</div>
                <div class="dm-info">
                    <div class="dm-user">${dialog.name}</div>
                    <div class="dm-preview">${lastMessage?.text?.substring(0, 30) || 'Нет сообщений'}...</div>
                </div>
                ${isUnread ? '<span class="dm-badge">!</span>' : ''}
            `;
            
            dmList.appendChild(dmItem);
        }
    });
    
    updateDMBadge(unreadCount);
    
    if (!hasDialogs) {
        dmList.innerHTML = `
            <div style="text-align: center; padding: 15px; color: rgba(255,255,255,0.5);">
                <i class="fas fa-envelope" style="font-size: 1.5em; margin-bottom: 8px; display: block;"></i>
                Нет диалогов
            </div>
        `;
    }
}

function updateDMBadge(count) {
    const folderBadge = document.getElementById('dmFolderBadge');
    const mobileBadge = document.getElementById('mobileDMBadge');
    
    if (folderBadge) {
        if (count > 0) {
            folderBadge.textContent = count;
            folderBadge.style.display = 'inline';
        } else {
            folderBadge.style.display = 'none';
        }
    }
    
    if (mobileBadge) {
        if (count > 0) {
            mobileBadge.textContent = count;
            mobileBadge.style.display = 'inline';
        } else {
            mobileBadge.style.display = 'none';
        }
    }
}

/* ========== ИСПРАВЛЕНИЯ ДЛЯ МОБИЛЬНОГО ВВОДА ========== */
function setupMobileInput() {
    const isMobile = window.innerWidth <= 768;
    const inputArea = document.getElementById('inputArea');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (isMobile && inputArea && messagesContainer) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('focus', function() {
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    hideMobilePanels();
                    closeEmojiPanel();
                }, 100);
            });
            
            messageInput.addEventListener('blur', function() {
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            });
        }
    }
}

function closeEmojiPanel() {
    const emojiPanel = document.getElementById('emojiPanel');
    if (emojiPanel) {
        emojiPanel.style.display = 'none';
    }
}

/* ========== ИСПРАВЛЕНИЯ ДЛЯ ЛЕВОГО МЕНЮ ========== */
function updateChannelLayout() {
    const channels = document.querySelectorAll('.channel');
    channels.forEach(channel => {
        const icon = channel.querySelector('i');
        const text = channel.querySelector('.channel-text');
        const badge = channel.querySelector('.unread-badge');
        
        if (icon && text && badge) {
            channel.style.justifyContent = 'flex-start';
            channel.style.alignItems = 'center';
            
            icon.style.marginRight = '10px';
            text.style.flex = '1';
            text.style.minWidth = '0';
            text.style.overflow = 'hidden';
            text.style.textOverflow = 'ellipsis';
            badge.style.marginLeft = '8px';
        }
    });
}

/* ========== УТИЛИТЫ ========== */
function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji + ' ';
        input.focus();
    }
}

function toggleEmojiPanel() {
    const emojiPanel = document.getElementById('emojiPanel');
    if (emojiPanel) {
        if (emojiPanel.style.display === 'block') {
            emojiPanel.style.display = 'none';
        } else {
            emojiPanel.style.display = 'block';
        }
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.channel').forEach(el => el.classList.remove('active'));
    
    const targetChannel = document.querySelector(`[onclick*="switchChannel('${channel}')"]`);
    if (targetChannel) {
        targetChannel.classList.add('active');
    }
    
    const channelNames = {
        'main': 'Основной чат',
        'games': 'Игры',
        'lessons': 'Уроки',
        'ai': '🤖 Нейросеть',
        'dm': 'Личные сообщения'
    };
    
    const channelNameElement = document.getElementById('channelName');
    if (channelNameElement) {
        channelNameElement.textContent = channelNames[channel] || channel;
    }
    
    updateMessagesDisplay();
    hideMobilePanels();
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
        rightSidebar.classList.remove('active');
    }
}

function toggleMembers() {
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
        rightSidebar.classList.toggle('active');
    }
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

function showDMView() {
    const dmFolder = document.getElementById('dmFolder');
    if (dmFolder) {
        const folderHeader = dmFolder.querySelector('.folder-header');
        if (folderHeader) {
            folderHeader.click();
        }
    }
}

function forceSync() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => btn.style.transform = 'rotate(0deg)', 300);
    }
    
    updateOnlineStatus();
    updateMessagesDisplay();
    showAlert('Чат обновлен!', 'success');
}

function hideMobilePanels() {
    document.querySelectorAll('.sidebar, .right-sidebar').forEach(panel => {
        panel.classList.remove('active');
    });
}

function adjustMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const inputArea = document.getElementById('inputArea');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (isMobile && inputArea && mobileMenu) {
        const menuHeight = mobileMenu.offsetHeight;
        inputArea.style.paddingBottom = (menuHeight + 10) + 'px';
    }
}

function startNewDM() {
    const modal = document.getElementById('newDMModal');
    if (modal) {
        modal.style.display = 'flex';
        const recipientInput = document.getElementById('dmRecipient');
        if (recipientInput) {
            recipientInput.value = '';
            recipientInput.focus();
        }
    }
}

function closeNewDM() {
    const modal = document.getElementById('newDMModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function sendDirectMessage() {
    const recipient = document.getElementById('dmRecipient').value.trim();
    const messageText = document.getElementById('dmMessageText').value.trim();
    
    if (!recipient) {
        showAlert('Введите имя получателя!', 'error');
        return;
    }
    
    if (!messageText) {
        showAlert('Введите сообщение!', 'error');
        return;
    }
    
    // Сохраняем диалог
    const dialogKey = 'neonchat_dm_' + recipient.toLowerCase();
    const existingDialog = JSON.parse(localStorage.getItem(dialogKey) || '{"messages":[], "name": "' + recipient + '", "avatar": "👤"}');
    
    const newMessage = {
        id: 'dm_' + Date.now(),
        userId: myUserId,
        userName: currentUser.name,
        text: messageText,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
    };
    
    existingDialog.messages.push(newMessage);
    localStorage.setItem(dialogKey, JSON.stringify(existingDialog));
    
    // Обновляем список диалогов
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    dialogs[recipient.toLowerCase()] = {
        name: recipient,
        avatar: '👤',
        messages: existingDialog.messages,
        lastMessage: newMessage.timestamp
    };
    localStorage.setItem('neonchat_dialogs', JSON.stringify(dialogs));
    
    closeNewDM();
    loadDMDialogs();
    showAlert('Личное сообщение отправлено!', 'success');
}

function openDM(userId) {
    // Переключаемся на вкладку ЛС
    switchChannel('dm');
    
    // Загружаем сообщения из этого диалога
    const dialogs = JSON.parse(localStorage.getItem('neonchat_dialogs') || '{}');
    const dialog = dialogs[userId];
    
    if (dialog) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            
            dialog.messages.forEach(msg => {
                const isOwn = msg.userId === myUserId;
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isOwn ? 'own' : ''}`;
                
                messageDiv.innerHTML = `
                    <div class="message-header">
                        <span class="message-user">${msg.userName}</span>
                        <span class="message-time">${msg.time}</span>
                    </div>
                    <div class="message-content">${msg.text}</div>
                `;
                
                messagesContainer.appendChild(messageDiv);
            });
            
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    hideMobilePanels();
}

function logout() {
    if (confirm('Выйти из чата?')) {
        if (database && myUserId) {
            try {
                database.ref('online/' + myUserId).remove();
            } catch (e) {}
        }
        
        if (onlineTimeout) clearInterval(onlineTimeout);
        
        localStorage.removeItem('neonchat_current_user');
        location.reload();
    }
}

/* ========== УВЕДОМЛЕНИЯ ========== */
function testNotification() {
    if (notificationsEnabled) {
        showBrowserNotification("NeonChat", "Тестовое уведомление работает!");
        showAlert('✅ Тестовое уведомление отправлено!', 'success');
    } else {
        showAlert('⚠️ Уведомления не разрешены. Разрешите их в настройках браузера.', 'warning');
    }
}

function showNotificationSettings() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Загружаем сохраненные настройки
        const soundEnabled = localStorage.getItem('neonchat_sound_enabled');
        const notifyMentions = localStorage.getItem('neonchat_notify_mentions');
        const notifyDM = localStorage.getItem('neonchat_notify_dm');
        const volume = localStorage.getItem('neonchat_volume');
        
        const soundCheckbox = document.getElementById('soundEnabled');
        const mentionsCheckbox = document.getElementById('notifyMentions');
        const dmCheckbox = document.getElementById('notifyDM');
        const volumeSlider = document.getElementById('notificationVolume');
        const volumeValue = document.getElementById('volumeValue');
        
        if (soundCheckbox) soundCheckbox.checked = soundEnabled !== 'false';
        if (mentionsCheckbox) mentionsCheckbox.checked = notifyMentions !== 'false';
        if (dmCheckbox) dmCheckbox.checked = notifyDM !== 'false';
        if (volumeSlider) {
            volumeSlider.value = volume || '50';
            if (volumeValue) volumeValue.textContent = (volume || '50') + '%';
        }
        
        // Обновляем значение громкости при изменении слайдера
        if (volumeSlider && volumeValue) {
            volumeSlider.oninput = function() {
                volumeValue.textContent = this.value + '%';
            };
        }
    }
}

function closeNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function saveNotificationSettings() {
    const soundEnabled = document.getElementById('soundEnabled').checked;
    const notifyMentions = document.getElementById('notifyMentions').checked;
    const notifyDM = document.getElementById('notifyDM').checked;
    const volume = document.getElementById('notificationVolume').value;
    
    localStorage.setItem('neonchat_sound_enabled', soundEnabled);
    localStorage.setItem('neonchat_notify_mentions', notifyMentions);
    localStorage.setItem('neonchat_notify_dm', notifyDM);
    localStorage.setItem('neonchat_volume', volume);
    
    closeNotifications();
    showAlert('Настройки уведомлений сохранены!', 'success');
}

function testNotificationSound() {
    playNotificationSound();
    showAlert('✅ Звук уведомления воспроизведен', 'success');
}

function showAlert(message, type = 'info') {
    const oldAlerts = document.querySelectorAll('.neon-alert');
    oldAlerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
    
    const alertDiv = document.createElement('div');
    const colors = {
        success: '#00cc66',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#00aaff'
    };
    
    alertDiv.className = 'neon-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.3);
        font-weight: 500;
        font-size: 14px;
    `;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alertDiv.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}" style="font-size: 1.2em;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alertDiv);
    
    if (!document.querySelector('#alert-animations')) {
        const style = document.createElement('style');
        style.id = 'alert-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                document.body.removeChild(alertDiv);
            }
        }, 300);
    }, 4000);
}

// Глобальные функции
window.toggleRegister = toggleRegister;
window.toggleLogin = toggleLogin;
window.teacherLogin = teacherLogin;
window.handleAuth = handleAuth;
window.sendMessage = sendMessage;
window.addEmoji = addEmoji;
window.toggleEmojiPanel = toggleEmojiPanel;
window.switchChannel = switchChannel;
window.startCall = startCall;
window.createDiscordCall = createDiscordCall;
window.createGoogleMeetCall = createGoogleMeetCall;
window.createZoomCall = createZoomCall;
window.createCustomCall = createCustomCall;
window.toggleSidebar = toggleSidebar;
window.toggleMembers = toggleMembers;
window.forceSync = forceSync;
window.logout = logout;
window.showTelegramInfo = showTelegramInfo;
window.testNotification = testNotification;
window.showNotificationSettings = showNotificationSettings;
window.closeNotifications = closeNotifications;
window.saveNotificationSettings = saveNotificationSettings;
window.testNotificationSound = testNotificationSound;
window.startNewDM = startNewDM;
window.closeNewDM = closeNewDM;
window.sendDirectMessage = sendDirectMessage;
window.teacherAnnounce = teacherAnnounce;
window.closeTeacherAnnounce = closeTeacherAnnounce;
window.sendTeacherAnnouncement = sendTeacherAnnouncement;
window.teacherPinMessage = teacherPinMessage;
window.teacherLessonPlan = teacherLessonPlan;
window.adminClearChat = adminClearChat;
window.adminAnnouncement = adminAnnouncement;
window.adminKickAll = adminKickAll;
window.showDMView = showDMView;

console.log('✅ Все функции загружены! Telegram бот настроен: все сообщения будут приходить!');
console.log('🔧 Проверка Telegram:');
console.log('   Токен:', TELEGRAM_BOT_TOKEN ? '✅ Есть' : '❌ Нет');
console.log('   Chat ID:', TELEGRAM_CHAT_ID ? '✅ Есть' : '❌ Нет');
console.log('💡 Для теста используй команду /testtelegram');
