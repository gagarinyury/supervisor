const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Contact form endpoint
app.post('/contact', async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        
        console.log('Received contact form:', { name, phone, message });
        
        // Validate required fields
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Имя и телефон обязательны'
            });
        }
        
        // Sanitize input
        const sanitizedData = {
            name: name.trim().substring(0, 100),
            phone: phone.trim().substring(0, 20),
            message: message ? message.trim().substring(0, 500) : ''
        };
        
        // Save to log file
        const logData = {
            timestamp: new Date().toISOString(),
            ...sanitizedData,
            ip: req.ip || 'unknown'
        };
        
        const logFile = '/var/www/profy.top/psy/contacts.log';
        fs.appendFileSync(logFile, JSON.stringify(logData) + '\n');
        console.log('Saved to log file');
        
        // Send Telegram notification
        const success = await sendTelegramNotification(sanitizedData.name, sanitizedData.phone, sanitizedData.message);
        console.log('Telegram notification result:', success);
        
        res.json({
            success: true,
            message: 'Спасибо! Ваша заявка отправлена. Я свяжусь с вами в ближайшее время.',
            telegram_sent: success
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        
        res.json({
            success: true, // Always show success to user
            message: 'Спасибо! Ваша заявка принята. Я свяжусь с вами в ближайшее время.'
        });
    }
});

// Function to send Telegram notification
function sendTelegramNotification(name, phone, message) {
    return new Promise((resolve) => {
        const scriptPath = '/root/supervisor/send-notification.js';
        const child = spawn('node', [scriptPath, name, phone, message]);
        
        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.on('close', (code) => {
            try {
                const result = JSON.parse(output);
                resolve(result.success);
            } catch (e) {
                console.error('Failed to parse notification result:', e);
                resolve(false);
            }
        });
        
        child.on('error', (error) => {
            console.error('Notification script error:', error);
            resolve(false);
        });
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'contact-api' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Contact API server running on port ${PORT}`);
});

module.exports = app;