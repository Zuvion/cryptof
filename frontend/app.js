class CryptoExchangeApp {
    constructor() {
        this.apiUrl = 'http://localhost:5000/api';
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 'dashboard';
        this.currentWithdrawRequest = null;
        this.currentTradingPair = 'BTC/USDT';
        this.currentTimeframe = '1h';
        this.currentChartType = 'candles';
        this.chart = null;
        this.series = null;
        this.indicators = [];
        
        this.initializeEventListeners();
        this.initializePanel();
    }

    async initializePanel() {
        // Проверка аутентификации админа
        if (this.isAuthenticated()) {
            await this.loadDashboardData();
            this.initializeTradingChart();
        } else {
            this.showLoginForm();
        }
    }

    isAuthenticated() {
        // Проверка наличия токена и его валидности
        if (!this.token) return false;
        
        try {
            const decoded = JSON.parse(atob(this.token.split('.')[1]));
            const isAdmin = decoded.isAdmin === true;
            const isExpired = decoded.exp * 1000 < Date.now();
            
            return isAdmin && !isExpired;
        } catch (error) {
            return false;
        }
    }

    showLoginForm() {
        // Реализация формы входа для админа
        // Для тестирования используем автоматический вход
        this.token = this.generateTestToken();
        localStorage.setItem('adminToken', this.token);
        this.initializePanel();
    }

    generateTestToken() {
        // Генерация тестового токена для демонстрации
        const payload = {
            id: 'admin1',
            username: 'Admin',
            isAdmin: true,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
        };
        
        return btoa(JSON.stringify(payload));
    }

    initializeEventListeners() {
        // Навигационные ссылки
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Поиск пользователей
        document.getElementById('userSearch').addEventListener('input', (e) => this.searchUsers(e.target.value));

        // Кнопки модальных окон
        document.getElementById('closeUserDetailsModal').addEventListener('click', () => this.closeModal('userDetailsModal'));
        document.getElementById('closeWithdrawDetailsModal').addEventListener('click', () => this.closeModal('withdrawDetailsModal'));
        
        // Действия с заявками на вывод
        document.getElementById('approveWithdrawBtn').addEventListener('click', () => this.approveWithdraw());
        document.getElementById('rejectWithdrawBtn').addEventListener('click', () => this.rejectWithdraw());

        // Trading View Controls
        document.getElementById('pairSelect').addEventListener('change', (e) => this.changeTradingPair(e.target.value));
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeTimeframe(e.target.dataset.timeframe));
        });
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeChartType(e.target.dataset.type));
        });
        document.getElementById('addIndicatorBtn').addEventListener('click', () => this.showIndicatorSelector());
    }

    handleNavigation(event) {
        event.preventDefault();
        const navItem = event.currentTarget;
        const page = navItem.dataset.page;
        
        // Обновление активного пункта меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        // Переключение страниц
        this.switchPage(page);
    }

    async switchPage(page) {
        // Скрытие всех страниц
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Показываем выбранную страницу
        document.getElementById(page).classList.add('active');
        
        // Обновление заголовка
        const pageTitle = this.getPageTitle(page);
        document.getElementById('pageTitle').textContent = pageTitle;
        
        // Загрузка данных для страницы
        switch(page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            case 'withdraw':
                await this.loadWithdrawRequests();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'orders':
                await this.loadOrders();
                break;
            case 'actions':
                await this.loadAdminActions();
                break;
        }
        
        this.currentPage = page;
    }

    getPageTitle(page) {
        const titles = {
            dashboard: 'Панель управления',
            users: 'Пользователи',
            withdraw: 'Заявки на вывод',
            transactions: 'Транзакции',
            orders: 'Ордера',
            actions: 'Журнал действий'
        };
        
        return titles[page] || 'Панель управления';
    }

    // Trading Chart Methods
    initializeTradingChart() {
        const chartContainer = document.getElementById('tradingChart');
        
        // Create chart
        this.chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: 400,
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Create series based on chart type
        this.createChartSeries(this.currentChartType);
        
        // Load initial data
        this.loadChartData();
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.chart.applyOptions({
                width: chartContainer.clientWidth,
            });
        });
    }

    createChartSeries(type) {
        // Remove existing series
        if (this.series) {
            this.chart.removeSeries(this.series);
            this.series = null;
        }

        // Create new series based on type
        switch(type) {
            case 'candles':
                this.series = this.chart.addCandlestickSeries({
                    upColor: '#4CAF50',
                    downColor: '#f44336',
                    borderVisible: false,
                    wickUpColor: '#4CAF50',
                    wickDownColor: '#f44336',
                });
                break;
            case 'bars':
                this.series = this.chart.addHistogramSeries({
                    color: '#26a69a',
                    priceFormat: { type: 'volume' },
                });
                break;
            case 'area':
                this.series = this.chart.addAreaSeries({
                    topColor: '#2962FF',
                    bottomColor: 'rgba(41, 98, 255, 0.28)',
                    lineColor: '#2962FF',
                    lineWidth: 2,
                });
                break;
        }
    }

    async loadChartData() {
        try {
            const response = await this.fetchApi(`/market/history?pair=${this.currentTradingPair.replace('/', '')}&timeframe=${this.currentTimeframe}`);
            const data = this.formatChartData(response.data.data);
            this.series.setData(data);
            
            // Update indicators if they are active
            this.updateIndicators();
        } catch (error) {
            console.error('Error loading chart data:', error);
            // Generate mock data if API fails
            this.series.setData(this.generateMockData());
        }
    }

    formatChartData(rawData) {
        return rawData.map(d => ({
            time: d.time,
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
            volume: parseFloat(d.volume),
        }));
    }

    generateMockData() {
        const data = [];
        const now = Math.floor(Date.now() / 1000);
        const interval = this.getTimeframeInterval(this.currentTimeframe);
        let price = 10000;

        for (let i = 100; i > 0; i--) {
            const time = now - i * interval;
            const volatility = 0.02;
            const changePercent = (Math.random() - 0.5) * volatility;
            
            price = price * (1 + changePercent);
            const open = price;
            const high = price * (1 + Math.random() * volatility);
            const low = price * (1 - Math.random() * volatility);
            const close = low + Math.random() * (high - low);

            data.push({
                time: time,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: Math.floor(Math.random() * 1000) + 100,
            });
        }

        return data;
    }

    getTimeframeInterval(timeframe) {
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

    changeTradingPair(pair) {
        this.currentTradingPair = pair;
        this.loadChartData();
    }

    changeTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        
        // Update active button
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === timeframe) {
                btn.classList.add('active');
            }
        });

        this.loadChartData();
    }

    changeChartType(type) {
        this.currentChartType = type;
        
        // Update active button
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });

        this.createChartSeries(type);
        this.loadChartData();
    }

    showIndicatorSelector() {
        // Check if user is premium
        const isPremium = this.currentUser && this.currentUser.verificationLevel === 'premium';
        
        if (!isPremium) {
            this.showNotification('Индикаторы доступны только для Premium-аккаунтов', 'warning');
            return;
        }

        // Show indicator selector (can be expanded with more indicators)
        const indicators = ['RSI', 'MA', 'EMA', 'Bollinger Bands'];
        const indicator = prompt('Выберите индикатор:', indicators.join(', '));
        
        if (indicator && indicators.includes(indicator)) {
            this.addIndicator(indicator);
        }
    }

    addIndicator(indicator) {
        switch(indicator) {
            case 'MA':
                this.addMovingAverage();
                break;
            case 'EMA':
                this.addExponentialMovingAverage();
                break;
            case 'RSI':
                this.addRSI();
                break;
            case 'Bollinger Bands':
                this.addBollingerBands();
                break;
        }
    }

    addMovingAverage() {
        const period = parseInt(prompt('Период (по умолчанию 20):') || '20');
        
        // Calculate MA data
        const data = this.calculateMA(this.series.data(), period);
        
        // Add MA series to chart
        const maSeries = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            title: `MA${period}`,
        });
        
        maSeries.setData(data);
        this.indicators.push({ name: 'MA', period: period, series: maSeries });
        
        this.showNotification(`Moving Average (${period}) добавлен`, 'success');
    }

    addExponentialMovingAverage() {
        const period = parseInt(prompt('Период (по умолчанию 12):') || '12');
        
        // Calculate EMA data
        const data = this.calculateEMA(this.series.data(), period);
        
        // Add EMA series to chart
        const emaSeries = this.chart.addLineSeries({
            color: '#FFA726',
            lineWidth: 2,
            title: `EMA${period}`,
        });
        
        emaSeries.setData(data);
        this.indicators.push({ name: 'EMA', period: period, series: emaSeries });
        
        this.showNotification(`Exponential Moving Average (${period}) добавлен`, 'success');
    }

    addRSI() {
        const period = parseInt(prompt('Период (по умолчанию 14):') || '14');
        
        // Calculate RSI data
        const data = this.calculateRSI(this.series.data(), period);
        
        // Add RSI series to chart
        const rsiSeries = this.chart.addLineSeries({
            color: '#667eea',
            lineWidth: 2,
            title: `RSI${period}`,
        });
        
        rsiSeries.setData(data);
        this.indicators.push({ name: 'RSI', period: period, series: rsiSeries });
        
        this.showNotification(`RSI (${period}) индикатор добавлен`, 'success');
    }

    addBollingerBands() {
        const period = parseInt(prompt('Период (по умолчанию 20):') || '20');
        const deviation = parseFloat(prompt('Отклонение (по умолчанию 2):') || '2');
        
        // Calculate Bollinger Bands data
        const { upper, middle, lower } = this.calculateBollingerBands(this.series.data(), period, deviation);
        
        // Add Bollinger Bands series to chart
        const upperSeries = this.chart.addLineSeries({
            color: '#FF6B6B',
            lineWidth: 1,
            title: 'BB Upper',
        });
        
        const middleSeries = this.chart.addLineSeries({
            color: '#4ECDC4',
            lineWidth: 2,
            title: 'BB Middle',
        });
        
        const lowerSeries = this.chart.addLineSeries({
            color: '#FF6B6B',
            lineWidth: 1,
            title: 'BB Lower',
        });
        
        upperSeries.setData(upper);
        middleSeries.setData(middle);
        lowerSeries.setData(lower);
        
        this.indicators.push({ name: 'Bollinger Bands', period: period, deviation: deviation, series: [upperSeries, middleSeries, lowerSeries] });
        
        this.showNotification('Bollinger Bands добавлены', 'success');
    }

    updateIndicators() {
        // Recalculate and update all active indicators
        this.indicators.forEach(indicator => {
            switch(indicator.name) {
                case 'MA':
                    indicator.series.setData(this.calculateMA(this.series.data(), indicator.period));
                    break;
                case 'EMA':
                    indicator.series.setData(this.calculateEMA(this.series.data(), indicator.period));
                    break;
                case 'RSI':
                    indicator.series.setData(this.calculateRSI(this.series.data(), indicator.period));
                    break;
                case 'Bollinger Bands':
                    const { upper, middle, lower } = this.calculateBollingerBands(this.series.data(), indicator.period, indicator.deviation);
                    indicator.series[0].setData(upper);
                    indicator.series[1].setData(middle);
                    indicator.series[2].setData(lower);
                    break;
            }
        });
    }

    // Indicator Calculations
    calculateMA(data, period) {
        const result = [];
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            sum += data[i].close;
            
            if (i >= period - 1) {
                const average = sum / period;
                result.push({
                    time: data[i].time,
                    value: average.toFixed(2),
                });
                sum -= data[i - period + 1].close;
            } else {
                result.push({
                    time: data[i].time,
                    value: null,
                });
            }
        }

        return result;
    }

    calculateEMA(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        let ema;

        for (let i = 0; i < data.length; i++) {
            if (i === period - 1) {
                // Calculate initial SMA
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += data[j].close;
                }
                ema = sum / period;
            } else if (i > period - 1) {
                // Calculate EMA
                ema = (data[i].close - ema) * multiplier + ema;
            }

            result.push({
                time: data[i].time,
                value: ema ? ema.toFixed(2) : null,
            });
        }

        return result;
    }

    calculateRSI(data, period) {
        const result = [];
        const changes = [];

        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            changes.push(change);
        }

        for (let i = period - 1; i < changes.length; i++) {
            let gains = 0;
            let losses = 0;

            for (let j = i - period + 1; j <= i; j++) {
                if (changes[j] > 0) {
                    gains += changes[j];
                } else {
                    losses += Math.abs(changes[j]);
                }
            }

            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            result.push({
                time: data[i + 1].time,
                value: rsi.toFixed(2),
            });
        }

        return result;
    }

    calculateBollingerBands(data, period, deviation) {
        const upper = [];
        const middle = [];
        const lower = [];

        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }

            const sma = sum / period;
            
            let sumSq = 0;
            for (let j = i - period + 1; j <= i; j++) {
                const diff = data[j].close - sma;
                sumSq += diff * diff;
            }

            const variance = sumSq / period;
            const std = Math.sqrt(variance);
            
            upper.push({
                time: data[i].time,
                value: (sma + deviation * std).toFixed(2),
            });
            
            middle.push({
                time: data[i].time,
                value: sma.toFixed(2),
            });
            
            lower.push({
                time: data[i].time,
                value: (sma - deviation * std).toFixed(2),
            });
        }

        return { upper, middle, lower };
    }

    async loadDashboardData() {
        try {
            const response = await this.fetchApi('/dashboard');
            
            // Обновление статистики
            document.getElementById('totalUsers').textContent = response.data.statistics.totalUsers;
            document.getElementById('pendingWithdraw').textContent = response.data.statistics.pendingWithdraw;
            document.getElementById('totalTransactions').textContent = response.data.statistics.totalTransactions;
            document.getElementById('activeOrders').textContent = response.data.statistics.activeOrders;
            
            // Загрузка последних действий
            this.updateRecentActivity(response.data.recentActivity);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateRecentActivity(actions) {
        const activityList = document.getElementById('activityList');
        
        activityList.innerHTML = '';
        
        actions.forEach(action => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z"></path>
                    </svg>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${action.action}</div>
                    <div class="activity-time">${new Date(action.createdAt).toLocaleString('ru')}</div>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
    }

    async loadUsersData() {
        try {
            const response = await this.fetchApi('/users');
            const usersTableBody = document.getElementById('usersTableBody');
            
            usersTableBody.innerHTML = '';
            
            response.data.users.forEach(user => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${user.telegramId}</td>
                    <td>${user.telegramFirstName} ${user.telegramLastName}</td>
                    <td>${user.telegramUsername || '-'}</td>
                    <td>${(user.balance.get('USDT') || 0).toFixed(2)} USDT</td>
                    <td><span class="badge ${user.status}">${this.getStatusText(user.status)}</span></td>
                    <td><span class="badge ${user.verificationLevel}">${this.getVerificationText(user.verificationLevel)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminPanel.showUserDetails('${user._id}')">
                            Просмотр
                        </button>
                    </td>
                `;
                
                usersTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading users data:', error);
        }
    }

    async searchUsers(query) {
        try {
            const url = query ? `/users?search=${encodeURIComponent(query)}` : '/users';
            const response = await this.fetchApi(url);
            
            const usersTableBody = document.getElementById('usersTableBody');
            usersTableBody.innerHTML = '';
            
            response.data.users.forEach(user => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${user.telegramId}</td>
                    <td>${user.telegramFirstName} ${user.telegramLastName}</td>
                    <td>${user.telegramUsername || '-'}</td>
                    <td>${(user.balance.get('USDT') || 0).toFixed(2)} USDT</td>
                    <td><span class="badge ${user.status}">${this.getStatusText(user.status)}</span></td>
                    <td><span class="badge ${user.verificationLevel}">${this.getVerificationText(user.verificationLevel)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminPanel.showUserDetails('${user._id}')">
                            Просмотр
                        </button>
                    </td>
                `;
                
                usersTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    async showUserDetails(userId) {
        try {
            const response = await this.fetchApi(`/users/${userId}`);
            const user = response.data.user;
            
            const userDetailsContent = document.getElementById('userDetailsContent');
            userDetailsContent.innerHTML = `
                <div class="detail-item">
                    <label>Telegram ID</label>
                    <span>${user.telegramId}</span>
                </div>
                <div class="detail-item">
                    <label>Имя</label>
                    <span>${user.telegramFirstName} ${user.telegramLastName}</span>
                </div>
                <div class="detail-item">
                    <label>Юзернейм</label>
                    <span>${user.telegramUsername || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Email</label>
                    <span>${user.email || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Телефон</label>
                    <span>${user.phone || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Статус</label>
                    <span><span class="badge ${user.status}">${this.getStatusText(user.status)}</span></span>
                </div>
                <div class="detail-item">
                    <label>Верификация</label>
                    <span><span class="badge ${user.verificationLevel}">${this.getVerificationText(user.verificationLevel)}</span></span>
                </div>
                <div class="detail-item">
                    <label>Баланс BTC</label>
                    <span>${(user.balance.get('BTC') || 0).toFixed(4)} BTC</span>
                </div>
                <div class="detail-item">
                    <label>Баланс ETH</label>
                    <span>${(user.balance.get('ETH') || 0).toFixed(4)} ETH</span>
                </div>
                <div class="detail-item">
                    <label>Баланс USDT</label>
                    <span>${(user.balance.get('USDT') || 0).toFixed(2)} USDT</span>
                </div>
                <div class="detail-item">
                    <label>Баланс TON</label>
                    <span>${(user.balance.get('TON') || 0).toFixed(4)} TON</span>
                </div>
                <div class="detail-item">
                    <label>Дата регистрации</label>
                    <span>${new Date(user.createdAt).toLocaleString('ru')}</span>
                </div>
            `;
            
            document.getElementById('userDetailsModal').classList.add('active');
        } catch (error) {
            console.error('Error loading user details:', error);
        }
    }

    async loadWithdrawRequests() {
        try {
            const response = await this.fetchApi('/withdraw');
            const withdrawTableBody = document.getElementById('withdrawTableBody');
            
            withdrawTableBody.innerHTML = '';
            
            response.data.requests.forEach(request => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${request._id}</td>
                    <td>${request.userId?.telegramUsername || request.userId?.telegramId || '-'}</td>
                    <td>${request.asset}</td>
                    <td>${request.amount.toFixed(2)} ${request.asset}</td>
                    <td><span class="badge ${request.status}">${this.getStatusText(request.status)}</span></td>
                    <td>${new Date(request.createdAt).toLocaleString('ru')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminPanel.showWithdrawDetails('${request._id}')">
                            Просмотр
                        </button>
                    </td>
                `;
                
                withdrawTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading withdraw requests:', error);
        }
    }

    async showWithdrawDetails(requestId) {
        try {
            const response = await this.fetchApi(`/withdraw/${requestId}`);
            this.currentWithdrawRequest = response.data;
            
            const withdrawDetailsContent = document.getElementById('withdrawDetailsContent');
            withdrawDetailsContent.innerHTML = `
                <div class="detail-item">
                    <label>ID заявки</label>
                    <span>${this.currentWithdrawRequest._id}</span>
                </div>
                <div class="detail-item">
                    <label>Пользователь</label>
                    <span>${this.currentWithdrawRequest.userId?.telegramUsername || this.currentWithdrawRequest.userId?.telegramId || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Валюта</label>
                    <span>${this.currentWithdrawRequest.asset}</span>
                </div>
                <div class="detail-item">
                    <label>Сумма</label>
                    <span>${this.currentWithdrawRequest.amount.toFixed(2)} ${this.currentWithdrawRequest.asset}</span>
                </div>
                <div class="detail-item">
                    <label>Комиссия</label>
                    <span>${this.currentWithdrawRequest.fee.toFixed(2)} ${this.currentWithdrawRequest.asset}</span>
                </div>
                <div class="detail-item">
                    <label>Статус</label>
                    <span><span class="badge ${this.currentWithdrawRequest.status}">${this.getStatusText(this.currentWithdrawRequest.status)}</span></span>
                </div>
                <div class="detail-item">
                    <label>Номер карты</label>
                    <span>${this.currentWithdrawRequest.paymentDetails?.cardNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Имя на карте</label>
                    <span>${this.currentWithdrawRequest.paymentDetails?.cardHolder || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Телефон</label>
                    <span>${this.currentWithdrawRequest.paymentDetails?.phoneNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Дата создания</label>
                    <span>${new Date(this.currentWithdrawRequest.createdAt).toLocaleString('ru')}</span>
                </div>
                ${this.currentWithdrawRequest.reviewInfo ? `
                    <div class="detail-item">
                        <label>Проверено</label>
                        <span>${new Date(this.currentWithdrawRequest.reviewInfo.reviewedAt).toLocaleString('ru')}</span>
                    </div>
                    <div class="detail-item">
                        <label>Примечание</label>
                        <span>${this.currentWithdrawRequest.reviewInfo.reviewNotes || '-'}</span>
                    </div>
                ` : ''}
            `;
            
            document.getElementById('withdrawDetailsModal').classList.add('active');
        } catch (error) {
            console.error('Error loading withdraw details:', error);
        }
    }

    async approveWithdraw() {
        if (!this.currentWithdrawRequest) return;
        
        try {
            await this.fetchApi(`/withdraw/${this.currentWithdrawRequest._id}/status`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'approved',
                    reviewNotes: 'Заявка одобрена'
                })
            });
            
            this.closeModal('withdrawDetailsModal');
            this.showNotification('Заявка одобрена', 'success');
            await this.loadWithdrawRequests();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error approving withdraw:', error);
            this.showNotification('Ошибка при одобрении заявки', 'error');
        }
    }

    async rejectWithdraw() {
        if (!this.currentWithdrawRequest) return;
        
        try {
            await this.fetchApi(`/withdraw/${this.currentWithdrawRequest._id}/status`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'rejected',
                    reviewNotes: 'Заявка отклонена'
                })
            });
            
            this.closeModal('withdrawDetailsModal');
            this.showNotification('Заявка отклонена', 'success');
            await this.loadWithdrawRequests();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error rejecting withdraw:', error);
            this.showNotification('Ошибка при отклонении заявки', 'error');
        }
    }

    async loadTransactions() {
        try {
            const response = await this.fetchApi('/transactions');
            const transactionsTableBody = document.getElementById('transactionsTableBody');
            
            transactionsTableBody.innerHTML = '';
            
            response.data.transactions.forEach(transaction => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${transaction._id}</td>
                    <td>${transaction.userId?.telegramUsername || transaction.userId?.telegramId || '-'}</td>
                    <td>${this.getTransactionTypeText(transaction.type)}</td>
                    <td>${transaction.asset}</td>
                    <td>${transaction.amount.toFixed(2)} ${transaction.asset}</td>
                    <td><span class="badge ${transaction.status}">${this.getStatusText(transaction.status)}</span></td>
                    <td>${new Date(transaction.createdAt).toLocaleString('ru')}</td>
                `;
                
                transactionsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    async loadOrders() {
        try {
            const response = await this.fetchApi('/orders');
            const ordersTableBody = document.getElementById('ordersTableBody');
            
            ordersTableBody.innerHTML = '';
            
            response.data.orders.forEach(order => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${order._id}</td>
                    <td>${order.userId?.telegramUsername || order.userId?.telegramId || '-'}</td>
                    <td>${order.pair}</td>
                    <td>${order.type.toUpperCase()}</td>
                    <td>${order.price.toFixed(2)}</td>
                    <td>${order.amount.toFixed(4)}</td>
                    <td><span class="badge ${order.status}">${this.getStatusText(order.status)}</span></td>
                    <td>${new Date(order.createdAt).toLocaleString('ru')}</td>
                `;
                
                ordersTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    async loadAdminActions() {
        try {
            const response = await this.fetchApi('/actions');
            const actionsTableBody = document.getElementById('actionsTableBody');
            
            actionsTableBody.innerHTML = '';
            
            response.data.actions.forEach(action => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${new Date(action.createdAt).toLocaleString('ru')}</td>
                    <td>${action.adminId?.telegramUsername || action.adminId?.telegramId || '-'}</td>
                    <td>${action.action}</td>
                    <td>${action.targetType || '-'}</td>
                    <td>${action.description || '-'}</td>
                `;
                
                actionsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading admin actions:', error);
        }
    }

    async fetchApi(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };
        
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            ...defaultOptions,
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
            throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    }

    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Устанавливаем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            transform: translateY(-100px);
            transition: transform 0.3s;
            font-weight: 500;
        `;
        
        // Добавляем уведомление на страницу
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateY(-100px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        if (modalId === 'withdrawDetailsModal') {
            this.currentWithdrawRequest = null;
        }
    }

    getStatusText(status) {
        const statuses = {
            active: 'Активен',
            blocked: 'Заблокирован',
            pending: 'Ожидает',
            completed: 'Завершен',
            rejected: 'Отклонен',
            approved: 'Одобрен',
            cancelled: 'Отменен',
            failed: 'Ошибка'
        };
        
        return statuses[status] || status;
    }

    getVerificationText(level) {
        const levels = {
            basic: 'Базовый',
            verified: 'Верифицирован',
            premium: 'Premium'
        };
        
        return levels[level] || level;
    }

    getTransactionTypeText(type) {
        const types = {
            deposit: 'Пополнение',
            withdraw: 'Вывод',
            trade: 'Торговля',
            admin: 'Административная'
        };
        
        return types[type] || type;
    }
}

// Инициализация админ-панели при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});