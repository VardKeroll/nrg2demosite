/**
 * NRG-UA Partner Cabinet JavaScript
 */

const API_URL = 'http://localhost:8001/api';
let authToken = localStorage.getItem('nrg_partner_token') || null;
let currentPartner = null;
let cart = JSON.parse(localStorage.getItem('nrg_cart') || '[]');
let favorites = JSON.parse(localStorage.getItem('nrg_favorites') || '[]');

// Demo Data
const demoData = {
    partner: {
        id: 1,
        company_name: 'ТОВ "Світло-Сервіс"',
        legal_name: 'ТОВ "Світло-Сервіс"',
        edrpou: '12345678',
        contact_name: 'Олександр Петренко',
        email: 'partner@test.com',
        phone: '+380501234567',
        city: 'Київ',
        address: 'вул. Хрещатик, 1',
        region_id: 9,
        status: 'active',
        partner_type: 'wholesale',
        price_level: 'wholesale',
        balance: 15000,
        credit_limit: 50000,
        discount_percent: 5
    },
    manager: {
        id: 1,
        full_name: 'Олександр Петренко',
        phone: '+380501234567',
        email: 'petrenk@nrg-ua.com',
        telegram: '@petrenk_nrg',
        photo: null,
        region: 'Київська область'
    },
    tags: [
        { id: 1, name: 'LED освітлення', slug: 'led-lighting', color: '#10b981' },
        { id: 2, name: 'Енергозбереження', slug: 'energy-saving', color: '#6366f1' },
        { id: 3, name: 'Акумулятори', slug: 'batteries', color: '#f59e0b' },
        { id: 4, name: 'Садовий інструмент', slug: 'garden-tools', color: '#22c55e' },
        { id: 5, name: 'Новинки', slug: 'new-arrivals', color: '#ef4444' }
    ],
    products: [
        { id: 1, sku: 'BAT-001', name_uk: 'Батарейка Energizer AA', category_id: 2, category_name: 'Елементи живлення', brand_name: 'Energizer', price_retail: 45, my_price: 32, stock_quantity: 5000, is_active: true, tags: [3] },
        { id: 2, sku: 'LED-001', name_uk: 'LED лампа Philips 10W', category_id: 1, category_name: 'Світлотехніка', brand_name: 'Philips', price_retail: 89, my_price: 65, stock_quantity: 1200, is_active: true, tags: [1, 2] },
        { id: 3, sku: 'GRD-001', name_uk: 'Шланг садовий Gardena 25м', category_id: 3, category_name: 'Сад і город', brand_name: 'Gardena', price_retail: 850, my_price: 680, stock_quantity: 150, is_active: true, tags: [4] },
        { id: 4, sku: 'BAT-002', name_uk: 'Батарейка GP AAA 4шт', category_id: 2, category_name: 'Елементи живлення', brand_name: 'GP Batteries', price_retail: 65, my_price: 48, stock_quantity: 3500, is_active: true, tags: [3] },
        { id: 5, sku: 'LED-002', name_uk: 'Світлодіодна стрічка Osram 5м', category_id: 1, category_name: 'Світлотехніка', brand_name: 'Osram', price_retail: 420, my_price: 340, stock_quantity: 280, is_active: true, tags: [1, 2, 5] },
        { id: 6, sku: 'HOU-001', name_uk: 'Набір губок для посуду 5шт', category_id: 4, category_name: 'Господарські товари', brand_name: 'CleanMax', price_retail: 35, my_price: 24, stock_quantity: 8000, is_active: true, tags: [] },
        { id: 7, sku: 'KIT-001', name_uk: 'Контейнер харчовий 1л', category_id: 5, category_name: 'Товари для кухні', brand_name: 'FreshBox', price_retail: 85, my_price: 62, stock_quantity: 2500, is_active: true, tags: [] },
        { id: 8, sku: 'ELE-001', name_uk: 'Подовжувач 3м на 4 розетки', category_id: 6, category_name: 'Електротовари', brand_name: 'PowerLine', price_retail: 180, my_price: 135, stock_quantity: 900, is_active: true, tags: [2] }
    ],
    articles: [
        { id: 1, slug: 'energy-saving-tips', title: 'Як заощадити електроенергію вдома', excerpt: 'Корисні поради щодо вибору LED освітлення та зменшення споживання енергії', image: null, publish_date: '2024-03-15', tags: [1, 2] },
        { id: 2, slug: 'battery-guide', title: 'Гід по вибору батарейок', excerpt: 'Як обрати правильні батарейки для різних пристроїв', image: null, publish_date: '2024-03-10', tags: [3] },
        { id: 3, slug: 'garden-season', title: 'Готуємось до садового сезону', excerpt: 'Все що потрібно знати про садові інструменти та обладнання', image: null, publish_date: '2024-03-05', tags: [4] },
        { id: 4, slug: 'led-technology', title: 'Переваги LED технологій', excerpt: 'Чому LED - це майбутнє освітлення', image: null, publish_date: '2024-02-28', tags: [1, 2, 5] }
    ],
    updates: [
        { id: 1, type: 'news', title: 'Весняний розпродаж 2024', excerpt: 'Знижки до 30% на всю світлотехніку!', publish_date: '2024-03-01', is_featured: true },
        { id: 2, type: 'promo', title: 'Акція на батарейки', excerpt: '-20% на батарейки GP при замовленні від 1000 грн', publish_date: '2024-03-15', is_featured: false }
    ],
    categories: [
        { id: 1, name_uk: 'Світлотехніка' },
        { id: 2, name_uk: 'Елементи живлення' },
        { id: 3, name_uk: 'Сад і город' },
        { id: 4, name_uk: 'Господарські товари' },
        { id: 5, name_uk: 'Товари для кухні' },
        { id: 6, name_uk: 'Електротовари' }
    ],
    orders: [
        { id: 1, order_number: 'NRG-240315-A1B2C3', total: 45600, status: 'delivered', items_count: 12, created_at: '2024-03-15T10:30:00' },
        { id: 2, order_number: 'NRG-240320-G7H8I9', total: 125000, status: 'processing', items_count: 28, created_at: '2024-03-20T09:15:00' }
    ],
    documents: [
        { id: 1, doc_type: 'contract', doc_number: 'ДГ-2024/001', doc_date: '2024-01-15', title: 'Договір поставки', file_path: '#' },
        { id: 2, doc_type: 'invoice', doc_number: 'РХ-2024/156', doc_date: '2024-03-15', title: 'Рахунок на оплату', amount: 45600, is_paid: true },
        { id: 3, doc_type: 'waybill', doc_number: 'ВН-2024/089', doc_date: '2024-03-16', title: 'Видаткова накладна', amount: 45600 },
        { id: 4, doc_type: 'act', doc_number: 'АКТ-2024/045', doc_date: '2024-03-18', title: 'Акт звірки', file_path: '#' }
    ],
    transactions: [
        { id: 1, date: '2024-03-18', type: 'payment', amount: 45600, description: 'Оплата за замовлення NRG-240315-A1B2C3' },
        { id: 2, date: '2024-03-15', type: 'order', amount: -45600, description: 'Замовлення NRG-240315-A1B2C3' },
        { id: 3, date: '2024-03-10', type: 'payment', amount: 30000, description: 'Часткова оплата' }
    ]
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupEventListeners();
    updateCartBadge();
});

// ==================== AUTHENTICATION ====================

function checkAuth() {
    if (authToken) {
        fetchCurrentPartner();
    } else {
        showLoginScreen();
    }
}

async function fetchCurrentPartner() {
    try {
        const response = await fetch(`${API_URL}/partner/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            currentPartner = await response.json();
            showApp();
            loadDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.log('API not available, using demo mode');
        currentPartner = demoData.partner;
        showApp();
        loadDashboard();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    
    // Set authentication status
    localStorage.setItem('isAuthenticated', 'true');
    
    // Trigger event for header update
    window.dispatchEvent(new CustomEvent('userLoggedIn'));
    
    if (currentPartner) {
        document.getElementById('companyName').textContent = currentPartner.company_name;
        document.getElementById('companyMeta').textContent = getPriceLevelText(currentPartner.price_level);
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/partner/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('nrg_partner_token', authToken);
            currentPartner = data.user;
            showApp();
            loadDashboard();
            showToast('Успішний вхід!', 'success');
        } else {
            showToast('Невірний email або пароль', 'error');
        }
    } catch (error) {
        // Demo mode
        if (email === 'partner@test.com' && password === 'partner123') {
            currentPartner = demoData.partner;
            localStorage.setItem('nrg_partner_token', 'demo_token');
            authToken = 'demo_token';
            showApp();
            loadDashboard();
            showToast('Demo режим активовано', 'success');
        } else {
            showToast('Невірний email або пароль', 'error');
        }
    }
});

function logout() {
    localStorage.removeItem('nrg_partner_token');
    localStorage.removeItem('isAuthenticated');
    authToken = null;
    currentPartner = null;
    
    // Trigger event for header update
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    showLoginScreen();
}

// ==================== NAVIGATION ====================

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    
    const titles = {
        dashboard: ['Головна', 'Огляд вашого кабінету'],
        catalog: ['Каталог товарів', 'Доступні товари з вашими цінами'],
        favorites: ['Обране', 'Ваші обрані товари та матеріали'],
        cart: ['Кошик', 'Товари для замовлення'],
        orders: ['Мої замовлення', 'Історія ваших замовлень'],
        documents: ['Документи', 'Рахунки, накладні, акти'],
        balance: ['Баланс', 'Фінансова інформація'],
        profile: ['Профіль', 'Ваші дані']
    };
    
    document.getElementById('pageTitle').textContent = titles[page]?.[0] || page;
    document.getElementById('pageSubtitle').textContent = titles[page]?.[1] || '';
    
    loadPageData(page);
}

function loadPageData(page) {
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'catalog': loadCatalog(); break;
        case 'favorites': loadFavorites(); break;
        case 'cart': renderCart(); break;
        case 'orders': loadOrders(); break;
        case 'documents': loadDocuments(); break;
        case 'balance': loadBalance(); break;
        case 'profile': loadProfile(); break;
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    document.getElementById('catalogSearch')?.addEventListener('input', debounce(loadCatalog, 300));
    document.getElementById('catalogCategory')?.addEventListener('change', loadCatalog);
    document.getElementById('docTypeFilter')?.addEventListener('change', loadDocuments);
    
    // Telegram login button
    document.getElementById('telegramLoginBtn')?.addEventListener('click', openTelegramLogin);
    
    // Telegram register form
    document.getElementById('telegramRegisterForm')?.addEventListener('submit', handleTelegramRegister);
}

// ==================== TELEGRAM INTEGRATION ====================

function openTelegramLogin() {
    // В реальному випадку тут буде Telegram Login Widget
    // https://core.telegram.org/widgets/login
    // Для demo просто відкриваємо бота
    if (confirm('Для входу через Telegram:\n\n1. Відкрийте бота @NRGCATBOT\n2. Натисніть "Start"\n3. Поділіться контактом\n\nВідкрити бота зараз?')) {
        window.open('https://t.me/NRGCATBOT', '_blank');
    }
    
    // Demo: перевіримо чи є телеграм дані в URL (після переходу з бота)
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('telegram_id');
    
    if (telegramId) {
        checkTelegramAuth(telegramId);
    }
}

async function checkTelegramAuth(telegramId) {
    try {
        const response = await fetch(`${API_URL}/telegram/verify-phone?telegram_id=${telegramId}`);
        const data = await response.json();
        
        if (data.verified) {
            // Телефон підтверджено - показуємо форму реєстрації
            document.getElementById('tgRegTelegramId').value = telegramId;
            document.getElementById('tgRegPhone').value = data.phone || '';
            document.getElementById('tgRegTelegramFirstName').value = data.first_name || '';
            
            loadRegionsForTelegramRegister();
            document.getElementById('telegramRegisterModal').style.display = 'flex';
        }
    } catch (error) {
        console.log('Demo mode: Telegram auth check');
        // Demo: показуємо форму з тестовими даними
        document.getElementById('tgRegTelegramId').value = telegramId || 'test_123';
        document.getElementById('tgRegPhone').value = '+380501234567';
        document.getElementById('tgRegTelegramFirstName').value = 'Тестовий';
        
        loadRegionsForTelegramRegister();
        document.getElementById('telegramRegisterModal').style.display = 'flex';
    }
}

async function loadRegionsForTelegramRegister() {
    // Demo regions
    const regions = [
        { id: 1, name: 'Вінницька область' },
        { id: 2, name: 'Волинська область' },
        { id: 3, name: 'Дніпропетровська область' },
        { id: 4, name: 'Донецька область' },
        { id: 5, name: 'Житомирська область' },
        { id: 6, name: 'Закарпатська область' },
        { id: 7, name: 'Запорізька область' },
        { id: 8, name: 'Івано-Франківська область' },
        { id: 9, name: 'Київська область' },
        { id: 10, name: 'м. Київ' },
        { id: 11, name: 'Кіровоградська область' },
        { id: 12, name: 'Луганська область' },
        { id: 13, name: 'Львівська область' },
        { id: 14, name: 'Миколаївська область' },
        { id: 15, name: 'Одеська область' },
        { id: 16, name: 'Полтавська область' },
        { id: 17, name: 'Рівненська область' },
        { id: 18, name: 'Сумська область' },
        { id: 19, name: 'Тернопільська область' },
        { id: 20, name: 'Харківська область' },
        { id: 21, name: 'Херсонська область' },
        { id: 22, name: 'Хмельницька область' },
        { id: 23, name: 'Черкаська область' },
        { id: 24, name: 'Чернівецька область' },
        { id: 25, name: 'Чернігівська область' }
    ];
    
    const select = document.getElementById('tgRegRegion');
    select.innerHTML = '<option value="">Оберіть область</option>' + 
        regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

async function handleTelegramRegister(e) {
    e.preventDefault();
    
    const data = {
        telegram_id: document.getElementById('tgRegTelegramId').value,
        telegram_username: document.getElementById('tgRegTelegramUsername').value || null,
        telegram_first_name: document.getElementById('tgRegTelegramFirstName').value,
        telegram_last_name: document.getElementById('tgRegTelegramLastName').value || null,
        company_name: document.getElementById('tgRegCompany').value,
        phone: document.getElementById('tgRegPhone').value,
        email: document.getElementById('tgRegEmail').value || null,
        region_id: document.getElementById('tgRegRegion').value ? parseInt(document.getElementById('tgRegRegion').value) : null,
        city: document.getElementById('tgRegCity').value || null
    };
    
    try {
        const response = await fetch(`${API_URL}/telegram/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Реєстрація успішна! Очікуйте підтвердження від менеджера.');
            closeTelegramModal();
        } else {
            alert(result.message || 'Помилка реєстрації');
        }
    } catch (error) {
        // Demo mode
        alert('Demo: Реєстрація успішна!\nВаш менеджер зв\'яжеться з вами найближчим часом.');
        closeTelegramModal();
    }
}

function closeTelegramModal() {
    document.getElementById('telegramRegisterModal').style.display = 'none';
}

// Перевіряємо URL параметри при завантаженні
(function checkTelegramUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('telegram_id');
    
    if (telegramId) {
        // Очистимо URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Перевіримо авторизацію Telegram
        setTimeout(() => checkTelegramAuth(telegramId), 500);
    }
})();

// ==================== DATA LOADING ====================

function loadDashboard() {
    if (!currentPartner) return;
    
    // Stats
    document.getElementById('balanceValue').textContent = formatMoney(currentPartner.balance);
    document.getElementById('balanceValue').className = `stat-value ${currentPartner.balance >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('ordersCount').textContent = demoData.orders.length;
    document.getElementById('priceLevel').textContent = getPriceLevelText(currentPartner.price_level);
    document.getElementById('discountValue').textContent = currentPartner.discount_percent + '%';
    
    // Recent orders
    document.getElementById('recentOrdersTable').innerHTML = demoData.orders.slice(0, 3).map(o => `
        <tr>
            <td>${o.order_number}</td>
            <td>${formatMoney(o.total)}</td>
            <td>${getStatusBadge(o.status)}</td>
        </tr>
    `).join('') || '<tr><td colspan="3">Немає замовлень</td></tr>';
    
    // Recent documents
    document.getElementById('recentDocumentsTable').innerHTML = demoData.documents.slice(0, 3).map(d => `
        <tr>
            <td>${d.title}</td>
            <td>${d.doc_date}</td>
            <td>${d.amount ? formatMoney(d.amount) : '-'}</td>
        </tr>
    `).join('') || '<tr><td colspan="3">Немає документів</td></tr>';
    
    // Load manager info
    loadManagerInfo();
    
    // Load updates
    loadUpdates();
    
    // Load recommended articles
    loadRecommendedArticles();
}

async function loadManagerInfo() {
    try {
        const response = await fetch(`${API_URL}/partner/manager`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const manager = await response.json();
            renderManager(manager);
        } else {
            renderManager(demoData.manager);
        }
    } catch (error) {
        renderManager(demoData.manager);
    }
}

function renderManager(manager) {
    if (!manager || manager.message) {
        document.getElementById('managerSection').innerHTML = `
            <p style="color: var(--text-muted);">Менеджера ще не призначено. Зв'яжіться з нами для отримання контактної особи.</p>
        `;
        return;
    }
    
    document.getElementById('managerName').textContent = manager.full_name;
    document.getElementById('managerRegion').textContent = manager.region || '';
    
    const phoneLink = document.getElementById('managerPhone');
    phoneLink.href = `tel:${manager.phone}`;
    phoneLink.querySelector('span').textContent = manager.phone;
    
    const emailLink = document.getElementById('managerEmail');
    emailLink.href = `mailto:${manager.email}`;
    emailLink.querySelector('span').textContent = manager.email;
    
    const tgLink = document.getElementById('managerTelegram');
    if (manager.telegram) {
        tgLink.href = `https://t.me/${manager.telegram.replace('@', '')}`;
        tgLink.querySelector('span').textContent = manager.telegram;
        tgLink.style.display = 'flex';
    } else {
        tgLink.style.display = 'none';
    }
    
    if (manager.photo) {
        document.getElementById('managerPhoto').innerHTML = `<img src="${manager.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
}

async function loadUpdates() {
    try {
        const response = await fetch(`${API_URL}/partner/updates`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderUpdates(data.items);
        } else {
            renderUpdates(demoData.updates);
        }
    } catch (error) {
        renderUpdates(demoData.updates);
    }
}

function renderUpdates(updates) {
    const container = document.getElementById('updatesSection');
    if (!updates || updates.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Немає нових оновлень</p>';
        return;
    }
    
    container.innerHTML = updates.slice(0, 3).map(u => `
        <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                ${u.is_featured ? '<span class="badge badge-warning" style="font-size: 0.6rem;">Важливо</span>' : ''}
                <span class="badge badge-${u.type === 'promo' ? 'success' : 'primary'}" style="font-size: 0.6rem;">${u.type === 'promo' ? 'Акція' : 'Новина'}</span>
            </div>
            <div style="font-weight: 600; font-size: 0.9rem;">${u.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${u.excerpt || ''}</div>
            <div style="font-size: 0.7rem; color: var(--gray); margin-top: 0.5rem;">${u.publish_date}</div>
        </div>
    `).join('');
}

async function loadRecommendedArticles() {
    const container = document.getElementById('recommendedArticlesSection');
    const card = document.getElementById('recommendedArticlesCard');
    
    try {
        const response = await fetch(`${API_URL}/partner/recommended-articles`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderRecommendedArticles(data.items);
        } else {
            renderRecommendedArticles(getLocalRecommendedArticles());
        }
    } catch (error) {
        renderRecommendedArticles(getLocalRecommendedArticles());
    }
}

function getLocalRecommendedArticles() {
    // Отримуємо теги з обраних товарів
    const favoriteTagIds = new Set();
    favorites.forEach(productId => {
        const product = demoData.products.find(p => p.id === productId);
        if (product && product.tags) {
            product.tags.forEach(tagId => favoriteTagIds.add(tagId));
        }
    });
    
    if (favoriteTagIds.size === 0) return [];
    
    // Фільтруємо статті за тегами
    return demoData.articles.filter(article => {
        return article.tags.some(tagId => favoriteTagIds.has(tagId));
    }).map(article => ({
        ...article,
        tags: article.tags.map(tagId => demoData.tags.find(t => t.id === tagId)).filter(Boolean)
    }));
}

function renderRecommendedArticles(articles) {
    const container = document.getElementById('recommendedArticlesSection');
    const card = document.getElementById('recommendedArticlesCard');
    
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-muted);">
                <i class="fas fa-heart"></i> 
                Додайте товари до обраного, щоб отримувати персоналізовані рекомендації статей та матеріалів
            </p>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${articles.slice(0, 4).map(article => `
                <div style="padding: 1rem; background: var(--bg); border-radius: 8px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">
                        ${(article.tags || []).map(tag => `
                            <span style="display: inline-block; padding: 0.15rem 0.5rem; background: ${tag.color}20; color: ${tag.color}; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">
                                ${tag.name}
                            </span>
                        `).join('')}
                    </div>
                    <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">${article.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${article.excerpt || ''}</div>
                    <div style="font-size: 0.7rem; color: var(--gray); margin-top: 0.75rem;">${article.publish_date}</div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadCatalog() {
    const search = document.getElementById('catalogSearch')?.value?.toLowerCase() || '';
    const categoryId = document.getElementById('catalogCategory')?.value || '';
    
    let products = demoData.products;
    
    // Populate category filter
    const categorySelect = document.getElementById('catalogCategory');
    if (categorySelect && categorySelect.options.length <= 1) {
        demoData.categories.forEach(c => {
            categorySelect.add(new Option(c.name_uk, c.id));
        });
    }
    
    // Filter
    if (search) {
        products = products.filter(p => 
            p.name_uk.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search)
        );
    }
    
    if (categoryId) {
        products = products.filter(p => p.category_id === parseInt(categoryId));
    }
    
    // Render
    document.getElementById('productGrid').innerHTML = products.map(p => {
        const isFavorite = favorites.includes(p.id);
        const productTags = (p.tags || []).map(tagId => demoData.tags.find(t => t.id === tagId)).filter(Boolean);
        
        return `
        <div class="product-card">
            <div class="product-img">
                <i class="fas fa-box"></i>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${p.id})" 
                    style="position: absolute; top: 0.5rem; right: 0.5rem; background: white; border: none; 
                    width: 32px; height: 32px; border-radius: 50%; cursor: pointer; 
                    color: ${isFavorite ? '#ef4444' : '#94a3b8'}; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
            ${productTags.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">
                    ${productTags.map(tag => `
                        <span style="display: inline-block; padding: 0.1rem 0.4rem; background: ${tag.color}20; color: ${tag.color}; border-radius: 4px; font-size: 0.6rem; font-weight: 600;">
                            ${tag.name}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            <div class="product-name">${p.name_uk}</div>
            <div class="product-sku">${p.sku} • ${p.brand_name}</div>
            <div class="product-price">${formatMoney(p.my_price)} <small style="color: var(--text-muted); text-decoration: line-through;">${formatMoney(p.price_retail)}</small></div>
            <div class="product-stock ${p.stock_quantity < 100 ? 'low' : ''}">
                <i class="fas fa-warehouse"></i> ${p.stock_quantity} шт
            </div>
            <div class="product-actions">
                <input type="number" class="qty-input" id="qty-${p.id}" value="1" min="1" max="${p.stock_quantity}">
                <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">
                    <i class="fas fa-cart-plus"></i> Додати
                </button>
            </div>
        </div>
    `}).join('') || '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Товарів не знайдено</div>';
}

// ==================== FAVORITES ====================

function toggleFavorite(productId) {
    const index = favorites.indexOf(productId);
    if (index === -1) {
        favorites.push(productId);
        showToast('Додано до обраного', 'success');
    } else {
        favorites.splice(index, 1);
        showToast('Видалено з обраного', 'success');
    }
    saveFavorites();
    
    // Оновлюємо UI
    loadCatalog();
    
    // Якщо на сторінці favorites - оновлюємо її також
    if (document.getElementById('page-favorites').classList.contains('active')) {
        loadFavorites();
    }
    
    // Оновлюємо рекомендовані статті
    loadRecommendedArticles();
}

function saveFavorites() {
    localStorage.setItem('nrg_favorites', JSON.stringify(favorites));
    
    // Також відправляємо на сервер
    if (authToken && authToken !== 'demo_token') {
        // API call для синхронізації
    }
}

async function loadFavorites() {
    // Спробуємо завантажити з API
    try {
        const response = await fetch(`${API_URL}/partner/favorites`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderFavorites(data.items);
            renderFavoritesArticles();
            return;
        }
    } catch (error) {
        // Використовуємо локальні дані
    }
    
    // Локальні дані
    const favoriteProducts = demoData.products.filter(p => favorites.includes(p.id));
    renderFavorites(favoriteProducts);
    renderFavoritesArticles();
}

function renderFavorites(products) {
    const container = document.getElementById('favoritesGrid');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">У вас ще немає обраних товарів</p>
                <p style="font-size: 0.9rem;">Перейдіть до <a href="#" onclick="navigateTo('catalog'); return false;" style="color: var(--primary);">каталогу</a> та натисніть ❤️ на товарах, які вас цікавлять</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(p => {
        const productTags = (p.tags || []).map(tagId => demoData.tags.find(t => t.id === tagId)).filter(Boolean);
        
        return `
        <div class="product-card">
            <div class="product-img" style="position: relative;">
                <i class="fas fa-box"></i>
                <button onclick="toggleFavorite(${p.id})" 
                    style="position: absolute; top: 0.5rem; right: 0.5rem; background: white; border: none; 
                    width: 32px; height: 32px; border-radius: 50%; cursor: pointer; 
                    color: #ef4444; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            ${productTags.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">
                    ${productTags.map(tag => `
                        <span style="display: inline-block; padding: 0.1rem 0.4rem; background: ${tag.color}20; color: ${tag.color}; border-radius: 4px; font-size: 0.6rem; font-weight: 600;">
                            ${tag.name}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            <div class="product-name">${p.name_uk}</div>
            <div class="product-sku">${p.sku} • ${p.brand_name}</div>
            <div class="product-price">${formatMoney(p.my_price)} <small style="color: var(--text-muted); text-decoration: line-through;">${formatMoney(p.price_retail)}</small></div>
            <div class="product-stock ${p.stock_quantity < 100 ? 'low' : ''}">
                <i class="fas fa-warehouse"></i> ${p.stock_quantity} шт
            </div>
            <div class="product-actions">
                <input type="number" class="qty-input" id="fav-qty-${p.id}" value="1" min="1" max="${p.stock_quantity}">
                <button class="btn btn-primary btn-sm" onclick="addToCartFromFavorites(${p.id})">
                    <i class="fas fa-cart-plus"></i> Додати
                </button>
            </div>
        </div>
    `}).join('');
}

function addToCartFromFavorites(productId) {
    const product = demoData.products.find(p => p.id === productId);
    if (!product) return;
    
    const qty = parseInt(document.getElementById(`fav-qty-${productId}`)?.value || 1);
    
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({
            productId,
            sku: product.sku,
            name: product.name_uk,
            price: product.my_price,
            quantity: qty
        });
    }
    
    saveCart();
    updateCartBadge();
    showToast(`Додано: ${product.name_uk} (${qty} шт)`, 'success');
}

function renderFavoritesArticles() {
    const container = document.getElementById('favoritesArticlesSection');
    const articles = getLocalRecommendedArticles();
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Статті з\'являться тут після додавання товарів до обраного</p>';
        document.getElementById('favoritesArticlesCard').style.display = favorites.length > 0 ? 'block' : 'none';
        return;
    }
    
    document.getElementById('favoritesArticlesCard').style.display = 'block';
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${articles.map(article => `
                <div style="padding: 1rem; background: var(--bg); border-radius: 8px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">
                        ${(article.tags || []).map(tag => `
                            <span style="display: inline-block; padding: 0.15rem 0.5rem; background: ${tag.color}20; color: ${tag.color}; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">
                                ${tag.name}
                            </span>
                        `).join('')}
                    </div>
                    <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">${article.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${article.excerpt || ''}</div>
                    <div style="font-size: 0.7rem; color: var(--gray); margin-top: 0.75rem;">${article.publish_date}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadOrders() {
    document.getElementById('ordersTable').innerHTML = demoData.orders.map(o => `
        <tr>
            <td><strong>${o.order_number}</strong></td>
            <td>${formatDate(o.created_at)}</td>
            <td>${o.items_count}</td>
            <td>${formatMoney(o.total)}</td>
            <td>${getStatusBadge(o.status)}</td>
            <td>
                <button class="action-btn" onclick="viewOrder(${o.id})" title="Переглянути">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">Замовлень поки немає</td></tr>';
}

function loadDocuments() {
    const docType = document.getElementById('docTypeFilter')?.value || '';
    
    let docs = demoData.documents;
    if (docType) {
        docs = docs.filter(d => d.doc_type === docType);
    }
    
    document.getElementById('documentsTable').innerHTML = docs.map(d => `
        <tr>
            <td>${getDocTypeBadge(d.doc_type)}</td>
            <td>${d.doc_number}</td>
            <td>${d.doc_date}</td>
            <td>${d.title}</td>
            <td>${d.amount ? formatMoney(d.amount) : '-'}</td>
            <td>
                ${d.file_path ? `<a href="${d.file_path}" class="action-btn" title="Завантажити"><i class="fas fa-download"></i></a>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">Документів не знайдено</td></tr>';
}

function loadBalance() {
    document.getElementById('balanceTotal').textContent = formatMoney(currentPartner.balance);
    document.getElementById('balanceTotal').className = `stat-value ${currentPartner.balance >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('creditLimit').textContent = formatMoney(currentPartner.credit_limit);
    
    document.getElementById('transactionsTable').innerHTML = demoData.transactions.map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${t.type === 'payment' ? '<span class="badge badge-success">Оплата</span>' : '<span class="badge badge-primary">Замовлення</span>'}</td>
            <td class="${t.amount >= 0 ? '' : 'negative'}" style="font-weight: 600; color: ${t.amount >= 0 ? 'var(--secondary)' : 'var(--danger)'}">
                ${t.amount >= 0 ? '+' : ''}${formatMoney(t.amount)}
            </td>
            <td>${t.description}</td>
        </tr>
    `).join('');
}

function loadProfile() {
    document.getElementById('profileCompany').value = currentPartner.company_name || '';
    document.getElementById('profileContact').value = currentPartner.contact_name || '';
    document.getElementById('profilePhone').value = currentPartner.phone || '';
    document.getElementById('profileEmail').value = currentPartner.email || '';
    document.getElementById('profileCity').value = currentPartner.city || '';
    document.getElementById('profileAddress').value = currentPartner.address || '';
}

function saveProfile() {
    currentPartner.company_name = document.getElementById('profileCompany').value;
    currentPartner.contact_name = document.getElementById('profileContact').value;
    currentPartner.phone = document.getElementById('profilePhone').value;
    currentPartner.city = document.getElementById('profileCity').value;
    currentPartner.address = document.getElementById('profileAddress').value;
    
    document.getElementById('companyName').textContent = currentPartner.company_name;
    showToast('Профіль збережено!', 'success');
}

// ==================== CART ====================

function addToCart(productId) {
    const product = demoData.products.find(p => p.id === productId);
    if (!product) return;
    
    const qty = parseInt(document.getElementById(`qty-${productId}`)?.value || 1);
    
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({
            productId,
            sku: product.sku,
            name: product.name_uk,
            price: product.my_price,
            quantity: qty
        });
    }
    
    saveCart();
    updateCartBadge();
    showToast(`Додано: ${product.name_uk} (${qty} шт)`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
}

function updateCartQty(productId, qty) {
    const item = cart.find(i => i.productId === productId);
    if (item) {
        item.quantity = Math.max(1, parseInt(qty));
        saveCart();
        renderCart();
    }
}

function saveCart() {
    localStorage.setItem('nrg_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartBadge').textContent = count;
}

function renderCart() {
    const tbody = document.querySelector('#cartTable tbody');
    
    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Кошик порожній</td></tr>';
        document.getElementById('cartSummary').style.display = 'none';
        return;
    }
    
    document.getElementById('cartSummary').style.display = 'block';
    
    tbody.innerHTML = cart.map(item => `
        <tr>
            <td>
                <strong>${item.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${item.sku}</div>
            </td>
            <td>${formatMoney(item.price)}</td>
            <td>
                <input type="number" class="qty-input" value="${item.quantity}" min="1" 
                    onchange="updateCartQty(${item.productId}, this.value)">
            </td>
            <td><strong>${formatMoney(item.price * item.quantity)}</strong></td>
            <td>
                <button class="action-btn" onclick="removeFromCart(${item.productId})" style="color: var(--danger);">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = subtotal * (currentPartner.discount_percent / 100);
    const total = subtotal - discount;
    
    document.getElementById('cartSubtotal').textContent = formatMoney(subtotal);
    document.getElementById('cartDiscount').textContent = `-${formatMoney(discount)}`;
    document.getElementById('cartTotal').textContent = formatMoney(total);
}

function createOrder() {
    if (cart.length === 0) {
        showToast('Кошик порожній', 'error');
        return;
    }
    
    // Create order
    const newOrder = {
        id: demoData.orders.length + 1,
        order_number: `NRG-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        items_count: cart.length,
        created_at: new Date().toISOString()
    };
    
    demoData.orders.unshift(newOrder);
    
    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();
    
    showToast(`Замовлення ${newOrder.order_number} створено!`, 'success');
    navigateTo('orders');
}

function viewOrder(orderId) {
    const order = demoData.orders.find(o => o.id === orderId);
    if (!order) return;
    
    alert(`Замовлення: ${order.order_number}\nСума: ${formatMoney(order.total)}\nСтатус: ${getStatusText(order.status)}`);
}

// ==================== HELPERS ====================

function formatMoney(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('uk-UA').format(amount) + ' ₴';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getPriceLevelText(level) {
    const levels = {
        retail: 'Роздріб',
        small_wholesale: 'Дрібний опт',
        wholesale: 'Оптова ціна',
        distributor: 'Дистриб\'юторська'
    };
    return levels[level] || level;
}

function getStatusBadge(status) {
    const statuses = {
        pending: { text: 'Нове', class: 'badge-warning' },
        processing: { text: 'В обробці', class: 'badge-primary' },
        shipped: { text: 'Відправлено', class: 'badge-primary' },
        delivered: { text: 'Доставлено', class: 'badge-success' },
        cancelled: { text: 'Скасовано', class: 'badge-danger' }
    };
    const s = statuses[status] || { text: status, class: 'badge-gray' };
    return `<span class="badge ${s.class}">${s.text}</span>`;
}

function getStatusText(status) {
    const statuses = {
        pending: 'Нове',
        processing: 'В обробці',
        shipped: 'Відправлено',
        delivered: 'Доставлено',
        cancelled: 'Скасовано'
    };
    return statuses[status] || status;
}

function getDocTypeBadge(type) {
    const types = {
        invoice: { text: 'Рахунок', class: 'badge-primary' },
        waybill: { text: 'Накладна', class: 'badge-success' },
        act: { text: 'Акт', class: 'badge-warning' },
        contract: { text: 'Договір', class: 'badge-gray' }
    };
    const t = types[type] || { text: type, class: 'badge-gray' };
    return `<span class="badge ${t.class}">${t.text}</span>`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
