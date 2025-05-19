#!/bin/bash

# Проверка установленных зависимостей
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Установите Node.js перед запуском."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm не установлен. Установите npm перед запуском."
    exit 1
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

# Запускаем бота
echo "Запуск ПсихоТренер бота..."
node telegram-bot.js