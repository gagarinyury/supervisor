#!/bin/bash

# Универсальный скрипт запуска ПсихоТренер бота
# Использование: ./unified-start.sh [standard|pm2]

MODE=${1:-standard}

# Общие функции проверки
check_dependencies() {
    echo "Проверка зависимостей..."
    
    if ! command -v node &> /dev/null; then
        echo "Node.js не установлен. Установите Node.js перед запуском."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo "npm не установлен. Установите npm перед запуском."
        exit 1
    fi
    
    if [ "$MODE" = "pm2" ] && ! command -v pm2 &> /dev/null; then
        echo "PM2 не установлен. Установка PM2..."
        npm install -g pm2
    fi
}

install_node_modules() {
    if [ ! -d "node_modules" ]; then
        echo "Установка зависимостей..."
        npm install
    fi
}

check_env_file() {
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
}

start_bot() {
    case "$MODE" in
        "pm2")
            echo "Запуск ПсихоТренер бота через PM2..."
            pm2 start telegram-bot.js --name "psycho-supervisor-bot"
            pm2 save
            echo "Бот успешно запущен!"
            echo "Для просмотра логов: pm2 logs psycho-supervisor-bot"
            echo "Для остановки: pm2 stop psycho-supervisor-bot"
            echo "Для перезапуска: pm2 restart psycho-supervisor-bot"
            ;;
        "standard"|*)
            echo "Запуск ПсихоТренер бота..."
            node telegram-bot.js
            ;;
    esac
}

# Основной процесс
cd "$(dirname "$0")"

echo "Режим запуска: $MODE"
check_dependencies
install_node_modules
check_env_file
start_bot