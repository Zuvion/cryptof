const express = require('express');
const router = express.Router();

// Маршрут для получения исторических данных рынка
router.get('/history', async (req, res) => {
    try {
        const { pair, timeframe } = req.query;
        
        if (!pair || !timeframe) {
            return res.status(400).json({
                success: false,
                message: 'Не указаны параметры pair или timeframe'
            });
        }
        
        // Получение исторических данных для графика
        const data = await getHistoricalData(pair, timeframe);
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Ошибка при получении исторических данных:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении исторических данных'
        });
    }
});

// Функция для получения исторических данных (mock data для демонстрации)
async function getHistoricalData(pair, timeframe) {
    const now = Math.floor(Date.now() / 1000);
    const interval = getTimeframeInterval(timeframe);
    const data = [];
    
    let basePrice = 10000;
    if (pair === 'ETHUSDT') basePrice = 500;
    if (pair === 'TONUSDT') basePrice = 2;
    
    for (let i = 100; i > 0; i--) {
        const time = now - i * interval;
        const volatility = 0.02;
        const changePercent = (Math.random() - 0.5) * volatility;
        
        basePrice = basePrice * (1 + changePercent);
        const open = basePrice;
        const high = basePrice * (1 + Math.random() * volatility);
        const low = basePrice * (1 - Math.random() * volatility);
        const close = low + Math.random() * (high - low);

        data.push({
            time: time,
            open: open.toFixed(2),
            high: high.toFixed(2),
            low: low.toFixed(2),
            close: close.toFixed(2),
            volume: Math.floor(Math.random() * 1000) + 100
        });
    }
    
    return data;
}

// Функция для определения интервала по таймфрейму
function getTimeframeInterval(timeframe) {
    const intervals = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400,
        '1w': 604800,
        '1M': 2592000
    };
    
    return intervals[timeframe] || 3600;
}

module.exports = router;