require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const PatientSystem = require('./patient-system');
const CacheManager = require('./cache-manager');
const VoiceHandler = require('./voice-handler');

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
  { command: '/custom', description: '🧩 Выбрать тип пациента' },
  { command: '/patients', description: '📂 Мои сохраненные пациенты' },
  { command: '/history', description: '📚 История сессий' },
  { command: '/analyze', description: '📊 Анализировать сессию' },
  { command: '/info', description: 'ℹ️ Информация о пациенте' },
  { command: '/end', description: '🏁 Завершить сессию' },
  { command: '/stats', description: '📈 Моя статистика' },
  { command: '/feedback', description: '💬 Оставить отзыв' },
  { command: '/help', description: '❓ Помощь' }
]);

// Инициализация Claude API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Создаем систему эмуляции пациентов
const patientSystem = new PatientSystem();

// Создаем CacheManager для оптимизации токенов
const cacheManager = new CacheManager();

// Создаем VoiceHandler для обработки голосовых сообщений
const voiceHandler = new VoiceHandler();

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
      lastAnalysis: null,
      waitingContinuation: false, // Флаг ожидания продолжения обрезанного ответа
      partialResponse: null,       // Хранит частичный ответ для продолжения
      analysisSessions: [],        // История анализов для текущего пользователя
      patientAnalysisHistory: {}   // История анализов по каждому пациенту {patientId: [analyses]}
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
    `💝 Желаю вам интересных открытий и профессионального роста!\n\n` +
    `📞 По всем вопросам: @YourTerapist\n\n` +
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
    "/custom - Выбрать тип пациента\n" +
    "/patients - Мои сохраненные пациенты\n" +
    "/history - История сессий\n" +
    "/analyze - Анализировать текущую сессию\n" +
    "/info - Информация о пациенте\n" +
    "/end - Завершить сессию с пациентом\n" +
    "/stats - Ваша статистика\n\n" +
    
    "📝 *Как пользоваться ботом:*\n" +
    "1. Начните с команды /new для создания пациента\n" +
    "2. Задавайте вопросы пациенту как обычные сообщения\n" +
    "3. Используйте меню (напишите 'меню') для управления сессией\n" +
    "4. Используйте /analyze для получения обратной связи\n" +
    "5. Завершите сессию командой /end когда закончите\n" +
    "6. Все пациенты сохраняются для продолжения работы через /patients",
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
  
  // Словарь эмодзи для категорий
  const categoryEmojis = {
    anxiety: "😨", // Тревожные расстройства
    mood: "😔", // Расстройства настроения
    stress: "😓", // Стресс и адаптация
    relationships: "👫", // Отношения и семья
    trauma: "💔", // Травма
    addictions: "🔄", // Зависимости
    eating: "🍽️", // Расстройства пищевого поведения
    psychotic: "🌀", // Психотические расстройства
    affective: "🌊", // Тяжелые аффективные расстройства
    crisis: "🆘", // Кризисные состояния
    personality: "🎭", // Расстройства личности
    youth: "👦", // Детско-подростковые
    elderly: "👴", // Пожилые люди
    identity: "🔍", // Проблемы идентичности
    neurodiverse: "🧠", // Нейроразнообразие
  };
  
  // Формируем клавиатуру из категорий (по 1 в ряд для лучшей читаемости)
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const categoryKey = category[0];
    const categoryName = category[1].name;
    const emoji = categoryEmojis[categoryKey] || "📋"; // Если эмодзи не найден, используем стандартный
    
    // Создаем ряд с одной кнопкой
    keyboard.push([{ 
      text: `${emoji} ${categoryName}`, 
      callback_data: `category:${categoryKey}` 
    }]);
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
    "📋 *ВЫБОР КАТЕГОРИИ ПАЦИЕНТА*\n\nВыберите тип проблемы пациента из списка ниже.\nКаждая категория предлагает уникальные терапевтические вызовы.",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
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
  
  // Кнопка "Назад к категориям"
  if (data === 'back_to_categories') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showCategoriesMenu(userId);
    return;
  }
  
  // Кнопка "Назад к выбору открытости"
  if (data.startsWith('back_to_openness:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const category = data.split(':')[1];
    
    if (patientSystem.casesDB[category]) {
      showOpennessMenu(userId, category);
    } else {
      bot.sendMessage(userId, "❌ Ошибка: категория не найдена");
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
      "/stats - Ваша статистика\n\n" +
      "💝 Удачной практики!\n\n" +
      "📞 Вопросы: @YourTerapist";
    
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
  
  // Показать сохраненных пациентов
  if (data === 'show_saved_patients') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showSavedPatients(userId);
    return;
  }
  
  // Показать историю сессий
  if (data === 'show_session_history') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showSessionHistory(userId);
    return;
  }
  
  // Показать статистику
  if (data === 'show_stats') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showUserStats(userId);
    return;
  }
  
  // 🔥 НОВОЕ: Анализ завершенной сессии
  if (data === 'analyze_completed_session') {
    await bot.answerCallbackQuery(callbackQuery.id);
    analyzeSession(userId);
    return;
  }
  
  // Загрузить сохраненного пациента
  if (data.startsWith('load_patient:') || data.startsWith('load:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const shortId = data.split(':')[1];
    
    // 🔥 ИСПРАВЛЕНИЕ: Ищем полный файл по короткому ID
    try {
      const userPatientsDir = `./patients/${userId}`;
      if (fs.existsSync(userPatientsDir)) {
        const files = fs.readdirSync(userPatientsDir)
          .filter(file => file.endsWith('.json') && file.startsWith(shortId));
        
        if (files.length > 0) {
          loadSavedPatient(userId, files[0]);
        } else {
          bot.sendMessage(userId, "❌ Пациент не найден");
        }
      } else {
        bot.sendMessage(userId, "❌ Нет сохраненных пациентов");
      }
    } catch (error) {
      console.error('Ошибка поиска пациента:', error);
      bot.sendMessage(userId, "❌ Ошибка при загрузке пациента");
    }
    return;
  }
  
  // Просмотр деталей сессии
  if (data.startsWith('view_session:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const sessionPath = data.split(':')[1];
    viewSessionDetails(userId, sessionPath);
    return;
  }
  
  // Возврат к списку пациентов
  if (data === 'back_to_patients') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showSavedPatients(userId);
    return;
  }
  
  // Возврат к основному меню
  if (data === 'back_to_main_menu') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showMainMenuOptions(userId);
    return;
  }
  
  // Начать процесс сбора отзыва
  if (data === 'start_feedback') {
    await bot.answerCallbackQuery(callbackQuery.id);
    startFeedbackProcess(userId);
    return;
  }
  
  // Сохранить отзыв
  if (data.startsWith('save_feedback:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const rating = parseInt(data.split(':')[1]);
    saveFeedbackRating(userId, rating);
    return;
  }
  
  // Отменить отзыв
  if (data === 'cancel_feedback') {
    await bot.answerCallbackQuery(callbackQuery.id);
    cancelFeedbackProcess(userId);
    return;
  }
  
  // Продолжение сессии после анализа
  if (data === 'continue_session') {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Отправляем сообщение без клавиатуры
    const options = {
      reply_markup: {
        remove_keyboard: true, // Убираем клавиатуру
        input_field_placeholder: "Введите ваш вопрос пациенту..."
      }
    };
    
    bot.sendMessage(
      userId,
      "✅ Вы можете продолжить диалог с пациентом.\n💬 Напишите 'меню' или используйте команды бота для управления.",
      options
    );
    return;
  }
  
  // Обработка новых callback кнопок управления сессией
  if (data === 'analyze_session') {
    await bot.answerCallbackQuery(callbackQuery.id);
    analyzeSession(userId);
    return;
  }
  
  if (data === 'show_patient_info') {
    await bot.answerCallbackQuery(callbackQuery.id);
    showPatientInfo(userId);
    return;
  }
  
  // Завершение диалога
  if (data === 'end_dialog') {
    await bot.answerCallbackQuery(callbackQuery.id);
    endDialog(userId);
    return;
  }
  
  // Подтверждение загрузки пациента
  if (data.startsWith('confirm_load:')) {
    await bot.answerCallbackQuery(callbackQuery.id);
    const patientId = data.split(':')[1];
    
    console.log(`[DEBUG] Подтверждение загрузки пациента: ${patientId}`);
    
    try {
      const userPatientsDir = `./patients/${userId}`;
      // Если patientId содержит .json, то это полное имя файла, иначе добавляем расширение
      const fileName = patientId.endsWith('.json') ? patientId : `${patientId}.json`;
      const patientFilePath = path.join(userPatientsDir, fileName);
      
      if (!fs.existsSync(patientFilePath)) {
        bot.sendMessage(userId, "❌ Файл пациента не найден.");
        return;
      }
      
      const patientData = JSON.parse(fs.readFileSync(patientFilePath, 'utf8'));
      console.log(`[DEBUG] Данные пациента загружены:`, patientData.name);
      
      // Сбрасываем текущую сессию и загружаем пациента
      const userSession = getUserSession(userId);
      userSession.state = 'talking_to_patient';
      userSession.currentPatient = patientData;
      userSession.conversation = [];
      userSession.lastAnalysis = null;
      userSession.lastCompletedSession = null;
      
      // Сохраняем данные пользователя
      saveUserData(userId);
      
      // Извлекаем диагноз из разных возможных мест
      const diagnosis = patientData.diagnosis || patientData.meta?.diagnosis || "Не указан";
      const personality = patientData.personality || patientData.character || patientData.speech || "Не указан";
      const mood = patientData.mood || patientData.emotional_state || "Не указано";
      const problem = patientData.problem || "Не указана";
      
      bot.sendMessage(userId, 
        `✅ Пациент *${patientData.name}* успешно загружен!\n\n` +
        `📋 *Диагноз:* ${diagnosis}\n` +
        `🎭 *Характер:* ${personality}\n` +
        `💭 *Проблема:* ${problem}\n\n` +
        `🗣 *Пациент готов к диалогу. Начните беседу.*\n\n` +
        `💬 Напишите 'меню' или используйте команды бота для управления сессией.`,
        { parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('[ERROR] Ошибка при загрузке пациента:', error);
      bot.sendMessage(userId, "❌ Ошибка при загрузке пациента. Попробуйте еще раз.");
    }
    
    return;
  }

  // Отмена загрузки пациента
  if (data === 'cancel_load') {
    await bot.answerCallbackQuery(callbackQuery.id);
    bot.sendMessage(userId, "❌ Загрузка пациента отменена.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📂 К списку пациентов", callback_data: "show_saved_patients" }],
          [{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]
        ]
      }
    });
    return;
  }
});

// Функция для отображения меню открытости
function showOpennessMenu(userId, category) {
  // Эмодзи для категории
  const categoryEmojis = {
    anxiety: "😨", mood: "😔", stress: "😓", relationships: "👫", 
    trauma: "💔", addictions: "🔄", eating: "🍽️", psychotic: "🌀", 
    affective: "🌊", crisis: "🆘", personality: "🎭", youth: "👦", 
    elderly: "👴", identity: "🔍", neurodiverse: "🧠"
  };
  
  // Описания типов открытости для подсказки
  const opennessDescriptions = {
    open: "Осознает проблему, готов сотрудничать",
    neutral: "Частично осознает проблему, амбивалентен",
    closed: "Отрицает проблему, сопротивляется помощи"
  };
  
  const categoryEmoji = categoryEmojis[category] || "📋";
  const categoryName = patientSystem.casesDB[category].name;
  
  // Создаем меню с визуально привлекательными кнопками (по одной в ряд)
  const keyboard = [
    [{ text: "🔓 Открытый - " + opennessDescriptions.open, callback_data: `openness:${category}:open` }],
    [{ text: "⚖️ Нейтральный - " + opennessDescriptions.neutral, callback_data: `openness:${category}:neutral` }],
    [{ text: "🔒 Закрытый - " + opennessDescriptions.closed, callback_data: `openness:${category}:closed` }]
  ];
  
  // Добавляем кнопку назад
  keyboard.push([{ text: "◀️ Назад к категориям", callback_data: "back_to_categories" }]);
  
  bot.sendMessage(
    userId,
    `${categoryEmoji} *НАСТРОЙКА ПАЦИЕНТА: ${categoryName}*\n\n` +
    `Выберите тип открытости пациента:\n` +
    `• *Открытый:* Легко идёт на контакт, готов работать\n` +
    `• *Нейтральный:* Умеренное сопротивление, средняя мотивация\n` +
    `• *Закрытый:* Сильное сопротивление, низкая мотивация`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

// Функция для отображения меню сложности
function showComplexityMenu(userId, category, openness) {
  // Эмодзи для категории и уровней сложности
  const categoryEmojis = {
    anxiety: "😨", mood: "😔", stress: "😓", relationships: "👫", 
    trauma: "💔", addictions: "🔄", eating: "🍽️", psychotic: "🌀", 
    affective: "🌊", crisis: "🆘", personality: "🎭", youth: "👦", 
    elderly: "👴", identity: "🔍", neurodiverse: "🧠"
  };
  
  // Описания уровней сложности
  const complexityDescriptions = {
    1: "типичный несложный случай",
    2: "случай ниже средней сложности",
    3: "случай средней сложности",
    4: "сложный случай с множественными проблемами", 
    5: "особо сложный случай, требующий опытного специалиста"
  };
  
  const categoryEmoji = categoryEmojis[category] || "📋";
  const categoryName = patientSystem.casesDB[category].name;
  const opennessName = patientSystem.openness[openness].name;
  
  // Создаем визуальный индикатор сложности для кнопок
  const getDifficultyStars = (level) => {
    const filled = "⭐".repeat(level);
    const empty = "☆".repeat(5 - level);
    return filled + empty;
  };
  
  // Создаем меню с визуально привлекательными кнопками (по одной в ряд)
  const keyboard = [
    [{ text: `1 ${getDifficultyStars(1)} Простой`, callback_data: `complexity:${category}:${openness}:1` }],
    [{ text: `2 ${getDifficultyStars(2)} Ниже среднего`, callback_data: `complexity:${category}:${openness}:2` }],
    [{ text: `3 ${getDifficultyStars(3)} Средний`, callback_data: `complexity:${category}:${openness}:3` }],
    [{ text: `4 ${getDifficultyStars(4)} Выше среднего`, callback_data: `complexity:${category}:${openness}:4` }],
    [{ text: `5 ${getDifficultyStars(5)} Сложный`, callback_data: `complexity:${category}:${openness}:5` }]
  ];
  
  // Добавляем кнопку назад
  keyboard.push([{ text: "◀️ Назад к выбору открытости", callback_data: `back_to_openness:${category}` }]);
  
  bot.sendMessage(
    userId,
    `${categoryEmoji} *НАСТРОЙКА СЛОЖНОСТИ ПАЦИЕНТА*\n\n` +
    `Категория: *${categoryName}*\n` +
    `Открытость: *${opennessName}*\n\n` +
    `Выберите уровень сложности случая:\n` +
    `• *Уровень 1:* ${complexityDescriptions[1]}\n` + 
    `• *Уровень 3:* ${complexityDescriptions[3]}\n` +
    `• *Уровень 5:* ${complexityDescriptions[5]}\n\n` +
    `Более высокий уровень = больше сопутствующих расстройств и сложных психологических защит.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
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
    const diagnosis = patient.diagnosis || patient.meta?.diagnosis || "";
    if (diagnosis.includes("тревож")) {
      reasonForVisit = "беспокойстве и постоянном напряжении";
    } else if (diagnosis.includes("депресс")) {
      reasonForVisit = "подавленном настроении и потере интереса к жизни";
    } else if (diagnosis.includes("фобия")) {
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
    
    // Редактируем сообщение только если есть waitingMsgId
    if (waitingMsgId) {
      await bot.editMessageText(patientInfo, {
        chat_id: userId,
        message_id: waitingMsgId,
        parse_mode: 'Markdown'
      });
    } else {
      // Если нет waitingMsgId, отправляем новое сообщение
      await bot.sendMessage(
        userId,
        patientInfo,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Предлагаем начать диалог без клавиатуры
    const options = {
      reply_markup: {
        remove_keyboard: true, // Убираем клавиатуру
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
          "✨ Пациент готов к диалогу. Вы можете начать общение!\n\n_💡 Не забудьте проанализировать сессию (/analyze) перед завершением - это улучшит качество работы и позволит сохранить пациента для продолжения в будущем._\n\n_💬 Напишите 'меню' или используйте команды бота для управления сессией_",
          { 
            parse_mode: 'Markdown',
            ...options 
          }
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
 * Функция для отображения управления сессией
 */
function showSessionControls(userId) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Анализ сессии", callback_data: "analyze_session" },
          { text: "🏁 Завершить сессию", callback_data: "end_dialog" }
        ],
        [
          { text: "ℹ️ Информация о пациенте", callback_data: "show_patient_info" }
        ]
      ]
    }
  };
  
  bot.sendMessage(userId, "🎮 *Управление сессией*\n\nВыберите действие:", {
    parse_mode: 'Markdown',
    ...options
  });
}

/**
 * Обработчик для обычных сообщений (вопросы психолога)
 */
bot.on('message', async (msg) => {
  // Сохраняем сообщение для логов
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  userSession.lastMessage = msg;
  
  // Сохраняем имя пользователя если еще не сохранено
  if (userSession.userName === undefined) {
    userSession.userName = msg.from.first_name || "Пользователь";
  }
  
  // 🎤 Обработка голосовых сообщений
  if (msg.voice) {
    console.log(`🎤 [Bot] Получено голосовое сообщение от пользователя ${userId}`);
    
    try {
      // Отправляем уведомление о обработке
      const processingMsg = await bot.sendMessage(
        userId,
        "🎤 *Обрабатываю голосовое сообщение...*\n\n⏳ Конвертирую речь в текст...",
        { parse_mode: 'Markdown' }
      );
      
      // Конвертируем голос в текст
      const transcription = await voiceHandler.processVoiceMessage(bot, msg);
      
      // Обновляем сообщение с результатом
      await bot.editMessageText(
        `🎤 *Распознанный текст:*\n\n"${transcription}"`,
        {
          chat_id: userId,
          message_id: processingMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
      
      // Создаем искусственное текстовое сообщение для дальнейшей обработки
      const artificialMsg = {
        ...msg,
        text: transcription,
        voice: undefined // Убираем голосовую часть
      };
      
      // Продолжаем обработку как обычное текстовое сообщение
      // Обновляем userSession.lastMessage для корректной работы
      userSession.lastMessage = artificialMsg;
      
      // Переходим к обработке текста (создаем новую переменную для обработки)
      msg = artificialMsg;
      
    } catch (error) {
      console.error('❌ [Bot] Ошибка обработки голосового сообщения:', error);
      
      // Отправляем сообщение об ошибке пользователю
      const errorMessage = error.message.includes('API key') 
        ? "❌ Сервис распознавания речи временно недоступен. Пожалуйста, используйте текстовые сообщения."
        : `❌ Не удалось распознать голосовое сообщение: ${error.message}`;
        
      await bot.sendMessage(userId, errorMessage);
      return;
    }
  }
  
  // Проверяем, ожидается ли комментарий к отзыву
  if (userSession.feedbackState === 'waiting_for_comment' && msg.text) {
    const rating = userSession.feedbackRating;
    const comment = msg.text === 'пропустить' ? '' : msg.text;
    
    // Сохраняем отзыв
    saveFeedbackToFile(userId, rating, comment);
    
    // Сбрасываем состояние отзыва
    userSession.feedbackState = null;
    userSession.feedbackRating = null;
    saveUserData(userId);
    
    // Отправляем благодарность
    bot.sendMessage(
      userId,
      "🙏 Спасибо за ваш отзыв! Мы ценим ваше мнение и будем использовать его для улучшения сервиса.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Вернуться в главное меню", callback_data: "back_to_main_menu" }]
          ]
        }
      }
    );
    return;
  }
  
  // Обработка текстовых команд для показа меню и продолжения
  if (msg.text) {
    const textLower = msg.text.toLowerCase();
    
    // Команда для вызова меню управления
    if (textLower === "меню" || textLower === "управление" || textLower === "команды" || textLower === "controls") {
      if (userSession.state === 'in_dialog') {
        showSessionControls(userId);
        return;
      } else {
        bot.sendMessage(userId, "У вас нет активной сессии с пациентом. Используйте /new для создания.");
        return;
      }
    }
    
    // Команда для продолжения обрезанного ответа
    if (textLower === "продолжить" || textLower === "continue" || textLower === "далее") {
      if (userSession.state === 'in_dialog' && userSession.waitingContinuation && userSession.partialResponse) {
        continueDialog(userId, "продолжить");
        return;
      } else if (userSession.state === 'in_dialog') {
        bot.sendMessage(userId, "В данный момент нет незавершенных ответов пациента для продолжения.");
        return;
      } else {
        bot.sendMessage(userId, "У вас нет активной сессии с пациентом. Используйте /new для создания.");
        return;
      }
    }
    
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
    let isContinuation = false;
    let partialResponse = null;
    
    // Если это первое сообщение в диалоге
    if (userSession.conversation.length === 0) {
      response = await patientSystem.startPatientDialog(userSession.currentPatient, message);
    } else {
      // Проверяем, есть ли ожидающее продолжение от предыдущего ответа
      if (userSession.waitingContinuation) {
        isContinuation = true;
        partialResponse = userSession.partialResponse;
        
        // Получаем продолжение предыдущего ответа
        response = await patientSystem.continuePatientDialog(
          userSession.currentPatient,
          userSession.conversation,
          message,
          true // Указываем, что это запрос продолжения
        );
        
        // Сбрасываем флаг ожидания продолжения
        userSession.waitingContinuation = false;
        userSession.partialResponse = null;
      } else {
        // Обычное продолжение диалога
        response = await patientSystem.continuePatientDialog(
          userSession.currentPatient,
          userSession.conversation,
          message
        );
      }
    }
    
    // Обрабатываем возможное обрезание ответа
    let finalResponse;
    
    if (response.is_truncated && !isContinuation) {
      // Если ответ обрезан и это не продолжение предыдущего, сохраняем частичный ответ
      userSession.waitingContinuation = true;
      userSession.partialResponse = response.patient_response;
      finalResponse = response.patient_response + "...";
      
      // Добавляем в историю текущий ответ
      userSession.conversation.push({
        therapist: message,
        patient: response.patient_response // Сохраняем без многоточия
      });
    } else if (isContinuation) {
      // Если это продолжение, объединяем с предыдущим частичным ответом
      finalResponse = partialResponse + "..." + response.patient_response;
      
      // Обновляем последний ответ в истории
      const lastIndex = userSession.conversation.length - 1;
      userSession.conversation[lastIndex].patient = partialResponse + response.patient_response;
      
      // Проверяем, не обрезано ли и продолжение
      if (response.is_truncated) {
        userSession.waitingContinuation = true;
        userSession.partialResponse = userSession.conversation[lastIndex].patient;
        finalResponse += "...";
      }
    } else {
      // Обычный случай без обрезания
      finalResponse = response.patient_response;
      
      // Добавляем в историю
      userSession.conversation.push({
        therapist: message,
        patient: response.patient_response
      });
    }
    
    // Сохраняем данные пользователя
    saveUserData(userId);
    
    // Симулируем печатание для большей реалистичности
    await bot.sendChatAction(userId, 'typing');
    
    // Задержка, как будто пациент печатает (зависит от длины ответа)
    const typingDelay = Math.min(2000, finalResponse.length * 30);
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    // Удаляем сообщение о печатании
    await bot.deleteMessage(userId, waitingMsg.message_id);
    
    // Формируем подсказку только если ответ обрезан
    let hint = "";
    if (response.is_truncated && (isContinuation || !userSession.waitingContinuation)) {
      hint = "\n\n_Ответ был слишком длинным и мог быть обрезан. Напишите 'продолжить' чтобы получить продолжение._";
    } else if (userSession.waitingContinuation) {
      hint = "\n\n_Ответ пациента не закончен. Напишите 'продолжить' чтобы получить продолжение._";
    }
    
    // Отправляем новое сообщение с ответом пациента и подсказками
    bot.sendMessage(
      userId, 
      finalResponse + hint, 
      { parse_mode: 'Markdown' }
    );
    
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
  // Извлекаем данные с fallback для совместимости
  const diagnosis = patient.diagnosis || patient.meta?.diagnosis || "Не указан";
  const profession = patient.profession || "Не указана";
  
  const patientInfo = 
    `📋 *КАРТА ПАЦИЕНТА*\n\n` +
    `👤 *${patient.name}* | ${patient.age} ${getYearWord(patient.age)} | ${patient.gender === "мужской" ? "♂️" : "♀️"}\n` +
    `💼 *Профессия:* ${profession}\n` +
    `🩺 *Диагноз:* ${diagnosis}\n` +
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
  
  // 🔥 ИСПРАВЛЕНИЕ: Разрешаем анализ завершенных сессий
  // Проверяем наличие текущей сессии ИЛИ последней завершенной сессии
  const hasActiveSession = userSession.currentPatient && userSession.conversation.length > 0;
  const hasCompletedSession = userSession.lastCompletedSession && userSession.lastCompletedSession.conversation.length > 0;
  
  if (!hasActiveSession && !hasCompletedSession) {
    bot.sendMessage(
      userId,
      "⚠️ У вас нет диалога для анализа. Начните диалог с пациентом или завершите текущую сессию."
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
    // 🔥 ИСПРАВЛЕНИЕ: Используем данные активной ИЛИ завершенной сессии
    const patient = hasActiveSession ? userSession.currentPatient : userSession.lastCompletedSession.patient;
    const conversation = hasActiveSession ? userSession.conversation : userSession.lastCompletedSession.conversation;
    
    // 🔥 НОВОЕ: Загружаем историю предыдущих сессий с этим пациентом
    const sessionHistory = loadPatientSessionHistory(patient, userId);
    
    // 🔥 НОВОЕ: Формируем контекст предыдущих анализов
    let previousAnalysesContext = "";
    if (sessionHistory.length > 0) {
      previousAnalysesContext = "\n📚 ПРЕДЫДУЩИЕ СЕССИИ С ЭТИМ ПАЦИЕНТОМ:\n";
      
      // Берем до 2 последних сессий для контекста
      const recentSessions = sessionHistory.slice(-2);
      recentSessions.forEach((session, index) => {
        const sessionDate = new Date(session.timestamp).toLocaleDateString();
        previousAnalysesContext += `\n🔹 Сессия ${index + 1} (${sessionDate}):`;
        previousAnalysesContext += `\n   Длительность: ${session.conversationLength} обменов`;
        previousAnalysesContext += `\n   Последний обмен: "${session.lastExchange?.patient?.substring(0, 100)}..."`;
        previousAnalysesContext += `\n   Анализ: ${session.analysis.substring(0, 300)}...\n`;
      });
    }
    
    // 🔥 НОВОЕ: Расширенный промпт с контекстом истории
    const analysisPrompt = `
Проанализируй эту психотерапевтическую сессию и дай обратную связь терапевту.

ИНФОРМАЦИЯ О ПАЦИЕНТЕ:
- Имя: ${patient.name}, ${patient.age} лет  
- Диагноз: ${patient.meta.diagnosis}
- Открытость: ${patient.openness}
- Симптомы: ${patient.symptoms.join(", ")}
- История: ${patient.history}
- Триггеры: ${patient.triggers.join(", ")}
- Защитные механизмы: ${patient.defenses.join(", ")}

${previousAnalysesContext}

ТЕКУЩАЯ СЕССИЯ:
${conversation.map((exchange, i) => 
  `[${i+1}] Терапевт: ${exchange.therapist}\n[${i+1}] Пациент: ${exchange.patient}`
).join("\n\n")}

${sessionHistory.length > 0 ? 
  `🎯 ВАЖНО: Это ${sessionHistory.length + 1}-я сессия с данным пациентом. Сосредоточься на:
  - НОВЫХ моментах и изменениях по сравнению с предыдущими сессиями
  - Прогрессе или регрессе в состоянии пациента  
  - Эффективности рекомендаций из предыдущих анализов
  - Динамике терапевтических отношений
  
  Дай анализ по пунктам:` : 
  `🆕 Это первая сессия с данным пациентом. Дай анализ по пунктам:`
}
1. Ключевые темы/проблемы пациента В ТЕКУЩЕЙ СЕССИИ
2. Эмоциональное состояние и изменения (если есть предыдущие сессии - укажи динамику)
3. Эффективные терапевтические интервенции в данной сессии
4. Что можно улучшить в работе терапевта (конкретно для ЭТОЙ сессии)
5. Прогресс/регресс по сравнению с предыдущими сессиями (если применимо)
6. Рекомендации для следующей сессии

${sessionHistory.length > 0 ? 
  'НЕ ПОВТОРЯЙ общие наблюдения из предыдущих анализов. Фокусируйся на НОВОМ и ДИНАМИКЕ.' : 
  'Анализ должен быть кратким, конкретным и практичным.'
}`;

    // 🔥 НОВОЕ: Используем CacheManager для кеширования анализов
    const analysisResponse = await cacheManager.createMessage({
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 1000, // Увеличено с 500 до 1000 для более детального анализа
      system: `Ты опытный психотерапевт-супервизор. Анализируй сессии профессионально и конструктивно.

🔥 ВАЖНО: ВСЕГДА отвечай ТОЛЬКО на РУССКОМ языке. Никогда не используй английские термины или фразы.

ФОРМАТ АНАЛИЗА:
1. Ключевые темы/проблемы пациента В ТЕКУЩЕЙ СЕССИИ
2. Эмоциональное состояние и изменения (если есть предыдущие сессии - укажи динамику)
3. Эффективные терапевтические интервенции в данной сессии
4. Что можно улучшить в работе терапевта (конкретно для ЭТОЙ сессии)
5. Прогресс/регресс по сравнению с предыдущими сессиями (если применимо)
6. Рекомендации для следующей сессии

Весь анализ должен быть на чистом русском языке без английских терминов.`,
      messages: [
        { role: 'user', content: analysisPrompt }
      ],
      enableCaching: true  // Включаем кеширование системного промпта
    });
    
    // Логирование использования токенов
    console.log(`[Токены: Анализ сессии] Ввод: ${analysisResponse.usage.input_tokens}, Вывод: ${analysisResponse.usage.output_tokens}, Всего: ${analysisResponse.usage.input_tokens + analysisResponse.usage.output_tokens}`);
    
    // 🔥 НОВОЕ: Логируем статистику кеширования
    cacheManager.logCacheStats('Анализ сессии');
    
    const analysis = analysisResponse.content;
    
    // Сохраняем анализ
    userSession.lastAnalysis = analysis;
    
    // 🔥 НОВОЕ: Сохраняем анализ в историю пользователя
    const analysisData = {
      timestamp: new Date().toISOString(),
      patientId: patient.patient_id || patient.name.toLowerCase().replace(/\s+/g, '_'),
      patientName: patient.name,
      exchangeCount: conversation.length,
      analysis: analysis,
      sessionNumber: sessionHistory.length + 1,
      isFirstSession: sessionHistory.length === 0
    };
    
    // Инициализируем массивы если их нет
    if (!userSession.analysisSessions) {
      userSession.analysisSessions = [];
    }
    if (!userSession.patientAnalysisHistory) {
      userSession.patientAnalysisHistory = {};
    }
    
    // Добавляем в общую историю анализов пользователя
    userSession.analysisSessions.push(analysisData);
    
    // Добавляем в историю анализов конкретного пациента
    const patientKey = analysisData.patientId;
    if (!userSession.patientAnalysisHistory[patientKey]) {
      userSession.patientAnalysisHistory[patientKey] = [];
    }
    userSession.patientAnalysisHistory[patientKey].push(analysisData);
    
    console.log(`Анализ сохранен в историю. Сессия ${analysisData.sessionNumber} с пациентом ${patient.name}`);
    
    saveUserData(userId);
    
    // Форматируем анализ для лучшей читаемости
    // Разбиваем анализ на параграфы по номерам
    const formattedAnalysis = analysis && typeof analysis === 'string' 
      ? analysis
          .replace(/(\d+\.\s)/g, '\n\n$1') // Добавляем двойной перенос перед каждым номером
          .replace(/^\s+/, '') // Убираем лишние пробелы в начале
      : analysis || 'Анализ недоступен';
      
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

/**
 * Функция для загрузки истории сессий конкретного пациента
 * @param {Object} patient - Данные пациента
 * @param {Number} userId - ID пользователя Telegram
 * @returns {Array} - Массив предыдущих сессий с анализами
 */
function loadPatientSessionHistory(patient, userId) {
  const patientId = patient.patient_id || 
                   `${patient.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const patientDir = `./sessions/${userId}/${patientId}`;
  
  if (!fs.existsSync(patientDir)) {
    console.log(`История сессий для пациента ${patient.name} не найдена`);
    return [];
  }
  
  try {
    const sessionFiles = fs.readdirSync(patientDir)
      .filter(file => file.endsWith('.json'))
      .sort(); // Сортируем по времени создания
    
    const sessionHistory = [];
    
    for (const file of sessionFiles) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(`${patientDir}/${file}`, 'utf8'));
        
        // Добавляем только если есть анализ и диалог
        if (sessionData.analysis && sessionData.conversation && sessionData.conversation.length > 0) {
          sessionHistory.push({
            timestamp: sessionData.timestamp,
            conversationLength: sessionData.conversation.length,
            analysis: sessionData.analysis,
            lastExchange: sessionData.conversation[sessionData.conversation.length - 1]
          });
        }
      } catch (e) {
        console.error(`Ошибка чтения файла сессии ${file}:`, e);
      }
    }
    
    console.log(`Загружено ${sessionHistory.length} предыдущих сессий для пациента ${patient.name}`);
    return sessionHistory;
    
  } catch (error) {
    console.error(`Ошибка при загрузке истории сессий пациента ${patient.name}:`, error);
    return [];
  }
}

/**
 * Функция для сохранения пациента в файл для будущих сессий
 * @param {Object} patient - Данные пациента
 * @param {Number} userId - ID пользователя Telegram
 * @returns {String} - Путь к сохраненному файлу
 */
function savePatientToFile(patient, userId) {
  // 🔥 ИСПРАВЛЕНИЕ: Создаем персональную директорию для каждого пользователя
  const userPatientsDir = `./patients/${userId}`;
  if (!fs.existsSync(userPatientsDir)) {
    fs.mkdirSync(userPatientsDir, { recursive: true });
  }
  
  // Создаем уникальный идентификатор для пациента
  const patientId = `${patient.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const filePath = `${userPatientsDir}/${patientId}.json`;
  
  // Добавляем метаданные о сохранении
  const patientData = {
    ...patient,
    saved_at: new Date().toISOString(),
    patient_id: patientId,
    saved_by_user: userId  // 🔥 НОВОЕ: Связываем пациента с пользователем
  };
  
  // Сохраняем в файл
  fs.writeFileSync(filePath, JSON.stringify(patientData, null, 2));
  console.log(`Пациент сохранен в: ${filePath}`);
  
  return filePath;
}

/**
 * Функция для архивирования сессии в файл
 * @param {Number} userId - ID пользователя
 * @param {Object} patient - Данные пациента
 * @param {Array} conversation - История диалога
 * @param {String} analysis - Анализ сессии
 * @returns {String} - Путь к сохраненному файлу
 */
function archiveSession(userId, patient, conversation, analysis) {
  if (!conversation || conversation.length === 0) {
    return null;
  }
  
  // 🔥 ИСПРАВЛЕНИЕ: Создаем персональные директории для каждого пользователя
  const userSessionsDir = `./sessions/${userId}`;
  if (!fs.existsSync(userSessionsDir)) {
    fs.mkdirSync(userSessionsDir, { recursive: true });
  }
  
  // Создаем папку для пациента в персональной директории пользователя
  const patientId = patient.patient_id || 
                   `${patient.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const patientDir = `${userSessionsDir}/${patientId}`;
  
  if (!fs.existsSync(patientDir)) {
    fs.mkdirSync(patientDir, { recursive: true });
  }
  
  // Формируем имя файла сессии с датой
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionFile = `${patientDir}/session_${timestamp}.json`;
  
  // Создаем объект сессии
  const sessionData = {
    patient: patient,
    conversation: conversation,
    analysis: analysis,
    timestamp: timestamp,
    therapistId: userId
  };
  
  // Сохраняем в файл
  fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  console.log(`Сессия архивирована в: ${sessionFile}`);
  
  return sessionFile;
}

// Функция для завершения диалога
function endDialog(userId) {
  const userSession = getUserSession(userId);
  
  console.log(`🏁 [endDialog] Завершение диалога для пользователя ${userId}`);
  console.log(`👤 [endDialog] Текущий пациент:`, userSession.currentPatient ? userSession.currentPatient.name : 'НЕТ');
  
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
      lastSessionTime: null,
      savedPatients: []  // Новое поле для отслеживания сохраненных пациентов
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
  
  // 🔥 ДИАГНОСТИКА: Полная информация о пациенте
  console.log(`🔍 [endDialog] Анализ пациента:`);
  console.log(`   - Имя: ${patient.name}`);
  console.log(`   - patient_id: ${patient.patient_id || 'НЕТ'}`);
  console.log(`   - saved_at: ${patient.saved_at || 'НЕТ'}`);
  console.log(`   - saved_by_user: ${patient.saved_by_user || 'НЕТ'}`);
  
  // 🔥 ИСПРАВЛЕНИЕ: Сохраняем пациента только если он новый (не имеет patient_id)
  let patientPath;
  if (!patient.patient_id) {
    console.log(`💾 [endDialog] Сохраняю НОВОГО пациента: ${patient.name} для пользователя ${userId}`);
    patientPath = savePatientToFile(patient, userId);
    console.log(`✅ [endDialog] Новый пациент сохранен в: ${patientPath}`);
  } else {
    console.log(`♻️ [endDialog] Пациент ${patient.name} уже существует (patient_id: ${patient.patient_id})`);
    patientPath = `./patients/${userId}/${patient.patient_id}.json`;
  }
  
  // Добавляем пациента в список сохраненных
  const patientId = patientPath.split('/').pop().replace('.json', '');
  if (!userSession.stats.savedPatients.includes(patientId)) {
    userSession.stats.savedPatients.push(patientId);
    console.log(`📋 [endDialog] Пациент добавлен в статистику: ${patientId}`);
  } else {
    console.log(`⚠️ [endDialog] Пациент уже в статистике: ${patientId}`);
  }
  
  // Архивируем сессию
  const sessionPath = archiveSession(userId, patient, userSession.conversation, userSession.lastAnalysis);
  
  // Формируем отчет
  let reportText = 
    `🏁 *Сессия завершена*\n\n` +
    `Пациент: *${patient.name}*, ${patient.age} ${getYearWord(patient.age)}\n` +
    `Диагноз: ${patient.meta.diagnosis}\n` +
    `Количество обменов репликами: ${exchangeCount}\n\n`;
  
  if (userSession.lastAnalysis) {
    reportText += `📊 *Итоговый анализ:*\n${userSession.lastAnalysis}\n\n`;
  }
  
  reportText += `✅ Пациент сохранен для будущих сессий.\n\n💝 Спасибо за работу! Желаю дальнейших успехов в развитии.\n\n📞 По всем вопросам: @YourTerapist\n\nДля создания нового пациента используйте */new*\nДля выбора сохраненного пациента используйте */patients*`;
  
  // 🔥 ИСПРАВЛЕНИЕ: Сохраняем данные завершенной сессии для возможности анализа
  userSession.lastCompletedSession = {
    patient: patient,
    conversation: userSession.conversation,
    analysis: userSession.lastAnalysis,
    completedAt: new Date().toISOString()
  };
  
  // Сбрасываем состояние диалога
  userSession.state = 'idle';
  userSession.currentPatient = null;
  userSession.conversation = [];
  // НЕ сбрасываем lastAnalysis - оставляем для анализа завершенной сессии
  saveUserData(userId);
  
  // Отправляем отчет с кнопками действий (inline)
  bot.sendMessage(
    userId,
    reportText,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 Анализ завершенной сессии", callback_data: "analyze_completed_session" }
          ],
          [
            { text: "🎲 Новый пациент", callback_data: "start_new_patient" }, 
            { text: "👤 Выбрать из сохраненных", callback_data: "show_saved_patients" }
          ],
          [
            { text: "📚 История сессий", callback_data: "show_session_history" }, 
            { text: "📈 Статистика", callback_data: "show_stats" }
          ]
        ]
      }
    }
  );
}

/**
 * Функция для отображения основных опций в меню
 */
function showMainMenuOptions(userId) {
  bot.sendMessage(
    userId,
    "🏠 *Главное меню ПсихоТренера*\n\nВыберите действие:",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎲 Новый случайный пациент", callback_data: "start_new_patient" },
            { text: "🧩 Выбрать тип пациента", callback_data: "start_custom_patient" }
          ],
          [
            { text: "📂 Мои сохраненные пациенты", callback_data: "show_saved_patients" },
            { text: "📚 История сессий", callback_data: "show_session_history" }
          ],
          [
            { text: "📈 Статистика", callback_data: "show_stats" },
            { text: "💬 Оставить отзыв", callback_data: "start_feedback" }
          ],
          [
            { text: "❓ Помощь", callback_data: "show_help" }
          ]
        ]
      }
    }
  );
}

/**
 * Функция для отображения сохраненных пациентов
 */
function showSavedPatients(userId) {
  const patientFiles = [];
  
  console.log(`🔍 [showSavedPatients] Загружаю пациентов для пользователя ${userId}`);
  
  try {
    // 🔥 МИГРАЦИЯ: Читаем пациентов из новой персональной директории
    const userPatientsDir = `./patients/${userId}`;
    if (fs.existsSync(userPatientsDir)) {
      const files = fs.readdirSync(userPatientsDir)
        .filter(file => file.endsWith('.json'));
      
      console.log(`📁 [showSavedPatients] Найдено ${files.length} файлов в ${userPatientsDir}`);
      
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(`${userPatientsDir}/${file}`, 'utf8'));
          patientFiles.push({
            id: file,
            name: data.name,
            age: data.age,
            diagnosis: data.meta.diagnosis,
            gender: data.gender,
            saved_at: data.saved_at || new Date().toISOString(),
            location: 'new' // Новая структура
          });
        } catch (e) {
          console.error(`Ошибка чтения файла пациента ${file}:`, e);
        }
      }
    }
    
    // 🔥 МИГРАЦИЯ: Также читаем старые пациенты из корневой директории для совместимости
    if (fs.existsSync('./patients')) {
      const oldFiles = fs.readdirSync('./patients')
        .filter(file => file.endsWith('.json'));
      
      for (const file of oldFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(`./patients/${file}`, 'utf8'));
          // Добавляем только если пациента еще нет в новой структуре
          const existsInNew = patientFiles.some(p => p.name === data.name);
          if (!existsInNew) {
            patientFiles.push({
              id: file,
              name: data.name,
              age: data.age,
              diagnosis: data.meta.diagnosis,
              gender: data.gender,
              saved_at: data.saved_at || new Date().toISOString(),
              location: 'old' // Старая структура - требует миграции
            });
          }
        } catch (e) {
          console.error(`Ошибка чтения старого файла пациента ${file}:`, e);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при чтении каталога пациентов:', error);
  }
  
  if (patientFiles.length === 0) {
    bot.sendMessage(
      userId,
      "📂 *Сохраненные пациенты*\n\nУ вас пока нет сохраненных пациентов. Проведите хотя бы одну сессию, чтобы сохранить пациента.",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎲 Новый пациент", callback_data: "start_new_patient" }],
            [{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]
          ]
        }
      }
    );
    return;
  }
  
  // Сортируем по дате сохранения (сначала новые)
  patientFiles.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
  
  // Формируем клавиатуру с пациентами
  const keyboard = [];
  let count = 0;
  
  for (const patient of patientFiles) {
    if (count < 10) { // Показываем до 10 пациентов на странице
      // 🔥 ИСПРАВЛЕНИЕ: Очень короткий ID для Telegram (лимит 64 байта)
      const shortId = patient.id.replace('.json', '').substring(0, 20);
      keyboard.push([{
        text: `${patient.name} (${patient.age}, ${patient.gender === 'мужской' ? 'М' : 'Ж'}) - ${patient.diagnosis}`,
        callback_data: `load:${shortId}`
      }]);
      count++;
    }
  }
  
  // Добавляем кнопки навигации
  keyboard.push([{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]);
  
  bot.sendMessage(
    userId,
    "📂 *Сохраненные пациенты*\n\nВыберите пациента для продолжения работы:",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

/**
 * Функция для загрузки сохраненного пациента
 */
async function loadSavedPatient(userId, patientId) {
  try {
    // 🔥 МИГРАЦИЯ: Проверяем сначала в новой структуре, потом в старой
    let filePath = `./patients/${userId}/${patientId}`;
    let needsMigration = false;
    
    if (!fs.existsSync(filePath)) {
      // Пробуем найти в старой структуре
      const oldFilePath = `./patients/${patientId}`;
      if (fs.existsSync(oldFilePath)) {
        filePath = oldFilePath;
        needsMigration = true;
        console.log(`🔄 Найден старый пациент ${patientId}, будет мигрирован`);
      } else {
        bot.sendMessage(
          userId,
          "❌ Пациент не найден. Возможно, файл был удален.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📂 К списку пациентов", callback_data: "show_saved_patients" }]
              ]
            }
          }
        );
        return;
      }
    }
    
    const patientData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 🔄 МИГРАЦИЯ: Если пациент из старой структуры, мигрируем его в новую
    if (needsMigration) {
      try {
        // Создаем персональную директорию если её нет
        const userPatientsDir = `./patients/${userId}`;
        if (!fs.existsSync(userPatientsDir)) {
          fs.mkdirSync(userPatientsDir, { recursive: true });
        }
        
        // Копируем в новую структуру с обновленными метаданными
        const migratedData = {
          ...patientData,
          saved_by_user: userId,
          migrated_at: new Date().toISOString(),
          original_file: patientId
        };
        
        const newFilePath = `${userPatientsDir}/${patientId}`;
        fs.writeFileSync(newFilePath, JSON.stringify(migratedData, null, 2));
        console.log(`✅ Пациент ${patientData.name} мигрирован в новую структуру: ${newFilePath}`);
        
        // Обновляем данные для использования в сессии
        Object.assign(patientData, migratedData);
      } catch (migrationError) {
        console.error(`❌ Ошибка миграции пациента ${patientId}:`, migrationError);
        // Продолжаем работу со старым файлом
      }
    }
    
    // Проверяем, не в активной ли сессии пользователь
    const userSession = getUserSession(userId);
    if (userSession.state === 'in_dialog' && userSession.currentPatient) {
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Да, загрузить", callback_data: `confirm_load:${patientId.replace('.json', '')}` },
              { text: "Нет, отменить", callback_data: "cancel_load" }
            ]
          ]
        }
      };
      
      bot.sendMessage(
        userId,
        `⚠️ У вас уже есть активный диалог с пациентом. Вы уверены, что хотите начать новую сессию с ${patientData.name}? Текущий диалог будет потерян.`,
        options
      );
    } else {
      // Начинаем новую сессию с загруженным пациентом
      // Отправляем сообщение ожидания и передаем его ID
      const waitingMsg = await bot.sendMessage(
        userId,
        "⏳ Загружаю пациента...",
        { parse_mode: 'Markdown' }
      );
      startNewDialogWithPatient(userId, patientData, waitingMsg.message_id);
    }
  } catch (error) {
    console.error("Ошибка при загрузке пациента:", error);
    bot.sendMessage(
      userId,
      "❌ Произошла ошибка при загрузке пациента. Пожалуйста, попробуйте снова.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📂 К списку пациентов", callback_data: "show_saved_patients" }]
          ]
        }
      }
    );
  }
}

/**
 * Функция для отображения истории сессий
 */
function showSessionHistory(userId) {
  const sessionDirs = [];
  
  try {
    // 🔥 ИСПРАВЛЕНИЕ: Читаем сессии только из персональной директории пользователя
    const userSessionsDir = `./sessions/${userId}`;
    if (fs.existsSync(userSessionsDir)) {
      const dirs = fs.readdirSync(userSessionsDir)
        .filter(dir => fs.statSync(`${userSessionsDir}/${dir}`).isDirectory());
      
      for (const dir of dirs) {
        const sessionFiles = fs.readdirSync(`${userSessionsDir}/${dir}`)
          .filter(file => file.endsWith('.json'));
        
        if (sessionFiles.length > 0) {
          try {
            // Берем первый файл сессии для получения информации о пациенте
            const sessionData = JSON.parse(fs.readFileSync(`${userSessionsDir}/${dir}/${sessionFiles[0]}`, 'utf8'));
            
            sessionDirs.push({
              id: dir,
              patient: sessionData.patient,
              sessionCount: sessionFiles.length,
              lastSession: sessionFiles
                .map(file => {
                  const data = JSON.parse(fs.readFileSync(`${userSessionsDir}/${dir}/${file}`, 'utf8'));
                  return { file, timestamp: data.timestamp };
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
            });
          } catch (e) {
            console.error(`Ошибка чтения файла сессии в директории ${dir}:`, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при чтении каталога сессий:', error);
  }
  
  if (sessionDirs.length === 0) {
    bot.sendMessage(
      userId,
      "📚 *История сессий*\n\nУ вас пока нет архивированных сессий. Проведите и завершите хотя бы одну сессию.",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎲 Новый пациент", callback_data: "start_new_patient" }],
            [{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]
          ]
        }
      }
    );
    return;
  }
  
  // Сортируем по дате последней сессии (сначала новые)
  sessionDirs.sort((a, b) => new Date(b.lastSession.timestamp) - new Date(a.lastSession.timestamp));
  
  // Формируем клавиатуру с историей сессий
  const keyboard = [];
  let count = 0;
  
  for (const session of sessionDirs) {
    if (count < 10) { // Показываем до 10 пациентов на странице
      const patientInfo = session.patient;
      keyboard.push([{
        text: `${patientInfo.name} - ${session.sessionCount} сессий`,
        callback_data: `view_patient_sessions:${session.id}`
      }]);
      count++;
    }
  }
  
  // Добавляем кнопки навигации
  keyboard.push([{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]);
  
  bot.sendMessage(
    userId,
    "📚 *История сессий*\n\nВыберите пациента для просмотра истории сессий:",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
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
    "   • Или выберите из сохраненных пациентов через /patients\n\n" +
    
    "2️⃣ *Проведите сессию*\n" +
    "   • Задавайте вопросы как обычные сообщения\n" +
    "   • 🎤 Или отправляйте голосовые сообщения (распознавание речи)\n" +
    "   • Используйте терапевтические техники\n" +
    "   • Напишите 'меню' для доступа к управлению сессией\n\n" +
    
    "3️⃣ *Получите обратную связь*\n" +
    "   • Используйте команду /analyze для анализа сессии\n" +
    "   • Узнайте сильные стороны своей работы\n" +
    "   • Получите рекомендации по улучшению\n\n" +
    
    "4️⃣ *Сохраняйте прогресс*\n" +
    "   • Все пациенты автоматически сохраняются\n" +
    "   • Просматривайте историю сессий через /history\n" +
    "   • Отслеживайте статистику через /stats\n\n" +
    
    "💡 *Доступные команды:*\n" +
    "/new - Создать случайного пациента\n" +
    "/custom - Выбрать тип пациента\n" +
    "/patients - Продолжить с сохраненным пациентом\n" +
    "/history - История всех сессий\n" +
    "/analyze - Анализировать текущую сессию\n" +
    "/info - Посмотреть карту пациента\n" +
    "/end - Завершить сессию\n" +
    "/stats - Ваша статистика\n\n" +
    "💝 Желаю вам успешной практики и новых открытий в психотерапии!\n\n" +
    "📞 По всем вопросам: @YourTerapist";
  
  bot.sendMessage(userId, helpText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎲 Новый пациент", callback_data: "start_new_patient" }],
        [{ text: "📂 Сохраненные пациенты", callback_data: "show_saved_patients" }],
        [{ text: "🏠 Главное меню", callback_data: "back_to_main_menu" }]
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

// Команда для отображения сохраненных пациентов
bot.onText(/\/patients/, (msg) => {
  showSavedPatients(msg.from.id);
});

// Команда для отображения истории сессий
bot.onText(/\/history/, (msg) => {
  showSessionHistory(msg.from.id);
});

// Команда для оставления отзыва
bot.onText(/\/feedback/, (msg) => {
  startFeedbackProcess(msg.from.id);
});

// Обработчик команды /stats - статистика пользователя
bot.onText(/\/stats/, (msg) => {
  showUserStats(msg.from.id);
});

// 🔥 НОВОЕ: Обработчик команды /cache - статистика кеширования (только для разработки)
bot.onText(/\/cache/, (msg) => {
  const stats = cacheManager.getCacheStats();
  const formattedStats = `🔧 *СТАТИСТИКА КЕШИРОВАНИЯ ТОКЕНОВ*

📊 **Общая статистика:**
• Всего запросов: ${stats.totalRequests}
• Попаданий в кеш: ${stats.cacheHits}
• Промахов кеша: ${stats.cacheMisses}
• Процент попаданий: ${stats.hitRate}%

💰 **Экономия токенов:**
• Сэкономлено входных токенов: ${stats.totalInputTokensSaved}
• Сэкономлено выходных токенов: ${stats.totalOutputTokensSaved}
• Общая экономия: ${stats.totalTokensSaved} токенов

💵 **Экономия средств:**
• Экономия на входных токенах: $${(stats.totalInputTokensSaved / 1000000 * 0.25).toFixed(4)}
• Экономия на выходных токенах: $${(stats.totalOutputTokensSaved / 1000000 * 1.25).toFixed(4)}
• **Общая экономия: $${stats.costSavings.toFixed(4)}**

⚡ **Производительность:**
• Среднее улучшение скорости: ~85%
• Уменьшение задержки благодаря кешу
`;

  bot.sendMessage(msg.from.id, formattedStats, { parse_mode: 'Markdown' });
});

// Функция для определения уровня пользователя на основе количества сессий
/**
 * Функция для начала процесса сбора отзыва
 */
function startFeedbackProcess(userId) {
  const userSession = getUserSession(userId);
  userSession.feedbackState = 'waiting_for_rating';
  saveUserData(userId);
  
  bot.sendMessage(
    userId,
    "💬 *Оставьте отзыв о боте ПсихоТренер*\n\nМы будем благодарны за вашу оценку и комментарии. Это поможет нам улучшить сервис!",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⭐", callback_data: "save_feedback:1" },
            { text: "⭐⭐", callback_data: "save_feedback:2" },
            { text: "⭐⭐⭐", callback_data: "save_feedback:3" },
            { text: "⭐⭐⭐⭐", callback_data: "save_feedback:4" },
            { text: "⭐⭐⭐⭐⭐", callback_data: "save_feedback:5" }
          ],
          [
            { text: "Отмена", callback_data: "cancel_feedback" }
          ]
        ]
      }
    }
  );
}

/**
 * Функция для сохранения оценки отзыва и запроса комментария
 */
function saveFeedbackRating(userId, rating) {
  const userSession = getUserSession(userId);
  userSession.feedbackState = 'waiting_for_comment';
  userSession.feedbackRating = rating;
  saveUserData(userId);
  
  bot.sendMessage(
    userId,
    `Спасибо за оценку! ${generateStars(rating)}\n\nПожалуйста, напишите комментарий о вашем опыте использования бота (или напишите "пропустить", если не хотите оставлять комментарий).`
  );
}

/**
 * Функция для отмены процесса отзыва
 */
function cancelFeedbackProcess(userId) {
  const userSession = getUserSession(userId);
  userSession.feedbackState = null;
  userSession.feedbackRating = null;
  saveUserData(userId);
  
  bot.sendMessage(
    userId,
    "✅ Отзыв отменен.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Вернуться в главное меню", callback_data: "back_to_main_menu" }]
        ]
      }
    }
  );
}

/**
 * Функция для сохранения отзыва в файл
 */
function saveFeedbackToFile(userId, rating, comment) {
  try {
    if (!fs.existsSync('./feedback')) {
      fs.mkdirSync('./feedback', { recursive: true });
    }
    
    const userName = userSessions[userId]?.userName || 'Неизвестный';
    const timestamp = new Date().toISOString();
    const feedbackId = `${userId}_${timestamp.replace(/[:.]/g, '-')}`;
    const feedbackFile = `./feedback/${feedbackId}.json`;
    
    const feedbackData = {
      userId: userId,
      userName: userName,
      rating: rating,
      comment: comment,
      timestamp: timestamp
    };
    
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbackData, null, 2));
    console.log(`Отзыв сохранен в: ${feedbackFile}`);
    
    return feedbackFile;
  } catch (error) {
    console.error("Ошибка при сохранении отзыва:", error);
    return null;
  }
}

/**
 * Функция для генерации строки со звездами для отзыва
 */
function generateStars(rating) {
  return "⭐".repeat(rating);
}

/**
 * Функция для определения уровня пользователя на основе количества сессий
 */
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

// Инициализация VoiceHandler при запуске
voiceHandler.initialize().then((isReady) => {
  if (isReady) {
    console.log('🎤 Голосовые сообщения полностью готовы к работе!');
  } else {
    console.log('⚠️ Голосовые сообщения недоступны. Бот работает только с текстом.');
  }
});

console.log('Бот успешно запущен и готов к приему сообщений!');

// ==============================
// ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЙ С САЙТА
// ==============================

// Функция для отправки уведомлений о новых заявках с сайта
async function sendContactNotification(name, phone, message = '') {
  const ADMIN_ID = 434085347; // Ваш Telegram ID
  
  try {
    const notificationText = `🔔 *Новая заявка с сайта!*\n\n👤 *Имя:* ${name}\n📞 *Телефон:* ${phone}${message ? `\n💬 *Сообщение:* ${message}` : ''}\n\n⏰ *Время:* ${new Date().toLocaleString('ru-RU')}`;
    
    await bot.sendMessage(ADMIN_ID, notificationText, {
      parse_mode: 'Markdown'
    });
    
    console.log(`✅ Уведомление о заявке отправлено: ${name}, ${phone}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
    return false;
  }
}

// Экспортируем функцию для использования в других файлах
module.exports = { sendContactNotification };