require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

// Инициализация API клиента
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Система генерации ИИ-пациентов для обучения психологов
 */
class PatientSystem {
  constructor() {
    // База случаев по категориям
    this.casesDB = {
      anxiety: {
        name: "Тревожные расстройства",
        cases: [
          "Генерализованное тревожное расстройство",
          "Паническое расстройство",
          "Социальная тревожность",
          "Специфические фобии"
        ]
      },
      mood: {
        name: "Расстройства настроения",
        cases: [
          "Депрессия (легкая-умеренная)",
          "Дистимия (хроническая депрессия)",
          "Сезонная депрессия",
          "Послеродовая депрессия"
        ]
      },
      stress: {
        name: "Стресс и адаптация",
        cases: [
          "Острая стрессовая реакция",
          "Выгорание на работе",
          "Горевание (потеря близких)",
          "Развод/расставание"
        ]
      },
      relationships: {
        name: "Отношения и семья",
        cases: [
          "Семейные конфликты",
          "Проблемы в отношениях",
          "Созависимость",
          "Проблемы воспитания детей"
        ]
      },
      trauma: {
        name: "Травма",
        cases: [
          "ПТСР (боевые действия, аварии)",
          "Детская травма/насилие",
          "Сексуальное насилие",
          "Эмоциональное насилие"
        ]
      },
      addictions: {
        name: "Зависимости",
        cases: [
          "Алкогольная зависимость",
          "Наркотическая зависимость",
          "Игровая зависимость",
          "Интернет/соцсети зависимость"
        ]
      },
      eating: {
        name: "Расстройства пищевого поведения",
        cases: [
          "Анорексия",
          "Булимия",
          "Компульсивное переедание"
        ]
      },
      psychotic: {
        name: "Психотические расстройства",
        cases: [
          "Первый психотический эпизод",
          "Шизофрения",
          "Бредовое расстройство"
        ]
      },
      affective: {
        name: "Тяжелые аффективные расстройства",
        cases: [
          "Тяжелая депрессия",
          "Биполярное расстройство (мания)",
          "Смешанные состояния"
        ]
      },
      crisis: {
        name: "Кризисные состояния",
        cases: [
          "Суицидальные мысли",
          "Парасуицид",
          "Агрессивность/угроза насилия"
        ]
      },
      personality: {
        name: "Расстройства личности",
        cases: [
          "Пограничное расстройство личности",
          "Нарциссическое расстройство",
          "Антисоциальное расстройство"
        ]
      },
      youth: {
        name: "Детско-подростковые",
        cases: [
          "Школьная тревожность",
          "Проблемы с самооценкой",
          "Буллинг",
          "Расстройства поведения"
        ]
      },
      elderly: {
        name: "Пожилые люди",
        cases: [
          "Депрессия в пожилом возрасте",
          "Тревога по поводу здоровья",
          "Одиночество/изоляция"
        ]
      },
      identity: {
        name: "Проблемы идентичности",
        cases: [
          "Гендерная дисфория",
          "Вопросы сексуальной ориентации",
          "Кросс-культурная адаптация",
          "Кризис четверти/среднего возраста"
        ]
      },
      neurodiverse: {
        name: "Нейроразнообразие",
        cases: [
          "СДВГ у взрослых",
          "Расстройства аутистического спектра",
          "Обсессивно-компульсивное расстройство"
        ]
      }
    };
    
    // Типы открытости пациентов
    this.openness = {
      open: {
        name: "Открытый",
        description: "Осознает проблему, сам обратился за помощью, готов сотрудничать",
        resistance: "Минимальное, обычно выполняет рекомендации",
        motivation: "Высокая, хочет решить проблему"
      },
      neutral: {
        name: "Нейтральный",
        description: "Частично осознает проблему, есть амбивалентность",
        resistance: "Среднее, иногда сопротивляется, иногда сотрудничает",
        motivation: "Средняя, нуждается в поддержке мотивации"
      },
      closed: {
        name: "Закрытый",
        description: "Пришел не по своей воле, отрицает/минимизирует проблему",
        resistance: "Высокое, активно сопротивляется, защитное поведение",
        motivation: "Низкая, внешняя (по настоянию близких)"
      }
    };
    
    // Психологические защиты
    this.defenses = [
      "отрицание", "рационализация", "проекция", "вытеснение", 
      "избегание", "интеллектуализация", "минимизация", "диссоциация",
      "регрессия", "обесценивание", "идеализация", "всемогущество"
    ];
  }
  
  /**
   * Генерирует описание случая
   * @param {object} params - Параметры генерации
   * @returns {Promise<object>} - Данные о пациенте
   */
  async generateCase(params = {}) {
    // Выбор категории случая или случайной 
    const category = params.category || this.getRandomKey(this.casesDB);
    const categoryData = this.casesDB[category];
    
    // Выбор конкретного случая или случайного
    const caseIndex = params.caseIndex !== undefined ? 
                      params.caseIndex : 
                      Math.floor(Math.random() * categoryData.cases.length);
    const diagnosis = categoryData.cases[caseIndex];
    
    // Определение открытости
    const opennessType = params.openness || this.getRandomKey(this.openness);
    const openness = this.openness[opennessType];
    
    // Сложность случая (1-5)
    const complexity = params.complexity || Math.floor(Math.random() * 5) + 1;
    
    // Создаем запрос для генерации деталей пациента
    const casePrompt = `
Создай детальное описание пациента для психологического тренинга. 

ВАЖНО: Твой ответ должен быть ТОЛЬКО в виде валидного JSON объекта, без дополнительного текста, пояснений или markdown-форматирования.

ПАРАМЕТРЫ СЛУЧАЯ:
Диагноз: ${diagnosis}
Категория: ${categoryData.name}
Открытость: ${openness.name} (${openness.description})
Сложность: ${complexity}/5

ТРЕБУЕМЫЕ ПОЛЯ JSON-ОБЪЕКТА:
{
  "name": "Имя пациента",
  "age": число от 25 до 55,
  "gender": "мужской" или "женский",
  "profession": "Профессия",
  "problem": "Основная проблема (как видит её пациент, 1-2 предложения)",
  "symptoms": ["Симптом 1", "Симптом 2", "Симптом 3"],
  "motivation": "Почему пришел к психологу",
  "openness": "Отношение к терапии, ${openness.name}",
  "history": "Краткая история возникновения проблемы",
  "triggers": ["Триггер 1", "Триггер 2"],
  "coping": ["Способ 1", "Способ 2"],
  "defenses": ["Защита 1", "Защита 2"],
  "speech": "Особенности речи, выражения эмоций",
  "resistance": "Как проявляет сопротивление в терапии",
  "background": "Семейная/социальная история"
}

Создай реалистичное, психологически достоверное описание. Сложность ${complexity}/5 означает ${this.getComplexityDescription(complexity)}.

ВАЖНО: Верни только чистый JSON-объект без кавычек, markdown-блоков и других форматирований.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: "Ты эксперт в клинической психологии, создающий реалистичные описания пациентов для обучения психологов. Всегда возвращай ответ ТОЛЬКО в формате JSON без дополнительного текста. JSON должен быть валидным и соответствовать запрашиваемым полям.",
        messages: [
          { role: 'user', content: casePrompt }
        ]
      });
      
      // Извлекаем и парсим JSON из ответа
      const text = response.content[0].text;
      console.log("Ответ Claude API:", text.substring(0, 200) + "...");
      
      // Различные форматы JSON в ответе
      const jsonPatterns = [
        /```json\n([\s\S]*?)\n```/, // JSON в блоке кода
        /```([\s\S]*?)```/, // Просто блок кода
        /{[\s\S]*?}/,  // Только сам JSON объект
        /\{[\s\S]*\}/  // JSON с пробелами
      ];
      
      let patientData;
      let parsed = false;
      
      // Пробуем разные шаблоны для поиска JSON
      for (const pattern of jsonPatterns) {
        if (parsed) break;
        
        const match = text.match(pattern);
        if (match) {
          try {
            // Очищаем возможные markdown-символы и лишние пробелы
            const jsonText = match[1] || match[0];
            const cleanedJson = jsonText.replace(/^```json\n|```$/g, '').trim();
            patientData = JSON.parse(cleanedJson);
            parsed = true;
            console.log("JSON успешно распарсен по шаблону:", pattern);
          } catch (e) {
            console.log("Неудачная попытка парсинга по шаблону:", pattern);
          }
        }
      }
      
      // Если все еще не распарсили, пробуем ручную обработку
      if (!parsed) {
        try {
          // Ищем всё что похоже на JSON объект
          const potentialJson = text.substring(
            text.indexOf('{'), 
            text.lastIndexOf('}') + 1
          );
          
          // Очищаем возможные markdown-символы
          const cleanedJson = potentialJson
            .replace(/^```json\n|```$/g, '')
            .replace(/\\n/g, '')
            .replace(/\\"/g, '"')
            .trim();
            
          patientData = JSON.parse(cleanedJson);
          parsed = true;
          console.log("JSON распарсен после ручной обработки");
        } catch (e) {
          console.error("Ошибка парсинга JSON после ручной обработки:", e);
          console.log("Исходный ответ:", text);
          throw new Error("Не удалось распарсить JSON в ответе Claude. Проверьте формат ответа API.");
        }
      }
      
      // Дополнительная информация для логирования
      patientData.meta = {
        category: categoryData.name,
        diagnosis: diagnosis,
        complexity: complexity,
        openness: openness.name,
        created: new Date().toISOString(),
        token_usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens
        }
      };
      
      return patientData;
    } catch (error) {
      console.error("Ошибка при генерации случая:", error);
      throw error;
    }
  }
  
  /**
   * Создает промпт для Claude на основе данных пациента
   * @param {object} patientData - Данные пациента
   * @returns {string} - Промпт для Claude
   */
  createPatientPrompt(patientData) {
    return `Ты пациент с ${patientData.meta.diagnosis}. Твой тип отношения к терапии: ${patientData.openness}.

При первом ответе психологу:
1. Представься (${patientData.name}, ${patientData.age} лет, ${patientData.profession})
2. Кратко опиши одну конкретную ситуацию, связанную с "${patientData.problem}"
3. Упомяни 1-2 симптома из списка: ${patientData.symptoms.join(", ")}

Твои особенности:
- Мотивация: ${patientData.motivation}
- Отношение к терапии: ${patientData.openness}
- История проблемы: ${patientData.history}
- Психологические защиты: ${patientData.defenses.join(", ")}
- Триггеры: ${patientData.triggers.join(", ")}
- Способы совладания: ${patientData.coping.join(", ")}
- Семейный фон: ${patientData.background}

В диалоге:
- Отвечай КРАТКО (2-4 предложения максимум)
- Говори обрывочно, с паузами (*показывай действия*)
- Жди реакции психолога, не выдавай всю информацию сразу
- Используй особенности речи: ${patientData.speech}
- Проявляй сопротивление: ${patientData.resistance}
- НЕ используй психологические термины (говори обычным языком)
- Держись своей истории на протяжении диалога
- НЕ произноси длинных монологов
- Иногда задавай встречные вопросы психологу

Будь живым человеком, а не образцовым пациентом. Твоя цель - создать реалистичный диалог, а не выдать всю информацию сразу.`;
  }
  
  /**
   * Запускает диалог с пациентом
   * @param {object} patientData - Данные пациента
   * @param {string} question - Первый вопрос психолога
   * @returns {Promise<object>} - Ответ пациента
   */
  async startPatientDialog(patientData, question = "Здравствуйте! Что привело вас ко мне сегодня?") {
    const patientPrompt = this.createPatientPrompt(patientData);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200, // Ограничиваем длину ответа для большей естественности
        system: patientPrompt,
        messages: [
          { role: 'user', content: question }
        ]
      });
      
      return {
        patient_response: response.content[0].text,
        token_usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error) {
      console.error("Ошибка при начале диалога:", error);
      throw error;
    }
  }
  
  /**
   * Продолжение диалога с пациентом
   * @param {object} patientData - Данные пациента
   * @param {array} conversation - История разговора
   * @param {string} question - Новый вопрос психолога
   * @returns {Promise<object>} - Ответ пациента
   */
  async continuePatientDialog(patientData, conversation, question) {
    const patientPrompt = this.createPatientPrompt(patientData);
    const messages = [];
    
    // Формируем историю разговора для контекста
    for (const exchange of conversation) {
      messages.push({ role: 'user', content: exchange.therapist });
      messages.push({ role: 'assistant', content: exchange.patient });
    }
    
    // Добавляем новый вопрос
    messages.push({ role: 'user', content: question });
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200, // Ограничиваем длину ответа для большей естественности
        system: patientPrompt,
        messages: messages
      });
      
      return {
        patient_response: response.content[0].text,
        token_usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error) {
      console.error("Ошибка при продолжении диалога:", error);
      throw error;
    }
  }
  
  /**
   * Выводит список всех категорий случаев
   */
  listCategories() {
    console.log("\n=== КАТЕГОРИИ ПСИХОЛОГИЧЕСКИХ СЛУЧАЕВ ===");
    
    Object.entries(this.casesDB).forEach(([key, category], index) => {
      console.log(`${index + 1}. ${category.name} (${key})`);
      category.cases.forEach((caseItem, i) => {
        console.log(`   ${i+1}. ${caseItem}`);
      });
      console.log("");
    });
  }
  
  /**
   * Сохраняет данные пациента в файл
   * @param {object} patientData - Данные пациента
   * @returns {string} - Путь к сохраненному файлу
   */
  savePatientData(patientData) {
    // Создаем имя файла на основе имени пациента и типа расстройства
    const sanitizedName = patientData.name.toLowerCase().replace(/\s+/g, '_');
    const sanitizedDiagnosis = patientData.meta.diagnosis.toLowerCase()
                                .replace(/\s+/g, '_')
                                .replace(/[^\w-]/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const fileName = `${sanitizedName}_${sanitizedDiagnosis}_${timestamp}.json`;
    const filePath = `./patients/${fileName}`;
    
    // Создаем директорию, если она не существует
    if (!fs.existsSync('./patients')) {
      fs.mkdirSync('./patients');
    }
    
    // Сохраняем данные в JSON файл
    fs.writeFileSync(filePath, JSON.stringify(patientData, null, 2));
    
    return filePath;
  }
  
  /**
   * Загружает данные пациента из файла
   * @param {string} filePath - Путь к файлу с данными пациента
   * @returns {object} - Данные пациента
   */
  loadPatientData(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Ошибка при загрузке данных пациента из ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Получает случайный ключ из объекта
   * @param {object} obj - Объект
   * @returns {string} - Случайный ключ
   */
  getRandomKey(obj) {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
  }
  
  /**
   * Возвращает описание сложности случая
   * @param {number} complexity - Уровень сложности (1-5)
   * @returns {string} - Описание сложности
   */
  getComplexityDescription(complexity) {
    const descriptions = {
      1: "типичный несложный случай, хорошо поддающийся терапии",
      2: "стандартный случай средней сложности",
      3: "случай умеренной сложности с некоторыми нетипичными проявлениями",
      4: "сложный случай с множественными проблемами или сопутствующими расстройствами", 
      5: "особо сложный случай, требующий опытного специалиста и возможно комбинированного подхода к лечению"
    };
    
    return descriptions[complexity] || descriptions[3];
  }
}

// Демонстрационный код для тестирования
async function demonstrateSystem() {
  console.log("=== СИСТЕМА ЭМУЛЯЦИИ ПАЦИЕНТОВ ДЛЯ ТРЕНИНГА ПСИХОЛОГОВ ===\n");
  
  const patientSystem = new PatientSystem();
  
  // Выводим список категорий для справки
  patientSystem.listCategories();
  
  // Ждем ввод пользователя для продолжения
  console.log("Генерируем случайного пациента...\n");
  
  try {
    // Генерируем случай
    const patientData = await patientSystem.generateCase({
      category: "anxiety", // Можно заменить на любую категорию из списка
      openness: "neutral",  // open, neutral, closed
      complexity: 3         // 1-5
    });
    
    console.log(`\n=== КАРТОЧКА ПАЦИЕНТА: ${patientData.name}, ${patientData.age} лет ===`);
    console.log(`Диагноз: ${patientData.meta.diagnosis}`);
    console.log(`Профессия: ${patientData.profession}`);
    console.log(`Проблема: ${patientData.problem}`);
    console.log(`Открытость: ${patientData.openness}`);
    console.log(`Сложность: ${patientData.meta.complexity}/5`);
    console.log("\nСимптомы:");
    patientData.symptoms.forEach(symptom => console.log(`- ${symptom}`));
    console.log("\nТриггеры:");
    patientData.triggers.forEach(trigger => console.log(`- ${trigger}`));
    console.log("\nПсихологические защиты:");
    patientData.defenses.forEach(defense => console.log(`- ${defense}`));
    
    // Сохраняем данные пациента
    const savedPath = patientSystem.savePatientData(patientData);
    console.log(`\nДанные пациента сохранены в: ${savedPath}`);
    
    // Начинаем диалог
    console.log("\n=== НАЧАЛО ДИАЛОГА ===");
    const firstQuestion = "Здравствуйте! Что привело вас ко мне сегодня?";
    console.log(`Психолог: ${firstQuestion}`);
    
    const initialResponse = await patientSystem.startPatientDialog(patientData, firstQuestion);
    console.log(`Пациент: ${initialResponse.patient_response}`);
    console.log(`\nИспользовано токенов: ${initialResponse.token_usage.total}`);
    
    // Можно продолжить диалог
    console.log("\n=== ПРОДОЛЖЕНИЕ ДИАЛОГА ===");
    const conversation = [
      { therapist: firstQuestion, patient: initialResponse.patient_response }
    ];
    
    const followUpQuestion = "Расскажите подробнее, когда вы впервые заметили эти симптомы?";
    console.log(`Психолог: ${followUpQuestion}`);
    
    const followUpResponse = await patientSystem.continuePatientDialog(patientData, conversation, followUpQuestion);
    console.log(`Пациент: ${followUpResponse.patient_response}`);
    console.log(`\nИспользовано токенов: ${followUpResponse.token_usage.total}`);
    
  } catch (error) {
    console.error("Ошибка демонстрации:", error);
  }
}

// Запускаем демонстрацию, если скрипт запущен напрямую
if (require.main === module) {
  demonstrateSystem();
}

module.exports = PatientSystem;