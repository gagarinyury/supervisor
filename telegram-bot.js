require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const PatientSystem = require('./patient-system');

// Инициализация Telegram бота с токеном из .env файла
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('ОШИБКА: Токен Telegram бота не найден. Добавьте TELEGRAM_BOT_TOKEN в файл .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log('Бот успешно запущен...');

// Устанавливаем команды в меню бота
bot.setMyCommands([
  { command: '/start', description: '🏠 Начать работу с ботом' },
  { command: '/new', description: '👤 Новый пациент' },
  { command: '/custom', description: '🧩 Выбрать пациента' },
  { command: '/analyze', description: '📊 Анализировать сессию' },
  { command: '/info', description: 'ℹ️ Информация о пациенте' },
  { command: '/end', description: '🏁 Завершить сессию' },
  { command: '/stats', description: '📈 Моя статистика' },
  { command: '/help', description: '❓ Помощь' }
]);

// Инициализация Claude API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Создаем систему эмуляции пациентов
const patientSystem = new PatientSystem();

// Хранилище данных пользователей
let userSessions = {};

// Путь к файлу для сохранения данных пользователей
const USER_DATA_FILE = './telegram_users.json';

// Загрузка данных пользователей при запуске
function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
      userSessions = JSON.parse(data);
      console.log('Данные пользователей загружены из файла');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователей:', error);
  }
}

// Сохранение данных пользователей
function saveUserData(userId = null) {
  try {
    // Проверяем существование файла
    if (!fs.existsSync(USER_DATA_FILE)) {
      // Если файла нет, создаем новый с пустым объектом
      fs.writeFileSync(USER_DATA_FILE, JSON.stringify({}, null, 2));
    }
    
    // Если указан ID, обновляем только одну запись
    if (userId) {
      let allData = {};
      try {
        allData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
      } catch (e) {
        // Если файл поврежден, создаем новый
        allData = {};
      }
      allData[userId] = userSessions[userId];
      fs.writeFileSync(USER_DATA_FILE, JSON.stringify(allData, null, 2));
    } else {
      // Иначе сохраняем все
      fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userSessions, null, 2));
    }
  } catch (error) {
    console.error('Ошибка при сохранении данных пользователей:', error);
  }
}

// Получение сессии пользователя
function getUserSession(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      state: 'idle',
      currentPatient: null,
      conversation: [],
      lastMessage: null,
      lastAnalysis: null
    };
    saveUserData(userId);
  }
  return userSessions[userId];
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const userName = msg.from.first_name || "Пользователь";
  
  const userSession = getUserSession(userId);
  userSession.userName = userName;
  userSession.state = 'idle';
  
  // Отправляем приветственное сообщение с логотипом (эмодзи) и описанием
  bot.sendMessage(
    userId,
    `🧠 *Добро пожаловать в ПсихоТренер!* 🧠\n\n` +
    `Здравствуйте, ${userName}!\n\n` +
    `Я помогу вам улучшить навыки психотерапевта с помощью симуляции реальных пациентов с различными психологическими проблемами.\n\n` +
    `🤖 AI-система генерирует уникальных пациентов\n` +
    `🗣 Ведите диалог, как на реальной сессии\n` +
    `📊 Получайте профессиональный анализ вашей работы\n` +
    `📈 Отслеживайте свой прогресс\n\n` +
    `Нажмите кнопку ниже, чтобы начать:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎲 Случайный пациент", callback_data: "start_new_patient" }],
          [{ text: "🧩 Выбрать пациента", callback_data: "start_custom_patient" }],
          [{ text: "❓ Как пользоваться ботом", callback_data: "show_help" }]
        ]
      }
    }
  );
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
  const userId = msg.from.id;
  
  bot.sendMessage(
    userId,
    "📋 *Доступные команды:*\n\n" +
    "/new - Создать нового пациента\n" +
    "/analyze - Анализировать текущую сессию\n" +
    "/end - Завершить сессию с пациентом\n" +
    "/stats - Ваша статистика\n" +
    "/help - Эта справка\n\n" +
    
    "📝 *Как пользоваться ботом:*\n" +
    "1. Начните с команды /new для создания пациента\n" +
    "2. Задавайте вопросы пациенту как обычные сообщения\n" +
    "3. Используйте /analyze для получения обратной связи\n" +
    "4. Завершите сессию командой /end когда закончите",
    { parse_mode: 'Markdown' }
  );
});

// Обработчик команды /new для создания нового пациента
bot.onText(/\/new/, async (msg) => {
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  
  // Проверяем, не в активной ли сессии пользователь
  if (userSession.state === 'in_dialog' && userSession.currentPatient) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Да, создать нового", callback_data: "confirm_new_patient" },
            { text: "Нет, вернуться", callback_data: "cancel_new_patient" }
          ]
        ]
      }
    };
    
    bot.sendMessage(
      userId,
      "⚠️ У вас уже есть активный диалог с пациентом. Вы уверены, что хотите начать новую сессию? Текущий диалог будет потерян.",
      options
    );
    return;
  }
  
  // Создаем случайного пациента сразу
  createRandomPatient(userId);
});

// Обработчик команды /custom для создания пациента с выбором параметров
bot.onText(/\/custom/, async (msg) => {
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  
  // Проверяем, не в активной ли сессии пользователь
  if (userSession.state === 'in_dialog' && userSession.currentPatient) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Да, выбрать пациента", callback_data: "confirm_custom_patient" },
            { text: "Нет, вернуться", callback_data: "cancel_new_patient" }
          ]
        ]
      }
    };
    
    bot.sendMessage(
      userId,
      "⚠️ У вас уже есть активный диалог с пациентом. Вы уверены, что хотите начать новую сессию? Текущий диалог будет потерян.",
      options
    );
    return;
  }
  
  // Показываем меню выбора категории пациента
  showCategoriesMenu(userId);
});

// Функция для отображения меню категорий
function showCategoriesMenu(userId) {
  const categories = Object.entries(patientSystem.casesDB);
  const keyboard = [];
  
  // Формируем клавиатуру из категорий (по 2 в ряд)
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push({ text: categories[i][1].name, callback_data: `category:${categories[i][0]}` });
    
    if (i + 1 < categories.length) {
      row.push({ text: categories[i+1][1].name, callback_data: `category:${categories[i+1][0]}` });
    }
    
    keyboard.push(row);
  }
  
  // Добавляем кнопку случайного пациента
  keyboard.push([{ text: "🎲 Случайный пациент", callback_data: "random_patient" }]);
  
  const options = {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
  
  bot.sendMessage(
    userId,
    "Выберите категорию пациента:",
    options
  );
}

// Обработчик для выбора категории
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  // Подтверждение создания нового пациента
  if (data === 'confirm_new_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Сбрасываем сессию и создаем нового случайного пациента
    const userSession = getUserSession(userId);
    userSession.state = 'idle';
    userSession.currentPatient = null;
    userSession.conversation = [];
    userSession.lastAnalysis = null;
    saveUserData(userId);
    
    createRandomPatient(userId);
    return;
  }

  // Подтверждение создания пациента с выбором параметров
  if (data === 'confirm_custom_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Сбрасываем сессию и показываем меню выбора категории
    const userSession = getUserSession(userId);
    userSession.state = 'idle';
    userSession.currentPatient = null;
    userSession.conversation = [];
    userSession.lastAnalysis = null;
    saveUserData(userId);
    
    showCategoriesMenu(userId);
    return;
  }
  
  // Отмена создания нового пациента
  if (data === 'cancel_new_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    bot.sendMessage(userId, "Вы продолжаете текущую сессию с пациентом.");
    return;
  }
  
  // Создание случайного пациента
  if (data === 'random_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    createRandomPatient(userId);
    return;
  }
  
  // Выбор категории
  if (data.startsWith('category:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const category = data.split(':')[1];
    
    if (patientSystem.casesDB[category]) {
      showOpennessMenu(userId, category);
    } else {
      bot.sendMessage(userId, "❌ Ошибка: категория не найдена");
    }
    return;
  }
  
  // Выбор открытости пациента
  if (data.startsWith('openness:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const [_, category, openness] = data.split(':');
    
    if (patientSystem.casesDB[category] && patientSystem.openness[openness]) {
      showComplexityMenu(userId, category, openness);
    } else {
      bot.sendMessage(userId, "❌ Ошибка: неверные параметры");
    }
    return;
  }
  
  // Выбор сложности и создание пациента
  if (data.startsWith('complexity:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const [_, category, openness, complexity] = data.split(':');
    const complexityNum = parseInt(complexity);
    
    if (
      patientSystem.casesDB[category] && 
      patientSystem.openness[openness] && 
      complexityNum >= 1 && complexityNum <= 5
    ) {
      createPatient(userId, category, openness, complexityNum);
    } else {
      bot.sendMessage(userId, "❌ Ошибка: неверные параметры");
    }
    return;
  }
  
  // Показать помощь
  if (data === 'show_help') {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    const helpText = 
      "🧠 *Как пользоваться ПсихоТренером* 🧠\n\n" +
      "1️⃣ *Создайте пациента*\n" +
      "   • Выберите категорию диагноза\n" +
      "   • Настройте уровень открытости\n" +
      "   • Установите сложность случая\n\n" +
      
      "2️⃣ *Проведите сессию*\n" +
      "   • Задавайте вопросы как обычные сообщения\n" +
      "   • Используйте терапевтические техники\n" +
      "   • Работайте с сопротивлением пациента\n\n" +
      
      "3️⃣ *Получите обратную связь*\n" +
      "   • Используйте /analyze для анализа сессии\n" +
      "   • Узнайте сильные стороны своей работы\n" +
      "   • Получите рекомендации по улучшению\n\n" +
      
      "4️⃣ *Отслеживайте прогресс*\n" +
      "   • Проверяйте статистику через /stats\n" +
      "   • Развивайте навыки с разными типами пациентов\n\n" +
      
      "💡 *Доступные команды:*\n" +
      "/new - Создать нового пациента\n" +
      "/analyze - Анализировать текущую сессию\n" +
      "/info - Посмотреть карту пациента\n" +
      "/end - Завершить сессию\n" +
      "/stats - Ваша статистика\n";
    
    bot.sendMessage(userId, helpText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "👤 Создать пациента", callback_data: "start_new_patient" }]
        ]
      }
    });
    
    return;
  }
  
  // Начать создание нового пациента
  if (data === 'start_new_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    // Создаем случайного пациента сразу
    createRandomPatient(userId);
    return;
  }
  
  // Начать создание пациента с выбором параметров
  if (data === 'start_custom_patient') {
    await bot.answerCallbackQuery(callbackQuery.id);
    // Показываем меню выбора категории пациента
    showCategoriesMenu(userId);
    return;
  }
  
  // Продолжение сессии после анализа
  if (data === 'continue_session') {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Отправляем основную клавиатуру и предлагаем продолжить
    const options = {
      reply_markup: {
        keyboard: [
          [
            { text: "ℹ️ Инфо" },
            { text: "📊 Анализ" },
            { text: "🏁 Завершить" }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        input_field_placeholder: "Введите ваш вопрос пациенту..."
      }
    };
    
    bot.sendMessage(
      userId,
      "✅ Вы можете продолжить диалог с пациентом.",
      options
    );
    return;
  }
  
  // Завершение диалога
  if (data === 'end_dialog') {
    await bot.answerCallbackQuery(callbackQuery.id);
    endDialog(userId);
    return;
  }
});

// Функция для отображения меню открытости
function showOpennessMenu(userId, category) {
  const keyboard = [
    [
      { text: "Открытый", callback_data: `openness:${category}:open` },
      { text: "Нейтральный", callback_data: `openness:${category}:neutral` }
    ],
    [
      { text: "Закрытый", callback_data: `openness:${category}:closed` }
    ]
  ];
  
  const options = {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
  
  bot.sendMessage(
    userId,
    `Выберите тип открытости пациента для категории "${patientSystem.casesDB[category].name}":`,
    options
  );
}

// Функция для отображения меню сложности
function showComplexityMenu(userId, category, openness) {
  const keyboard = [
    [
      { text: "1 (Простой)", callback_data: `complexity:${category}:${openness}:1` },
      { text: "2", callback_data: `complexity:${category}:${openness}:2` }
    ],
    [
      { text: "3 (Средний)", callback_data: `complexity:${category}:${openness}:3` },
      { text: "4", callback_data: `complexity:${category}:${openness}:4` }
    ],
    [
      { text: "5 (Сложный)", callback_data: `complexity:${category}:${openness}:5` }
    ]
  ];
  
  const options = {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
  
  bot.sendMessage(
    userId,
    `Выберите уровень сложности пациента с "${patientSystem.openness[openness].name}" типом открытости:`,
    options
  );
}

// Функция для создания случайного пациента
async function createRandomPatient(userId) {
  const waitingMsg = await bot.sendMessage(
    userId,
    "⏳ *Генерация случайного пациента...*\n\nПожалуйста, подождите.",
    { parse_mode: 'Markdown' }
  );
  
  try {
    const patient = await patientSystem.generateCase();
    startNewDialogWithPatient(userId, patient, waitingMsg.message_id);
  } catch (error) {
    console.error("Ошибка при создании случайного пациента:", error);
    
    bot.editMessageText(
      "❌ *Не удалось создать пациента*\n\nПроизошла ошибка. Пожалуйста, попробуйте снова.",
      {
        chat_id: userId,
        message_id: waitingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
  }
}

// Функция для создания пациента с заданными параметрами
async function createPatient(userId, category, openness, complexity) {
  const waitingMsg = await bot.sendMessage(
    userId,
    "⏳ *Генерация пациента...*\n\nПожалуйста, подождите.",
    { parse_mode: 'Markdown' }
  );
  
  try {
    const patient = await patientSystem.generateCase({
      category: category,
      openness: openness,
      complexity: complexity
    });
    
    startNewDialogWithPatient(userId, patient, waitingMsg.message_id);
  } catch (error) {
    console.error("Ошибка при создании пациента:", error);
    
    bot.editMessageText(
      "❌ *Не удалось создать пациента*\n\nПроизошла ошибка. Пожалуйста, попробуйте снова.",
      {
        chat_id: userId,
        message_id: waitingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
  }
}

// Функция для начала диалога с созданным пациентом
async function startNewDialogWithPatient(userId, patient, waitingMsgId) {
  try {
    // Сохраняем пациента в сессии пользователя
    const userSession = getUserSession(userId);
    userSession.currentPatient = patient;
    userSession.state = 'in_dialog';
    userSession.conversation = [];
    saveUserData(userId);
    
    // Отправляем информацию о пациенте в виде сообщения от секретаря
    // Выбираем случайное имя для секретаря
    const secretaryNames = ["Елена", "Ирина", "Анна", "Ольга", "Мария"];
    const secretaryName = secretaryNames[Math.floor(Math.random() * secretaryNames.length)];
    
    // Формируем различные причины обращения в зависимости от диагноза
    let reasonForVisit;
    if (patient.meta.diagnosis.includes("тревож")) {
      reasonForVisit = "беспокойстве и постоянном напряжении";
    } else if (patient.meta.diagnosis.includes("депресс")) {
      reasonForVisit = "подавленном настроении и потере интереса к жизни";
    } else if (patient.meta.diagnosis.includes("фобия")) {
      reasonForVisit = "сильных страхах, которые мешают нормально жить";
    } else {
      reasonForVisit = "психологических трудностях";
    }
    
    // Время приема
    const appointmentHours = 10 + Math.floor(Math.random() * 8); // от 10 до 17
    const appointmentMinutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30 или 45
    const appointmentTime = `${appointmentHours}:${appointmentMinutes === 0 ? '00' : appointmentMinutes}`;
    
    const patientInfo = 
      `👩‍💼 *Сообщение от секретаря ${secretaryName}:*\n\n` +
      `Добрый день, доктор!\n\n` +
      `К вам на приём в ${appointmentTime} записан пациент *${patient.name}*, ${patient.age} ${getYearWord(patient.age)}.\n\n` +
      `Первичное обращение. Жалуется на ${reasonForVisit}. ` +
      `${patient.gender === "мужской" ? "Сам" : "Сама"} записал${patient.gender === "мужской" ? "ся" : "ась"} ` +
      `на консультацию, настрой на работу ${patient.openness.includes("открыт") ? "позитивный" : patient.openness.includes("нейтраль") ? "умеренный" : "сдержанный"}.\n\n` +
      `Для получения полной информации о пациенте используйте команду /info.`;
    
    await bot.editMessageText(patientInfo, {
      chat_id: userId,
      message_id: waitingMsgId,
      parse_mode: 'Markdown'
    });
    
    // Предлагаем начать диалог с красивой компактной клавиатурой
    const options = {
      reply_markup: {
        keyboard: [
          [
            { text: "ℹ️ Инфо" },
            { text: "📊 Анализ" },
            { text: "🏁 Завершить" }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        input_field_placeholder: "Введите ваш вопрос пациенту..."
      }
    };
    
    // Начинаем диалог с уведомлением, что пациент зашел в кабинет
    // Добавляем небольшую задержку для реалистичности
    setTimeout(() => {
      bot.sendMessage(
        userId,
        "🚪 *Пациент входит в кабинет...*",
        { parse_mode: 'Markdown' }
      );
      
      // Через 2 секунды отправляем приглашение начать диалог
      setTimeout(() => {
        bot.sendMessage(
          userId,
          "Вы можете начать диалог. Обычно первая встреча начинается с приветствия и открытого вопроса о причине обращения.",
          options
        );
      }, 2000);
    }, 1000);
    
  } catch (error) {
    console.error("Ошибка при начале диалога:", error);
    
    bot.editMessageText(
      "❌ *Произошла ошибка при начале диалога*\n\nПожалуйста, попробуйте снова.",
      {
        chat_id: userId,
        message_id: waitingMsgId,
        parse_mode: 'Markdown'
      }
    );
  }
}

// Вспомогательная функция для склонения слова "год"
function getYearWord(age) {
  if (age % 10 === 1 && age % 100 !== 11) {
    return "год";
  } else if ((age % 10 >= 2 && age % 10 <= 4) && (age % 100 < 12 || age % 100 > 14)) {
    return "года";
  } else {
    return "лет";
  }
}

// Функция для форматирования типа открытости пациента
function formatOpenness(openness) {
  if (openness.includes("открыт")) {
    return "Высокая ⭐⭐⭐"; 
  } else if (openness.includes("нейтраль")) {
    return "Средняя ⭐⭐";
  } else {
    return "Низкая ⭐";
  }
}

/**
 * Обработчик для обычных сообщений (вопросы психолога)
 */
bot.on('message', (msg) => {
  // Сохраняем сообщение для логов
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  userSession.lastMessage = msg;
  
  // Сохраняем имя пользователя если еще не сохранено
  if (userSession.userName === undefined) {
    userSession.userName = msg.from.first_name || "Пользователь";
  }
  
  // Обработка команд в виде кнопок
  if (msg.text) {
    // Обработка команд с кнопками диалога
    if (msg.text === "ℹ️ Инфо") {
      // Вызываем обработчик команды info
      showPatientInfo(userId);
      return;
    } else if (msg.text === "📊 Анализ") {
      // Вызываем обработчик команды analyze
      analyzeSession(userId);
      return;
    } else if (msg.text === "🏁 Завершить") {
      // Вызываем обработчик команды end
      endDialog(userId);
      return;
    }
    
    // Обработка команд главного меню
    if (msg.text === "🎲 Случайный пациент") {
      // Вызываем создание нового пациента
      createRandomPatient(userId);
      return;
    } else if (msg.text === "🧩 Выбрать пациента") {
      // Показываем меню выбора категории пациента
      showCategoriesMenu(userId);
      return;
    } else if (msg.text === "📈 Статистика") {
      // Показываем статистику
      showUserStats(userId);
      return;
    } else if (msg.text === "❓ Помощь") {
      // Показываем справку
      showHelp(userId);
      return;
    }
    
    // Пропускаем стандартные команды
    if (msg.text.startsWith('/')) {
      return;
    }
  }
  
  if (userSession.state === 'in_dialog') {
    // Продолжаем диалог без повторения сообщения психолога
    continueDialog(userId, msg.text);
  }
});

// Функция для продолжения диалога
async function continueDialog(userId, message) {
  const userSession = getUserSession(userId);
  
  if (!userSession.currentPatient) {
    bot.sendMessage(
      userId,
      "❌ У вас нет активного диалога с пациентом. Используйте /new для создания."
    );
    return;
  }
  
  const waitingMsg = await bot.sendMessage(
    userId,
    "⏳ Пациент печатает...",
    { reply_to_message_id: userSession.lastMessage.message_id }
  );
  
  try {
    let response;
    
    // Если это первое сообщение в диалоге
    if (userSession.conversation.length === 0) {
      response = await patientSystem.startPatientDialog(userSession.currentPatient, message);
    } else {
      response = await patientSystem.continuePatientDialog(
        userSession.currentPatient,
        userSession.conversation,
        message
      );
    }
    
    // Добавляем в историю
    userSession.conversation.push({
      therapist: message,
      patient: response.patient_response
    });
    saveUserData(userId);
    
    // Симулируем печатание для большей реалистичности
    await bot.sendChatAction(userId, 'typing');
    
    // Задержка, как будто пациент печатает (зависит от длины ответа)
    const typingDelay = Math.min(2000, response.patient_response.length * 30);
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    // Удаляем сообщение о печатании
    await bot.deleteMessage(userId, waitingMsg.message_id);
    
    // Отправляем новое сообщение с ответом пациента
    bot.sendMessage(userId, response.patient_response);
    
  } catch (error) {
    console.error("Ошибка при продолжении диалога:", error);
    
    bot.editMessageText(
      "❌ Не удалось получить ответ от пациента. Пожалуйста, попробуйте другой вопрос.",
      {
        chat_id: userId,
        message_id: waitingMsg.message_id
      }
    );
  }
}

// Обработчик команды /info - информация о пациенте
/**
 * Функция для показа информации о пациенте (обработка команды /info и кнопки Инфо)
 */
function showPatientInfo(userId) {
  const userSession = getUserSession(userId);
  
  if (!userSession.currentPatient) {
    bot.sendMessage(
      userId,
      "❌ У вас нет активного пациента. Используйте /new для создания."
    );
    return;
  }
  
  const patient = userSession.currentPatient;
  
  // Создаем табличное представление информации для лучшей читаемости
  const patientInfo = 
    `📋 *КАРТА ПАЦИЕНТА*\n\n` +
    `👤 *${patient.name}* | ${patient.age} ${getYearWord(patient.age)} | ${patient.gender === "мужской" ? "♂️" : "♀️"}\n` +
    `💼 *Профессия:* ${patient.profession}\n` +
    `🩺 *Диагноз:* ${patient.meta.diagnosis}\n` +
    `🔓 *Открытость:* ${formatOpenness(patient.openness)}\n\n` +
    
    `🔍 *ОСНОВНАЯ ПРОБЛЕМА*\n${patient.problem}\n\n` +
    
    `🩺 *СИМПТОМЫ*\n${patient.symptoms.map(s => `• ${s}`).join('\n')}\n\n` +
    
    `📜 *АНАМНЕЗ*\n${patient.history}\n\n` +
    
    `⚠️ *ТРИГГЕРЫ*\n${patient.triggers.map(t => `• ${t}`).join('\n')}\n\n` +
    
    `🛡️ *ЗАЩИТНЫЕ МЕХАНИЗМЫ*\n${patient.defenses.map(d => `• ${d}`).join('\n')}\n\n` +
    
    `🗣️ *ОСОБЕННОСТИ КОММУНИКАЦИИ*\n${patient.speech}\n\n` +
    
    `⚔️ *ПАТТЕРНЫ СОПРОТИВЛЕНИЯ*\n${patient.resistance}`;
    
  // Отправляем информацию в формате "файла медицинской карты"
  bot.sendMessage(
    userId,
    patientInfo,
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "◀️ Вернуться к диалогу", callback_data: "continue_session" }]
        ]
      }
    }
  );
}

// Регистрируем обработчик стандартной команды /info
bot.onText(/\/info/, (msg) => {
  showPatientInfo(msg.from.id);
});

/**
 * Функция для анализа сессии (обработка команды /analyze и кнопки Анализ)
 */
async function analyzeSession(userId) {
  const userSession = getUserSession(userId);
  
  if (!userSession.currentPatient || userSession.conversation.length === 0) {
    bot.sendMessage(
      userId,
      "⚠️ У вас нет активного диалога для анализа. Начните диалог с пациентом и задайте несколько вопросов."
    );
    return;
  }
  
  // Отправляем сообщение о начале анализа
  const waitingMsg = await bot.sendMessage(
    userId,
    "⏳ *Анализирую сессию...*\n\nПожалуйста, подождите.",
    { parse_mode: 'Markdown' }
  );
  
  try {
    // Подготавливаем данные для анализа
    const patient = userSession.currentPatient;
    const conversation = userSession.conversation;
    
    // Формируем запрос для анализа
    const analysisPrompt = `
Проанализируй эту психотерапевтическую сессию и дай обратную связь терапевту.

ИНФОРМАЦИЯ О ПАЦИЕНТЕ:
- Имя: ${patient.name}, ${patient.age} лет
- Диагноз: ${patient.meta.diagnosis}
- Открытость: ${patient.openness}
- Симптомы: ${patient.symptoms.join(", ")}

ДИАЛОГ:
${conversation.map((exchange, i) => 
  `[${i+1}] Терапевт: ${exchange.therapist}\n[${i+1}] Пациент: ${exchange.patient}`
).join("\n\n")}

Дай краткий анализ по следующим пунктам:
1. Ключевые темы/проблемы пациента
2. Эмоциональное состояние пациента в ходе сессии
3. Эффективные терапевтические интервенции
4. Что можно улучшить в работе терапевта
5. Рекомендации для следующей сессии

Анализ должен быть кратким, конкретным и практичным.`;

    // Вызываем API для анализа
    const analysisResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        { role: 'user', content: analysisPrompt }
      ]
    });
    
    const analysis = analysisResponse.content[0].text;
    
    // Сохраняем анализ
    userSession.lastAnalysis = analysis;
    saveUserData(userId);
    
    // Форматируем анализ для лучшей читаемости
    // Разбиваем анализ на параграфы по номерам
    const formattedAnalysis = analysis
      .replace(/(\d+\.\s)/g, '\n\n$1') // Добавляем двойной перенос перед каждым номером
      .replace(/^\s+/, ''); // Убираем лишние пробелы в начале
      
    // Отправляем анализ с красивым форматированием
    await bot.editMessageText(
      `📊 *ПРОФЕССИОНАЛЬНЫЙ АНАЛИЗ СЕССИИ*\n\n${formattedAnalysis}`,
      {
        chat_id: userId,
        message_id: waitingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
    
    // Предлагаем продолжить или завершить
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "▶️ Продолжить сессию", callback_data: "continue_session" },
            { text: "🏁 Завершить сессию", callback_data: "end_dialog" }
          ]
        ]
      }
    };
    
    bot.sendMessage(
      userId,
      "Что вы хотите сделать дальше?",
      options
    );
    
  } catch (error) {
    console.error("Ошибка при анализе сессии:", error);
    
    bot.editMessageText(
      "❌ *Произошла ошибка при анализе сессии*\n\nПожалуйста, попробуйте снова позже.",
      {
        chat_id: userId,
        message_id: waitingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
  }
}

/**
 * Обработчик команды /analyze - анализ текущей сессии
 */
bot.onText(/\/analyze/, (msg) => {
  analyzeSession(msg.from.id);
});

// Обработчик команды /end - завершение диалога
bot.onText(/\/end/, (msg) => {
  const userId = msg.from.id;
  endDialog(userId);
});


// Функция для завершения диалога
function endDialog(userId) {
  const userSession = getUserSession(userId);
  
  if (!userSession.currentPatient) {
    bot.sendMessage(
      userId,
      "❌ У вас нет активного диалога с пациентом."
    );
    return;
  }
  
  // Формируем итоговый отчет
  const patient = userSession.currentPatient;
  const exchangeCount = userSession.conversation.length;
  
  // Сохраняем сессию в статистику
  if (!userSession.stats) {
    userSession.stats = {
      totalSessions: 0,
      totalExchanges: 0,
      sessionsByCategory: {},
      lastSessionTime: null
    };
  }
  
  userSession.stats.totalSessions++;
  userSession.stats.totalExchanges += exchangeCount;
  userSession.stats.lastSessionTime = new Date().toISOString();
  
  const category = patient.meta.category;
  if (!userSession.stats.sessionsByCategory[category]) {
    userSession.stats.sessionsByCategory[category] = 0;
  }
  userSession.stats.sessionsByCategory[category]++;
  
  // Формируем отчет
  let reportText = 
    `🏁 *Сессия завершена*\n\n` +
    `Пациент: *${patient.name}*, ${patient.age} ${getYearWord(patient.age)}\n` +
    `Диагноз: ${patient.meta.diagnosis}\n` +
    `Количество обменов репликами: ${exchangeCount}\n\n`;
  
  if (userSession.lastAnalysis) {
    reportText += `📊 *Итоговый анализ:*\n${userSession.lastAnalysis}\n\n`;
  }
  
  reportText += `Для создания нового пациента используйте команду /new`;
  
  // Сбрасываем состояние диалога
  userSession.state = 'idle';
  userSession.currentPatient = null;
  userSession.conversation = [];
  userSession.lastAnalysis = null;
  saveUserData(userId);
  
  // Отправляем отчет с красивыми кнопками
  bot.sendMessage(
    userId,
    reportText,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [
            { text: "🎲 Случайный пациент" }, 
            { text: "🧩 Выбрать пациента" }
          ],
          [
            { text: "📈 Статистика" }, 
            { text: "❓ Помощь" }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        input_field_placeholder: "Выберите действие или напишите команду..."
      }
    }
  );
}

/**
 * Функция для отображения справки
 */
function showHelp(userId) {
  const helpText = 
    "🧠 *Как пользоваться ПсихоТренером* 🧠\n\n" +
    "1️⃣ *Создайте пациента*\n" +
    "   • Используйте команду /new для случайного пациента\n" +
    "   • Используйте команду /custom для выбора категории\n" +
    "   • Каждый пациент уникален и имеет свою историю\n\n" +
    
    "2️⃣ *Проведите сессию*\n" +
    "   • Задавайте вопросы как обычные сообщения\n" +
    "   • Используйте терапевтические техники\n" +
    "   • Работайте с сопротивлением пациента\n\n" +
    
    "3️⃣ *Получите обратную связь*\n" +
    "   • Используйте кнопку 'Анализ' для анализа сессии\n" +
    "   • Узнайте сильные стороны своей работы\n" +
    "   • Получите рекомендации по улучшению\n\n" +
    
    "4️⃣ *Отслеживайте прогресс*\n" +
    "   • Проверяйте статистику через кнопку 'Статистика'\n" +
    "   • Развивайте навыки с разными типами пациентов\n\n" +
    
    "💡 *Доступные команды:*\n" +
    "/new - Создать случайного пациента\n" +
    "/custom - Выбрать пациента\n" +
    "/analyze - Анализировать текущую сессию\n" +
    "/info - Посмотреть карту пациента\n" +
    "/end - Завершить сессию\n" +
    "/stats - Ваша статистика\n";
  
  bot.sendMessage(userId, helpText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎲 Случайный пациент", callback_data: "start_new_patient" }],
        [{ text: "🧩 Выбрать пациента", callback_data: "start_custom_patient" }]
      ]
    }
  });
}

/**
 * Функция для отображения статистики пользователя
 */
function showUserStats(userId) {
  const userSession = getUserSession(userId);
  
  if (!userSession.stats || userSession.stats.totalSessions === 0) {
    bot.sendMessage(
      userId,
      "📊 *Ваша статистика*\n\nУ вас еще нет завершенных сессий. Создайте пациента с помощью /new и проведите первую сессию!",
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "👤 Создать пациента", callback_data: "start_new_patient" }]
          ]
        }
      }
    );
    return;
  }
  
  const stats = userSession.stats;
  
  // Формируем статистику по категориям
  let categoriesText = "";
  if (stats.sessionsByCategory) {
    categoriesText = Object.entries(stats.sessionsByCategory)
      .map(([category, count]) => {
        // Находим название категории
        const categoryName = patientSystem.casesDB[category] 
          ? patientSystem.casesDB[category].name 
          : category;
        return `• ${categoryName}: ${count}`;
      })
      .join('\n');
  }
  
  // Форматируем дату последней сессии
  let lastSessionDate = "Нет данных";
  if (stats.lastSessionTime) {
    const date = new Date(stats.lastSessionTime);
    lastSessionDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
  
  // Рассчитаем прогресс и уровень
  const sessionsLevel = getSessionsLevel(stats.totalSessions);
  const averageReplies = Math.round(stats.totalExchanges / stats.totalSessions);
  const levelDescription = getLevelDescription(sessionsLevel);
  
  // Создаем красивую статистику с визуальными элементами
  const statsText = 
    `📊 *СТАТИСТИКА ПСИХОТЕРАПЕВТА*\n\n` +
    `👤 *Уровень:* ${sessionsLevel} - ${levelDescription}\n` +
    `🏆 *Проведено сессий:* ${stats.totalSessions}\n` +
    `💬 *Обменов репликами:* ${stats.totalExchanges}\n` +
    `📏 *Средняя длина сессии:* ${averageReplies} реплик\n` +
    `⏱️ *Последняя сессия:* ${lastSessionDate}\n\n` +
    
    `📋 *СЕССИИ ПО КАТЕГОРИЯМ:*\n${categoriesText}\n\n` +
    
    `💡 Проведите больше сессий с разными типами пациентов, чтобы повысить свой уровень и развить новые навыки!`;
  
  // Добавляем кнопку создания нового пациента
  bot.sendMessage(
    userId,
    statsText,
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎲 Случайный пациент", callback_data: "start_new_patient" }],
          [{ text: "🧩 Выбрать пациента", callback_data: "start_custom_patient" }]
        ]
      }
    }
  );
}

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
  showHelp(msg.from.id);
});

// Обработчик команды /stats - статистика пользователя
bot.onText(/\/stats/, (msg) => {
  showUserStats(msg.from.id);
});

// Функция для определения уровня пользователя на основе количества сессий
function getSessionsLevel(totalSessions) {
  if (totalSessions < 5) {
    return "Новичок";
  } else if (totalSessions < 15) {
    return "Стажер";
  } else if (totalSessions < 30) {
    return "Практик";
  } else if (totalSessions < 50) {
    return "Специалист";
  } else if (totalSessions < 100) {
    return "Эксперт";
  } else {
    return "Мастер";
  }
}

// Функция для получения описания уровня
function getLevelDescription(level) {
  const descriptions = {
    "Новичок": "начало пути в психотерапии",
    "Стажер": "развитие базовых навыков",
    "Практик": "уверенное ведение сессий",
    "Специалист": "глубокий терапевтический подход",
    "Эксперт": "виртуозное владение техниками",
    "Мастер": "непревзойденный психотерапевт"
  };
  
  return descriptions[level] || "практикующий терапевт";
}

// Загружаем данные пользователей при запуске
loadUserData();

// Обработка ошибок для предотвращения падения бота
process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение обещания:', reason);
});

console.log('Бот успешно запущен и готов к приему сообщений!');