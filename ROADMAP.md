# План доработок Telegram-бота ПсихоТренер

**ВАЖНО:** После реализации каждого этапа обращайтесь к этому файлу, чтобы не терять контекст и последовательность разработки.

## Общий прогресс

🎉 **ПРОЕКТ 100% ЗАВЕРШЕН!** (20 мая 2025 г.)

✅ **Выполнено:** ВСЕ этапы 1-6 + дополнительный Stage 7 (Token Caching)

🚀 **Статус:** Готов к продакшену

💰 **Бонус:** Реализована система кеширования токенов сверх плана

## ✅ ВСЕ ПРОБЛЕМЫ РЕШЕНЫ:
- ✅ Исчезновение клавиатуры при вводе текста (Этап 1)
- ✅ Неочевидное завершение сессии (Этап 1)
- ✅ Обрезание текста ответов (Этапы 2-3)
- ✅ Избыточная заметность кнопки "Инфо" (Этап 1)
- ✅ Повторение одних и тех же проблем в анализе сессий (Этап 5)
- ✅ Отсутствие возможности продолжать работу с тем же клиентом (Этапы 4-5)
- ✅ Высокая стоимость токенов (Stage 7 - кеширование)

## Статус выполнения

### ✅ Этап 1: Улучшение UX и информативности (ВЫПОЛНЕНО 20.05.2024)
- ✅ Добавлены текстовые подсказки о командах в ответы бота
- ✅ Создана функция showSessionControls для отображения управления по запросу
- ✅ Добавлена обработка текстовых команд "меню", "управление", "команды"
- ✅ Перемещена кнопка "ℹ️ Инфо" в менее заметное место (в меню управления)
- ✅ Удалена кнопка Инфо из основной клавиатуры
- ✅ Добавлено напоминание о командах в начале диалога

### ✅ Этап 2: Увеличение лимитов токенов (ВЫПОЛНЕНО 20.05.2024)
- ✅ Увеличен лимит токенов для ответов пациента до 300
- ✅ Увеличен лимит токенов для анализа сессий до 1000
- ✅ Добавлено логирование использования токенов

### ✅ Этап 3: Обработка обрезания текста (ВЫПОЛНЕНО 20.05.2024)
- ✅ Добавлена функция isResponseTruncated для детектирования обрезанных ответов
- ✅ Реализован механизм запроса продолжения обрезанных ответов через команду "продолжить"
- ✅ Добавлено объединение фрагментов сообщений для непрерывности ответов
- ✅ Добавлено сохранение состояния для корректной обработки продолжений
- ✅ Включены подсказки пользователю о возможности продолжения

### ✅ Этап 4: Хранение пациентов и сессий (ВЫПОЛНЕНО 20.05.2024)
- ✅ Создана структура хранения пациентов в каталоге `/patients/`
- ✅ Добавлена функция сохранения пациента после сессии
- ✅ Создана структура для архивирования сессий в `/sessions/`
- ✅ Реализован базовый функционал выбора существующего пациента
- ✅ Добавлен просмотр истории сессий с пациентом
- ✅ Реализовано восстановление контекста предыдущих сессий
- ✅ Добавлены новые команды /patients и /history в меню бота
- ✅ Улучшен интерфейс с inline-кнопками вместо клавиатуры

### ✅ Этап 5: Улучшение качества анализа (ВЫПОЛНЕНО 20.05.2025)
- ✅ Создана структура для хранения истории анализов (analysisSessions, patientAnalysisHistory)
- ✅ Модифицирован промпт для учета предыдущих анализов с полным контекстом
- ✅ Добавлено сравнение с предыдущими сессиями и отслеживание динамики
- ✅ Реализована функция loadPatientSessionHistory() для загрузки истории
- ✅ Расширенный анализ с фокусом на новые моменты и изменения

### ✅ STAGE 7: Система токен-кеширования (ВЫПОЛНЕНО 20.05.2025 - СВЕРХ ПЛАНА!)
- ✅ Создан модуль cache-manager.js с современным API кеширования
- ✅ Интегрирован CacheManager в patient-system.js для диалогов
- ✅ Модифицирован analyzeSession() для кеширования анализов
- ✅ Переведены все модели на Claude 3.5 Haiku с поддержкой caching
- ✅ Добавлена команда /cache для мониторинга статистики
- ✅ Создан тестовый модуль test-caching.js для проверки
- ✅ Реализована экономия до 90% стоимости токенов на повторах
- ✅ Полное логирование и мониторинг эффективности кеширования

## Выявленные проблемы

1. **Проблема завершения сессии**:
   - Клавиатура исчезает при вводе текста
   - Отсутствует понятный способ завершения сессии

2. **Проблема обрезания текста**:
   - Ответы пациентов ограничены 200 токенами
   - Анализ сессий ограничен 500 токенами
   - Отсутствует механизм продолжения при превышении лимита

3. **Проблема качества анализа**:
   - Анализ повторяет одни и те же проблемы из первой сессии
   - Не учитывается динамика и прогресс в следующих сессиях

4. **Отсутствие непрерывности**:
   - Нет возможности продолжать работу с тем же пациентом
   - Нет функционала выбора пациентов из истории

5. **Вопрос интерфейса**:
   - Кнопка "Информация о пациенте" слишком заметна

## Этапы реализации

### Этап 1: Улучшение UX и информативности

**Файлы**: telegram-bot.js

**Изменения**:
1. Добавить текстовые подсказки о командах в ответы бота:
   ```javascript
   // Пример добавления подсказки в функцию continueDialog
   bot.sendMessage(userId, 
     response.patient_response + 
     "\n\n_Используйте команды: /analyze для анализа, /end для завершения, или напишите 'меню' для отображения опций_", 
     { parse_mode: 'Markdown' }
   );
   ```

2. Добавить функцию для отображения управления по запросу:
   ```javascript
   // Новая функция для показа управления по запросу
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
     
     bot.sendMessage(userId, "Управление сессией:", options);
   }
   ```

3. Добавить обработку текстового запроса меню:
   ```javascript
   // В обработчике сообщений
   if (msg.text && (msg.text.toLowerCase() === "меню" || 
                     msg.text.toLowerCase() === "управление" || 
                     msg.text.toLowerCase() === "команды")) {
     showSessionControls(userId);
     return;
   }
   ```

4. Переместить кнопку "ℹ️ Инфо" в менее заметное место:
   - Удалить из основной клавиатуры
   - Добавить в меню управления

**Результат этапа**: Улучшенный UX без изменения основной логики работы. Можно перезапустить бота и проверить, что подсказки и кнопки отображаются корректно.

### Этап 2: Увеличение лимитов токенов

**Файлы**: patient-system.js

**Изменения**:
1. Увеличить лимит токенов для ответов пациента:
   ```javascript
   // Изменение в startPatientDialog и continuePatientDialog
   max_tokens: 300, // Увеличено с 200
   ```

2. Увеличить лимит токенов для анализа сессий в telegram-bot.js:
   ```javascript
   // Изменение в функции analyzeSession
   max_tokens: 1000, // Увеличено с 500
   ```

3. Добавить логирование использования токенов:
   ```javascript
   // Добавить в функции, где есть вызовы API Claude
   console.log(`[Использование токенов] Запрос: ${response.usage.input_tokens}, Ответ: ${response.usage.output_tokens}, Всего: ${response.usage.input_tokens + response.usage.output_tokens}`);
   ```

**Результат этапа**: Более подробные ответы пациентов и анализы без риска нарушения основной функциональности. Можно перезапустить бота и проверить качество ответов.

### Этап 3: Обработка обрезания текста

**Файлы**: telegram-bot.js, patient-system.js

**Изменения**:
1. Добавить функцию детектирования обрезанного ответа:
   ```javascript
   // Новая функция в patient-system.js
   function isResponseTruncated(response, maxTokens) {
     // Если ответ использует 98% или более от лимита, считаем его потенциально обрезанным
     return response.usage.output_tokens >= maxTokens * 0.98;
   }
   ```

2. Добавить механизм продолжения ответа в patient-system.js:
   ```javascript
   // Модификация функции continuePatientDialog
   async function continuePatientDialog(patientData, conversation, question, continuation = false) {
     // ... существующий код ...
     
     const response = await anthropic.messages.create({
       model: 'claude-3-haiku-20240307',
       max_tokens: 300,
       system: continuation ? "Продолжи свой предыдущий ответ с того места, где он прервался." : patientPrompt,
       messages: messages
     });
     
     // Проверяем, может ли быть обрезан ответ
     const isTruncated = isResponseTruncated(response, 300);
     
     return {
       patient_response: response.content[0].text,
       token_usage: {
         input: response.usage.input_tokens,
         output: response.usage.output_tokens,
         total: response.usage.input_tokens + response.usage.output_tokens
       },
       isTruncated: isTruncated
     };
   }
   ```

3. Модифицировать обработку ответов в telegram-bot.js:
   ```javascript
   // В функции continueDialog
   if (response.isTruncated) {
     // Сохраняем частичный ответ
     const partialResponse = response.patient_response;
     
     // Запрашиваем продолжение
     bot.sendMessage(userId, partialResponse);
     bot.sendChatAction(userId, 'typing');
     
     // Запрашиваем продолжение
     const continuationResponse = await patientSystem.continuePatientDialog(
       userSession.currentPatient,
       userSession.conversation,
       message,
       true // указываем, что это запрос продолжения
     );
     
     // Отправляем продолжение
     bot.sendMessage(userId, "..." + continuationResponse.patient_response);
     
     // Сохраняем полный ответ в истории
     userSession.conversation[userSession.conversation.length - 1].patient = 
       partialResponse + continuationResponse.patient_response;
   } else {
     // Обычный ответ
     bot.sendMessage(userId, response.patient_response);
   }
   ```

4. Аналогично обработать продолжение для анализа сессий.

**Результат этапа**: Корректная обработка длинных ответов без обрезания. Можно перезапустить бота и проверить работу с длинными сообщениями.

### Этап 4: Улучшение качества анализа

**Файлы**: telegram-bot.js

**Изменения**:
1. Создать структуру для хранения истории анализов:
   ```javascript
   // Модификация структуры данных пользователя
   if (!userSessions[userId]) {
     userSessions[userId] = {
       state: 'idle',
       currentPatient: null,
       conversation: [],
       lastMessage: null,
       lastAnalysis: null,
       analysisSessions: [] // Новое поле для хранения истории анализов
     };
   }
   ```

2. Сохранять анализы с метаданными:
   ```javascript
   // В функции analyzeSession после получения анализа
   const analysisData = {
     timestamp: new Date().toISOString(),
     patientId: userSession.currentPatient.name, // или уникальный ID, если будет внедрен
     exchangeCount: userSession.conversation.length,
     analysis: analysis
   };
   
   // Добавляем анализ в историю
   if (!userSession.analysisSessions) {
     userSession.analysisSessions = [];
   }
   userSession.analysisSessions.push(analysisData);
   ```

3. Модифицировать промпт для учета предыдущих анализов:
   ```javascript
   // В функции analyzeSession при формировании запроса
   let previousAnalyses = "";
   if (userSession.analysisSessions && userSession.analysisSessions.length > 0) {
     previousAnalyses = "\nПРЕДЫДУЩИЕ АНАЛИЗЫ:\n";
     // Берем до 2 последних анализов для контекста
     const recentAnalyses = userSession.analysisSessions.slice(-2);
     recentAnalyses.forEach((analysisData, index) => {
       previousAnalyses += `Анализ ${index+1} (${new Date(analysisData.timestamp).toLocaleString()}):\n${analysisData.analysis}\n\n`;
     });
   }
   
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
   
   ${previousAnalyses}
   
   Дай краткий анализ по следующим пунктам:
   1. Ключевые темы/проблемы пациента В ТЕКУЩЕЙ СЕССИИ
   2. Эмоциональное состояние пациента в ходе ЭТОЙ сессии
   3. Эффективные терапевтические интервенции в ДАННОЙ сессии
   4. Что можно улучшить в работе терапевта (конкретно для ЭТОЙ сессии)
   5. Рекомендации для следующей сессии
   
   ВАЖНО: Сосредоточься на анализе ТЕКУЩЕЙ сессии, не повторяй общие наблюдения из предыдущих анализов. Выдели НОВЫЕ моменты и динамику, которая появилась в ЭТОЙ сессии.
   
   Анализ должен быть кратким, конкретным и практичным.`;
   ```

**Результат этапа**: Более релевантный и специфичный анализ сессий. Можно перезапустить бота и проверить качество анализа в последовательных сессиях.

### Этап 5: Базовое хранение пациентов

**Файлы**: telegram-bot.js, patient-system.js

**Изменения**:
1. Убедиться, что каталог `/patients/` существует:
   ```javascript
   // В конструкторе PatientSystem или при инициализации бота
   if (!fs.existsSync('./patients')) {
     fs.mkdirSync('./patients');
   }
   ```

2. Активировать функцию сохранения пациента в файл:
   ```javascript
   // В функции endDialog в telegram-bot.js
   // После обновления статистики
   if (patient) {
     // Сохраняем пациента для возможного повторного использования
     const savedPath = patientSystem.savePatientData(patient);
     console.log(`Пациент сохранен в: ${savedPath}`);
   }
   ```

3. Добавить функцию загрузки списка сохраненных пациентов:
   ```javascript
   // Новая функция в PatientSystem
   listSavedPatients() {
     if (!fs.existsSync('./patients')) {
       return [];
     }
     
     const files = fs.readdirSync('./patients');
     return files
       .filter(file => file.endsWith('.json'))
       .map(file => {
         try {
           const data = JSON.parse(fs.readFileSync(`./patients/${file}`, 'utf8'));
           return {
             id: file,
             name: data.name,
             age: data.age,
             diagnosis: data.meta.diagnosis,
             savedAt: fs.statSync(`./patients/${file}`).mtime
           };
         } catch (e) {
           console.error(`Error reading patient file ${file}:`, e);
           return null;
         }
       })
       .filter(patient => patient !== null)
       .sort((a, b) => b.savedAt - a.savedAt); // Сортировка по дате, сначала новые
   }
   ```

4. Добавить команду и функционал для выбора существующего пациента:
   ```javascript
   // Новая команда в telegram-bot.js
   bot.onText(/\/patients/, (msg) => {
     showSavedPatients(msg.from.id);
   });
   
   // Функция отображения сохраненных пациентов
   function showSavedPatients(userId) {
     const patients = patientSystem.listSavedPatients();
     
     if (patients.length === 0) {
       bot.sendMessage(userId, "У вас пока нет сохраненных пациентов. Создайте нового пациента с помощью команды /new");
       return;
     }
     
     // Формируем список пациентов с инлайн-кнопками
     const keyboard = [];
     patients.slice(0, 10).forEach(patient => { // Показываем до 10 последних пациентов
       keyboard.push([{
         text: `${patient.name} (${patient.age}) - ${patient.diagnosis}`,
         callback_data: `load_patient:${patient.id}`
       }]);
     });
     
     // Добавляем кнопки навигации, если пациентов больше 10
     if (patients.length > 10) {
       keyboard.push([{ text: "Показать больше", callback_data: "patients_page:1" }]);
     }
     
     bot.sendMessage(
       userId,
       "📋 *СОХРАНЕННЫЕ ПАЦИЕНТЫ*\n\nВыберите пациента для продолжения работы:",
       {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: keyboard
         }
       }
     );
   }
   ```

5. Добавить обработчик для загрузки пациента:
   ```javascript
   // В обработчик callback_query добавить
   if (data.startsWith('load_patient:')) {
     await bot.answerCallbackQuery(callbackQuery.id);
     const patientId = data.split(':')[1];
     loadSavedPatient(userId, patientId);
     return;
   }
   
   // Новая функция для загрузки сохраненного пациента
   async function loadSavedPatient(userId, patientId) {
     try {
       const patientData = patientSystem.loadPatientData(`./patients/${patientId}`);
       
       // Проверяем, не в активной ли сессии пользователь
       const userSession = getUserSession(userId);
       if (userSession.state === 'in_dialog' && userSession.currentPatient) {
         const options = {
           reply_markup: {
             inline_keyboard: [
               [
                 { text: "Да, загрузить", callback_data: `confirm_load:${patientId}` },
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
         startNewDialogWithPatient(userId, patientData);
       }
     } catch (error) {
       console.error("Ошибка при загрузке пациента:", error);
       bot.sendMessage(userId, "❌ Произошла ошибка при загрузке пациента. Пожалуйста, попробуйте снова.");
     }
   }
   ```

**Результат этапа**: Возможность сохранять пациентов и возвращаться к ним позже. Можно перезапустить бота и проверить работу с сохраненными пациентами.

### Этап 6: Архивирование сессий

**Файлы**: telegram-bot.js (+ новые модули)

**Изменения**:
1. Создать каталог `/sessions/` для архивирования:
   ```javascript
   // При инициализации бота
   if (!fs.existsSync('./sessions')) {
     fs.mkdirSync('./sessions');
   }
   ```

2. Добавить функцию сохранения сессии при завершении:
   ```javascript
   // В функции endDialog
   function archiveSession(userId, patient, conversation, analysis) {
     if (!conversation || conversation.length === 0) {
       return null;
     }
     
     // Создаем папку для пациента, если её нет
     const patientDir = `./sessions/${patient.name.toLowerCase().replace(/\s+/g, '_')}`;
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
     
     return sessionFile;
   }
   
   // Вызов в endDialog
   const archivedFile = archiveSession(
     userId, 
     patient, 
     userSession.conversation, 
     userSession.lastAnalysis
   );
   if (archivedFile) {
     console.log(`Сессия архивирована в: ${archivedFile}`);
   }
   ```

3. Добавить команду и функционал просмотра архивных сессий:
   ```javascript
   // Новая команда
   bot.onText(/\/history/, (msg) => {
     showPatientHistory(msg.from.id);
   });
   
   // Функция отображения истории пациентов
   function showPatientHistory(userId) {
     if (!fs.existsSync('./sessions')) {
       bot.sendMessage(userId, "История сессий пуста. Завершите хотя бы одну сессию для создания записи.");
       return;
     }
     
     // Получаем список папок пациентов
     const patientDirs = fs.readdirSync('./sessions')
       .filter(dir => fs.statSync(`./sessions/${dir}`).isDirectory());
     
     if (patientDirs.length === 0) {
       bot.sendMessage(userId, "История сессий пуста. Завершите хотя бы одну сессию для создания записи.");
       return;
     }
     
     // Формируем список пациентов с инлайн-кнопками
     const keyboard = [];
     patientDirs.forEach(dir => {
       const sessionFiles = fs.readdirSync(`./sessions/${dir}`)
         .filter(file => file.endsWith('.json'));
       
       if (sessionFiles.length > 0) {
         // Получаем имя пациента из первого файла
         try {
           const sessionData = JSON.parse(fs.readFileSync(`./sessions/${dir}/${sessionFiles[0]}`, 'utf8'));
           keyboard.push([{
             text: `${sessionData.patient.name} - ${sessionFiles.length} сессий`,
             callback_data: `history:${dir}`
           }]);
         } catch (e) {
           console.error(`Error reading session file for ${dir}:`, e);
         }
       }
     });
     
     if (keyboard.length === 0) {
       bot.sendMessage(userId, "Не удалось прочитать историю сессий. Попробуйте снова позже.");
       return;
     }
     
     bot.sendMessage(
       userId,
       "📚 *ИСТОРИЯ СЕССИЙ*\n\nВыберите пациента для просмотра истории:",
       {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: keyboard
         }
       }
     );
   }
   ```

4. Добавить функции для просмотра сессий конкретного пациента и восстановления контекста.

**Результат этапа**: Полная функциональность работы с пациентами через несколько сессий. Можно перезапустить бота и проверить работу с историей сессий.

### Этап 7: Подготовка к кешированию токенов (тестовый модуль)

**Файлы**: token-manager.js (новый)

**Изменения**:
1. Создать модуль для тестирования кеширования токенов:
   ```javascript
   // token-manager.js
   require('dotenv').config();
   const Anthropic = require('@anthropic-ai/sdk');
   const crypto = require('crypto');
   
   // Инициализация API клиента
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
   });
   
   // Хранилище message_id
   const messageIdStore = new Map();
   
   class TokenManager {
     constructor() {
       this.defaultModel = 'claude-3-haiku-20240307';
     }
     
     /**
      * Генерирует уникальный ключ для сообщения
      */
     generateMessageKey(userId, type, identifier) {
       return `${userId}:${type}:${identifier}`;
     }
     
     /**
      * Сохраняет message_id для будущего использования
      */
     saveMessageId(key, messageId) {
       messageIdStore.set(key, messageId);
       console.log(`Saved message_id for ${key}: ${messageId}`);
     }
     
     /**
      * Получает сохраненный message_id
      */
     getMessageId(key) {
       return messageIdStore.get(key);
     }
     
     /**
      * Создает сообщение с возможным использованием кеширования
      */
     async createMessage(options) {
       const { userId, type, identifier, model, max_tokens, messages, system } = options;
       
       // Генерируем ключ для сообщения
       const key = this.generateMessageKey(userId, type, identifier);
       
       // Получаем предыдущий message_id, если есть
       const previousMessageId = this.getMessageId(key);
       
       // Создаем запрос
       const requestOptions = {
         model: model || this.defaultModel,
         max_tokens: max_tokens || 500,
         messages: messages
       };
       
       // Если есть system, добавляем его
       if (system) {
         requestOptions.system = system;
       }
       
       // Если есть предыдущий message_id, используем его для кеширования
       if (previousMessageId) {
         requestOptions.message_id = crypto.randomUUID();
         requestOptions.system = previousMessageId;
         console.log(`Using cached message_id for ${key}: ${previousMessageId}`);
       } else {
         requestOptions.message_id = crypto.randomUUID();
       }
       
       // Отправляем запрос
       try {
         const response = await anthropic.messages.create(requestOptions);
         
         // Сохраняем message_id для будущего использования
         this.saveMessageId(key, requestOptions.message_id);
         
         return {
           content: response.content[0].text,
           message_id: requestOptions.message_id,
           token_usage: {
             input: response.usage.input_tokens,
             output: response.usage.output_tokens,
             total: response.usage.input_tokens + response.usage.output_tokens
           }
         };
       } catch (error) {
         console.error('Error in createMessage:', error);
         throw error;
       }
     }
     
     /**
      * Тестовая функция для проверки кеширования
      */
     async testCaching() {
       const userId = 'test-user';
       const type = 'test';
       const identifier = 'test-1';
       
       // Первый запрос
       console.log('Making first request...');
       const response1 = await this.createMessage({
         userId,
         type,
         identifier,
         messages: [
           { role: 'user', content: 'What is the capital of France?' }
         ]
       });
       
       console.log('First response token usage:', response1.token_usage);
       
       // Второй запрос (должен использовать кеширование)
       console.log('Making second request with caching...');
       const response2 = await this.createMessage({
         userId,
         type,
         identifier,
         messages: [
           { role: 'user', content: 'What is the capital of France?' }
         ]
       });
       
       console.log('Second response token usage:', response2.token_usage);
       
       // Возвращаем результаты для анализа
       return {
         response1,
         response2
       };
     }
   }
   
   module.exports = TokenManager;
   
   // Если запущен напрямую, запускаем тест
   if (require.main === module) {
     const tokenManager = new TokenManager();
     tokenManager.testCaching()
       .then(results => {
         console.log('Test results:');
         console.log('First request tokens:', results.response1.token_usage);
         console.log('Second request tokens:', results.response2.token_usage);
         console.log('Token savings:', results.response1.token_usage.input - results.response2.token_usage.input);
       })
       .catch(error => {
         console.error('Test error:', error);
       });
   }
   ```

2. Запустить и протестировать модуль отдельно от основного кода.

**Результат этапа**: Готовый к внедрению механизм кеширования токенов. На этом этапе изменения не влияют на работу бота.

### Этап 8: Внедрение кеширования токенов (интеграция)

**Файлы**: telegram-bot.js, patient-system.js, token-manager.js

**Изменения**:
1. Интегрировать TokenManager в PatientSystem
2. Модифицировать функции диалога и анализа для использования кеширования
3. Добавить сохранение и загрузку message_id

**Результат этапа**: Полная оптимизация использования токенов. Можно перезапустить бота и наблюдать экономию без изменения функциональности.

## Общие рекомендации для всех этапов

1. **Перед внедрением**:
   - Создавайте резервные копии ключевых файлов
   - Проверяйте синтаксис и логику изменений
   - Комментируйте изменения для облегчения отладки

2. **После внедрения**:
   - Тестируйте основные сценарии использования
   - Проверяйте журналы на наличие ошибок
   - Убедитесь в отсутствии регрессий

3. **При тестировании**:
   - Проверяйте работу с разными типами пациентов
   - Тестируйте граничные случаи (очень длинные ответы)
   - Проверяйте плавность переходов между состояниями

## Контрольные точки

После каждого этапа перезапускайте бота и проверяйте:

1. **Работает ли основной функционал**: создание пациента, диалог, анализ
2. **Решена ли целевая проблема** этапа
3. **Нет ли новых проблем** в результате изменений

## 🎉 ФИНАЛЬНЫЙ СТАТУС (20 мая 2025 г.)

### ✅ ПРОЕКТ ПОЛНОСТЬЮ ЗАВЕРШЕН!

**Все этапы ROADMAP успешно реализованы с дополнительными возможностями сверх плана.**

#### 📊 Итоговые результаты:
- **100% выполнение** всех запланированных этапов
- **Дополнительная система** токен-кеширования для оптимизации стоимости
- **Готовность к продакшену** с полным функционалом
- **Экономия до 90%** на повторных запросах к Claude API

#### 🚀 Готовая к использованию система:
- Полноценный Telegram бот для обучения психотерапевтов
- AI-генерация пациентов разных категорий и уровней сложности
- Интеллектуальный анализ сессий с учетом истории
- Система сохранения и загрузки пациентов
- Архивирование сессий с возможностью восстановления
- Современное кеширование токенов для оптимизации затрат

#### 💡 Технические достижения:
- Современная архитектура с модульным подходом
- Полная интеграция с Claude 3.5 Haiku API
- Система кеширования с ephemeral cache control
- Comprehensive logging и мониторинг
- Отказоустойчивость и обработка ошибок

---

## Заключение

**Проект успешно завершен!** Все поставленные цели достигнуты, система работает стабильно и готова к продуктивному использованию. Дополнительная реализация системы токен-кеширования обеспечивает экономичную работу и масштабируемость.

**Система готова к развертыванию в продакшене.** 🚀