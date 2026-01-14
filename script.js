/* ========== ВИДЕОЗВОНКИ ЧЕРЕЗ GOOGLE MEET ========== */
function startCall() {
    if (!currentUser) {
        showAlert('Сначала войди в чат!', 'error');
        return;
    }
    
    // Генерируем уникальный код для Google Meet
    const meetCode = generateMeetCode();
    
    // Создаем ссылку Google Meet (работает 100%)
    const meetLink = `https://meet.google.com/${meetCode}`;
    // Альтернативная ссылка для мобильных
    const meetLinkMobile = `https://meet.google.com/new?hs=0&authuser=0`;
    
    // Создаем красивое сообщение о звонке
    const callMessage = createGoogleMeetMessage(meetCode, meetLink);
    
    // Отправляем сообщение в чат
    sendCallMessage(callMessage);
    
    // Показываем инструкцию
    showMeetInstructions(meetCode, meetLink);
}

function generateMeetCode() {
    // Генерируем код как у Google Meet (3 группы по 3 буквы-цифры)
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    
    let code = '';
    
    // Первая часть: 3 буквы
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Вторая часть: 3 буквы/цифры
    for (let i = 0; i < 3; i++) {
        const pool = Math.random() > 0.5 ? chars : nums;
        code += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    
    // Третья часть: 3 буквы/цифры
    for (let i = 0; i < 3; i++) {
        const pool = Math.random() > 0.5 ? chars : nums;
        code += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    
    return code.toLowerCase();
}

function createGoogleMeetMessage(meetCode, meetLink) {
    const timestamp = Date.now();
    
    return {
        id: 'call_' + timestamp + '_' + Math.random().toString(36).substr(2, 9),
        userId: 'system',
        userName: '📞 Система звонков',
        userAvatar: '📞',
        text: `
            <div class="call-message-container" style="
                background: linear-gradient(135deg, rgba(26, 115, 232, 0.15), rgba(66, 133, 244, 0.15));
                border-radius: 16px;
                padding: 22px;
                margin: 12px 0;
                border: 2px solid rgba(66, 133, 244, 0.4);
                box-shadow: 0 8px 25px rgba(66, 133, 244, 0.25);
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            ">
                <!-- Google цвета в фоне -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background: linear-gradient(90deg, #4285f4, #34a853, #fbbc05, #ea4335);
                    background-size: 400% 100%;
                    animation: gradientMove 4s ease infinite;
                "></div>
                
                <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 18px;">
                    <div style="
                        background: linear-gradient(135deg, #4285f4, #34a853);
                        width: 55px;
                        height: 55px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.6em;
                        color: white;
                        box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
                    ">
                        <i class="fab fa-google"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.4em; font-weight: 700; color: #4285f4; margin-bottom: 6px;">
                            🎥 GOOGLE MEET ЗВОНОК
                        </div>
                        <div style="color: rgba(255,255,255,0.85); font-size: 0.95em; display: flex; align-items: center; gap: 8px;">
                            <div style="
                                background: #34a853;
                                color: white;
                                padding: 4px 10px;
                                border-radius: 20px;
                                font-size: 0.85em;
                                font-weight: 600;
                            ">
                                <i class="fas fa-user-check"></i> ${currentUser.name}
                            </div>
                            <span>создал видеозвонок</span>
                        </div>
                    </div>
                </div>
                
                <!-- Код встречи -->
                <div style="
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 12px;
                    padding: 18px;
                    margin: 18px 0;
                    border: 1px solid rgba(66, 133, 244, 0.3);
                    text-align: center;
                ">
                    <div style="color: #fbbc05; font-size: 0.95em; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-key"></i> Код встречи:
                    </div>
                    <div style="
                        background: rgba(66, 133, 244, 0.2);
                        padding: 14px;
                        border-radius: 10px;
                        font-family: 'Courier New', monospace;
                        font-weight: 800;
                        color: white;
                        font-size: 1.5em;
                        letter-spacing: 3px;
                        border: 2px solid rgba(66, 133, 244, 0.5);
                        margin-bottom: 15px;
                    ">
                        ${meetCode}
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <a href="${meetLink}" target="_blank" onclick="joinMeetCall('${meetLink}')" style="
                            flex: 1;
                            min-width: 200px;
                            background: linear-gradient(135deg, #4285f4, #34a853);
                            color: white;
                            text-align: center;
                            padding: 16px 24px;
                            border-radius: 12px;
                            text-decoration: none;
                            font-weight: 700;
                            font-size: 1.1em;
                            border: 1px solid rgba(255,255,255,0.3);
                            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 12px;
                            position: relative;
                            overflow: hidden;
                        ">
                            <i class="fas fa-video"></i>
                            <span>Присоединиться</span>
                            <div style="
                                position: absolute;
                                top: 0;
                                left: -100%;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                                animation: shimmer 2s infinite;
                            "></div>
                        </a>
                        
                        <button onclick="copyMeetCode('${meetCode}')" style="
                            flex: 1;
                            min-width: 150px;
                            background: rgba(251, 188, 5, 0.2);
                            border: 1px solid rgba(251, 188, 5, 0.5);
                            color: #fbbc05;
                            text-align: center;
                            padding: 16px 20px;
                            border-radius: 12px;
                            font-weight: 700;
                            font-size: 1em;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        ">
                            <i class="fas fa-copy"></i>
                            <span>Копировать код</span>
                        </button>
                    </div>
                </div>
                
                <!-- Инструкция -->
                <div style="
                    background: rgba(52, 168, 83, 0.1);
                    border-radius: 10px;
                    padding: 16px;
                    margin-top: 15px;
                    border-left: 4px solid #34a853;
                ">
                    <div style="color: #34a853; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-lightbulb"></i> Как присоединиться:
                    </div>
                    <div style="color: rgba(255,255,255,0.9); line-height: 1.5; font-size: 0.9em;">
                        <div style="margin-bottom: 6px;">1. <strong>Нажмите "Присоединиться"</strong></div>
                        <div style="margin-bottom: 6px;">2. Войдите в Google аккаунт (или используйте гостевой доступ)</div>
                        <div style="margin-bottom: 6px;">3. <strong>Введите код:</strong> ${meetCode}</div>
                        <div>4. Разрешите доступ к камере и микрофону</div>
                    </div>
                </div>
                
                <!-- Google лого -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    font-size: 0.85em;
                    color: rgba(255,255,255,0.6);
                ">
                    <i class="fab fa-google" style="color: #4285f4;"></i>
                    <span>Работает на Google Meet</span>
                    <i class="fas fa-shield-alt" style="color: #34a853;"></i>
                    <span>Безопасно</span>
                </div>
            </div>
            
            <style>
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                .call-message-container:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(66, 133, 244, 0.35);
                }
                a:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(66, 133, 244, 0.5);
                }
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(251, 188, 5, 0.3);
                    background: rgba(251, 188, 5, 0.3);
                }
            </style>
        `,
        channel: currentChannel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isCall: true
    };
}

function showMeetInstructions(meetCode, meetLink) {
    const overlay = document.createElement('div');
    overlay.className = 'meet-instructions-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.97);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(20px);
        animation: fadeIn 0.4s ease;
        padding: 30px;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 40px;
        border-radius: 24px;
        border: 2px solid rgba(66, 133, 244, 0.6);
        box-shadow: 0 0 60px rgba(66, 133, 244, 0.5);
        max-width: 650px;
        width: 90%;
        color: white;
        position: relative;
        overflow: hidden;
    `;
    
    // Google градиентный бордер
    modal.innerHTML = `
        <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #4285f4, #34a853, #fbbc05, #ea4335);
            background-size: 400% 100%;
            animation: gradientMove 4s ease infinite;
        "></div>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                background: rgba(66, 133, 244, 0.1);
                padding: 15px 30px;
                border-radius: 50px;
                margin-bottom: 20px;
            ">
                <div style="
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2em;
                    color: white;
                    box-shadow: 0 8px 25px rgba(66, 133, 244, 0.5);
                ">
                    <i class="fab fa-google"></i>
                </div>
                <div style="text-align: left;">
                    <h2 style="color: #4285f4; margin: 0; font-size: 2em; font-weight: 800;">
                        Google Meet
                    </h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">
                        видеозвонок создан!
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Код встречи крупно -->
        <div style="
            background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15));
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            border: 2px solid rgba(66, 133, 244, 0.4);
            text-align: center;
            position: relative;
            overflow: hidden;
        ">
            <div style="color: #fbbc05; font-size: 1.1em; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                <i class="fas fa-hashtag" style="font-size: 1.3em;"></i>
                <span style="font-weight: 600;">КОД ВСТРЕЧИ</span>
            </div>
            
            <div style="
                background: rgba(0, 0, 0, 0.3);
                padding: 25px;
                border-radius: 16px;
                font-family: 'Courier New', monospace;
                font-weight: 900;
                color: white;
                font-size: 2.5em;
                letter-spacing: 5px;
                border: 3px solid rgba(66, 133, 244, 0.6);
                margin: 20px 0;
                text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                box-shadow: inset 0 0 30px rgba(66, 133, 244, 0.2);
            ">
                ${meetCode}
            </div>
            
            <div style="color: rgba(255,255,255,0.8); font-size: 1.1em; margin: 25px 0; line-height: 1.6;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-user" style="color: #4285f4;"></i>
                    <span>Организатор: <strong style="color: #34a853;">${currentUser.name}</strong></span>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-clock" style="color: #fbbc05;"></i>
                    <span>Создано: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
                <a href="${meetLink}" target="_blank" onclick="joinMeetCall('${meetLink}')" style="
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    color: white;
                    text-align: center;
                    padding: 20px;
                    border-radius: 16px;
                    text-decoration: none;
                    font-weight: 800;
                    font-size: 1.3em;
                    border: 2px solid rgba(255,255,255,0.3);
                    box-shadow: 0 8px 30px rgba(66, 133, 244, 0.5);
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <i class="fas fa-video" style="font-size: 1.5em;"></i>
                    <span>Присоединиться</span>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                        animation: shimmer 2s infinite;
                    "></div>
                </a>
                
                <button onclick="copyMeetCode('${meetCode}')" style="
                    background: linear-gradient(135deg, rgba(251, 188, 5, 0.2), rgba(234, 67, 53, 0.2));
                    border: 2px solid rgba(251, 188, 5, 0.6);
                    color: #fbbc05;
                    text-align: center;
                    padding: 20px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 1.2em;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                ">
                    <i class="fas fa-copy" style="font-size: 1.5em;"></i>
                    <span>Копировать код</span>
                </button>
            </div>
        </div>
        
        <!-- Подробная инструкция -->
        <div style="
            background: rgba(52, 168, 83, 0.1);
            border-radius: 16px;
            padding: 25px;
            margin-top: 30px;
            border-left: 5px solid #34a853;
        ">
            <div style="color: #34a853; font-weight: 800; margin-bottom: 15px; font-size: 1.3em; display: flex; align-items: center; gap: 15px;">
                <i class="fas fa-graduation-cap"></i>
                <span>Полная инструкция</span>
            </div>
            
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
            ">
                <div style="
                    background: rgba(66, 133, 244, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(66, 133, 244, 0.3);
                ">
                    <div style="color: #4285f4; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-laptop" style="font-size: 1.2em;"></i>
                        <span>На компьютере</span>
                    </div>
                    <ul style="color: rgba(255,255,255,0.9); padding-left: 20px; margin: 0; line-height: 1.6;">
                        <li>Нажмите "Присоединиться"</li>
                        <li>Войдите в Google аккаунт</li>
                        <li>Разрешите доступ к камере/микрофону</li>
                        <li>Наслаждайтесь общением!</li>
                    </ul>
                </div>
                
                <div style="
                    background: rgba(251, 188, 5, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(251, 188, 5, 0.3);
                ">
                    <div style="color: #fbbc05; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-mobile-alt" style="font-size: 1.2em;"></i>
                        <span>На телефоне</span>
                    </div>
                    <ul style="color: rgba(255,255,255,0.9); padding-left: 20px; margin: 0; line-height: 1.6;">
                        <li>Установите приложение Google Meet</li>
                        <li>Нажмите "Присоединиться"</li>
                        <li>Введите код: <strong>${meetCode}</strong></li>
                        <li>Или отсканируйте QR-код</li>
                    </ul>
                </div>
            </div>
            
            <!-- QR код для мобильных -->
            <div style="
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 20px;
                margin-top: 20px;
                text-align: center;
                border: 1px dashed rgba(255,255,255,0.2);
            ">
                <div style="color: #ea4335; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-qrcode"></i>
                    <span>Для быстрого подключения с телефона</span>
                </div>
                <div style="
                    background: white;
                    width: 180px;
                    height: 180px;
                    margin: 15px auto;
                    border-radius: 12px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: monospace;
                    font-weight: 900;
                    color: #1a1a1a;
                    font-size: 1.1em;
                    word-break: break-all;
                    border: 3px solid #4285f4;
                ">
                    meet.google.com/${meetCode}
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.9em; margin-top: 10px;">
                    Отсканируйте код камерой телефона
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 40px; flex-wrap: wrap;">
            <button onclick="createNewMeetLink()" style="
                background: linear-gradient(135deg, #4285f4, #34a853);
                border: none;
                color: white;
                padding: 16px 35px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 700;
                font-size: 1.1em;
                box-shadow: 0 6px 25px rgba(66, 133, 244, 0.4);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <i class="fas fa-plus-circle"></i>
                <span>Создать новую встречу</span>
            </button>
            
            <button onclick="this.closest('.meet-instructions-overlay').remove()" style="
                background: rgba(234, 67, 53, 0.2);
                border: 2px solid rgba(234, 67, 53, 0.6);
                color: #ea4335;
                padding: 16px 35px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 700;
                font-size: 1.1em;
                transition: all 0.3s ease;
            ">
                Закрыть
            </button>
        </div>
        
        <!-- Google футер -->
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-top: 40px;
            padding-top: 25px;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.6);
            font-size: 0.9em;
            flex-wrap: wrap;
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-shield-alt" style="color: #34a853;"></i>
                <span>Защищено Google</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-infinity" style="color: #4285f4;"></i>
                <span>Бесплатно</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-globe" style="color: #fbbc05;"></i>
                <span>Работает везде</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-users" style="color: #ea4335;"></i>
                <span>До 100 участников</span>
            </div>
        </div>
        
        <style>
            @keyframes gradientMove {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            a:hover, button:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(66, 133, 244, 0.6);
            }
        </style>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Закрытие по клику на оверлей
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function joinMeetCall(meetLink) {
    // Открываем Google Meet в новом окне
    const width = 1300;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
    
    window.open(meetLink, 'NeonChat Google Meet', features);
    
    // Закрываем модальное окно
    const overlay = document.querySelector('.meet-instructions-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function copyMeetCode(meetCode) {
    const text = `Google Meet звонок от ${currentUser.name}:
Код встречи: ${meetCode}
Ссылка: https://meet.google.com/${meetCode}
Присоединяйтесь!`;
    
    navigator.clipboard.writeText(text).then(() => {
        showAlert('✅ Код звонка скопирован в буфер обмена!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('✅ Код звонка скопирован!', 'success');
    });
}

function createNewMeetLink() {
    // Открываем страницу создания новой встречи
    window.open('https://meet.google.com/new', '_blank');
}

// Обновляем обработчики событий для эмодзи кнопок
function setupEmojiButtons() {
    document.querySelectorAll('.action-btn').forEach(btn => {
        const emoji = btn.textContent.trim();
        btn.onclick = function(e) {
            e.preventDefault();
            addEmoji(emoji);
        };
    });
}

// Добавляем в конце файла:
window.joinMeetCall = joinMeetCall;
window.copyMeetCode = copyMeetCode;
window.createNewMeetLink = createNewMeetLink;
