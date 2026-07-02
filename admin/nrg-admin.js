/**
 * NRG-UA Admin Panel JavaScript
 */

const API_URL = 'http://localhost:8001/api';
let authToken = localStorage.getItem('nrg_admin_token') || null;
let currentUser = null;
let currentContentType = 'news';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupEventListeners();
});

// ==================== AUTHENTICATION ====================

function checkAuth() {
    if (authToken) {
        fetchCurrentUser();
    } else {
        showLoginScreen();
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser.type === 'admin') {
                showApp();
                loadDashboard();
            } else {
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.log('API not available, using demo mode');
        currentUser = { id: 1, username: 'admin', full_name: 'Адміністратор', role: 'admin' };
        showApp();
        loadDemoData();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Адміністратор' : currentUser.role;
        document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.username)[0].toUpperCase();
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(`${API_URL}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('nrg_admin_token', authToken);
            currentUser = data.user;
            showApp();
            loadDashboard();
            showToast('Успішний вхід!', 'success');
        } else {
            showToast('Невірний логін або пароль', 'error');
        }
    } catch (error) {
        // Demo mode
        if (username === 'admin' && password === 'admin123') {
            currentUser = { id: 1, username: 'admin', full_name: 'Адміністратор', role: 'admin' };
            localStorage.setItem('nrg_admin_token', 'demo_token');
            authToken = 'demo_token';
            showApp();
            loadDemoData();
            showToast('Demo режим активовано', 'success');
        } else {
            showToast('Невірний логін або пароль', 'error');
        }
    }
});

function logout() {
    localStorage.removeItem('nrg_admin_token');
    authToken = null;
    currentUser = null;
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
    // Update nav
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    
    // Update page visibility
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    
    // Update header
    const titles = {
        dashboard: ['Дашборд', 'Огляд показників системи'],
        partners: ['Партнери', 'Управління партнерами B2B'],
        managers: ['Менеджери', 'Управління менеджерами компанії'],
        orders: ['Замовлення', 'Обробка замовлень від партнерів'],
        products: ['Товари', 'Каталог продукції'],
        categories: ['Категорії', 'Структура каталогу'],
        brands: ['Бренди', 'Управління брендами'],
        tags: ['Теги', 'Теги для товарів та статей'],
        content: ['Контент', 'Новини, банери та акції'],
        translations: ['Переклади', 'Мультимовність сайту'],
        settings: ['Налаштування', 'Конфігурація системи']
    };
    
    document.getElementById('pageTitle').textContent = titles[page]?.[0] || page;
    document.getElementById('pageSubtitle').textContent = titles[page]?.[1] || '';
    
    // Load page data
    loadPageData(page);
}

function loadPageData(page) {
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'partners': loadPartners(); break;
        case 'managers': loadManagers(); break;
        case 'orders': loadOrders(); break;
        case 'products': loadProducts(); break;
        case 'categories': loadCategories(); break;
        case 'brands': loadBrands(); break;
        case 'tags': loadTags(); break;
        case 'content': loadContent(); break;
        case 'translations': loadTranslations(); break;
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Content tabs
    document.querySelectorAll('.tab[data-content-type]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab[data-content-type]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentContentType = tab.dataset.contentType;
            loadContent();
        });
    });
    
    // Search inputs (debounced)
    ['partnersSearch', 'ordersSearch', 'productsSearch', 'translationsSearch'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', debounce(() => {
                const page = id.replace('Search', '');
                loadPageData(page);
            }, 300));
        }
    });
    
    // Filter selects
    document.getElementById('partnersStatusFilter')?.addEventListener('change', () => loadPartners());
    document.getElementById('ordersStatusFilter')?.addEventListener('change', () => loadOrders());
    document.getElementById('productsCategoryFilter')?.addEventListener('change', () => loadProducts());
}

// ==================== DATA LOADING ====================

// Demo Data
const demoData = {
    stats: {
        partners: { total: 156, active: 134, new_this_month: 12, pending: 3 },
        orders: { total: 1847, this_month: 156, pending: 12, processing: 8 },
        revenue: { this_month: 2450000, prev_month: 2180000, growth_percent: 12.4 },
        products: { total: 690, active: 645, low_stock: 23, out_of_stock: 5 }
    },
    partners: [
        { id: 1, company_name: 'ТОВ "Світло-Сервіс"', contact_name: 'Олександр Петренко', email: 'partner@test.com', phone: '+380501234567', city: 'Київ', status: 'active', partner_type: 'wholesale', balance: 15000 },
        { id: 2, company_name: 'ФОП Коваленко', contact_name: 'Марія Коваленко', email: 'kovalenko@ukr.net', phone: '+380671112233', city: 'Харків', status: 'active', partner_type: 'retail', balance: -2500 },
        { id: 3, company_name: 'Мережа "Електротовари"', contact_name: 'Ігор Бондаренко', email: 'electro@network.ua', phone: '+380933334455', city: 'Одеса', status: 'pending', partner_type: 'network', balance: 0 }
    ],
    orders: [
        { id: 1, order_number: 'NRG-240315-A1B2C3', partner_name: 'ТОВ "Світло-Сервіс"', total: 45600, status: 'delivered', items_count: 12, created_at: '2024-03-15T10:30:00' },
        { id: 2, order_number: 'NRG-240318-D4E5F6', partner_name: 'ФОП Коваленко', total: 8900, status: 'shipped', items_count: 5, created_at: '2024-03-18T14:20:00' },
        { id: 3, order_number: 'NRG-240320-G7H8I9', partner_name: 'ТОВ "Світло-Сервіс"', total: 125000, status: 'processing', items_count: 28, created_at: '2024-03-20T09:15:00' },
        { id: 4, order_number: 'NRG-240322-J0K1L2', partner_name: 'ФОП Коваленко', total: 3200, status: 'pending', items_count: 3, created_at: '2024-03-22T16:45:00' }
    ],
    products: [
        { id: 1, sku: 'BAT-001', name_uk: 'Батарейка Energizer AA', category_name: 'Елементи живлення', brand_name: 'Energizer', price_retail: 45, price_wholesale: 32, stock_quantity: 5000, is_active: true, is_bestseller: true },
        { id: 2, sku: 'LED-001', name_uk: 'LED лампа Philips 10W', category_name: 'Світлотехніка', brand_name: 'Philips', price_retail: 89, price_wholesale: 65, stock_quantity: 1200, is_active: true, is_new: true },
        { id: 3, sku: 'GRD-001', name_uk: 'Шланг садовий Gardena 25м', category_name: 'Сад і город', brand_name: 'Gardena', price_retail: 850, price_wholesale: 680, stock_quantity: 150, is_active: true },
        { id: 4, sku: 'BAT-002', name_uk: 'Батарейка GP AAA 4шт', category_name: 'Елементи живлення', brand_name: 'GP Batteries', price_retail: 65, price_wholesale: 48, stock_quantity: 3500, is_active: true },
        { id: 5, sku: 'LED-002', name_uk: 'Світлодіодна стрічка Osram 5м', category_name: 'Світлотехніка', brand_name: 'Osram', price_retail: 420, price_wholesale: 340, stock_quantity: 280, is_active: true, is_promo: true }
    ],
    categories: [
        { id: 1, name_uk: 'Світлотехніка', name_en: 'Lighting', slug: 'lighting', icon: 'fa-lightbulb', products_count: 45, is_active: true },
        { id: 2, name_uk: 'Елементи живлення', name_en: 'Batteries', slug: 'batteries', icon: 'fa-battery-full', products_count: 120, is_active: true },
        { id: 3, name_uk: 'Сад і город', name_en: 'Garden', slug: 'garden', icon: 'fa-seedling', products_count: 80, is_active: true },
        { id: 4, name_uk: 'Господарські товари', name_en: 'Household', slug: 'household', icon: 'fa-spray-can-sparkles', products_count: 200, is_active: true },
        { id: 5, name_uk: 'Товари для кухні', name_en: 'Kitchen', slug: 'kitchen', icon: 'fa-utensils', products_count: 95, is_active: true },
        { id: 6, name_uk: 'Електротовари', name_en: 'Electrical', slug: 'electrical', icon: 'fa-plug', products_count: 150, is_active: true }
    ],
    brands: [
        { id: 1, name: 'Energizer', country: 'USA', is_exclusive: true, products_count: 85 },
        { id: 2, name: 'Philips', country: 'Netherlands', is_exclusive: false, products_count: 120 },
        { id: 3, name: 'Osram', country: 'Germany', is_exclusive: true, products_count: 65 },
        { id: 4, name: 'GP Batteries', country: 'Hong Kong', is_exclusive: false, products_count: 95 },
        { id: 5, name: 'Gardena', country: 'Germany', is_exclusive: true, products_count: 45 }
    ],
    content: [
        { id: 1, content_type: 'news', slug: 'spring-sale-2024', title_uk: 'Весняний розпродаж 2024', title_en: 'Spring Sale 2024', is_active: true, publish_date: '2024-03-01' },
        { id: 2, content_type: 'news', slug: 'new-energizer-lineup', title_uk: 'Нова лінійка Energizer', title_en: 'New Energizer Lineup', is_active: true, publish_date: '2024-03-10' },
        { id: 3, content_type: 'banner', slug: 'main-banner-1', title_uk: 'Ексклюзивний дистрибютор', title_en: 'Exclusive Distributor', is_active: true },
        { id: 4, content_type: 'promo', slug: 'batteries-promo', title_uk: 'Акція на батарейки', title_en: 'Battery Promo', is_active: true, publish_date: '2024-03-15' }
    ],
    translations: {
        'nav.home': { uk: 'Головна', en: 'Home' },
        'nav.about': { uk: 'Про нас', en: 'About' },
        'nav.catalog': { uk: 'Каталог', en: 'Catalog' },
        'nav.brands': { uk: 'Бренди', en: 'Brands' },
        'nav.partners': { uk: 'Партнерам', en: 'Partners' },
        'nav.news': { uk: 'Новини', en: 'News' },
        'nav.contacts': { uk: 'Контакти', en: 'Contacts' },
        'btn.login': { uk: 'Увійти', en: 'Login' },
        'btn.register': { uk: 'Реєстрація', en: 'Register' },
        'btn.become_partner': { uk: 'Стати партнером', en: 'Become a Partner' },
        'hero.title': { uk: 'Національний B2B-дистрибютор', en: 'National B2B Distributor' },
        'footer.copyright': { uk: '© 2024 NRG-UA. Всі права захищені.', en: '© 2024 NRG-UA. All rights reserved.' }
    },
    regions: [
        { id: 1, name_uk: 'Вінницька область', code: 'UA-05' },
        { id: 2, name_uk: 'Волинська область', code: 'UA-07' },
        { id: 3, name_uk: 'Дніпропетровська область', code: 'UA-12' },
        { id: 9, name_uk: 'Київська область', code: 'UA-32' },
        { id: 12, name_uk: 'Львівська область', code: 'UA-46' },
        { id: 14, name_uk: 'Одеська область', code: 'UA-51' },
        { id: 19, name_uk: 'Харківська область', code: 'UA-63' },
        { id: 25, name_uk: 'м. Київ', code: 'UA-30' }
    ],
    managers: [
        { id: 1, full_name: 'Олександр Петренко', phone: '+380501234567', email: 'petrenk@nrg-ua.com', telegram_username: '@petrenk_nrg', region_id: 9, region_name: 'Київська область', is_active: true },
        { id: 2, full_name: 'Марія Коваленко', phone: '+380671112233', email: 'kovalenko@nrg-ua.com', telegram_username: '@kovalenko_nrg', region_id: 19, region_name: 'Харківська область', is_active: true },
        { id: 3, full_name: 'Іван Шевченко', phone: '+380933334455', email: 'shevchenko@nrg-ua.com', telegram_username: '@shevchenko_nrg', region_id: 14, region_name: 'Одеська область', is_active: true },
        { id: 4, full_name: 'Анна Бондаренко', phone: '+380661234567', email: 'bondarenko@nrg-ua.com', telegram_username: '@bondarenko_nrg', region_id: 12, region_name: 'Львівська область', is_active: true },
        { id: 5, full_name: 'Сергій Мельник', phone: '+380981234567', email: 'melnyk@nrg-ua.com', telegram_username: '@melnyk_nrg', region_id: 3, region_name: 'Дніпропетровська область', is_active: true }
    ],
    tags: [
        { id: 1, name_uk: 'LED освітлення', name_en: 'LED lighting', slug: 'led-lighting', color: '#10b981', products_count: 25, content_count: 3 },
        { id: 2, name_uk: 'Енергозбереження', name_en: 'Energy saving', slug: 'energy-saving', color: '#6366f1', products_count: 18, content_count: 2 },
        { id: 3, name_uk: 'Акумулятори', name_en: 'Batteries', slug: 'batteries', color: '#f59e0b', products_count: 42, content_count: 5 },
        { id: 4, name_uk: 'Садовий інструмент', name_en: 'Garden tools', slug: 'garden-tools', color: '#22c55e', products_count: 31, content_count: 2 },
        { id: 5, name_uk: 'Новинки', name_en: 'New arrivals', slug: 'new-arrivals', color: '#ef4444', products_count: 15, content_count: 1 },
        { id: 6, name_uk: 'Розумний дім', name_en: 'Smart home', slug: 'smart-home', color: '#8b5cf6', products_count: 8, content_count: 0 }
    ]
};

function loadDemoData() {
    loadDashboard();
}

async function loadDashboard() {
    let stats;
    
    try {
        const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            stats = await response.json();
        } else {
            stats = demoData.stats;
        }
    } catch {
        stats = demoData.stats;
    }
    
    // Render stats
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-icon primary"><i class="fas fa-handshake"></i></div>
                <span class="stat-change positive">+${stats.partners.new_this_month} цього місяця</span>
            </div>
            <div class="stat-value">${stats.partners.total}</div>
            <div class="stat-label">Всього партнерів</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-icon success"><i class="fas fa-shopping-cart"></i></div>
                <span class="stat-change positive">${stats.orders.pending} нових</span>
            </div>
            <div class="stat-value">${stats.orders.this_month}</div>
            <div class="stat-label">Замовлень за місяць</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-icon warning"><i class="fas fa-hryvnia-sign"></i></div>
                <span class="stat-change ${stats.revenue.growth_percent >= 0 ? 'positive' : 'negative'}">
                    ${stats.revenue.growth_percent >= 0 ? '+' : ''}${stats.revenue.growth_percent}%
                </span>
            </div>
            <div class="stat-value">${formatMoney(stats.revenue.this_month)}</div>
            <div class="stat-label">Виручка за місяць</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-icon danger"><i class="fas fa-boxes"></i></div>
                <span class="stat-change ${stats.products.low_stock > 0 ? 'negative' : 'positive'}">${stats.products.low_stock} мало</span>
            </div>
            <div class="stat-value">${stats.products.active}</div>
            <div class="stat-label">Активних товарів</div>
        </div>
    `;
    
    // Update badges
    document.getElementById('pendingPartnersBadge').textContent = stats.partners.pending;
    document.getElementById('pendingOrdersBadge').textContent = stats.orders.pending;
    
    // Load recent orders
    let orders;
    try {
        const response = await fetch(`${API_URL}/admin/dashboard/recent-orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        orders = response.ok ? await response.json() : demoData.orders.slice(0, 5);
    } catch {
        orders = demoData.orders.slice(0, 5);
    }
    
    document.getElementById('recentOrdersTable').innerHTML = orders.map(o => `
        <tr>
            <td><strong>${o.order_number}</strong></td>
            <td>${o.partner_name}</td>
            <td>${formatMoney(o.total)}</td>
            <td>${getStatusBadge(o.status)}</td>
        </tr>
    `).join('');
    
    // Load recent partners
    let partners;
    try {
        const response = await fetch(`${API_URL}/admin/dashboard/recent-partners`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        partners = response.ok ? await response.json() : demoData.partners;
    } catch {
        partners = demoData.partners;
    }
    
    document.getElementById('recentPartnersTable').innerHTML = partners.map(p => `
        <tr>
            <td><strong>${p.company_name}</strong></td>
            <td>${p.city || '-'}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>
                <div class="actions">
                    ${p.status === 'pending' ? `<button class="action-btn" onclick="approvePartner(${p.id})" title="Підтвердити"><i class="fas fa-check"></i></button>` : ''}
                    <button class="action-btn" onclick="viewPartner(${p.id})" title="Переглянути"><i class="fas fa-eye"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadPartners() {
    const search = document.getElementById('partnersSearch')?.value || '';
    const status = document.getElementById('partnersStatusFilter')?.value || '';
    
    let data;
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        
        const response = await fetch(`${API_URL}/admin/partners?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.partners };
    } catch {
        data = { items: demoData.partners };
    }
    
    let partners = data.items;
    
    // Client-side filtering for demo
    if (search) {
        const s = search.toLowerCase();
        partners = partners.filter(p => 
            p.company_name?.toLowerCase().includes(s) ||
            p.contact_name?.toLowerCase().includes(s) ||
            p.email?.toLowerCase().includes(s)
        );
    }
    if (status) {
        partners = partners.filter(p => p.status === status);
    }
    
    document.getElementById('partnersTable').innerHTML = partners.map(p => `
        <tr>
            <td>
                <strong>${p.company_name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.email}</div>
            </td>
            <td>
                ${p.contact_name}
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.phone}</div>
            </td>
            <td>${getPartnerTypeBadge(p.partner_type)}</td>
            <td class="${p.balance < 0 ? 'text-danger' : ''}">${formatMoney(p.balance)}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>
                <div class="actions">
                    ${p.status === 'pending' ? `<button class="action-btn" onclick="approvePartner(${p.id})" title="Підтвердити"><i class="fas fa-check"></i></button>` : ''}
                    <button class="action-btn" onclick="editPartner(${p.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn danger" onclick="deletePartner(${p.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="empty-state">Партнерів не знайдено</td></tr>';
}

async function loadOrders() {
    const status = document.getElementById('ordersStatusFilter')?.value || '';
    
    let data;
    try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        
        const response = await fetch(`${API_URL}/admin/orders?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.orders };
    } catch {
        data = { items: demoData.orders };
    }
    
    let orders = data.items;
    if (status) {
        orders = orders.filter(o => o.status === status);
    }
    
    document.getElementById('ordersTable').innerHTML = orders.map(o => `
        <tr>
            <td><strong>${o.order_number}</strong></td>
            <td>${o.partner_name}</td>
            <td>${o.items_count}</td>
            <td>${formatMoney(o.total)}</td>
            <td>${formatDate(o.created_at)}</td>
            <td>${getStatusBadge(o.status)}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="viewOrder(${o.id})" title="Переглянути"><i class="fas fa-eye"></i></button>
                    <button class="action-btn" onclick="editOrderStatus(${o.id})" title="Змінити статус"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty-state">Замовлень не знайдено</td></tr>';
}

async function loadProducts() {
    let data;
    try {
        const response = await fetch(`${API_URL}/admin/products`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.products };
    } catch {
        data = { items: demoData.products };
    }
    
    // Load categories for filter
    const categories = demoData.categories;
    const filterSelect = document.getElementById('productsCategoryFilter');
    if (filterSelect && filterSelect.options.length <= 1) {
        categories.forEach(c => {
            filterSelect.add(new Option(c.name_uk, c.id));
        });
    }
    
    document.getElementById('productsTable').innerHTML = data.items.map(p => `
        <tr>
            <td><code>${p.sku}</code></td>
            <td>
                <strong>${p.name_uk}</strong>
                ${p.is_new ? '<span class="badge badge-success" style="margin-left: 0.5rem;">NEW</span>' : ''}
                ${p.is_bestseller ? '<span class="badge badge-warning" style="margin-left: 0.5rem;">HIT</span>' : ''}
            </td>
            <td>${p.category_name || '-'}</td>
            <td>${p.price_retail} ₴</td>
            <td>${p.price_wholesale || '-'} ₴</td>
            <td class="${p.stock_quantity < 50 ? 'text-danger' : ''}">${p.stock_quantity}</td>
            <td>${p.is_active ? '<span class="badge badge-success">Активний</span>' : '<span class="badge badge-gray">Вимкнено</span>'}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editProduct(${p.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn danger" onclick="deleteProduct(${p.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadCategories() {
    let data;
    try {
        const response = await fetch(`${API_URL}/admin/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.categories };
    } catch {
        data = { items: demoData.categories };
    }
    
    document.getElementById('categoriesTable').innerHTML = data.items.map(c => `
        <tr>
            <td>
                <i class="fas ${c.icon}" style="margin-right: 0.5rem; color: var(--primary);"></i>
                <strong>${c.name_uk}</strong>
                <span style="color: var(--text-muted); margin-left: 0.5rem;">${c.name_en || ''}</span>
            </td>
            <td><code>${c.slug}</code></td>
            <td>${c.products_count || 0}</td>
            <td>${c.is_active ? '<span class="badge badge-success">Активна</span>' : '<span class="badge badge-gray">Вимкнено</span>'}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editCategory(${c.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn danger" onclick="deleteCategory(${c.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadBrands() {
    let data;
    try {
        const response = await fetch(`${API_URL}/admin/brands`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.brands };
    } catch {
        data = { items: demoData.brands };
    }
    
    document.getElementById('brandsTable').innerHTML = data.items.map(b => `
        <tr>
            <td><strong>${b.name}</strong></td>
            <td>${b.country || '-'}</td>
            <td>${b.is_exclusive ? '<span class="badge badge-primary">Ексклюзив</span>' : '-'}</td>
            <td>${b.products_count || 0}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editBrand(${b.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn danger" onclick="deleteBrand(${b.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadContent() {
    let data;
    try {
        const response = await fetch(`${API_URL}/admin/content?content_type=${currentContentType}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        data = response.ok ? await response.json() : { items: demoData.content };
    } catch {
        data = { items: demoData.content };
    }
    
    const filtered = data.items.filter(c => c.content_type === currentContentType);
    
    document.getElementById('contentTable').innerHTML = filtered.map(c => `
        <tr>
            <td><strong>${c.title_uk}</strong></td>
            <td>${c.title_en || '-'}</td>
            <td>${getContentTypeBadge(c.content_type)}</td>
            <td>${c.is_active ? '<span class="badge badge-success">Активний</span>' : '<span class="badge badge-gray">Вимкнено</span>'}</td>
            <td>${c.publish_date || '-'}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editContent(${c.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn danger" onclick="deleteContent(${c.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="empty-state">Контент не знайдено</td></tr>';
}

async function loadTranslations() {
    let translations;
    try {
        const response = await fetch(`${API_URL}/admin/translations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        translations = response.ok ? await response.json() : demoData.translations;
    } catch {
        translations = demoData.translations;
    }
    
    const search = document.getElementById('translationsSearch')?.value?.toLowerCase() || '';
    
    const entries = Object.entries(translations).filter(([key]) => 
        !search || key.toLowerCase().includes(search)
    );
    
    document.getElementById('translationsTable').innerHTML = entries.map(([key, value]) => `
        <tr>
            <td><code>${key}</code></td>
            <td>${value.uk}</td>
            <td>${value.en || '<span style="color: var(--text-muted);">—</span>'}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editTranslation('${key}')" title="Редагувати"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== MODALS ====================

function openModal(title, content, onSave) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalSaveBtn').onclick = onSave;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function openProductModal(product = null) {
    const isEdit = !!product;
    const content = `
        <form id="productForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>SKU *</label>
                    <input type="text" class="form-control" name="sku" value="${product?.sku || ''}" required>
                </div>
                <div class="form-group">
                    <label>Категорія</label>
                    <select class="form-control filter-select" name="category_id">
                        <option value="">Виберіть...</option>
                        ${demoData.categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${c.name_uk}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Назва (UK) *</label>
                <input type="text" class="form-control" name="name_uk" value="${product?.name_uk || ''}" required>
            </div>
            <div class="form-group">
                <label>Назва (EN)</label>
                <input type="text" class="form-control" name="name_en" value="${product?.name_en || ''}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Ціна РРЦ *</label>
                    <input type="number" class="form-control" name="price_retail" value="${product?.price_retail || ''}" required>
                </div>
                <div class="form-group">
                    <label>Ціна Опт</label>
                    <input type="number" class="form-control" name="price_wholesale" value="${product?.price_wholesale || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Залишок на складі</label>
                <input type="number" class="form-control" name="stock_quantity" value="${product?.stock_quantity || 0}">
            </div>
        </form>
    `;
    
    openModal(isEdit ? 'Редагувати товар' : 'Новий товар', content, () => saveProduct(product?.id));
}

function openCategoryModal(category = null) {
    const content = `
        <form id="categoryForm">
            <div class="form-group">
                <label>Назва (UK) *</label>
                <input type="text" class="form-control" name="name_uk" value="${category?.name_uk || ''}" required>
            </div>
            <div class="form-group">
                <label>Назва (EN)</label>
                <input type="text" class="form-control" name="name_en" value="${category?.name_en || ''}">
            </div>
            <div class="form-group">
                <label>Slug</label>
                <input type="text" class="form-control" name="slug" value="${category?.slug || ''}" placeholder="auto-generated">
            </div>
            <div class="form-group">
                <label>Іконка (FontAwesome)</label>
                <input type="text" class="form-control" name="icon" value="${category?.icon || ''}" placeholder="fa-lightbulb">
            </div>
        </form>
    `;
    
    openModal(category ? 'Редагувати категорію' : 'Нова категорія', content, () => saveCategory(category?.id));
}

function openBrandModal(brand = null) {
    const content = `
        <form id="brandForm">
            <div class="form-group">
                <label>Назва *</label>
                <input type="text" class="form-control" name="name" value="${brand?.name || ''}" required>
            </div>
            <div class="form-group">
                <label>Країна</label>
                <input type="text" class="form-control" name="country" value="${brand?.country || ''}">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_exclusive" ${brand?.is_exclusive ? 'checked' : ''}>
                    Ексклюзивний бренд
                </label>
            </div>
        </form>
    `;
    
    openModal(brand ? 'Редагувати бренд' : 'Новий бренд', content, () => saveBrand(brand?.id));
}

function openContentModal(content = null) {
    const formContent = `
        <form id="contentForm">
            <div class="form-group">
                <label>Тип</label>
                <select class="form-control filter-select" name="content_type">
                    <option value="news" ${content?.content_type === 'news' ? 'selected' : ''}>Новина</option>
                    <option value="banner" ${content?.content_type === 'banner' ? 'selected' : ''}>Банер</option>
                    <option value="promo" ${content?.content_type === 'promo' ? 'selected' : ''}>Акція</option>
                </select>
            </div>
            <div class="form-group">
                <label>Заголовок (UK) *</label>
                <input type="text" class="form-control" name="title_uk" value="${content?.title_uk || ''}" required>
            </div>
            <div class="form-group">
                <label>Заголовок (EN)</label>
                <input type="text" class="form-control" name="title_en" value="${content?.title_en || ''}">
            </div>
            <div class="form-group">
                <label>Короткий опис (UK)</label>
                <textarea class="form-control" name="excerpt_uk" rows="3">${content?.excerpt_uk || ''}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_active" ${content?.is_active !== false ? 'checked' : ''}>
                    Активний
                </label>
            </div>
        </form>
    `;
    
    openModal(content ? 'Редагувати контент' : 'Новий контент', formContent, () => saveContent(content?.id));
}

function openTranslationModal(key = null, existing = null) {
    const content = `
        <form id="translationForm">
            <div class="form-group">
                <label>Ключ *</label>
                <input type="text" class="form-control" name="key" value="${key || ''}" ${key ? 'readonly' : ''} required placeholder="nav.home">
            </div>
            <div class="form-group">
                <label>Українська *</label>
                <input type="text" class="form-control" name="uk" value="${existing?.uk || ''}" required>
            </div>
            <div class="form-group">
                <label>English</label>
                <input type="text" class="form-control" name="en" value="${existing?.en || ''}">
            </div>
        </form>
    `;
    
    openModal(key ? 'Редагувати переклад' : 'Новий переклад', content, () => saveTranslation(key));
}

function openPartnerModal(partner = null) {
    const content = `
        <form id="partnerForm">
            <div class="form-group">
                <label>Назва компанії *</label>
                <input type="text" class="form-control" name="company_name" value="${partner?.company_name || ''}" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Контактна особа *</label>
                    <input type="text" class="form-control" name="contact_name" value="${partner?.contact_name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Телефон *</label>
                    <input type="text" class="form-control" name="phone" value="${partner?.phone || ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" class="form-control" name="email" value="${partner?.email || ''}" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Місто</label>
                    <input type="text" class="form-control" name="city" value="${partner?.city || ''}">
                </div>
                <div class="form-group">
                    <label>Тип партнера</label>
                    <select class="form-control filter-select" name="partner_type">
                        <option value="retail" ${partner?.partner_type === 'retail' ? 'selected' : ''}>Роздріб</option>
                        <option value="wholesale" ${partner?.partner_type === 'wholesale' ? 'selected' : ''}>Опт</option>
                        <option value="distributor" ${partner?.partner_type === 'distributor' ? 'selected' : ''}>Дистриб'ютор</option>
                        <option value="network" ${partner?.partner_type === 'network' ? 'selected' : ''}>Мережа</option>
                    </select>
                </div>
            </div>
            ${partner ? `
            <div class="grid-2">
                <div class="form-group">
                    <label>Статус</label>
                    <select class="form-control filter-select" name="status">
                        <option value="pending" ${partner?.status === 'pending' ? 'selected' : ''}>Очікує</option>
                        <option value="active" ${partner?.status === 'active' ? 'selected' : ''}>Активний</option>
                        <option value="suspended" ${partner?.status === 'suspended' ? 'selected' : ''}>Призупинений</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Знижка %</label>
                    <input type="number" class="form-control" name="discount_percent" value="${partner?.discount_percent || 0}">
                </div>
            </div>
            ` : ''}
        </form>
    `;
    
    openModal(partner ? 'Редагувати партнера' : 'Новий партнер', content, () => savePartner(partner?.id));
}

// ==================== SAVE FUNCTIONS ====================

async function saveProduct(id) {
    const form = document.getElementById('productForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Convert numeric fields
    data.price_retail = parseFloat(data.price_retail);
    data.price_wholesale = data.price_wholesale ? parseFloat(data.price_wholesale) : null;
    data.stock_quantity = parseInt(data.stock_quantity);
    data.category_id = data.category_id ? parseInt(data.category_id) : null;
    
    try {
        const response = await fetch(`${API_URL}/admin/products${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Товар збережено!', 'success');
            closeModal();
            loadProducts();
        } else {
            showToast('Помилка збереження', 'error');
        }
    } catch {
        // Demo mode
        showToast('Demo: Товар збережено!', 'success');
        closeModal();
    }
}

async function saveCategory(id) {
    const form = document.getElementById('categoryForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/admin/categories${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Категорію збережено!', 'success');
            closeModal();
            loadCategories();
        }
    } catch {
        showToast('Demo: Категорію збережено!', 'success');
        closeModal();
    }
}

async function saveBrand(id) {
    const form = document.getElementById('brandForm');
    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        country: formData.get('country'),
        is_exclusive: formData.get('is_exclusive') === 'on'
    };
    
    try {
        const response = await fetch(`${API_URL}/admin/brands${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Бренд збережено!', 'success');
            closeModal();
            loadBrands();
        }
    } catch {
        showToast('Demo: Бренд збережено!', 'success');
        closeModal();
    }
}

async function saveContent(id) {
    const form = document.getElementById('contentForm');
    const formData = new FormData(form);
    const data = {
        content_type: formData.get('content_type'),
        title_uk: formData.get('title_uk'),
        title_en: formData.get('title_en'),
        excerpt_uk: formData.get('excerpt_uk'),
        is_active: formData.get('is_active') === 'on'
    };
    
    try {
        const response = await fetch(`${API_URL}/admin/content${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Контент збережено!', 'success');
            closeModal();
            loadContent();
        }
    } catch {
        showToast('Demo: Контент збережено!', 'success');
        closeModal();
    }
}

async function saveTranslation(existingKey) {
    const form = document.getElementById('translationForm');
    const formData = new FormData(form);
    const data = {
        key: formData.get('key'),
        uk: formData.get('uk'),
        en: formData.get('en')
    };
    
    try {
        const url = existingKey 
            ? `${API_URL}/admin/translations/${existingKey}`
            : `${API_URL}/admin/translations`;
        
        const response = await fetch(url, {
            method: existingKey ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Переклад збережено!', 'success');
            closeModal();
            loadTranslations();
        }
    } catch {
        // Demo mode - add to local data
        demoData.translations[data.key] = { uk: data.uk, en: data.en || data.uk };
        showToast('Demo: Переклад збережено!', 'success');
        closeModal();
        loadTranslations();
    }
}

async function savePartner(id) {
    const form = document.getElementById('partnerForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    if (data.discount_percent) {
        data.discount_percent = parseFloat(data.discount_percent);
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/partners${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Партнера збережено!', 'success');
            closeModal();
            loadPartners();
        }
    } catch {
        showToast('Demo: Партнера збережено!', 'success');
        closeModal();
    }
}

// ==================== ACTION FUNCTIONS ====================

async function approvePartner(id) {
    if (!confirm('Підтвердити цього партнера?')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/partners/${id}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showToast('Партнера підтверджено!', 'success');
            loadPartners();
            loadDashboard();
        }
    } catch {
        // Demo mode
        const partner = demoData.partners.find(p => p.id === id);
        if (partner) partner.status = 'active';
        showToast('Demo: Партнера підтверджено!', 'success');
        loadPartners();
        loadDashboard();
    }
}

function viewPartner(id) {
    const partner = demoData.partners.find(p => p.id === id);
    if (partner) {
        editPartner(id);
    }
}

function editPartner(id) {
    const partner = demoData.partners.find(p => p.id === id);
    if (partner) {
        openPartnerModal(partner);
    }
}

function deletePartner(id) {
    if (!confirm('Видалити цього партнера?')) return;
    showToast('Demo: Партнера видалено', 'success');
    demoData.partners = demoData.partners.filter(p => p.id !== id);
    loadPartners();
}

function viewOrder(id) {
    const order = demoData.orders.find(o => o.id === id);
    if (!order) return;
    
    const content = `
        <div style="margin-bottom: 1rem;">
            <strong>№ ${order.order_number}</strong>
            <span class="badge badge-${getStatusClass(order.status)}" style="margin-left: 0.5rem;">${getStatusText(order.status)}</span>
        </div>
        <p><strong>Партнер:</strong> ${order.partner_name}</p>
        <p><strong>Дата:</strong> ${formatDate(order.created_at)}</p>
        <p><strong>Сума:</strong> ${formatMoney(order.total)}</p>
        <hr style="border-color: var(--border); margin: 1rem 0;">
        <h4>Позиції замовлення</h4>
        <table class="table" style="margin-top: 0.5rem;">
            <thead>
                <tr><th>Товар</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr>
            </thead>
            <tbody>
                <tr><td>Батарейка Energizer AA</td><td>100</td><td>32 ₴</td><td>3 200 ₴</td></tr>
                <tr><td>LED лампа Philips 10W</td><td>50</td><td>65 ₴</td><td>3 250 ₴</td></tr>
            </tbody>
        </table>
    `;
    
    openModal('Деталі замовлення', content, closeModal);
    document.getElementById('modalSaveBtn').textContent = 'Закрити';
}

function editOrderStatus(id) {
    const order = demoData.orders.find(o => o.id === id);
    if (!order) return;
    
    const content = `
        <form id="orderStatusForm">
            <p><strong>Замовлення:</strong> ${order.order_number}</p>
            <div class="form-group" style="margin-top: 1rem;">
                <label>Новий статус</label>
                <select class="form-control filter-select" name="status">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Нове</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обробці</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Відправлено</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлено</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Скасовано</option>
                </select>
            </div>
            <div class="form-group">
                <label>ТТН (номер відстеження)</label>
                <input type="text" class="form-control" name="tracking_number" value="${order.tracking_number || ''}">
            </div>
        </form>
    `;
    
    openModal('Змінити статус', content, () => {
        const form = document.getElementById('orderStatusForm');
        const formData = new FormData(form);
        order.status = formData.get('status');
        if (formData.get('tracking_number')) {
            order.tracking_number = formData.get('tracking_number');
        }
        showToast('Demo: Статус оновлено!', 'success');
        closeModal();
        loadOrders();
    });
}

function editProduct(id) {
    const product = demoData.products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

function deleteProduct(id) {
    if (!confirm('Видалити цей товар?')) return;
    demoData.products = demoData.products.filter(p => p.id !== id);
    showToast('Demo: Товар видалено', 'success');
    loadProducts();
}

function editCategory(id) {
    const category = demoData.categories.find(c => c.id === id);
    if (category) {
        openCategoryModal(category);
    }
}

function deleteCategory(id) {
    if (!confirm('Видалити цю категорію?')) return;
    demoData.categories = demoData.categories.filter(c => c.id !== id);
    showToast('Demo: Категорію видалено', 'success');
    loadCategories();
}

function editBrand(id) {
    const brand = demoData.brands.find(b => b.id === id);
    if (brand) {
        openBrandModal(brand);
    }
}

function deleteBrand(id) {
    if (!confirm('Видалити цей бренд?')) return;
    demoData.brands = demoData.brands.filter(b => b.id !== id);
    showToast('Demo: Бренд видалено', 'success');
    loadBrands();
}

function editContent(id) {
    const content = demoData.content.find(c => c.id === id);
    if (content) {
        openContentModal(content);
    }
}

function deleteContent(id) {
    if (!confirm('Видалити цей контент?')) return;
    demoData.content = demoData.content.filter(c => c.id !== id);
    showToast('Demo: Контент видалено', 'success');
    loadContent();
}

function editTranslation(key) {
    const existing = demoData.translations[key];
    openTranslationModal(key, existing);
}

function saveSettings() {
    showToast('Demo: Налаштування збережено!', 'success');
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

function getStatusBadge(status) {
    const classes = {
        pending: 'badge-warning',
        active: 'badge-success',
        processing: 'badge-primary',
        shipped: 'badge-primary',
        delivered: 'badge-success',
        cancelled: 'badge-danger',
        suspended: 'badge-danger'
    };
    return `<span class="badge ${classes[status] || 'badge-gray'}">${getStatusText(status)}</span>`;
}

function getStatusClass(status) {
    const classes = {
        pending: 'warning',
        active: 'success',
        processing: 'primary',
        shipped: 'primary',
        delivered: 'success',
        cancelled: 'danger'
    };
    return classes[status] || 'gray';
}

function getStatusText(status) {
    const texts = {
        pending: 'Очікує',
        active: 'Активний',
        processing: 'В обробці',
        shipped: 'Відправлено',
        delivered: 'Доставлено',
        cancelled: 'Скасовано',
        suspended: 'Призупинено'
    };
    return texts[status] || status;
}

function getPartnerTypeBadge(type) {
    const types = {
        retail: { text: 'Роздріб', class: 'badge-gray' },
        wholesale: { text: 'Опт', class: 'badge-primary' },
        distributor: { text: 'Дистриб\'ютор', class: 'badge-success' },
        network: { text: 'Мережа', class: 'badge-warning' }
    };
    const t = types[type] || { text: type, class: 'badge-gray' };
    return `<span class="badge ${t.class}">${t.text}</span>`;
}

function getContentTypeBadge(type) {
    const types = {
        news: { text: 'Новина', class: 'badge-primary' },
        banner: { text: 'Банер', class: 'badge-success' },
        promo: { text: 'Акція', class: 'badge-warning' }
    };
    const t = types[type] || { text: type, class: 'badge-gray' };
    return `<span class="badge ${t.class}">${t.text}</span>`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
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

// ==================== MANAGERS ====================

async function loadManagers() {
    const regionId = document.getElementById('managersRegionFilter')?.value || '';
    
    // Populate region filter
    const regionSelect = document.getElementById('managersRegionFilter');
    if (regionSelect && regionSelect.options.length <= 1) {
        demoData.regions.forEach(r => {
            regionSelect.add(new Option(r.name_uk, r.id));
        });
    }
    
    let managers;
    try {
        const params = new URLSearchParams();
        if (regionId) params.append('region_id', regionId);
        
        const response = await fetch(`${API_URL}/admin/managers?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        managers = response.ok ? (await response.json()).items : demoData.managers;
    } catch {
        managers = demoData.managers;
    }
    
    if (regionId) {
        managers = managers.filter(m => m.region_id === parseInt(regionId));
    }
    
    document.getElementById('managersTable').innerHTML = managers.map(m => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${m.full_name.charAt(0)}
                    </div>
                    <strong>${m.full_name}</strong>
                </div>
            </td>
            <td><a href="tel:${m.phone}" style="color: var(--text);">${m.phone}</a></td>
            <td><a href="mailto:${m.email}" style="color: var(--primary);">${m.email}</a></td>
            <td>${m.telegram_username ? `<a href="https://t.me/${m.telegram_username.replace('@', '')}" target="_blank" style="color: #0088cc;">${m.telegram_username}</a>` : '-'}</td>
            <td>${m.region_name || '-'}</td>
            <td>${m.is_active ? '<span class="badge badge-success">Активний</span>' : '<span class="badge badge-gray">Неактивний</span>'}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editManager(${m.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="deleteManager(${m.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align: center;">Менеджерів не знайдено</td></tr>';
}

function openManagerModal(manager = null) {
    const title = manager ? 'Редагувати менеджера' : 'Додати менеджера';
    const html = `
        <div class="form-group">
            <label>ПІБ</label>
            <input type="text" class="form-control" id="managerName" value="${manager?.full_name || ''}" required>
        </div>
        <div class="form-group">
            <label>Телефон</label>
            <input type="tel" class="form-control" id="managerPhone" value="${manager?.phone || ''}" required>
        </div>
        <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" id="managerEmail" value="${manager?.email || ''}" required>
        </div>
        <div class="form-group">
            <label>Telegram</label>
            <input type="text" class="form-control" id="managerTelegram" value="${manager?.telegram_username || ''}" placeholder="@username">
        </div>
        <div class="form-group">
            <label>Регіон</label>
            <select class="form-control" id="managerRegion">
                <option value="">Не призначено</option>
                ${demoData.regions.map(r => `<option value="${r.id}" ${manager?.region_id === r.id ? 'selected' : ''}>${r.name_uk}</option>`).join('')}
            </select>
        </div>
    `;
    
    openModal(title, html, () => saveManager(manager?.id));
}

async function saveManager(id) {
    const data = {
        full_name: document.getElementById('managerName').value,
        phone: document.getElementById('managerPhone').value,
        email: document.getElementById('managerEmail').value,
        telegram_username: document.getElementById('managerTelegram').value,
        region_id: parseInt(document.getElementById('managerRegion').value) || null
    };
    
    try {
        const url = id ? `${API_URL}/admin/managers/${id}` : `${API_URL}/admin/managers`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        showToast(`Менеджера ${id ? 'оновлено' : 'створено'}`, 'success');
    } catch {
        // Demo mode
        if (!id) {
            const region = demoData.regions.find(r => r.id === data.region_id);
            demoData.managers.push({
                id: demoData.managers.length + 1,
                ...data,
                region_name: region?.name_uk,
                is_active: true
            });
        }
        showToast(`Менеджера ${id ? 'оновлено' : 'створено'} (demo)`, 'success');
    }
    
    closeModal();
    loadManagers();
}

function editManager(id) {
    const manager = demoData.managers.find(m => m.id === id);
    if (manager) openManagerModal(manager);
}

async function deleteManager(id) {
    if (!confirm('Видалити менеджера?')) return;
    
    try {
        await fetch(`${API_URL}/admin/managers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch {
        demoData.managers = demoData.managers.filter(m => m.id !== id);
    }
    
    showToast('Менеджера видалено', 'success');
    loadManagers();
}


// ==================== TAGS ====================

async function loadTags() {
    let tags;
    try {
        const response = await fetch(`${API_URL}/admin/tags`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        tags = response.ok ? (await response.json()).items : demoData.tags;
    } catch {
        tags = demoData.tags;
    }
    
    document.getElementById('tagsTable').innerHTML = tags.map(t => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="width: 12px; height: 12px; background: ${t.color}; border-radius: 3px;"></span>
                    <strong>${t.name_uk}</strong>
                    <span style="color: var(--text-muted); font-size: 0.8rem;">(${t.name_en || t.name_uk})</span>
                </div>
            </td>
            <td><code style="background: var(--dark); padding: 0.2rem 0.5rem; border-radius: 4px;">${t.slug}</code></td>
            <td>
                <input type="color" value="${t.color}" style="width: 30px; height: 24px; border: none; cursor: pointer;" 
                    onchange="updateTagColor(${t.id}, this.value)">
            </td>
            <td>${t.products_count || 0}</td>
            <td>${t.content_count || 0}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="editTag(${t.id})" title="Редагувати"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="deleteTag(${t.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align: center;">Тегів не знайдено</td></tr>';
}

function openTagModal(tag = null) {
    const title = tag ? 'Редагувати тег' : 'Додати тег';
    const html = `
        <div class="form-group">
            <label>Назва (UK)</label>
            <input type="text" class="form-control" id="tagNameUk" value="${tag?.name_uk || ''}" required>
        </div>
        <div class="form-group">
            <label>Назва (EN)</label>
            <input type="text" class="form-control" id="tagNameEn" value="${tag?.name_en || ''}">
        </div>
        <div class="form-group">
            <label>Колір</label>
            <input type="color" class="form-control" id="tagColor" value="${tag?.color || '#6366f1'}" style="height: 44px;">
        </div>
    `;
    
    openModal(title, html, () => saveTag(tag?.id));
}

async function saveTag(id) {
    const data = {
        name_uk: document.getElementById('tagNameUk').value,
        name_en: document.getElementById('tagNameEn').value,
        color: document.getElementById('tagColor').value
    };
    
    try {
        const url = id ? `${API_URL}/admin/tags/${id}` : `${API_URL}/admin/tags`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        showToast(`Тег ${id ? 'оновлено' : 'створено'}`, 'success');
    } catch {
        // Demo mode
        if (!id) {
            const slug = data.name_uk.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '-').replace(/-+/g, '-');
            demoData.tags.push({
                id: demoData.tags.length + 1,
                ...data,
                slug,
                products_count: 0,
                content_count: 0
            });
        }
        showToast(`Тег ${id ? 'оновлено' : 'створено'} (demo)`, 'success');
    }
    
    closeModal();
    loadTags();
}

function editTag(id) {
    const tag = demoData.tags.find(t => t.id === id);
    if (tag) openTagModal(tag);
}

async function deleteTag(id) {
    if (!confirm('Видалити тег?')) return;
    
    try {
        await fetch(`${API_URL}/admin/tags/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch {
        demoData.tags = demoData.tags.filter(t => t.id !== id);
    }
    
    showToast('Тег видалено', 'success');
    loadTags();
}

async function updateTagColor(id, color) {
    try {
        await fetch(`${API_URL}/admin/tags/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ color })
        });
    } catch {
        const tag = demoData.tags.find(t => t.id === id);
        if (tag) tag.color = color;
    }
    showToast('Колір оновлено', 'success');
}
