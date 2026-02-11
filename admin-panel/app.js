class AdminPanel {
    constructor() {
        this.apiUrl = 'http://localhost:5000/api/admin';
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 'dashboard';
        this.currentWithdrawRequest = null;
        
        this.initializeEventListeners();
        this.initializePanel();
    }

    async initializePanel() {
        // Проверка аутентификации админа
        if (this.isAuthenticated()) {
            await this.loadDashboardData();
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