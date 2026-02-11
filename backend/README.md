# Crypto Exchange Backend

Backend для криптовалютной биржи с поддержкой Telegram Mini App и CryptoBot.

## Требования

- Node.js 16+
- MongoDB 4.0+
- npm или yarn

## Установка

1. Клонируйте репозиторий
2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` с необходимыми переменными окружения:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crypto-exchange
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=30d
CRYPTObot_API_TOKEN=your_cryptobot_api_token
CRYPTObot_TEST_NETWORK=false
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_IDS=123456789,987654321
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшн
```bash
npm start
```

### Тесты
```bash
npm test
```

## API endpoints

### Аутентификация
- `POST /api/auth/login` - Вход через Telegram
- `GET /api/auth/me` - Получить текущего пользователя
- `PUT /api/auth/me` - Обновить профиль
- `PUT /api/auth/kyc` - Обновить KYC данные

### Транзакции
- `GET /api/transactions` - Получить список транзакций
- `GET /api/transactions/:id` - Получить транзакцию по ID
- `POST /api/transactions/deposit` - Создать депозитный инвойс

### Вывод средств
- `GET /api/withdraw` - Получить список заявок на вывод
- `GET /api/withdraw/:id` - Получить заявку на вывод по ID
- `POST /api/withdraw` - Создать заявку на вывод
- `PUT /api/withdraw/:id/cancel` - Отменить заявку на вывод

### Ордера
- `GET /api/orders` - Получить список ордеров
- `GET /api/orders/:id` - Получить ордер по ID
- `POST /api/orders` - Создать ордер
- `PUT /api/orders/:id/cancel` - Отменить ордер

### Рыночный данные
- `GET /api/market/pairs` - Получить список доступных торговых пар
- `GET /api/market/ticker` - Получить котировки
- `GET /api/market/orderbook` - Получить ордербук
- `GET /api/market/trades` - Получить историю торгов

### CryptoBot
- `POST /api/cryptobot/webhook` - Webhook для CryptoBot
- `GET /api/cryptobot/test` - Тест соединения с CryptoBot
- `POST /api/cryptobot/invoice` - Создать инвойс
- `GET /api/cryptobot/invoice/:id` - Получить инвойс

### Админ-панель
- `GET /api/admin/users` - Получить список пользователей
- `GET /api/admin/users/:id` - Получить пользователя по ID
- `PUT /api/admin/users/:id/status` - Обновить статус пользователя
- `PUT /api/admin/users/:id/verification` - Обновить уровень верификации
- `PUT /api/admin/users/:id/balance` - Обновить баланс пользователя
- `GET /api/admin/withdraw` - Получить заявки на вывод
- `PUT /api/admin/withdraw/:id/status` - Обновить статус заявки
- `GET /api/admin/transactions` - Получить транзакции
- `GET /api/admin/actions` - Получить лог действий

## Технологический стек

- Node.js
- Express.js
- MongoDB с Mongoose
- JSON Web Tokens (JWT) для аутентификации
- CryptoBot API для обработки платежей
- Binance API для получения рыночных данных