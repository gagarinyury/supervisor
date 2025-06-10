# СТРУКТУРА ДАННЫХ ПРОЕКТА SUPERVISOR

## ОБЗОР ПРОЕКТА

Проект Supervisor представляет собой Telegram-бота для тренинга психологов с использованием ИИ-пациентов. Система включает генерацию виртуальных пациентов, проведение сессий и анализ результатов.

## 1. СТРУКТУРА ПАПОК И ФАЙЛОВ

### 1.1 Основные директории

```
/root/supervisor/
├── patients/           # Данные сгенерированных пациентов
├── sessions/           # Записи психотерапевтических сессий  
├── feedback/           # Обратная связь пользователей
├── temp_audio/         # Временные аудиофайлы
├── node_modules/       # Зависимости Node.js
└── [основные файлы]
```

### 1.2 Основные файлы

- `telegram-bot.js` - Главный бот для Telegram
- `patient-system.js` - Система генерации ИИ-пациентов
- `cache-manager.js` - Управление кешированием Claude API
- `voice-handler.js` - Обработка голосовых сообщений
- `telegram_users.json` - Данные пользователей бота
- `package.json` - Конфигурация Node.js проекта

## 2. ФОРМАТЫ ДАННЫХ

### 2.1 Структура данных пациента (patients/)

**Имя файла:** `{имя_пациента}_{timestamp}.json`

**Пример:** `игорь_викторович_смирнов_1748096058793.json`

**Структура JSON:**
```json
{
  "name": "Игорь Викторович Смирнов",
  "age": 37,
  "gender": "мужской",
  "profession": "Менеджер по продажам",
  "problem": "Основная проблема как видит её пациент",
  "symptoms": [
    "Симптом 1",
    "Симптом 2", 
    "Симптом 3"
  ],
  "motivation": "Мотивация к терапии",
  "openness": "Открытый/Нейтральный/Закрытый",
  "history": "История возникновения проблемы",
  "triggers": [
    "Триггер 1",
    "Триггер 2"
  ],
  "coping": [
    "Способ совладания 1",
    "Способ совладания 2"
  ],
  "defenses": [
    "Психологическая защита 1",
    "Психологическая защита 2"
  ],
  "speech": "Особенности речи и выражения эмоций",
  "resistance": "Как проявляет сопротивление в терапии",
  "background": "Семейная/социальная история",
  "meta": {
    "category": "Категория расстройства",
    "diagnosis": "Конкретный диагноз",
    "complexity": 1-5,
    "openness": "Тип открытости",
    "created": "ISO timestamp",
    "token_usage": {
      "input": 685,
      "output": 475,
      "total": 1160
    }
  },
  "saved_at": "ISO timestamp",
  "patient_id": "уникальный_идентификатор",
  "saved_by_user": 393924341
}
```

### 2.2 Структура сессии (sessions/)

**Путь:** `sessions/{user_id}/{patient_id}/session_{timestamp}.json`

**Пример:** `sessions/434085347/виктор_сергеевич_новиков_1747826219854/session_2025-05-21T11-16-59-854Z.json`

**Структура JSON:**
```json
{
  "patient": {
    // Полная структура данных пациента (см. выше)
  },
  "conversation": [
    {
      "therapist": "Сообщение психолога",
      "patient": "Ответ пациента"
    }
  ],
  "analysis": "Детальный анализ сессии от ИИ-супервизора",
  "timestamp": "ISO timestamp",
  "therapistId": 434085347
}
```

### 2.3 Структура обратной связи (feedback/)

**Имя файла:** `{user_id}_{timestamp}.json`

**Пример:** `434085347_2025-05-21T04-54-28-981Z.json`

**Структура JSON:**
```json
{
  "userId": 434085347,
  "userName": "Имя пользователя",
  "rating": 1-5,
  "comment": "Текст отзыва",
  "timestamp": "ISO timestamp"
}
```

### 2.4 Данные пользователей (telegram_users.json)

**Структура JSON:**
```json
{
  "43210578": {
    "state": "in_dialog/waiting/idle",
    "currentPatient": {
      // Полная структура пациента
    },
    "conversation": [
      {
        "therapist": "Вопрос",
        "patient": "Ответ"
      }
    ],
    "lastMessage": {
      "message_id": 432,
      "text": "Текст сообщения",
      "timestamp": "ISO timestamp"
    }
  }
}
```

## 3. МОДЕЛИ ДАННЫХ

### 3.1 Модель User (Пользователь)
```javascript
{
  userId: Number,           // ID пользователя Telegram
  state: String,           // Состояние: 'idle', 'in_dialog', 'waiting'
  currentPatient: Patient, // Текущий активный пациент
  conversation: Array,     // История диалога
  lastMessage: Object      // Последнее сообщение
}
```

### 3.2 Модель Patient (Пациент)
```javascript
{
  name: String,           // ФИО пациента
  age: Number,           // Возраст (25-55)
  gender: String,        // 'мужской' или 'женский'
  profession: String,    // Профессия
  problem: String,       // Основная проблема
  symptoms: Array,       // Массив симптомов
  motivation: String,    // Мотивация к терапии
  openness: String,      // Тип открытости
  history: String,       // История проблемы
  triggers: Array,       // Триггеры
  coping: Array,         // Способы совладания
  defenses: Array,       // Психологические защиты
  speech: String,        // Особенности речи
  resistance: String,    // Проявления сопротивления
  background: String,    // Семейная история
  meta: {
    category: String,    // Категория расстройства
    diagnosis: String,   // Диагноз
    complexity: Number,  // Сложность 1-5
    openness: String,    // Тип открытости
    created: String,     // Timestamp создания
    token_usage: Object  // Использование токенов
  }
}
```

### 3.3 Модель Session (Сессия)
```javascript
{
  patient: Patient,      // Данные пациента
  conversation: Array,   // Диалог терапевт-пациент
  analysis: String,      // Анализ сессии
  timestamp: String,     // Время создания
  therapistId: Number    // ID терапевта
}
```

### 3.4 Модель Feedback (Обратная связь)
```javascript
{
  userId: Number,        // ID пользователя
  userName: String,      // Имя пользователя
  rating: Number,        // Оценка 1-5
  comment: String,       // Комментарий
  timestamp: String      // Время отправки
}
```

## 4. ПОТОКИ ДАННЫХ

### 4.1 Генерация пациента

1. **Запрос пользователя** → `/new` или `/custom`
2. **Вызов PatientSystem.generateCase()** с параметрами:
   - category (категория расстройства)
   - openness (тип открытости)  
   - complexity (сложность 1-5)
3. **Обращение к Claude API** для генерации деталей
4. **Создание JSON структуры** пациента
5. **Сохранение в patients/{user_id}/** 
6. **Обновление telegram_users.json**

### 4.2 Проведение сессии

1. **Создание диалога** с ИИ-пациентом
2. **Каждое сообщение:**
   - Сохранение в conversation массив
   - Передача контекста в Claude API
   - Генерация ответа пациента
   - Обновление telegram_users.json
3. **Завершение сессии:**
   - Генерация анализа
   - Сохранение в sessions/{user_id}/{patient_id}/
   - Очистка состояния пользователя

### 4.3 Сбор обратной связи

1. **Команда /feedback**
2. **Сбор рейтинга** (1-5)
3. **Сбор комментария**
4. **Сохранение в feedback/{user_id}_{timestamp}.json**

## 5. КАТЕГОРИИ РАССТРОЙСТВ

Система поддерживает 15 категорий психологических расстройств:

1. **anxiety** - Тревожные расстройства
2. **mood** - Расстройства настроения
3. **stress** - Стресс и адаптация
4. **relationships** - Отношения и семья
5. **trauma** - Травма
6. **addictions** - Зависимости
7. **eating** - Расстройства пищевого поведения
8. **psychotic** - Психотические расстройства
9. **affective** - Тяжелые аффективные расстройства
10. **crisis** - Кризисные состояния
11. **personality** - Расстройства личности
12. **youth** - Детско-подростковые проблемы
13. **elderly** - Проблемы пожилых людей
14. **identity** - Проблемы идентичности
15. **neurodiverse** - Нейроразнообразие

## 6. ТЕХНИЧЕСКИЕ ОСОБЕННОСТИ

### 6.1 Кеширование (CacheManager)
- Использует Claude API prompt caching
- Экономия до 90% стоимости запросов
- Кеширование системных промптов пациентов

### 6.2 Обработка голоса (VoiceHandler)
- Конвертация .ogg в .mp3
- Распознавание речи через Claude API
- Сохранение в temp_audio/

### 6.3 Иерархия файлов
```
patients/
├── {user_id}/
│   └── {пациент}_{timestamp}.json

sessions/
├── {user_id}/
│   └── {пациент}_{timestamp}/
│       └── session_{timestamp}.json

feedback/
└── {user_id}_{timestamp}.json
```

## 7. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### 7.1 Создание нового пациента
```javascript
const patientData = await patientSystem.generateCase({
  category: "anxiety",
  openness: "neutral", 
  complexity: 3
});
```

### 7.2 Начало диалога
```javascript
const response = await patientSystem.startPatientDialog(
  patientData, 
  "Здравствуйте! Что привело вас ко мне?"
);
```

### 7.3 Продолжение диалога
```javascript
const response = await patientSystem.continuePatientDialog(
  patientData,
  conversation,
  "Расскажите подробнее..."
);
```

Эта структура обеспечивает полную функциональность системы тренинга психологов с использованием ИИ-пациентов.