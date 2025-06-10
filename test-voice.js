#!/usr/bin/env node

/**
 * 🧪 Тестирование модуля обработки голосовых сообщений
 */

require('dotenv').config();
const VoiceHandler = require('./voice-handler');

async function testVoiceHandler() {
  console.log('🧪 ТЕСТИРОВАНИЕ VOICEHANDLER\n');
  
  const voiceHandler = new VoiceHandler();
  
  console.log('🔧 Проверяем зависимости...\n');
  
  // Проверяем FFmpeg
  const ffmpegOk = await voiceHandler.checkFFmpegAvailability();
  console.log(`FFmpeg: ${ffmpegOk ? '✅ Доступен' : '❌ Недоступен'}`);
  
  // Проверяем OpenAI API
  const openaiOk = await voiceHandler.checkOpenAIAvailability();
  console.log(`OpenAI API: ${openaiOk ? '✅ Доступен' : '❌ Недоступен'}`);
  
  // Проверяем готовность системы
  console.log('\n🚀 Инициализация...');
  const isReady = await voiceHandler.initialize();
  
  console.log(`\n📊 РЕЗУЛЬТАТ: ${isReady ? '✅ Готов к работе' : '❌ Требует настройки'}`);
  
  if (!isReady) {
    console.log('\n📝 ДЛЯ АКТИВАЦИИ ГОЛОСОВЫХ СООБЩЕНИЙ:');
    
    if (!ffmpegOk) {
      console.log('1. FFmpeg уже установлен ✅');
    }
    
    if (!openaiOk) {
      console.log('2. Добавьте OPENAI_API_KEY в .env файл');
      console.log('   Получите ключ: https://platform.openai.com/api-keys');
      console.log('   Формат: OPENAI_API_KEY=sk-...');
    }
  } else {
    console.log('\n🎉 Все готово! Голосовые сообщения работают.');
  }
  
  return isReady;
}

// Запускаем тест
if (require.main === module) {
  testVoiceHandler()
    .then((result) => {
      console.log(`\n🏁 Тест завершен. Результат: ${result ? 'SUCCESS' : 'NEEDS_SETUP'}`);
      process.exit(result ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Ошибка тестирования:', error);
      process.exit(1);
    });
}

module.exports = { testVoiceHandler };