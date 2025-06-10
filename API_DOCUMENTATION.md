# 🔌 API Documentation - ПсихоТренер Бот

## 📋 Обзор API интеграций

Проект интегрирует 4 основных API для создания полнофункциональной платформы обучения психотерапевтов:

1. **Anthropic Claude API** - AI генерация и анализ
2. **Telegram Bot API** - Пользовательский интерфейс  
3. **OpenAI Whisper API** - Обработка голоса
4. **Express REST API** - Веб-интеграции

---

## 🤖 Anthropic Claude API

### Конфигурация
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### Основные сценарии использования

#### 1. Генерация виртуальных пациентов
**Эндпоинт**: `messages.create`  
**Модель**: `claude-3-5-haiku-20241022`  
**Токены**: до 1000  
**Кеширование**: Включено для системных промптов  

```javascript
const casePrompt = `
Создай детальное описание пациента для психологического тренинга.

ПАРАМЕТРЫ СЛУЧАЯ:
Диагноз: ${diagnosis}
Категория: ${categoryData.name}  
Открытость: ${openness.name}
Сложность: ${complexity}/5

ТРЕБУЕМЫЕ ПОЛЯ JSON-ОБЪЕКТА:
{
  "name": "Имя пациента",
  "age": число от 25 до 55,
  "gender": "мужской" или "женский", 
  "profession": "Профессия",
  "problem": "Основная проблема",
  "symptoms": ["Симптом 1", "Симптом 2"],
  "motivation": "Почему пришел к психологу",
  "openness": "Отношение к терапии",
  "history": "Краткая история возникновения проблемы",
  "triggers": ["Триггер 1", "Триггер 2"],
  "coping": ["Способ 1", "Способ 2"],
  "defenses": ["Защита 1", "Защита 2"],
  "speech": "Особенности речи",
  "resistance": "Как проявляет сопротивление",
  "background": "Семейная/социальная история"
}
`;

const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1000,
  system: systemPrompt,
  messages: [{ role: 'user', content: casePrompt }]
});
```

**Пример ответа**:
```json
{
  "name": "Анна Сергеевна Волкова",
  "age": 34,
  "gender": "женский",
  "profession": "Учитель начальных классов",
  "problem": "Панические атаки в школе",
  "symptoms": ["учащенное сердцебиение", "головокружение", "страх потерять контроль"],
  "motivation": "Хочу вернуться к нормальной работе и не бояться заходить в класс",
  "openness": "Готова к изменениям, но настороженна к новым методам",
  "history": "Проблема началась 3 месяца назад после серьезного конфликта с администрацией школы",
  "triggers": ["звонок на урок", "большие скопления детей", "проверки администрации"],
  "coping": ["дыхательные упражнения", "избегание школьных мероприятий"],
  "defenses": ["рационализация", "избегание", "интеллектуализация"],
  "speech": "Говорит тихо, часто делает паузы, иногда голос дрожит",
  "resistance": "Может уходить от болезненных тем, переводя разговор на детей",
  "background": "Росла в строгой семье учителей, привыкла соответствовать высоким стандартам"
}
```

#### 2. Эмуляция диалогов с пациентами
**Эндпоинт**: `messages.create`  
**Модель**: `claude-3-5-haiku-20241022`  
**Токены**: 300 (с автопродолжением при обрезании)  
**Кеширование**: Системный промпт кешируется  

```javascript
const systemPrompt = `Ты пациент с ${patientData.meta.diagnosis}. 
Твой тип отношения к терапии: ${patientData.openness}.

🔥 КРИТИЧЕСКИ ВАЖНО:
- Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке
- ЗАПРЕЩЕНО использовать английские слова, фразы или действия
- Все действия описывай русскими словами в скобках
- Пример действий: (смотрит в сторону), (сжимает кулаки), (вздыхает)

При первом ответе психологу:
1. Представься (${patientData.name}, ${patientData.age} лет, ${patientData.profession})
2. Кратко опиши одну конкретную ситуацию  
3. Упомяни 1-2 симптома из списка: ${patientData.symptoms.join(", ")}

В диалоге:
- Отвечай КРАТКО (2-4 предложения максимум)
- Говори обрывочно, с паузами
- Жди реакции психолога, не выдавай всю информацию сразу
- Используй особенности речи: ${patientData.speech}
- Проявляй сопротивление: ${patientData.resistance}
- НЕ используй психологические термины
- Действия ТОЛЬКО в скобках: (нервно теребит папку), (опускает глаза)`;

const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022', 
  max_tokens: 300,
  system: systemPrompt,
  messages: conversationHistory
});
```

**Пример диалога**:
```
Терапевт: "Здравствуйте! Расскажите, что привело вас ко мне?"

Пациент: "Здравствуйте... (немного нервничает) Меня зовут Анна, 34 года, я учитель начальных классов. У меня начались... ну, панические атаки прямо в школе. (опускает глаза) Вчера даже не смогла зайти в класс - сердце так колотилось, что думала, упаду в обморок."
```

#### 3. Анализ терапевтических сессий
**Эндпоинт**: `messages.create`  
**Модель**: `claude-3-5-haiku-20241022`  
**Токены**: до 1000  
**Кеширование**: Системный промпт супервизора кешируется  

```javascript
const supervisorPrompt = `Ты опытный психотерапевт-супервизор. 
Анализируй сессии профессионально и конструктивно.

🔥 ВАЖНО: ВСЕГДА отвечай ТОЛЬКО на РУССКОМ языке.

ФОРМАТ АНАЛИЗА:
1. Ключевые темы/проблемы пациента В ТЕКУЩЕЙ СЕССИИ
2. Эмоциональное состояние и изменения  
3. Эффективные терапевтические интервенции
4. Что можно улучшить в работе терапевта
5. Прогресс/регресс по сравнению с предыдущими сессиями
6. Рекомендации для следующей сессии`;

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

ТЕКУЩАЯ СЕССИЯ:
${conversation.map((exchange, i) => 
  `[${i+1}] Терапевт: ${exchange.therapist}\n[${i+1}] Пациент: ${exchange.patient}`
).join("\n\n")}
`;
```

**Пример анализа**:
```
📊 АНАЛИЗ ТЕРАПЕВТИЧЕСКОЙ СЕССИИ

1. КЛЮЧЕВЫЕ ТЕМЫ:
• Панические атаки на рабочем месте
• Страх потери контроля в присутствии коллег
• Связь симптоматики с конфликтом с администрацией

2. ЭМОЦИОНАЛЬНОЕ СОСТОЯНИЕ:
• Высокий уровень тревоги (8/10)
• Стыд за свои симптомы  
• Злость на администрацию (частично подавленная)

3. ЭФФЕКТИВНЫЕ ИНТЕРВЕНЦИИ:
✅ Валидация переживаний клиента
✅ Исследование триггеров через конкретные примеры
✅ Нормализация реакций на стресс

4. ОБЛАСТИ ДЛЯ УЛУЧШЕНИЯ:
• Больше исследовать связь между конфликтом и симптомами
• Работать с телесными ощущениями во время паники
• Изучить семейную историю перфекционизма

5. ПРОГРЕСС:
• Первая сессия - установился хороший контакт
• Клиент проявляет готовность к работе

6. РЕКОМЕНДАЦИИ:
• На следующей сессии: техники заземления
• Домашнее задание: дневник панических атак  
• Рассмотреть методы когнитивной реструктуризации
```

### Система кеширования

#### Конфигурация кеширования
```javascript
class CacheManager {
  async createMessage(options) {
    const {
      model = 'claude-3-5-haiku-20241022',
      maxTokens = 1000, 
      system,
      messages,
      enableCaching = true
    } = options;

    let systemPrompt = system;
    
    // Автоматическое кеширование для длинных промптов
    if (enableCaching && system && typeof system === 'string' && system.length > 1000) {
      systemPrompt = [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" }
        }
      ];
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages
    });

    // Обновление статистики кеширования
    this._updateCacheStats(response);
    
    return {
      content: response.content[0].text,
      usage: response.usage,
      cacheStats: this._extractCacheStats(response)
    };
  }
}
```

#### Статистика кеширования
```javascript
{
  totalRequests: 1250,
  cacheHits: 892,           // 71% попаданий в кеш
  cacheMisses: 358,         // 29% промахов
  tokensWrittenToCache: 45000,
  tokensReadFromCache: 125000,
  costSavings: 0.847        // 84.7% экономии стоимости
}
```

---

## 📱 Telegram Bot API

### Инициализация
```javascript
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
```

### Команды бота
```javascript
// Регистрация команд в меню Telegram
await bot.setMyCommands([
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
```

### Обработчики событий

#### Текстовые сообщения
```javascript
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  
  // Голосовые сообщения
  if (msg.voice) {
    const processingMsg = await bot.sendMessage(
      userId,
      "🎤 *Обрабатываю голосовое сообщение...*",
      { parse_mode: 'Markdown' }
    );
    
    try {
      const transcription = await voiceHandler.processVoiceMessage(bot, msg);
      
      await bot.editMessageText(
        `🎤 *Распознанный текст:*\n\n"${transcription}"`,
        {
          chat_id: userId,
          message_id: processingMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
      
      // Создаем искусственное текстовое сообщение
      msg = { ...msg, text: transcription, voice: undefined };
    } catch (error) {
      await bot.editMessageText(
        "❌ Ошибка обработки голосового сообщения",
        {
          chat_id: userId,
          message_id: processingMsg.message_id
        }
      );
      return;
    }
  }
  
  // Команды управления
  if (msg.text) {
    const textLower = msg.text.toLowerCase();
    
    if (textLower === "меню" || textLower === "управление") {
      showSessionControls(userId);
      return;
    }
    
    if (textLower === "продолжить" || textLower === "continue") {
      continueDialog(userId, "продолжить");
      return;
    }
  }
  
  // Продолжение диалога с пациентом
  if (userSession.state === 'in_dialog') {
    continueDialog(userId, msg.text);
  } else if (userSession.feedbackState === 'waiting_for_rating') {
    processFeedbackRating(userId, msg.text);
  } else if (userSession.feedbackState === 'waiting_for_comment') {
    processFeedbackComment(userId, msg.text);
  }
});
```

#### Callback Query (кнопки)
```javascript
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  // Создание нового пациента
  if (data === 'start_new_patient') {
    await createRandomPatient(userId);
  }
  
  // Выбор категории расстройства
  if (data.startsWith('category:')) {
    const category = data.split(':')[1];
    await showOpennessMenu(userId, category);
  }
  
  // Выбор уровня открытости
  if (data.startsWith('openness:')) {
    const [category, openness] = data.split(':').slice(1);
    await showComplexityMenu(userId, category, openness);
  }
  
  // Выбор сложности
  if (data.startsWith('complexity:')) {
    const [category, openness, complexity] = data.split(':').slice(1);
    await createCustomPatient(userId, category, openness, parseInt(complexity));
  }
  
  // Загрузка сохраненного пациента
  if (data.startsWith('load_patient:')) {
    const shortId = data.split(':')[1];
    await loadSavedPatient(userId, shortId);
  }
  
  // Управление сессией
  if (data === 'analyze_session') {
    await analyzeSession(userId);
  }
  
  if (data === 'show_patient_info') {
    await showPatientInfo(userId);
  }
  
  if (data === 'end_dialog') {
    await endDialog(userId);
  }
  
  if (data === 'continue_session') {
    await bot.sendMessage(userId, "Продолжайте диалог с пациентом...");
  }
  
  // Подтверждение ответа
  await bot.answerCallbackQuery(callbackQuery.id);
});
```

### Inline клавиатуры

#### Меню управления сессией
```javascript
const sessionControls = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📊 Анализировать сессию", callback_data: "analyze_session" },
        { text: "ℹ️ Информация о пациенте", callback_data: "show_patient_info" }
      ],
      [
        { text: "🏁 Завершить сессию", callback_data: "end_dialog" },
        { text: "▶️ Продолжить диалог", callback_data: "continue_session" }
      ]
    ]
  }
};
```

#### Меню выбора категории пациентов
```javascript
function createCategoryKeyboard() {
  const categories = Object.keys(patientSystem.casesDB);
  const keyboard = [];
  
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push({
      text: `${patientSystem.casesDB[categories[i]].emoji} ${patientSystem.casesDB[categories[i]].name}`,
      callback_data: `category:${categories[i]}`
    });
    
    if (i + 1 < categories.length) {
      row.push({
        text: `${patientSystem.casesDB[categories[i + 1]].emoji} ${patientSystem.casesDB[categories[i + 1]].name}`,
        callback_data: `category:${categories[i + 1]}`
      });
    }
    
    keyboard.push(row);
  }
  
  keyboard.push([{ text: "↩️ Назад в меню", callback_data: "back_to_main" }]);
  
  return { reply_markup: { inline_keyboard: keyboard } };
}
```

### Управление состояниями
```javascript
function getUserSession(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      state: 'idle',                    // idle, in_dialog, waiting_analysis
      currentPatient: null,             // Данные текущего пациента
      conversation: [],                 // История диалога [{therapist: "", patient: ""}]
      lastAnalysis: null,              // Последний анализ сессии
      lastCompletedSession: null,      // Данные завершенной сессии
      stats: {                         // Статистика пользователя
        totalSessions: 0,
        totalExchanges: 0,
        sessionsByCategory: {},
        savedPatients: []
      },
      feedbackState: null,             // waiting_for_rating, waiting_for_comment
      feedbackRating: null,
      analysisSessions: [],            // История всех анализов
      patientAnalysisHistory: {},      // Анализы по пациентам
      waitingContinuation: false,      // Ожидание продолжения обрезанного ответа
      partialResponse: null            // Частичный ответ пациента
    };
  }
  return userSessions[userId];
}
```

---

## 🎤 OpenAI Whisper API

### Конфигурация
```javascript
class VoiceHandler {
  constructor() {
    this.tempDir = './temp_audio/';
    this.maxFileSizeMB = 25; // Лимит OpenAI Whisper API
    this.apiKey = process.env.OPENAI_API_KEY;
  }
}
```

### Обработка голосовых сообщений

#### Полный workflow
```javascript
async processVoiceMessage(bot, msg) {
  const voice = msg.voice;
  const userId = msg.from.id;
  
  // 1. Валидация размера файла
  if (voice.file_size > this.maxFileSizeMB * 1024 * 1024) {
    throw new Error(`Голосовое сообщение слишком большое (${(voice.file_size / 1024 / 1024).toFixed(1)}MB). Максимум: ${this.maxFileSizeMB}MB`);
  }
  
  // 2. Скачивание OGG файла из Telegram
  const oggFilePath = await this.downloadVoiceFile(bot, voice.file_id, userId);
  
  // 3. Конвертация OGG → MP3 (требование Whisper API)
  const mp3FilePath = await this.convertOggToMp3(oggFilePath);
  
  // 4. Транскрипция через OpenAI Whisper
  const transcription = await this.transcribeAudio(mp3FilePath);
  
  // 5. Очистка временных файлов
  this.cleanupTempFiles([oggFilePath, mp3FilePath]);
  
  return transcription;
}
```

#### Скачивание файлов
```javascript
async downloadVoiceFile(bot, fileId, userId) {
  try {
    // Получение информации о файле от Telegram
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;
    
    // Генерация уникального имени файла
    const timestamp = Date.now();
    const oggFilePath = path.join(this.tempDir, `voice_${userId}_${timestamp}.ogg`);
    
    // Скачивание файла
    await this.downloadFile(fileUrl, oggFilePath);
    
    console.log(`📥 Загружен голосовой файл: ${path.basename(oggFilePath)}`);
    return oggFilePath;
    
  } catch (error) {
    console.error('❌ Ошибка скачивания голосового файла:', error);
    throw error;
  }
}

async downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(filePath, () => {}); // Удаляем частично загруженный файл
      reject(error);
    });
  });
}
```

#### Конвертация через FFmpeg
```javascript
async convertOggToMp3(oggFilePath) {
  const mp3FilePath = oggFilePath.replace('.ogg', '.mp3');
  
  // FFmpeg команда для конвертации с оптимизацией для Whisper
  const command = `ffmpeg -i "${oggFilePath}" -acodec mp3 -ar 16000 -ab 32k "${mp3FilePath}" -y`;
  
  try {
    const { stdout, stderr } = await this.execAsync(command);
    
    if (!fs.existsSync(mp3FilePath)) {
      throw new Error('MP3 файл не был создан после конвертации');
    }
    
    console.log(`🔄 Конвертирован в MP3: ${path.basename(mp3FilePath)}`);
    return mp3FilePath;
    
  } catch (error) {
    console.error('❌ Ошибка конвертации OGG в MP3:', error);
    throw error;
  }
}
```

#### Транскрипция
```javascript
async transcribeAudio(mp3FilePath) {
  try {
    const fileStream = fs.createReadStream(mp3FilePath);
    
    // Подготовка multipart/form-data для OpenAI API
    const formData = new FormData();
    formData.append('file', fileStream, {
      filename: path.basename(mp3FilePath),
      contentType: 'audio/mp3'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');          // Русский язык
    formData.append('response_format', 'text'); // Только текст без метаданных
    
    // HTTP запрос к OpenAI API
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode,
            text: () => Promise.resolve(data),
            statusText: res.statusMessage
          });
        });
      });

      req.on('error', reject);
      formData.pipe(req);
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} - ${errorData}`);
    }
    
    const transcription = await response.text();
    console.log(`🎤 Транскрипция завершена: "${transcription.substring(0, 50)}..."`);
    
    return transcription.trim();
    
  } catch (error) {
    console.error('❌ Ошибка транскрипции аудио:', error);
    throw error;
  }
}
```

#### Очистка временных файлов
```javascript
cleanupTempFiles(filePaths) {
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Удален временный файл: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Не удалось удалить ${filePath}:`, error.message);
    }
  });
}
```

---

## 🌐 Express REST API

### Конфигурация сервера
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers для кросс-доменных запросов
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🌐 Contact API сервер запущен на порту ${PORT}`);
});
```

### Endpoints

#### POST /contact - Обработка контактных форм
```javascript
app.post('/contact', async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        
        // Валидация обязательных полей
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Имя и телефон обязательны'
            });
        }
        
        // Санитизация входных данных
        const sanitizedData = {
            name: name.trim().substring(0, 100),
            phone: phone.trim().substring(0, 20),
            message: message ? message.trim().substring(0, 500) : ''
        };
        
        // Валидация телефона (базовая)
        if (!/^\+?[\d\s\-\(\)]{7,20}$/.test(sanitizedData.phone)) {
            return res.status(400).json({
                success: false,
                message: 'Некорректный формат телефона'
            });
        }
        
        // Сохранение в лог файл
        const logData = {
            timestamp: new Date().toISOString(),
            ...sanitizedData,
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        };
        
        const logFile = '/var/www/profy.top/psy/contacts.log';
        fs.appendFileSync(logFile, JSON.stringify(logData) + '\n');
        
        // Отправка уведомления в Telegram
        const telegramSuccess = await sendTelegramNotification(
            sanitizedData.name, 
            sanitizedData.phone, 
            sanitizedData.message
        );
        
        // Всегда возвращаем успех пользователю (для безопасности)
        res.json({
            success: true,
            message: 'Спасибо! Ваша заявка отправлена.',
            telegram_sent: telegramSuccess
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        
        // Логируем ошибку, но показываем успех пользователю
        res.json({
            success: true,
            message: 'Спасибо! Ваша заявка принята.'
        });
    }
});
```

#### GET /health - Health check
```javascript
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('./package.json').version
    });
});
```

#### GET /stats - Статистика API
```javascript
app.get('/stats', (req, res) => {
    try {
        // Чтение логов контактов
        const logFile = '/var/www/profy.top/psy/contacts.log';
        const logs = fs.readFileSync(logFile, 'utf8')
                      .split('\n')
                      .filter(line => line.trim())
                      .map(line => JSON.parse(line));
        
        const stats = {
            totalContacts: logs.length,
            todayContacts: logs.filter(log => 
                new Date(log.timestamp).toDateString() === new Date().toDateString()
            ).length,
            lastContact: logs[logs.length - 1]?.timestamp,
            contactsByDay: {}
        };
        
        // Группировка по дням
        logs.forEach(log => {
            const day = new Date(log.timestamp).toDateString();
            stats.contactsByDay[day] = (stats.contactsByDay[day] || 0) + 1;
        });
        
        res.json(stats);
        
    } catch (error) {
        res.status(500).json({
            error: 'Ошибка получения статистики'
        });
    }
});
```

### Интеграция с Telegram

#### Функция отправки уведомлений
```javascript
function sendTelegramNotification(name, phone, message) {
    return new Promise((resolve) => {
        const scriptPath = '/root/supervisor/send-notification.js';
        const child = spawn('node', [scriptPath, name, phone, message]);
        
        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.on('close', (code) => {
            try {
                const result = JSON.parse(output);
                resolve(result.success);
            } catch (e) {
                console.error('Ошибка парсинга ответа от send-notification.js:', e);
                resolve(false);
            }
        });
        
        child.on('error', (error) => {
            console.error('Ошибка запуска send-notification.js:', error);
            resolve(false);
        });
    });
}
```

#### Скрипт отправки уведомлений (send-notification.js)
```javascript
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const [name, phone, message] = process.argv.slice(2);
const ADMIN_ID = 434085347; // ID администратора

async function sendNotification() {
    try {
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
        
        const notificationText = `🔔 *Новая заявка с сайта!*

👤 *Имя:* ${name}
📞 *Телефон:* ${phone}${message ? `
💬 *Сообщение:* ${message}` : ''}

⏰ *Время:* ${new Date().toLocaleString('ru-RU', { 
    timeZone: 'Europe/Paris' 
})}`;
        
        await bot.sendMessage(ADMIN_ID, notificationText, {
            parse_mode: 'Markdown'
        });
        
        console.log(JSON.stringify({ 
            success: true, 
            message: 'Уведомление отправлено' 
        }));
        
    } catch (error) {
        console.log(JSON.stringify({ 
            success: false, 
            error: error.message 
        }));
    }
}

sendNotification();
```

---

## 🔧 Конфигурация и переменные окружения

### Обязательные переменные
```bash
# .env файл
ANTHROPIC_API_KEY=sk-ant-api03-...     # Ключ Claude API
TELEGRAM_BOT_TOKEN=7234567890:AAE...   # Токен Telegram бота
```

### Опциональные переменные
```bash
OPENAI_API_KEY=sk-proj-...             # Только для голосовых сообщений
PORT=3001                              # Порт для Express API
NODE_ENV=production                    # Режим работы
LOG_LEVEL=info                         # Уровень логирования
```

### Проверка конфигурации
```javascript
function validateEnvironment() {
    const required = ['ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Отсутствуют обязательные переменные окружения:');
        missing.forEach(key => console.error(`   - ${key}`));
        process.exit(1);
    }
    
    console.log('✅ Конфигурация окружения валидна');
}
```

---

## 📊 Мониторинг и метрики

### Статистика использования Claude API
```javascript
// Статистика кеширования
{
  totalRequests: 1250,
  cacheHits: 892,           // 71% эффективность кеша
  cacheMisses: 358,
  tokensWrittenToCache: 45000,
  tokensReadFromCache: 125000,
  costSavings: 0.847,       // 84.7% экономии
  avgResponseTime: 1.2      // секунды
}

// Статистика использования по типам запросов
{
  patientGeneration: { requests: 340, avgTokens: 850 },
  dialogues: { requests: 780, avgTokens: 245 },
  analysis: { requests: 130, avgTokens: 920 }
}
```

### Статистика Telegram Bot
```javascript
{
  totalUsers: 156,
  activeUsersToday: 23,
  totalSessions: 892,
  averageSessionLength: 12.5,  // сообщений
  voiceMessagesProcessed: 234,
  categoriesUsage: {
    "anxiety": 156,
    "mood": 134,
    "trauma": 89
  }
}
```

### Мониторинг ошибок
```javascript
// Логирование ошибок API
function logApiError(api, error, context) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        api: api,                    // 'claude', 'telegram', 'whisper'
        error: error.message,
        context: context,
        stack: error.stack
    };
    
    console.error(`❌ [${api.toUpperCase()}] ${error.message}`);
    
    // Сохранение в файл ошибок
    fs.appendFileSync('./logs/errors.log', JSON.stringify(errorLog) + '\n');
}
```

---

## 🚨 Обработка ошибок

### Типичные ошибки и решения

#### Claude API
```javascript
// Превышение лимита токенов
if (error.message.includes('maximum context length')) {
    // Сокращение контекста диалога
    conversation = conversation.slice(-5); // Последние 5 сообщений
}

// Ошибка аутентификации
if (error.status === 401) {
    console.error('❌ Неверный ANTHROPIC_API_KEY');
    // Уведомление администратора
}

// Rate limit
if (error.status === 429) {
    // Экспоненциальный backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
}
```

#### Telegram API
```javascript
// Пользователь заблокировал бота
if (error.code === 403) {
    console.log(`⚠️ Пользователь ${userId} заблокировал бота`);
    // Удаление из активных пользователей
    delete userSessions[userId];
}

// Сообщение слишком длинное
if (error.code === 413) {
    // Разбивка на части
    const chunks = splitMessage(text, 4000);
    for (const chunk of chunks) {
        await bot.sendMessage(userId, chunk);
    }
}
```

#### OpenAI Whisper
```javascript
// Файл слишком большой
if (error.message.includes('file size')) {
    await bot.sendMessage(userId, 
        `❌ Голосовое сообщение слишком большое. Максимум: ${this.maxFileSizeMB}MB`
    );
}

// Неподдерживаемый формат
if (error.message.includes('format')) {
    await bot.sendMessage(userId, 
        "❌ Неподдерживаемый формат аудио. Отправьте голосовое сообщение."
    );
}
```

---

## 🔄 Rate Limiting и оптимизация

### Claude API оптимизация
```javascript
class RateLimiter {
    constructor(requestsPerMinute = 60) {
        this.requests = [];
        this.limit = requestsPerMinute;
    }
    
    async checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 60000);
        
        if (this.requests.length >= this.limit) {
            const waitTime = 60000 - (now - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
    }
}
```

### Оптимизация токенов
```javascript
// Сжатие истории диалога
function compressConversation(conversation, maxExchanges = 10) {
    if (conversation.length <= maxExchanges) {
        return conversation;
    }
    
    // Оставляем первое и последние сообщения
    const first = conversation.slice(0, 2);
    const last = conversation.slice(-maxExchanges + 2);
    
    return [
        ...first,
        { therapist: "[...диалог сокращен...]", patient: "" },
        ...last
    ];
}
```

---

## 📝 Примеры интеграции

### Полный цикл работы с пациентом
```javascript
async function completePatientWorkflow(userId) {
    // 1. Генерация пациента
    const patient = await patientSystem.generateRandomPatient();
    
    // 2. Начало диалога
    userSessions[userId].currentPatient = patient;
    userSessions[userId].state = 'in_dialog';
    
    // 3. Ведение сессии (множественные запросы)
    for (let i = 0; i < therapistMessages.length; i++) {
        const response = await cacheManager.createMessage({
            system: patientSystemPrompt,
            messages: buildConversationHistory(userId),
            maxTokens: 300
        });
        
        userSessions[userId].conversation.push({
            therapist: therapistMessages[i],
            patient: response.content
        });
    }
    
    // 4. Анализ сессии
    const analysis = await cacheManager.createMessage({
        system: supervisorSystemPrompt,
        messages: [{ role: 'user', content: buildAnalysisPrompt(userId) }],
        maxTokens: 1000
    });
    
    // 5. Сохранение в архив
    archiveSession(userId, patient, userSessions[userId].conversation, analysis.content);
    
    // 6. Обновление статистики
    updateUserStats(userId, patient.meta.category);
}
```

### Обработка голосового сообщения
```javascript
async function processVoiceWorkflow(bot, msg) {
    const userId = msg.from.id;
    
    // 1. Обработка голоса
    const transcription = await voiceHandler.processVoiceMessage(bot, msg);
    
    // 2. Показ результата пользователю
    await bot.sendMessage(userId, 
        `🎤 *Распознанный текст:*\n\n"${transcription}"`,
        { parse_mode: 'Markdown' }
    );
    
    // 3. Продолжение как текстовое сообщение
    await continueDialog(userId, transcription);
}
```

---

**📅 Версия документации**: 1.0  
**📝 Последнее обновление**: 10 июня 2025  
**🔧 Совместимость**: Claude API v2024, Telegram Bot API 7.0+, OpenAI API v1