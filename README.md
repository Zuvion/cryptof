# Crypto Exchange Platform

Биржа криптовалют с поддержкой Telegram Mini App и CryptoBot.

## Функциональность

### Для пользователей:
- Авторизация через Telegram
- Пополнение баланса через CryptoBot (USDT, BTC, ETH, TON)
- Торговля на рынке с реальными ценами
- Заявки на вывод средств на банковскую карту
- Личный кабинет с историей операций
- Уведомления и статистика

### Для администраторов:
- Панель управления пользователями
- Просмотр и обработка заявок на вывод
- Управление балансами пользователей
- Логирование всех действий
- Статистика и отчеты

## Стек технологий

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT авторизация
- CryptoBot API

### Frontend
- HTML5 + CSS3
- Vanilla JavaScript
- Telegram Mini App API

### Admin Panel
- HTML5 + CSS3
- Vanilla JavaScript

## Установка и запуск

### 1. Установка зависимостей

```bash
cd backend
npm install
```

### 2. Настройка окружения

Создайте файл `.env` в папке backend и заполните следующие переменные:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/cryptoexchange
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
CRYPTOPAY_API_TOKEN=529962:AAgtpxCY9UaJvJm7tSwcvLDdDsqsoaxEbdo
CRYPTOPAY_TESTNET=false
TELEGRAM_BOT_TOKEN=8237524257:AAEh7uBfzx-Cr0et0r7bbGt3l0kAgPCWkvQ
TELEGRAM_ADMIN_ID=5394437781
```

### 3. Запуск MongoDB

Убедитесь, что MongoDB запущен на вашем компьютере или используйте облачный сервис.

### 4. Запуск сервера

```bash
cd backend
npm run dev
```

Сервер запустится на порту 5000.

### 5. Запуск frontend

Откройте файл `frontend/index.html` в браузере или используйте локальный сервер:

```bash
# Для Node.js
npm install -g http-server
cd frontend
http-server -p 3000
```

### 6. Запуск админ-панели

Откройте файл `admin-panel/index.html` в браузере или используйте локальный сервер:

```bash
cd admin-panel
http-server -p 3001
```

## API эндпоинты

### Публичные
- `POST /api/auth/login` - Вход через Telegram
- `GET /api/market/ticker` - Получение курсов валют

### Закрытые (требуют авторизации)
- `GET /api/user/balance` - Просмотр баланса
- `POST /api/deposit/create` - Создание депозита
- `POST /api/withdraw/create` - Создание заявки на вывод
- `GET /api/transactions` - История транзакций
- `GET /api/orders` - История ордеров
- `POST /api/order/create` - Создание ордера
- `POST /api/order/cancel` - Отмена ордера

### Административные (требуют админских прав)
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/users/:id` - Детали пользователя
- `PUT /api/admin/users/:id/balance` - Изменение баланса
- `GET /api/admin/withdraw` - Список заявок на вывод
- `PUT /api/admin/withdraw/:id/status` - Изменение статуса заявки
- `GET /api/admin/transactions` - Все транзакции
- `GET /api/admin/actions` - Логи действий

## Использование

### Для пользователей:
1. Откройте приложение в браузере
2. Авторизуйтесь через Telegram
3. Пополните баланс через CryptoBot
4. Торгуйте на рынке
5. Создайте заявку на вывод средств

### Для администраторов:
1. Откройте админ-панель
2. Авторизуйтесь (в демонстрационном режиме автоматическая авторизация)
3. Просматривайте и обрабатывайте заявки на вывод
4. Управляйте пользователями и балансами
5. Просматривайте логи и статистику

## Безопасность

- Все запросы защищены JWT токенами
- Пароли хранятся в хэшированном виде
- Ограничение по скорости запросов
- Поддержка HTTPS
- Логирование всех действий

## Лицензия

MIT License