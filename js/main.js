// ============================
// DOM Elements
// ============================
const header = document.querySelector('.header');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mainNav = document.getElementById('mainNav');
const searchBtn = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const searchClose = document.getElementById('searchClose');
const backToTop = document.getElementById('backToTop');
const heroSlider = document.getElementById('heroSlider');
const heroDots = document.getElementById('heroDots');
const heroPrev = document.getElementById('heroPrev');
const heroNext = document.getElementById('heroNext');
const productsGrid = document.getElementById('productsGrid');
const tabBtns = document.querySelectorAll('.tab-btn');
const contactForm = document.getElementById('contactForm');

// ============================
// Products Data
// ============================
const products = {
    new: [
        { id: 1, name: 'Відеодомофон ENERGIA HD-700', category: 'Домофони', price: 4599, oldPrice: null, badge: 'new', rating: 5, reviews: 12 },
        { id: 2, name: 'IP-камера ENERGIA Pro 4K', category: 'Відеоспостереження', price: 3299, oldPrice: null, badge: 'new', rating: 5, reviews: 8 },
        { id: 3, name: 'Контролер доступу ENERGIA Smart', category: 'Контроль доступу', price: 2899, oldPrice: null, badge: 'new', rating: 4, reviews: 5 },
        { id: 4, name: 'Електрозамок ENERGIA Lock-500', category: 'Електрозамки', price: 1599, oldPrice: null, badge: 'new', rating: 5, reviews: 15 }
    ],
    popular: [
        { id: 5, name: 'Відеодомофон ENERGIA Classic', category: 'Домофони', price: 2999, oldPrice: null, badge: 'hit', rating: 5, reviews: 89 },
        { id: 6, name: 'Комплект відеоспостереження 4 камери', category: 'Відеоспостереження', price: 8999, oldPrice: null, badge: 'hit', rating: 5, reviews: 67 },
        { id: 7, name: 'Зчитувач карток ENERGIA Reader', category: 'Контроль доступу', price: 899, oldPrice: null, badge: 'hit', rating: 4, reviews: 45 },
        { id: 8, name: 'Блок живлення 12V 5A', category: 'Аксесуари', price: 399, oldPrice: null, badge: 'hit', rating: 5, reviews: 123 }
    ],
    sale: [
        { id: 9, name: 'Відеодомофон ENERGIA Lite', category: 'Домофони', price: 1899, oldPrice: 2499, badge: 'sale', rating: 4, reviews: 34 },
        { id: 10, name: 'IP-камера ENERGIA Outdoor', category: 'Відеоспостереження', price: 1599, oldPrice: 2199, badge: 'sale', rating: 4, reviews: 28 },
        { id: 11, name: 'Домофон аудіо ENERGIA Basic', category: 'Домофони', price: 799, oldPrice: 1199, badge: 'sale', rating: 4, reviews: 56 },
        { id: 12, name: 'Відеореєстратор 8 каналів', category: 'Відеоспостереження', price: 3999, oldPrice: 5499, badge: 'sale', rating: 5, reviews: 41 }
    ]
};

// ============================
// Hero Slider
// ============================
class HeroSlider {
    constructor() {
        this.slides = document.querySelectorAll('.hero-slide');
        this.currentSlide = 0;
        this.autoPlayInterval = null;
        this.init();
    }

    init() {
        if (this.slides.length === 0) return;
        
        // Create dots
        this.slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('hero-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.goToSlide(index));
            heroDots.appendChild(dot);
        });

        // Event listeners
        heroPrev?.addEventListener('click', () => this.prevSlide());
        heroNext?.addEventListener('click', () => this.nextSlide());

        // Auto play
        this.startAutoPlay();

        // Pause on hover
        heroSlider?.addEventListener('mouseenter', () => this.stopAutoPlay());
        heroSlider?.addEventListener('mouseleave', () => this.startAutoPlay());
    }

    goToSlide(index) {
        this.slides[this.currentSlide].classList.remove('active');
        heroDots.children[this.currentSlide].classList.remove('active');
        
        this.currentSlide = index;
        
        this.slides[this.currentSlide].classList.add('active');
        heroDots.children[this.currentSlide].classList.add('active');
    }

    nextSlide() {
        const next = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(next);
    }

    prevSlide() {
        const prev = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prev);
    }

    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
    }

    stopAutoPlay() {
        clearInterval(this.autoPlayInterval);
    }
}

// ============================
// Products Display
// ============================
function renderProducts(tab = 'new') {
    if (!productsGrid) return;
    
    const productList = products[tab] || products.new;
    
    productsGrid.innerHTML = productList.map(product => `
        <div class="product-card">
            <div class="product-image">
                <i class="fas fa-box"></i>
                ${product.badge ? `<span class="product-badge ${product.badge}">${getBadgeText(product.badge)}</span>` : ''}
                <div class="product-actions">
                    <button class="product-action-btn" title="Додати в обране"><i class="far fa-heart"></i></button>
                    <button class="product-action-btn" title="Порівняти"><i class="fas fa-exchange-alt"></i></button>
                    <button class="product-action-btn" title="Швидкий перегляд"><i class="far fa-eye"></i></button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-title"><a href="#">${product.name}</a></h3>
                <div class="product-rating">
                    ${renderStars(product.rating)}
                    <span>(${product.reviews})</span>
                </div>
                <div class="product-price">
                    <span class="price-current">${formatPrice(product.price)} грн</span>
                    ${product.oldPrice ? `<span class="price-old">${formatPrice(product.oldPrice)} грн</span>` : ''}
                </div>
                <button class="product-buy" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Купити
                </button>
            </div>
        </div>
    `).join('');
}

function getBadgeText(badge) {
    const badges = {
        'new': 'Новинка',
        'hit': 'Хіт',
        'sale': 'Акція'
    };
    return badges[badge] || badge;
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ============================
// Cart Functions
// ============================
let cart = [];

function addToCart(productId) {
    const allProducts = [...products.new, ...products.popular, ...products.sale];
    const product = allProducts.find(p => p.id === productId);
    
    if (product) {
        cart.push(product);
        updateCartCount();
        showNotification(`${product.name} додано в кошик`);
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// ============================
// Notifications
// ============================
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        background: #10b981;
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================
// Mobile Menu
// ============================
function toggleMobileMenu() {
    mobileMenuBtn?.classList.toggle('active');
    mainNav?.classList.toggle('active');
    document.body.style.overflow = mainNav?.classList.contains('active') ? 'hidden' : '';
}

// ============================
// Search Modal
// ============================
function openSearch() {
    searchModal?.classList.add('active');
    document.body.style.overflow = 'hidden';
    searchModal?.querySelector('.search-input')?.focus();
}

function closeSearch() {
    searchModal?.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================
// Back to Top
// ============================
function handleScroll() {
    // Back to top button visibility
    if (window.scrollY > 500) {
        backToTop?.classList.add('visible');
    } else {
        backToTop?.classList.remove('visible');
    }
    
    // Header shadow on scroll
    if (window.scrollY > 10) {
        header?.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header?.style.boxShadow = '';
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================
// Stats Counter Animation
// ============================
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    
    stats.forEach(stat => {
        const target = parseInt(stat.dataset.count);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                stat.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                stat.textContent = target.toLocaleString();
            }
        };
        
        // Use Intersection Observer to trigger animation when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(stat);
    });
}

// ============================
// Contact Form
// ============================
function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    showNotification('Дякуємо! Ваше повідомлення надіслано.');
    e.target.reset();
}

// ============================
// Tabs
// ============================
function handleTabClick(e) {
    const tab = e.target.dataset.tab;
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    renderProducts(tab);
}

// ============================
// Smooth Scroll for Anchor Links
// ============================
function handleAnchorLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// ============================
// Initialize
// ============================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize slider
    new HeroSlider();
    
    // Render initial products
    renderProducts('new');
    
    // Animate stats
    animateStats();
    
    // Handle anchor links
    handleAnchorLinks();
    
    // Event Listeners
    mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    searchBtn?.addEventListener('click', openSearch);
    searchClose?.addEventListener('click', closeSearch);
    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearch();
    });
    backToTop?.addEventListener('click', scrollToTop);
    contactForm?.addEventListener('submit', handleContactForm);
    
    // Tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', handleTabClick);
    });
    
    // Scroll events
    window.addEventListener('scroll', handleScroll);
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSearch();
            if (mainNav?.classList.contains('active')) {
                toggleMobileMenu();
            }
        }
    });
});

// ============================
// Preloader (optional)
// ============================
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});
