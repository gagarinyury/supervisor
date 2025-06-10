# 🚀 Руководство разработчика - ПсихоТренер Бот

## 📋 Обзор проекта

**ПсихоТренер** - это специализированный Telegram-бот для обучения психотерапевтов через взаимодействие с виртуальными AI-пациентами, созданными с помощью Claude API.

### 🎯 Ключевые возможности
- 🤖 AI-генерация реалистичных пациентов (15 категорий расстройств)
- 💬 Интерактивные терапевтические сессии
- 📊 Профессиональный анализ и обратная связь
- 🎤 Поддержка голосовых сообщений
- 📈 Отслеживание прогресса обучения

---

## 🏗️ Архитектура

### Основные компоненты

```
/root/supervisor/
├── telegram-bot.js      # Основной бот-оркестратор (2554 строки)
├── patient-system.js    # Система генерации пациентов 
├── cache-manager.js     # Кеширование для экономии токенов
├── voice-handler.js     # Обработка голосовых сообщений
├── contact-api.js       # Веб API для контактных форм
└── send-notification.js # Уведомления в Telegram
```

### API интеграции
- **Anthropic Claude API** - Генерация пациентов и анализ сессий
- **Telegram Bot API** - Интерфейс пользователя
- **OpenAI Whisper API** - Транскрипция голосовых сообщений
- **Express API** - Веб-эндпоинты для контактных форм

---

## ⚙️ Быстрый старт

### 1. Установка зависимостей
```bash
cd /root/supervisor
npm install
```

### 2. Конфигурация окружения
Создайте файл `.env`:
```bash
# Anthropic API (основной для AI)
ANTHROPIC_API_KEY=ваш_ключ_anthropic_api

# Telegram Bot
TELEGRAM_BOT_TOKEN=ваш_токен_telegram_бота

# OpenAI API (для голосовых сообщений)
OPENAI_API_KEY=ваш_ключ_openai_api
```

### 3. Запуск проекта
```bash
# Стандартный запуск
./unified-start.sh

# Запуск через PM2 (для продакшена)
./unified-start.sh pm2
```

---

## 🔧 Разработка

### Структура кода

#### **telegram-bot.js** - Центральный оркестратор
```javascript
// Управление состояниями пользователей
function getUserSession(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      state: 'idle',           // idle, in_dialog, waiting_analysis
      currentPatient: null,    // Данные пациента
      conversation: [],        // История диалога
      stats: { ... }          // Статистика пользователя
    };
  }
  return userSessions[userId];
}

// Основные команды
bot.onText(/\/new/, createRandomPatient);
bot.onText(/\/custom/, showCategoryMenu);
bot.onText(/\/analyze/, analyzeSession);
bot.onText(/\/end/, endDialog);
```

#### **patient-system.js** - AI генерация
```javascript
class PatientSystem {
  // 15 категорий × 52 подтипа расстройств
  constructor() {
    this.casesDB = {
      anxiety: { /* тревожные расстройства */ },
      mood: { /* расстройства настроения */ },
      trauma: { /* травматические */ },
      // ... всего 15 категорий
    };
  }

  async generateRandomPatient() {
    // Случайный выбор параметров + Claude API
    const patient = await this.cacheManager.createMessage({
      system: "Ты эксперт в клинической психологии...",
      messages: [{ role: "user", content: casePrompt }],
      maxTokens: 1000
    });
    return patient;
  }
}
```

#### **cache-manager.js** - Оптимизация токенов
```javascript
class CacheManager {
  async createMessage(options) {
    // Автоматическое кеширование длинных промптов
    if (system && system.length > 1000) {
      systemPrompt = [{
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" } // Экономия до 90%
      }];
    }
    
    return await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages
    });
  }
}
```

### Структура данных

#### Пациент (JSON формат)
```json
{
  "name": "Анна Сергеевна Волкова",
  "age": 34,
  "gender": "женский",
  "profession": "Учитель начальных классов",
  "problem": "Панические атаки в школе",
  "symptoms": ["учащенное сердцебиение", "головокружение"],
  "motivation": "Хочу вернуться к нормальной работе",
  "openness": "Готова к изменениям, но настороженна",
  "history": "Проблема началась после конфликта с администрацией",
  "triggers": ["звонок на урок", "большие скопления детей"],
  "coping": ["дыхательные упражнения", "избегание школьных мероприятий"],
  "defenses": ["рационализация", "избегание"],
  "speech": "Говорит тихо, часто делает паузы",
  "resistance": "Может уходить от болезненных тем",
  "background": "Росла в строгой семье учителей",
  "meta": {
    "category": "anxiety",
    "diagnosis": "Паническое расстройство",
    "complexity": 3,
    "openness": "neutral",
    "created": "2024-06-10T07:25:43.326Z"
  }
}
```

#### Сессия (JSON формат)
```json
{
  "patient": { /* данные пациента */ },
  "conversation": [
    {
      "therapist": "Расскажите, что привело вас к психологу?",
      "patient": "Здравствуйте... (немного нервничает) Меня зовут Анна, 34 года, я учитель начальных классов. У меня начались панические атаки прямо в школе..."
    }
  ],
  "analysis": "Клиент демонстрирует готовность к работе, несмотря на тревожность...",
  "timestamp": "2024-06-10T07:25:43-326Z",
  "therapistId": "541619366"
}
```

---

## 🚦 Команды бота

| Команда | Описание | Состояние |
|---------|----------|-----------|
| `/start` | Начать работу с ботом | Любое |
| `/new` | Создать случайного пациента | idle |
| `/custom` | Выбрать тип пациента | idle |
| `/patients` | Загрузить сохраненного пациента | idle |
| `/history` | Просмотр истории сессий | Любое |
| `/analyze` | Анализ текущей сессии | in_dialog |
| `/info` | Информация о пациенте | in_dialog |
| `/end` | Завершить сессию | in_dialog |
| `/stats` | Статистика пользователя | Любое |
| `/feedback` | Оставить отзыв | Любое |

---

## 📊 Состояния пользователя

```javascript
// Возможные состояния
const STATES = {
  IDLE: 'idle',                    // Ожидание команд
  IN_DIALOG: 'in_dialog',          // Ведет сессию с пациентом  
  WAITING_ANALYSIS: 'waiting_analysis', // Ожидает анализ
  FEEDBACK_RATING: 'waiting_for_rating', // Ввод рейтинга
  FEEDBACK_COMMENT: 'waiting_for_comment' // Ввод комментария
};

// Переходы состояний
idle → in_dialog (команды /new, /custom, загрузка пациента)
in_dialog → waiting_analysis (команда /analyze)
in_dialog → idle (команда /end)
любое → feedback_* (команда /feedback)
```

---

## 🧪 Тестирование

### Запуск тестов
```bash
# Тестирование кеширования
node test-caching.js

# Тестирование голосовых сообщений
node test-voice.js

# Тестирование сохранения пациентов
node test-patient-save.js
```

### Примеры тестовых сценариев
```javascript
// Тест генерации пациента
async function testPatientGeneration() {
  const patient = await patientSystem.generateRandomPatient();
  console.log('✅ Пациент создан:', patient.name);
}

// Тест кеширования
async function testCaching() {
  const stats = cacheManager.getStats();
  console.log('📊 Статистика кеширования:', stats);
}
```

---

## 🔄 Рабочие процессы

### 1. Создание нового пациента
```
Пользователь → /new → PatientSystem.generateRandomPatient() 
             → Claude API → Сохранение в patients/ 
             → Обновление состояния → Начало диалога
```

### 2. Ведение сессии
```
Сообщение пользователя → CacheManager.createMessage() 
                      → Claude API (с кешированием)
                      → Ответ пациента → Сохранение диалога
```

### 3. Анализ сессии
```
/analyze → Claude API (системный промпт супервизора)
        → Профессиональная обратная связь
        → Сохранение в sessions/
```

### 4. Голосовые сообщения
```
Голосовое сообщение → VoiceHandler.processVoiceMessage()
                   → Скачивание OGG → FFmpeg конвертация 
                   → OpenAI Whisper → Транскрипция 
                   → Обработка как текст
```

---

## 📁 Файловая система

```
/root/supervisor/
├── patients/           # Сохраненные пациенты
│   └── {userId}/      # Папки пользователей
│       └── {имя}_{timestamp}.json
├── sessions/          # Архив сессий  
│   └── {userId}/
│       └── {patientId}/
│           └── session_{timestamp}.json
├── feedback/          # Обратная связь
│   └── {userId}_{timestamp}.json
├── temp_audio/        # Временные аудио (автоочистка)
│   ├── voice_*.ogg    # Оригинальные от Telegram
│   └── voice_*.mp3    # Конвертированные для Whisper
└── telegram_users.json # Состояния пользователей (408KB+)
```

---

## 🎛️ Конфигурация

### Основные параметры
```javascript
// Лимиты токенов
const TOKEN_LIMITS = {
  PATIENT_GENERATION: 1000,  // Создание пациента
  DIALOG: 300,               // Ответы пациента  
  ANALYSIS: 1000             // Анализ сессии
};

// Настройки голоса
const VOICE_CONFIG = {
  MAX_FILE_SIZE: 25,         // MB (лимит Whisper API)
  TEMP_DIR: './temp_audio/', // Папка для временных файлов
  CLEANUP_AGE: 24            // Часы до автоочистки
};

// Модель Claude
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
```

### Переменные окружения
```bash
# Обязательные
ANTHROPIC_API_KEY=sk-ant-api03-...
TELEGRAM_BOT_TOKEN=7234567890:AAE...

# Опциональные
OPENAI_API_KEY=sk-proj-...  # Только для голосовых сообщений
PORT=3001                   # Для contact-api.js
```

---

## 🚨 Мониторинг и логирование

### Ключевые метрики
```javascript
// Статистика кеширования
{
  totalRequests: 1250,
  cacheHits: 892,           // 71% попаданий
  cacheMisses: 358,
  tokensWrittenToCache: 45000,
  tokensReadFromCache: 125000,
  costSavings: 0.847        // 84.7% экономии
}

// Статистика пользователя  
{
  totalSessions: 23,
  totalExchanges: 186,
  sessionsByCategory: {
    "anxiety": 8,
    "mood": 5,
    "trauma": 3
  },
  savedPatients: 12
}
```

### Логирование
```javascript
// Основные события логируются в консоль
console.log('✅ [PatientSystem] Пациент создан:', patient.name);
console.log('🎤 [VoiceHandler] Обработано голосовое сообщение');
console.log('💾 [CacheManager] Cache hit - экономия токенов');
console.error('❌ [TelegramBot] Ошибка обработки:', error);
```

---

## 🔧 Деплой и продакшен

### PM2 конфигурация
```bash
# Запуск через PM2
./unified-start.sh pm2

# Управление
pm2 logs psycho-supervisor-bot   # Просмотр логов
pm2 restart psycho-supervisor-bot # Перезапуск
pm2 stop psycho-supervisor-bot    # Остановка
```

### Мониторинг файлов
```bash
# Размер основных файлов
ls -lah telegram_users.json     # ~408KB (критично при 1MB+)
du -sh patients/                # Растет с количеством пользователей  
du -sh sessions/                # Архив всех сессий
du -sh temp_audio/              # Должен автоочищаться
```

### Backup стратегия
```bash
# Еженедельный бэкап
tar -czf backup_$(date +%Y%m%d).tar.gz \
    patients/ sessions/ telegram_users.json

# Автоочистка старых аудио (cron)
0 2 * * * find /root/supervisor/temp_audio -mtime +1 -delete
```

---

## 🐛 Отладка

### Частые проблемы

**1. Бот не отвечает**
```bash
# Проверка логов
pm2 logs psycho-supervisor-bot
# Проверка токена Telegram
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

**2. Ошибки Claude API**
```bash
# Проверка ключа Anthropic
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages
```

**3. Проблемы с голосом**
```bash
# Проверка FFmpeg
ffmpeg -version
# Проверка OpenAI ключа  
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**4. Переполнение памяти**
```bash
# Архивирование больших файлов
gzip telegram_users.json
# Очистка старых сессий
find sessions/ -mtime +90 -name "*.json" -compress
```

### Режим отладки
```javascript
// Включение подробного логирования
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) {
  console.log('🔍 [DEBUG] Данные пациента:', JSON.stringify(patient, null, 2));
  console.log('🔍 [DEBUG] Состояние пользователя:', userSession);
}
```

---

## 📈 Расширение функциональности

### Добавление новой категории пациентов
```javascript
// В patient-system.js
this.casesDB.newCategory = {
  name: "Новая категория",
  description: "Описание категории",
  cases: {
    subtype1: {
      name: "Подтип 1", 
      description: "Описание подтипа",
      complexity: 3
    }
  }
};
```

### Добавление новой команды
```javascript
// В telegram-bot.js
bot.onText(/\/newcommand/, async (msg) => {
  const userId = msg.from.id;
  const userSession = getUserSession(userId);
  
  // Логика команды
  await bot.sendMessage(userId, "Ответ команды");
});
```

### Интеграция нового API
```javascript
// Создание нового модуля
class NewApiHandler {
  constructor() {
    this.apiKey = process.env.NEW_API_KEY;
  }
  
  async makeRequest(data) {
    // Логика запроса
  }
}
```

---

## 📞 Поддержка

### Контакты
- **Автор**: Команда разработки ПсихоТренер
- **Документация**: `/root/supervisor/README.md`
- **Техническая документация**: `/root/supervisor/CLAUDE.md`

### Полезные команды
```bash
# Статус системы
pm2 status
systemctl status telegram-bot

# Логи в реальном времени
tail -f /var/log/telegram-bot.log
pm2 logs --lines 50

# Анализ использования
du -sh patients/ sessions/ temp_audio/
df -h /root/supervisor/
```

---

## 🔄 Оптимизация

### Рекомендуемые улучшения
1. **База данных**: Миграция с JSON на SQLite/PostgreSQL
2. **Кеширование**: Redis для состояний пользователей  
3. **Файлы**: S3/MinIO для аудиофайлов и архивов
4. **Мониторинг**: Prometheus + Grafana
5. **Тестирование**: Jest для автоматизированных тестов

### Текущие ограничения
- Файловое хранение (проблемы масштабирования)
- Отсутствие горизонтального масштабирования
- Ручная очистка временных файлов
- Один instance бота

---

**📝 Версия документации**: 1.0  
**📅 Последнее обновление**: 10 июня 2025  
**🔧 Совместимость**: Node.js 18+, Linux/macOS