#!/bin/bash

# Проверка установки PM2
if ! command -v pm2 &> /dev/null; then
    echo "PM2 не установлен. Установка PM2..."
    npm install -g pm2
fi

# Переходим в директорию бота
cd "$(dirname "$0")"

# Устанавливаем зависимости, если не установлены
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей..."
    npm install
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "ОШИБКА: Файл .env не найден."
    echo "Создайте файл .env со следующим содержимым:"
    echo "---------------------------------------------"
    echo "# Anthropic API Configuration"
    echo "ANTHROPIC_API_KEY=ваш_ключ_anthropic_api"
    echo ""
    echo "# Telegram Bot Configuration"
    echo "TELEGRAM_BOT_TOKEN=ваш_токен_telegram_бота"
    echo "---------------------------------------------"
    exit 1
fi

# Запускаем бота через PM2
echo "Запуск ПсихоТренер бота через PM2..."
pm2 start telegram-bot.js --name "psycho-supervisor-bot"
pm2 save

echo "Бот успешно запущен!"
echo "Для просмотра логов: pm2 logs psycho-supervisor-bot"
echo "Для остановки: pm2 stop psycho-supervisor-bot"
echo "Для перезапуска: pm2 restart psycho-supervisor-bot"