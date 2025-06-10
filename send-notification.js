#!/usr/bin/env node

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Получаем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(JSON.stringify({ success: false, error: 'Недостаточно аргументов' }));
    process.exit(1);
}

const name = args[0];
const phone = args[1];
const message = args[2] || '';

// Инициализация Telegram бота
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.log(JSON.stringify({ success: false, error: 'Токен не найден' }));
    process.exit(1);
}

const bot = new TelegramBot(token);
const ADMIN_ID = 434085347; // Ваш Telegram ID

async function sendNotification() {
    try {
        const notificationText = `🔔 *Новая заявка с сайта!*\n\n👤 *Имя:* ${name}\n📞 *Телефон:* ${phone}${message ? `\n💬 *Сообщение:* ${message}` : ''}\n\n⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Paris' })}`;
        
        await bot.sendMessage(ADMIN_ID, notificationText, {
            parse_mode: 'Markdown'
        });
        
        console.log(JSON.stringify({ success: true, message: 'Уведомление отправлено' }));
        process.exit(0);
        
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
}

// Отправляем уведомление
sendNotification();