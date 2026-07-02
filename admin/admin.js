// Admin Panel JavaScript
// API Configuration
const API_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('admin_token') || null;
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupForms();
});

// Authentication
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
            showApp();
            loadDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.log('API not available, using demo mode');
        // Demo mode - show app without real API
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
        document.getElementById('userRole').textContent = getRoleName(currentUser.role);
        document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.username)[0].toUpperCase();
    }
}

function getRoleName(role) {
    const roles = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Переглядач' };
    return roles[role] || role;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('admin_token', authToken);
            fetchCurrentUser();
        } else {
            showToast('Невірний логін або пароль', true);
        }
    } catch (error) {
        // Demo mode login
        if (username === 'admin' && password === 'admin123') {
            currentUser = { id: 1, username: 'admin', full_name: 'Адміністратор', role: 'admin' };
            localStorage.setItem('admin_token', 'demo_token');
            showApp();
            loadDemoData();
        } else {
            showToast('Невірний логін або пароль', true);
        }
    }
});

function logout() {
    localStorage.removeItem('admin_token');
    authToken = null;
    currentUser = null;
    showLoginScreen();
}

// Navigation
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
        products: ['Товари', 'Управління каталогом продукції'],
        categories: ['Категорії', 'Структура каталогу'],
        brands: ['Бренди', 'Виробники продукції'],
        customers: ['Клієнти', 'База клієнтів CRM'],
        leads: ['Воронка продажів', 'Управління лідами'],
        orders: ['Замовлення', 'Обробка замовлень'],
        'ai-chat': ['AI Чат-бот', 'Тестування чат-бота'],
        'ai-tools': ['AI Інструменти', 'Автоматизація за допомогою AI'],
        analytics: ['Аналітика', 'Звіти та статистика'],
        users: ['Користувачі', 'Управління доступом'],
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
        case 'products': loadProducts(); break;
        case 'categories': loadCategories(); break;
        case 'brands': loadBrands(); break;
        case 'customers': loadCustomers(); break;
        case 'leads': loadLeadsFunnel(); break;
        case 'orders': loadOrders(); break;
        case 'users': loadUsers(); break;
        case 'analytics': loadAnalytics(); break;
    }
}

// Demo Data
let demoData = {
    products: [
        { id: 1, sku: 'DOM-001', name: 'Домофон Quantum 7"', category_id: 1, category_name: 'Домофони', price: 3500, stock: 25, is_active: true, is_new: true },
        { id: 2, sku: 'CAM-001', name: 'IP Камера ProVision 4MP', category_id: 2, category_name: 'Відеоспостереження', price: 2800, stock: 42, is_active: true, is_hit: true },
        { id: 3, sku: 'LCK-001', name: 'Електрозамок YaleGuard', category_id: 5, category_name: 'Електрозамки', price: 1200, stock: 5, is_active: true, is_sale: true },
        { id: 4, sku: 'DOM-002', name: 'Відеопанель антивандальна', category_id: 1, category_name: 'Домофони', price: 4200, stock: 15, is_active: true },
        { id: 5, sku: 'ACC-001', name: 'Кронштейн для камери', category_id: 6, category_name: 'Аксесуари', price: 350, stock: 100, is_active: true }
    ],
    categories: [
        { id: 1, name: 'Домофони', slug: 'domophones', products_count: 2, is_active: true },
        { id: 2, name: 'Відеоспостереження', slug: 'video', products_count: 1, is_active: true },
        { id: 3, name: 'Контроль доступу', slug: 'access', products_count: 0, is_active: true },
        { id: 4, name: 'Інтеркоми', slug: 'intercom', products_count: 0, is_active: true },
        { id: 5, name: 'Електрозамки', slug: 'locks', products_count: 1, is_active: true },
        { id: 6, name: 'Аксесуари', slug: 'accessories', products_count: 1, is_active: true }
    ],
    brands: [
        { id: 1, name: 'Hikvision', slug: 'hikvision' },
        { id: 2, name: 'Dahua', slug: 'dahua' },
        { id: 3, name: 'Slinex', slug: 'slinex' },
        { id: 4, name: 'Yale', slug: 'yale' },
        { id: 5, name: 'Tantos', slug: 'tantos' }
    ],
    customers: [
        { id: 1, name: 'ТОВ "Безпека Плюс"', company: 'ТОВ "Безпека Плюс"', email: 'info@bezpeka.ua', phone: '+380501234567', orders_count: 12, total_amount: 156000, source: 'referral' },
        { id: 2, name: 'Іван Петренко', company: null, email: 'ivan@gmail.com', phone: '+380671112233', orders_count: 3, total_amount: 8500, source: 'website' },
        { id: 3, name: 'ФОП Коваленко', company: 'ФОП Коваленко', email: 'kovalenko@ukr.net', phone: '+380933334455', orders_count: 7, total_amount: 45000, source: 'phone' }
    ],
    leads: [
        { id: 1, title: 'Встановлення системи відеоспостереження', contact_name: 'Олександр Сидоров', company: 'ТОВ "Будівельник"', phone: '+380501234567', email: 'alex@builder.ua', value: 125000, status: 'new', source: 'website' },
        { id: 2, title: 'Домофонна система на 24 квартири', contact_name: 'Марія Шевченко', company: 'ОСББ "Соняшник"', phone: '+380671112233', value: 85000, status: 'contacted', source: 'phone' },
        { id: 3, title: 'Система контролю доступу офіс', contact_name: 'Петро Мельник', company: 'IT Solutions', phone: '+380933334455', value: 45000, status: 'meeting', source: 'referral' },
        { id: 4, title: 'СКУД на підприємство', contact_name: 'Андрій Бондар', company: 'Завод "Металіст"', value: 280000, status: 'proposal', source: 'advertising' },
        { id: 5, title: 'Камери спостереження магазин', contact_name: 'Наталія Кравець', company: 'Продукти 24', value: 32000, status: 'negotiation', source: 'website' },
        { id: 6, title: 'Домофон приватний будинок', contact_name: 'Віктор Лисенко', value: 8500, status: 'closed_won', source: 'phone' },
        { id: 7, title: 'Занадто дорого', contact_name: 'Олег Козак', value: 15000, status: 'closed_lost', source: 'email' }
    ],
    orders: [
        { id: 1001, customer_name: 'ТОВ "Безпека Плюс"', phone: '+380501234567', total: 45600, status: 'new', created_at: '2024-01-15T10:30:00' },
        { id: 1002, customer_name: 'Іван Петренко', phone: '+380671112233', total: 3500, status: 'processing', created_at: '2024-01-15T09:15:00' },
        { id: 1003, customer_name: 'ФОП Коваленко', phone: '+380933334455', total: 12800, status: 'shipped', created_at: '2024-01-14T16:45:00' },
        { id: 1004, customer_name: 'Марина Бойко', phone: '+380661234567', total: 5200, status: 'delivered', created_at: '2024-01-13T11:20:00' },
        { id: 1005, customer_name: 'ТОВ "СТ Груп"', phone: '+380991234567', total: 89000, status: 'confirmed', created_at: '2024-01-15T08:00:00' }
    ],
    users: [
        { id: 1, username: 'admin', full_name: 'Адміністратор', email: 'admin@energia.ua', role: 'admin', is_active: true },
        { id: 2, username: 'manager1', full_name: 'Олена Іванова', email: 'olena@energia.ua', role: 'manager', is_active: true },
        { id: 3, username: 'viewer1', full_name: 'Максим Петров', email: 'maxim@energia.ua', role: 'viewer', is_active: true }
    ]
};

function loadDemoData() {
    loadDashboard();
}

// Dashboard
async function loadDashboard() {
    // Stats
    document.getElementById('stat-orders').textContent = demoData.orders.length;
    const totalRevenue = demoData.orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('stat-leads').textContent = demoData.leads.filter(l => l.status === 'new').length;
    document.getElementById('stat-products').textContent = demoData.products.length;
    document.getElementById('stat-lowstock').textContent = demoData.products.filter(p => p.stock < 10).length;
    
    // Recent orders
    const recentOrders = demoData.orders.slice(0, 5);
    document.getElementById('recentOrdersTable').innerHTML = recentOrders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer_name}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${getStatusBadge(order.status)}</td>
        </tr>
    `).join('');
    
    // Update nav badges
    document.getElementById('newLeadsCount').textContent = demoData.leads.filter(l => l.status === 'new').length;
    document.getElementById('newOrdersCount').textContent = demoData.orders.filter(o => o.status === 'new').length;
}

function getStatusBadge(status) {
    const statuses = {
        'new': ['Новий', 'info'],
        'contacting': ['Контакт', 'primary'],
        'contacted': ['Контакт', 'primary'],
        'meeting': ['Зустріч', 'warning'],
        'proposal': ['КП', 'warning'],
        'negotiation': ['Переговори', 'primary'],
        'closed_won': ['Успіх', 'success'],
        'closed_lost': ['Втрачено', 'danger'],
        'processing': ['В обробці', 'warning'],
        'confirmed': ['Підтверджено', 'success'],
        'shipped': ['Відправлено', 'info'],
        'delivered': ['Доставлено', 'success'],
        'cancelled': ['Скасовано', 'danger']
    };
    const [label, type] = statuses[status] || [status, 'secondary'];
    return `<span class="badge badge-${type}">${label}</span>`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            demoData.products = await response.json();
        }
    } catch (error) {
        console.log('Using demo data for products');
    }
    
    document.getElementById('productsTable').innerHTML = demoData.products.map(product => `
        <tr>
            <td>${product.sku}</td>
            <td><strong>${product.name}</strong></td>
            <td>${product.category_name || 'Без категорії'}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock < 10 ? `<span class="text-danger"><strong>${product.stock}</strong></span>` : product.stock}</td>
            <td>${product.is_active ? '<span class="badge badge-success">Активний</span>' : '<span class="badge badge-danger">Вимкнено</span>'}</td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadCategoriesForSelect() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '<option value="">Оберіть категорію</option>' +
        demoData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadBrandsForSelect() {
    const select = document.getElementById('productBrand');
    select.innerHTML = '<option value="">Оберіть бренд</option>' +
        demoData.brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

function openProductModal(productId = null) {
    loadCategoriesForSelect();
    loadBrandsForSelect();
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'Додати товар';
    document.getElementById('productModal').classList.add('active');
}

function editProduct(id) {
    const product = demoData.products.find(p => p.id === id);
    if (!product) return;
    
    loadCategoriesForSelect();
    loadBrandsForSelect();
    
    document.getElementById('productId').value = product.id;
    document.getElementById('productSku').value = product.sku;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productPriceOld').value = product.price_old || '';
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productBrand').value = product.brand_id || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productIsNew').checked = product.is_new;
    document.getElementById('productIsHit').checked = product.is_hit;
    document.getElementById('productIsSale').checked = product.is_sale;
    document.getElementById('productIsActive').checked = product.is_active;
    
    document.getElementById('productModalTitle').textContent = 'Редагувати товар';
    document.getElementById('productModal').classList.add('active');
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const productData = {
        sku: document.getElementById('productSku').value,
        name: document.getElementById('productName').value,
        category_id: document.getElementById('productCategory').value || null,
        brand_id: document.getElementById('productBrand').value || null,
        price: parseFloat(document.getElementById('productPrice').value),
        price_old: parseFloat(document.getElementById('productPriceOld').value) || null,
        stock: parseInt(document.getElementById('productStock').value) || 0,
        description: document.getElementById('productDescription').value,
        is_new: document.getElementById('productIsNew').checked,
        is_hit: document.getElementById('productIsHit').checked,
        is_sale: document.getElementById('productIsSale').checked,
        is_active: document.getElementById('productIsActive').checked
    };
    
    try {
        const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            showToast(id ? 'Товар оновлено' : 'Товар додано');
            closeModal('productModal');
            loadProducts();
        } else {
            showToast('Помилка збереження', true);
        }
    } catch (error) {
        // Demo mode
        if (id) {
            const idx = demoData.products.findIndex(p => p.id == id);
            if (idx !== -1) {
                demoData.products[idx] = { ...demoData.products[idx], ...productData };
            }
        } else {
            productData.id = Math.max(...demoData.products.map(p => p.id)) + 1;
            productData.category_name = demoData.categories.find(c => c.id == productData.category_id)?.name || '';
            demoData.products.push(productData);
        }
        showToast(id ? 'Товар оновлено' : 'Товар додано');
        closeModal('productModal');
        loadProducts();
    }
}

async function deleteProduct(id) {
    if (!confirm('Видалити цей товар?')) return;
    
    try {
        await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (error) {
        // Demo mode
        demoData.products = demoData.products.filter(p => p.id !== id);
    }
    
    showToast('Товар видалено');
    loadProducts();
}

// Categories
async function loadCategories() {
    document.getElementById('categoriesTable').innerHTML = demoData.categories.map(cat => `
        <tr>
            <td>${cat.id}</td>
            <td><strong>${cat.name}</strong></td>
            <td><code>${cat.slug}</code></td>
            <td>${cat.products_count || 0}</td>
            <td>${cat.is_active !== false ? '<span class="badge badge-success">Активна</span>' : '<span class="badge badge-danger">Вимкнена</span>'}</td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCategoryModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModal').classList.add('active');
}

async function saveCategory() {
    const categoryData = {
        name: document.getElementById('categoryName').value,
        slug: document.getElementById('categorySlug').value || document.getElementById('categoryName').value.toLowerCase().replace(/\s+/g, '-'),
        icon: document.getElementById('categoryIcon').value,
        description: document.getElementById('categoryDescription').value
    };
    
    categoryData.id = Math.max(...demoData.categories.map(c => c.id)) + 1;
    categoryData.products_count = 0;
    categoryData.is_active = true;
    demoData.categories.push(categoryData);
    
    showToast('Категорію додано');
    closeModal('categoryModal');
    loadCategories();
}

// Brands
async function loadBrands() {
    document.getElementById('brandsTable').innerHTML = demoData.brands.map(brand => `
        <tr>
            <td>${brand.id}</td>
            <td><strong>${brand.name}</strong></td>
            <td><code>${brand.slug}</code></td>
            <td>${brand.website || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openBrandModal() {
    showToast('Форма буде додана');
}

// Customers
async function loadCustomers() {
    document.getElementById('customersTable').innerHTML = demoData.customers.map(cust => `
        <tr>
            <td>${cust.id}</td>
            <td>
                <strong>${cust.name}</strong>
                ${cust.company ? `<br><small class="text-muted">${cust.company}</small>` : ''}
            </td>
            <td>
                ${cust.email ? `<i class="fas fa-envelope text-muted"></i> ${cust.email}<br>` : ''}
                ${cust.phone ? `<i class="fas fa-phone text-muted"></i> ${cust.phone}` : ''}
            </td>
            <td>${cust.orders_count}</td>
            <td><strong>${formatCurrency(cust.total_amount)}</strong></td>
            <td><span class="badge badge-info">${cust.source}</span></td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn"><i class="fas fa-eye"></i></button>
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCustomerModal() {
    showToast('Форма буде додана');
}

// Leads Funnel
const funnelStages = [
    { id: 'new', name: 'Нові', color: '#3b82f6' },
    { id: 'contacted', name: 'Контакт', color: '#8b5cf6' },
    { id: 'meeting', name: 'Зустріч', color: '#f59e0b' },
    { id: 'proposal', name: 'КП', color: '#06b6d4' },
    { id: 'negotiation', name: 'Переговори', color: '#ec4899' },
    { id: 'closed_won', name: 'Успіх', color: '#10b981' },
    { id: 'closed_lost', name: 'Втрачено', color: '#ef4444' }
];

function loadLeadsFunnel() {
    const board = document.getElementById('funnelBoard');
    board.innerHTML = funnelStages.map(stage => {
        const stageLeads = demoData.leads.filter(l => l.status === stage.id);
        const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
        
        return `
            <div class="funnel-column" data-stage="${stage.id}">
                <div class="funnel-header" style="border-color: ${stage.color};">
                    <h4>${stage.name}</h4>
                    <span class="funnel-count">${stageLeads.length}</span>
                </div>
                <div class="funnel-cards">
                    ${stageLeads.map(lead => `
                        <div class="lead-card" onclick="viewLead(${lead.id})">
                            <h5>${lead.title}</h5>
                            <p><i class="fas fa-user"></i> ${lead.contact_name}</p>
                            ${lead.company ? `<p><i class="fas fa-building"></i> ${lead.company}</p>` : ''}
                            <div class="lead-value">${formatCurrency(lead.value)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="text-muted" style="font-size: 12px; margin-top: 10px; text-align: center;">
                    Сума: ${formatCurrency(stageValue)}
                </div>
            </div>
        `;
    }).join('');
}

function openLeadModal() {
    document.getElementById('leadForm').reset();
    document.getElementById('leadModal').classList.add('active');
}

function saveLead() {
    const leadData = {
        id: Math.max(...demoData.leads.map(l => l.id)) + 1,
        title: document.getElementById('leadTitle').value || 'Новий запит',
        contact_name: document.getElementById('leadName').value,
        company: document.getElementById('leadCompany').value,
        phone: document.getElementById('leadPhone').value,
        email: document.getElementById('leadEmail').value,
        value: parseFloat(document.getElementById('leadValue').value) || 0,
        source: document.getElementById('leadSource').value,
        description: document.getElementById('leadDescription').value,
        status: 'new'
    };
    
    demoData.leads.push(leadData);
    showToast('Лід додано');
    closeModal('leadModal');
    loadLeadsFunnel();
    document.getElementById('newLeadsCount').textContent = demoData.leads.filter(l => l.status === 'new').length;
}

function viewLead(id) {
    const lead = demoData.leads.find(l => l.id === id);
    if (lead) {
        alert(`Лід: ${lead.title}\nКонтакт: ${lead.contact_name}\nКомпанія: ${lead.company || '-'}\nТелефон: ${lead.phone || '-'}\nСума: ${formatCurrency(lead.value)}\nСтатус: ${lead.status}`);
    }
}

// Orders
async function loadOrders() {
    const statusFilter = document.getElementById('orderStatusFilter')?.value;
    let orders = demoData.orders;
    
    if (statusFilter) {
        orders = orders.filter(o => o.status === statusFilter);
    }
    
    document.getElementById('ordersTable').innerHTML = orders.map(order => `
        <tr>
            <td><strong>#${order.id}</strong></td>
            <td>${order.customer_name}</td>
            <td>${order.phone}</td>
            <td><strong>${formatCurrency(order.total)}</strong></td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn"><i class="fas fa-eye"></i></button>
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Users
async function loadUsers() {
    document.getElementById('usersTable').innerHTML = demoData.users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.full_name}</strong><br><small class="text-muted">@${user.username}</small></td>
            <td>${user.email}</td>
            <td><span class="badge badge-primary">${getRoleName(user.role)}</span></td>
            <td>${user.is_active ? '<span class="badge badge-success">Активний</span>' : '<span class="badge badge-danger">Заблокований</span>'}</td>
            <td>
                <div class="table-actions">
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openUserModal() {
    showToast('Форма буде додана');
}

// Analytics
function loadAnalytics() {
    const totalLeads = demoData.leads.length;
    const wonLeads = demoData.leads.filter(l => l.status === 'closed_won').length;
    const conversion = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;
    
    document.getElementById('analytics-conversion').textContent = conversion + '%';
    
    const totalOrders = demoData.orders.length;
    const totalRevenue = demoData.orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    document.getElementById('analytics-avg-order').textContent = formatCurrency(avgOrder);
    document.getElementById('analytics-customers').textContent = demoData.customers.length;
    document.getElementById('analytics-new-month').textContent = demoData.customers.length;
    
    // Simple chart
    const ctx = document.getElementById('salesChart');
    if (ctx && window.Chart) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1', '5', '10', '15', '20', '25', '30'],
                datasets: [{
                    label: 'Продажі',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// AI Chat
function setupForms() {
    document.getElementById('chatForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        // Add user message
        addChatMessage(message, 'user');
        input.value = '';
        
        // Simulate AI response
        try {
            const response = await fetch(`${API_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ message })
            });
            
            if (response.ok) {
                const data = await response.json();
                addChatMessage(data.response, 'assistant');
            } else {
                throw new Error('API error');
            }
        } catch (error) {
            // Demo response
            const demoResponses = [
                'Доброго дня! Дякую за звернення. Я допоможу вам обрати потрібне обладнання.',
                'Наша компанія працює з усіма провідними брендами систем безпеки: Hikvision, Dahua, Slinex, Yale та інші.',
                'Доставка здійснюється по всій Україні. Для оптових клієнтів — безкоштовно при замовленні від 5000 грн.',
                'Гарантія на все обладнання — від 12 до 36 місяців залежно від виробника.',
                'Для отримання оптових цін зареєструйтесь як дилер або зверніться до менеджера.'
            ];
            const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
            setTimeout(() => addChatMessage(randomResponse, 'assistant'), 500);
        }
    });
}

function addChatMessage(content, role) {
    const container = document.getElementById('chatMessages');
    const avatar = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    container.innerHTML += `
        <div class="chat-message ${role}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">${content}</div>
        </div>
    `;
    
    container.scrollTop = container.scrollHeight;
}

function openAIDescriptionModal() {
    const productName = prompt('Введіть назву товару для генерації опису:');
    if (productName) {
        showToast('Генерація опису... (демо режим)');
        setTimeout(() => {
            alert(`Згенерований опис для "${productName}":\n\n${productName} — професійне обладнання для системи безпеки вашого дому чи офісу. Надійна робота, сучасний дизайн та простота встановлення. Виробник надає гарантію 24 місяці.`);
        }, 1000);
    }
}

// Modals & Toasts
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});
