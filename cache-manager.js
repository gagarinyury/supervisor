require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

/**
 * 🔥 Модуль управления кешированием для Claude API
 * Использует современный prompt caching с cache_control
 * 
 * ЭКОНОМИЯ: До 90% стоимости и 85% латентности для закешированного контента
 */
class CacheManager {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    // Статистика кеширования
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tokensWrittenToCache: 0,
      tokensReadFromCache: 0,
      costSavings: 0
    };
  }

  /**
   * 🎯 Создание сообщения с кешированием system промпта
   * @param {Object} options - Параметры запроса
   * @param {string} options.model - Модель Claude
   * @param {number} options.maxTokens - Максимум токенов
   * @param {string|Array} options.system - System промпт (будет закеширован)
   * @param {Array} options.messages - Сообщения диалога
   * @param {boolean} options.enableCaching - Включить кеширование (по умолчанию true)
   * @returns {Promise<Object>} - Ответ API с метриками кеширования
   */
  async createMessage(options) {
    const {
      model = 'claude-3-5-haiku-20241022',
      maxTokens = 1000,
      system,
      messages,
      enableCaching = true
    } = options;

    this.stats.totalRequests++;

    // Подготавливаем system промпт для кеширования
    let systemPrompt = system;
    if (enableCaching && system) {
      // Если system это строка, конвертируем в массив с кешированием
      if (typeof system === 'string') {
        // Проверяем минимальный размер для кеширования
        if (system.length > 1000) { // Примерно 1000+ токенов
          systemPrompt = [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" }
            }
          ];
        }
      } 
      // Если system уже массив, добавляем кеширование к последнему элементу
      else if (Array.isArray(system)) {
        systemPrompt = [...system];
        if (systemPrompt.length > 0) {
          systemPrompt[systemPrompt.length - 1].cache_control = { type: "ephemeral" };
        }
      }
    }

    try {
      const requestOptions = {
        model,
        max_tokens: maxTokens,
        messages
      };

      // Добавляем system промпт если есть
      if (systemPrompt) {
        requestOptions.system = systemPrompt;
      }

      // Beta header уже установлен в constructor через defaultHeaders

      console.log(`🔥 [CacheManager] Отправляем запрос с кешированием: ${enableCaching}`);

      const response = await this.anthropic.messages.create(requestOptions);

      // Обновляем статистику кеширования
      this._updateCacheStats(response);

      return {
        content: response.content[0].text,
        usage: response.usage,
        cacheStats: this._extractCacheStats(response)
      };

    } catch (error) {
      console.error('🚨 [CacheManager] Ошибка при создании сообщения:', error);
      throw error;
    }
  }

  /**
   * 📊 Обновление статистики кеширования
   * @private
   */
  _updateCacheStats(response) {
    const usage = response.usage;
    
    // Проверяем наличие кеширования в ответе
    if (usage.cache_creation_input_tokens || usage.cache_read_input_tokens) {
      
      if (usage.cache_creation_input_tokens > 0) {
        this.stats.cacheMisses++;
        this.stats.tokensWrittenToCache += usage.cache_creation_input_tokens;
        console.log(`📝 [Cache] Создан кеш: ${usage.cache_creation_input_tokens} токенов`);
      }
      
      if (usage.cache_read_input_tokens > 0) {
        this.stats.cacheHits++;
        this.stats.tokensReadFromCache += usage.cache_read_input_tokens;
        
        // Расчет экономии (примерно 90% от стоимости)
        const savedTokens = usage.cache_read_input_tokens;
        this.stats.costSavings += savedTokens * 0.9; // 90% экономии
        
        console.log(`✅ [Cache HIT] Прочитано из кеша: ${usage.cache_read_input_tokens} токенов`);
      }
    } else {
      console.log(`⚪ [Cache] Кеширование не использовалось`);
    }
  }

  /**
   * 📈 Извлечение статистики кеширования из ответа
   * @private
   */
  _extractCacheStats(response) {
    const usage = response.usage;
    return {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheCreationTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
    };
  }

  /**
   * 📊 Получение общей статистики кеширования
   */
  getCacheStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalSavedTokens: this.stats.tokensReadFromCache,
      estimatedCostSavings: this.stats.costSavings
    };
  }

  /**
   * 🧹 Сброс статистики
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tokensWrittenToCache: 0,
      tokensReadFromCache: 0,
      costSavings: 0
    };
  }

  /**
   * 📋 Логирование статистики кеширования
   */
  logCacheStats() {
    const stats = this.getCacheStats();
    console.log(`
🔥 === СТАТИСТИКА КЕШИРОВАНИЯ ===
📊 Всего запросов: ${stats.totalRequests}
✅ Cache hits: ${stats.cacheHits} (${stats.hitRate})
❌ Cache misses: ${stats.cacheMisses}
📝 Токенов записано в кеш: ${stats.tokensWrittenToCache}
📖 Токенов прочитано из кеша: ${stats.tokensReadFromCache}
💰 Токенов сэкономлено: ${stats.totalSavedTokens}
💵 Примерная экономия: ${stats.estimatedCostSavings.toFixed(0)} токенов
===================================
    `);
  }
}

module.exports = CacheManager;

// Тестирование модуля, если запущен напрямую
if (require.main === module) {
  async function testCaching() {
    const cacheManager = new CacheManager();
    
    console.log('🧪 Тестируем кеширование...');
    
    const systemPrompt = `Ты виртуальный пациент для обучения психологов. Твоя роль: имитировать реалистичные диалоги с психотерапевтом.

ОСНОВНЫЕ ПРИНЦИПЫ:
- Веди себя естественно, как реальный человек с психологическими проблемами
- Проявляй эмоции, сопротивление, защитные механизмы
- Отвечай краткими фразами, как в живом диалоге
- Не соглашайся сразу на все предложения терапевта
- Показывай противоречивые чувства и мысли

СТИЛЬ ОБЩЕНИЯ:
- Говори от первого лица
- Используй повседневную речь
- Покажи неуверенность, паузы, эмоции
- Иногда избегай прямых ответов
- Проявляй сопротивление терапевтическому процессу

Это длинный промпт для тестирования кеширования в Claude API.`.repeat(3);

    try {
      // Первый запрос - создание кеша
      console.log('\n1️⃣ Первый запрос (создание кеша)...');
      const response1 = await cacheManager.createMessage({
        system: systemPrompt,
        messages: [
          { role: 'user', content: 'Привет, как дела?' }
        ],
        enableCaching: true
      });
      
      console.log('Ответ 1:', response1.content.substring(0, 100) + '...');
      console.log('Cache stats 1:', response1.cacheStats);

      // Второй запрос - использование кеша  
      console.log('\n2️⃣ Второй запрос (использование кеша)...');
      const response2 = await cacheManager.createMessage({
        system: systemPrompt,
        messages: [
          { role: 'user', content: 'Что вас беспокоит?' }
        ],
        enableCaching: true
      });
      
      console.log('Ответ 2:', response2.content.substring(0, 100) + '...');
      console.log('Cache stats 2:', response2.cacheStats);

      // Общая статистика
      cacheManager.logCacheStats();

    } catch (error) {
      console.error('❌ Ошибка тестирования:', error);
    }
  }

  testCaching();
}