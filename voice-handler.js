require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const FormData = require('form-data');

/**
 * 🎤 Модуль обработки голосовых сообщений
 * Конвертирует голосовые сообщения Telegram в текст через OpenAI Whisper API
 */
class VoiceHandler {
  constructor() {
    this.tempDir = './temp_audio/';
    this.maxFileSizeMB = 25; // Лимит OpenAI Whisper API
    this.execAsync = util.promisify(exec);
    
    // Создаем папку для временных файлов
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    console.log('🎤 [VoiceHandler] Инициализирован модуль обработки голосовых сообщений');
  }

  /**
   * 📥 Основная функция обработки голосового сообщения
   * @param {Object} bot - Экземпляр Telegram бота
   * @param {Object} msg - Сообщение с голосовым файлом
   * @returns {Promise<string>} - Транскрибированный текст
   */
  async processVoiceMessage(bot, msg) {
    const voice = msg.voice;
    const userId = msg.from.id;
    
    console.log(`🎤 [VoiceHandler] Обрабатываем голосовое сообщение от пользователя ${userId}`);
    console.log(`📊 Длительность: ${voice.duration}с, Размер: ${(voice.file_size / 1024).toFixed(1)}KB`);

    try {
      // 1. Проверяем размер файла
      if (voice.file_size > this.maxFileSizeMB * 1024 * 1024) {
        throw new Error(`Голосовое сообщение слишком большое (${(voice.file_size / 1024 / 1024).toFixed(1)}MB). Максимум ${this.maxFileSizeMB}MB`);
      }

      // 2. Скачиваем файл от Telegram
      const oggFilePath = await this.downloadVoiceFile(bot, voice.file_id, userId);
      
      // 3. Конвертируем OGG в MP3 (требование Whisper API)
      const mp3FilePath = await this.convertOggToMp3(oggFilePath);
      
      // 4. Отправляем в OpenAI Whisper для транскрипции
      const transcription = await this.transcribeAudio(mp3FilePath);
      
      // 5. Очищаем временные файлы
      this.cleanupTempFiles([oggFilePath, mp3FilePath]);
      
      console.log(`✅ [VoiceHandler] Транскрипция завершена: "${transcription.substring(0, 50)}..."`);
      
      return transcription;
      
    } catch (error) {
      console.error('❌ [VoiceHandler] Ошибка обработки голосового сообщения:', error);
      throw error;
    }
  }

  /**
   * 📥 Скачивание голосового файла из Telegram
   * @param {Object} bot - Telegram bot instance
   * @param {string} fileId - ID файла в Telegram
   * @param {string} userId - ID пользователя
   * @returns {Promise<string>} - Путь к скачанному OGG файлу
   */
  async downloadVoiceFile(bot, fileId, userId) {
    try {
      // Получаем информацию о файле
      const fileInfo = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;
      
      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const oggFilePath = path.join(this.tempDir, `voice_${userId}_${timestamp}.ogg`);
      
      console.log(`📥 [VoiceHandler] Скачиваем файл: ${fileUrl}`);
      
      // Скачиваем файл
      await this.downloadFile(fileUrl, oggFilePath);
      
      return oggFilePath;
      
    } catch (error) {
      console.error('❌ [VoiceHandler] Ошибка скачивания файла:', error);
      throw new Error('Не удалось скачать голосовое сообщение');
    }
  }

  /**
   * 📁 Загрузка файла по URL
   * @param {string} url - URL файла
   * @param {string} filepath - Путь для сохранения
   * @returns {Promise<void>}
   */
  downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Удаляем некорректный файл
          reject(err);
        });
        
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 🔄 Конвертация OGG в MP3 через FFmpeg
   * @param {string} oggFilePath - Путь к OGG файлу
   * @returns {Promise<string>} - Путь к MP3 файлу
   */
  async convertOggToMp3(oggFilePath) {
    const mp3FilePath = oggFilePath.replace('.ogg', '.mp3');
    
    try {
      console.log(`🔄 [VoiceHandler] Конвертируем OGG в MP3: ${path.basename(oggFilePath)}`);
      
      // FFmpeg команда для конвертации
      const command = `ffmpeg -i "${oggFilePath}" -acodec mp3 -ar 16000 -ab 32k "${mp3FilePath}" -y`;
      
      const { stdout, stderr } = await this.execAsync(command);
      
      if (stderr && !stderr.includes('size=')) {
        console.warn('⚠️ [VoiceHandler] FFmpeg warnings:', stderr);
      }
      
      // Проверяем, что файл создался
      if (!fs.existsSync(mp3FilePath)) {
        throw new Error('MP3 файл не был создан');
      }
      
      console.log(`✅ [VoiceHandler] Конвертация завершена: ${path.basename(mp3FilePath)}`);
      
      return mp3FilePath;
      
    } catch (error) {
      console.error('❌ [VoiceHandler] Ошибка конвертации:', error);
      throw new Error('Не удалось сконвертировать аудио файл');
    }
  }

  /**
   * 🧠 Транскрипция через OpenAI Whisper API
   * @param {string} mp3FilePath - Путь к MP3 файлу
   * @returns {Promise<string>} - Транскрибированный текст
   */
  async transcribeAudio(mp3FilePath) {
    try {
      console.log(`🧠 [VoiceHandler] Отправляем в OpenAI Whisper: ${path.basename(mp3FilePath)}`);
      
      // Подготавливаем данные для multipart/form-data
      const fileStats = fs.statSync(mp3FilePath);
      const fileStream = fs.createReadStream(mp3FilePath);
      
      console.log(`📊 Размер MP3: ${(fileStats.size / 1024).toFixed(1)}KB`);
      
      // Используем OpenAI API для транскрипции
      const formData = new FormData();
      formData.append('file', fileStream, {
        filename: path.basename(mp3FilePath),
        contentType: 'audio/mp3'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'ru'); // Указываем русский язык
      formData.append('response_format', 'text');
      
      // Используем Promise для выполнения HTTP запроса
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.openai.com',
          path: '/v1/audio/transcriptions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders()
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode === 200,
              status: res.statusCode,
              text: () => Promise.resolve(data),
              statusText: res.statusMessage
            });
          });
        });

        req.on('error', reject);
        formData.pipe(req);
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorData}`);
      }
      
      const transcription = await response.text();
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Не удалось распознать речь в аудио');
      }
      
      return transcription.trim();
      
    } catch (error) {
      console.error('❌ [VoiceHandler] Ошибка транскрипции:', error);
      
      if (error.message.includes('API key')) {
        throw new Error('Ошибка доступа к системе распознавания речи');
      }
      
      throw new Error('Не удалось распознать речь в голосовом сообщении');
    }
  }

  /**
   * 🧹 Очистка временных файлов
   * @param {string[]} filePaths - Массив путей к файлам для удаления
   */
  cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🧹 [VoiceHandler] Удален временный файл: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.warn(`⚠️ [VoiceHandler] Не удалось удалить ${filePath}:`, error.message);
      }
    });
  }

  /**
   * 🔧 Проверка доступности FFmpeg
   * @returns {Promise<boolean>} - true если FFmpeg доступен
   */
  async checkFFmpegAvailability() {
    try {
      const { stdout } = await this.execAsync('ffmpeg -version');
      console.log('✅ [VoiceHandler] FFmpeg доступен:', stdout.split('\n')[0]);
      return true;
    } catch (error) {
      console.error('❌ [VoiceHandler] FFmpeg не найден:', error.message);
      return false;
    }
  }

  /**
   * 🔧 Проверка доступности OpenAI API
   * @returns {Promise<boolean>} - true если API ключ корректен
   */
  async checkOpenAIAvailability() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ [VoiceHandler] OPENAI_API_KEY не установлен в .env');
        return false;
      }
      
      if (process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.error('❌ [VoiceHandler] OPENAI_API_KEY не настроен (используется placeholder)');
        return false;
      }
      
      // Простая проверка через HTTP запрос
      return new Promise((resolve) => {
        const options = {
          hostname: 'api.openai.com',
          path: '/v1/models',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          }
        };

        const req = https.request(options, (res) => {
          if (res.statusCode === 200) {
            console.log('✅ [VoiceHandler] OpenAI API доступен');
            resolve(true);
          } else {
            console.error(`❌ [VoiceHandler] OpenAI API недоступен: ${res.statusCode}`);
            resolve(false);
          }
        });

        req.on('error', (error) => {
          console.error('❌ [VoiceHandler] Ошибка проверки OpenAI API:', error.message);
          resolve(false);
        });

        req.end();
      });
      
    } catch (error) {
      console.error('❌ [VoiceHandler] Ошибка проверки OpenAI API:', error.message);
      return false;
    }
  }

  /**
   * 🚀 Инициализация и проверка всех зависимостей
   * @returns {Promise<boolean>} - true если все готово к работе
   */
  async initialize() {
    console.log('🚀 [VoiceHandler] Инициализация модуля голосовых сообщений...');
    
    const ffmpegOk = await this.checkFFmpegAvailability();
    const openaiOk = await this.checkOpenAIAvailability();
    
    if (!ffmpegOk) {
      console.log('📦 [VoiceHandler] Для установки FFmpeg выполните: apt update && apt install -y ffmpeg');
    }
    
    if (!openaiOk) {
      console.log('🔑 [VoiceHandler] Добавьте OPENAI_API_KEY в файл .env');
    }
    
    const isReady = ffmpegOk && openaiOk;
    
    if (isReady) {
      console.log('🎉 [VoiceHandler] Модуль готов к обработке голосовых сообщений!');
    } else {
      console.log('⚠️ [VoiceHandler] Модуль не готов. Необходимо устранить проблемы выше.');
    }
    
    return isReady;
  }
}

module.exports = VoiceHandler;