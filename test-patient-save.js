require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Инициализация бота
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// Тестовый пользователь ID (замените на ваш реальный ID)
const TEST_USER_ID = 434085347; // Ваш ID из логов

async function testPatientWorkflow() {
  console.log('🧪 Начинаю тестирование сохранения пациентов...');
  
  try {
    // Шаг 1: Отправляем команду создания нового пациента
    console.log('📤 Отправляю команду /new...');
    await bot.sendMessage(TEST_USER_ID, '/new');
    
    // Ждем 3 секунды для генерации пациента
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Шаг 2: Симулируем диалог
    console.log('💬 Отправляю сообщение пациенту...');
    await bot.sendMessage(TEST_USER_ID, 'Здравствуйте! Что вас беспокоит?');
    
    // Ждем ответ
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Шаг 3: Завершаем сессию
    console.log('🏁 Завершаю сессию...');
    await bot.sendMessage(TEST_USER_ID, '/end');
    
    // Ждем завершения
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Шаг 4: Проверяем список пациентов
    console.log('📂 Проверяю список пациентов...');
    await bot.sendMessage(TEST_USER_ID, '/patients');
    
    console.log('✅ Тест завершен! Проверьте логи бота для диагностики.');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запуск теста
testPatientWorkflow();