/**
 * NRG-UA Main JavaScript
 * Handles animations, interactions, and dynamic features
 */

// ============================================
// Utility Functions
// ============================================

const utils = {
    // Debounce function for performance
    debounce(func, wait = 100) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Check if element is in viewport
    isInViewport(element, offset = 0) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight - offset) &&
            rect.bottom >= offset
        );
    },

    // Animate number counting
    animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        const suffix = element.dataset.suffix || '';
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = `${current.toLocaleString('uk-UA')}${suffix}`;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }
};

// ============================================
// Preloader
// ============================================

class Preloader {
    constructor() {
        this.preloader = document.getElementById('preloader');
        this.init();
    }

    init() {
        if (!this.preloader) return;

        window.addEventListener('load', () => {
            setTimeout(() => {
                this.hide();
            }, 500);
        });

        // Fallback - hide after 3 seconds
        setTimeout(() => {
            this.hide();
        }, 3000);
    }

    hide() {
        this.preloader.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ============================================
// Header
// ============================================

class Header {
    constructor() {
        this.header = document.getElementById('header');
        this.mobileToggle = document.getElementById('mobileToggle');
        this.mainNav = document.getElementById('mainNav');
        this.lastScrollY = 0;
        this.ticking = false;

        this.init();
    }

    init() {
        if (!this.header) return;

        // Scroll handling
        window.addEventListener('scroll', () => {
            if (!this.ticking) {
                requestAnimationFrame(() => {
                    this.onScroll();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        });

        // Mobile menu toggle
        if (this.mobileToggle && this.mainNav) {
            this.mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Close mobile menu on link click
        this.mainNav?.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Close mobile menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target) && this.mainNav?.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }

    onScroll() {
        const scrollY = window.scrollY;

        // Add scrolled class
        if (scrollY > 50) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }

        // Hide/show header on scroll (optional)
        if (scrollY > this.lastScrollY && scrollY > 500) {
            this.header.style.transform = 'translateY(-100%)';
        } else {
            this.header.style.transform = 'translateY(0)';
        }

        this.lastScrollY = scrollY;
    }

    toggleMobileMenu() {
        this.mobileToggle.classList.toggle('active');
        this.mainNav.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    }

    closeMobileMenu() {
        this.mobileToggle?.classList.remove('active');
        this.mainNav?.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

// ============================================
// Scroll Animations
// ============================================

class ScrollAnimations {
    constructor() {
        this.animatedElements = document.querySelectorAll('[data-animate]');
        this.init();
    }

    init() {
        if (this.animatedElements.length === 0) return;

        // Initial check
        this.checkElements();

        // Scroll handler
        window.addEventListener('scroll', utils.throttle(() => {
            this.checkElements();
        }, 50));

        // Resize handler
        window.addEventListener('resize', utils.debounce(() => {
            this.checkElements();
        }, 100));
    }

    checkElements() {
        this.animatedElements.forEach(element => {
            if (utils.isInViewport(element, 100) && !element.classList.contains('animated')) {
                const delay = element.dataset.delay || 0;
                setTimeout(() => {
                    element.classList.add('animated');
                }, parseInt(delay));
            }
        });
    }
}

// ============================================
// Stats Counter
// ============================================

class StatsCounter {
    constructor() {
        this.counters = document.querySelectorAll('[data-count]');
        this.animated = false;
        this.init();
    }

    fillStatic() {
        this.counters.forEach((counter) => {
            const target = parseInt(counter.dataset.count, 10);
            const suffix = counter.dataset.suffix || '';
            if (!Number.isNaN(target)) {
                counter.textContent = `${target.toLocaleString('uk-UA')}${suffix}`;
            }
        });
    }

    init() {
        if (this.counters.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animated = true;
                    this.animateCounters();
                }
            });
        }, { threshold: 0.5 });

        const statsSection = document.querySelector('.hero-stats, .about-stats');
        if (statsSection) {
            observer.observe(statsSection);
        } else {
            this.fillStatic();
            return;
        }

        // Safety fallback: if observer did not fire, keep real values instead of zeros.
        setTimeout(() => {
            if (!this.animated) {
                this.fillStatic();
            }
        }, 2500);
    }

    animateCounters() {
        this.counters.forEach((counter, index) => {
            const target = parseInt(counter.dataset.count);
            setTimeout(() => {
                utils.animateCounter(counter, target, 2000);
            }, index * 200);
        });
    }
}

// ============================================
// Ukraine Map
// ============================================

class UkraineMap {
    constructor() {
        this.map = document.getElementById('ukraineMap');
        this.tooltip = document.getElementById('mapTooltip');
        this.init();
    }

    init() {
        if (!this.map) return;

        const points = this.map.querySelectorAll('.branch-point');

        points.forEach((point, index) => {
            // Анімуємо появу з затримкою
            setTimeout(() => {
                const rings = point.querySelectorAll('.pulse-ring, .pulse-ring2');
                rings.forEach((ring, i) => {
                    ring.style.animation = `svgPulse 2.5s ease-out infinite`;
                    ring.style.animationDelay = `${index * 0.25 + i * 0.4}s`;
                });
            }, index * 120);

            // Hover — показати тултіп
            point.addEventListener('mouseenter', (e) => this.showTooltip(e, point));
            point.addEventListener('mouseleave', () => this.hideTooltip());
            point.style.cursor = 'pointer';
        });

        // Додаємо CSS анімації
        if (!document.getElementById('nrg-svg-map-styles')) {
            const style = document.createElement('style');
            style.id = 'nrg-svg-map-styles';
            style.textContent = `
                @keyframes svgPulse {
                    0%   { opacity: 0.7; transform: scale(1); }
                    70%  { opacity: 0;   transform: scale(2); }
                    100% { opacity: 0;   transform: scale(2); }
                }
                .ukraine-svg-container {
                    position: relative;
                    width: 100%;
                    background: #080d14;
                    border-radius: 16px;
                    border: 1px solid rgba(0,212,255,0.2);
                    box-shadow: 0 0 60px rgba(0,212,255,0.08);
                    padding: 16px;
                }
                .ukraine-svg-container svg { width: 100%; height: auto; display: block; }
                /* Стилі областей */
                .oblast {
                    fill: #0d1c2e;
                    stroke: rgba(0,212,255,0.45);
                    stroke-width: 1.2;
                    stroke-linejoin: round;
                    transition: fill 0.25s ease, stroke 0.25s ease;
                    cursor: pointer;
                }
                .oblast:hover {
                    fill: rgba(0,212,255,0.18);
                    stroke: rgba(0,212,255,0.9);
                    stroke-width: 1.8;
                }
                .oblast-city {
                    fill: rgba(0,212,255,0.12);
                    stroke: rgba(0,212,255,0.6);
                    stroke-width: 1;
                }
                .branch-point { cursor: pointer; }
                .pulse-ring, .pulse-ring2 {
                    transform-origin: center;
                    transform-box: fill-box;
                }
                #mapTooltip {
                    position: absolute;
                    background: rgba(15,20,30,0.97);
                    border: 1px solid rgba(0,212,255,0.4);
                    border-radius: 12px;
                    padding: 12px 16px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    min-width: 205px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
                    z-index: 20;
                }
                #mapTooltip.active { opacity: 1; }
                .tooltip-city  { font-size: 1rem; font-weight: 700; color: #00D4FF; margin-bottom: 3px; }
                .tooltip-type  { font-size: 0.72rem; color: #6366F1; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
                .tooltip-detail { font-size: 0.82rem; color: #CBD5E1; display: flex; align-items: center; gap: 7px; margin-top: 4px; }
                .tooltip-detail i { color: #00D4FF; min-width: 12px; font-size: 0.75rem; }
                .connection-lines line { stroke-dashoffset: 0; animation: dashMove 3s linear infinite; }
                @keyframes dashMove { to { stroke-dashoffset: -20; } }
            `;
            document.head.appendChild(style);
        }

        // Hover на областях — показуємо назву
        const oblasts = this.map.querySelectorAll('.oblast');
        oblasts.forEach(oblast => {
            oblast.addEventListener('mouseenter', (e) => {
                if (!this.tooltip) return;
                this.tooltip.querySelector('.tooltip-city').textContent = oblast.dataset.name || '';
                this.tooltip.querySelector('.tooltip-type').textContent = 'Область';
                this.tooltip.querySelector('.tooltip-address').textContent = '';
                this.tooltip.querySelector('.tooltip-phone').textContent = '';
                this._positionTooltip(e);
                this.tooltip.classList.add('active');
            });
            oblast.addEventListener('mousemove', (e) => this._positionTooltip(e));
            oblast.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    showTooltip(e, point) {
        if (!this.tooltip) return;
        this.tooltip.querySelector('.tooltip-city').textContent    = point.dataset.city;
        this.tooltip.querySelector('.tooltip-type').textContent    = point.dataset.type;
        this.tooltip.querySelector('.tooltip-address').textContent = point.dataset.address;
        this.tooltip.querySelector('.tooltip-phone').textContent   = point.dataset.phone;
        this._positionTooltip(e);
        this.tooltip.classList.add('active');
    }

    _positionTooltip(e) {
        if (!this.tooltip) return;
        const cont = this.map.closest('.ukraine-svg-container');
        if (!cont) return;
        const r = cont.getBoundingClientRect();
        let left = e.clientX - r.left + 14;
        let top  = e.clientY - r.top  - 14;
        if (left + 215 > r.width - 8) left = e.clientX - r.left - 225;
        if (top < 10)                  top  = e.clientY - r.top  + 14;
        this.tooltip.style.left      = `${left}px`;
        this.tooltip.style.top       = `${top}px`;
        this.tooltip.style.transform = 'none';
    }

    hideTooltip() {
        this.tooltip?.classList.remove('active');
    }
}

// ============================================
// Brands Marquee
// ============================================

class BrandsMarquee {
    constructor() {
        this.marquee = document.querySelector('.brands-marquee');
        this.init();
    }

    init() {
        if (!this.marquee) return;

        // Pause on hover
        const track = this.marquee.querySelector('.marquee-content');
        
        this.marquee.addEventListener('mouseenter', () => {
            if (track) track.style.animationPlayState = 'paused';
        });

        this.marquee.addEventListener('mouseleave', () => {
            if (track) track.style.animationPlayState = 'running';
        });
    }
}

// ============================================
// Language Switcher
// ============================================

class LanguageSwitcher {
    constructor() {
        this.buttons = document.querySelectorAll('.lang-btn');
        this.currentLang = localStorage.getItem('nrg-lang') || 'uk';
        this.init();
    }

    init() {
        if (this.buttons.length === 0) return;

        // Set initial state
        this.setActiveLang(this.currentLang);

        // Add click handlers
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.switchLang(lang);
            });
        });
    }

    setActiveLang(lang) {
        this.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        document.documentElement.lang = lang;
    }

    switchLang(lang) {
        if (lang === this.currentLang) return;

        this.currentLang = lang;
        localStorage.setItem('nrg-lang', lang);
        this.setActiveLang(lang);

        // Trigger language change event
        document.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));

        // In a real app, this would reload translations or redirect
        // For now, we'll just reload the page
        // window.location.reload();
    }
}

// ============================================
// Back to Top
// ============================================

class BackToTop {
    constructor() {
        this.button = document.getElementById('backToTop');
        this.init();
    }

    init() {
        if (!this.button) return;

        // Scroll handler
        window.addEventListener('scroll', utils.throttle(() => {
            this.toggleVisibility();
        }, 100));

        // Click handler
        this.button.addEventListener('click', () => {
            this.scrollToTop();
        });
    }

    toggleVisibility() {
        if (window.scrollY > 500) {
            this.button.classList.add('visible');
        } else {
            this.button.classList.remove('visible');
        }
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// ============================================
// Smooth Scroll
// ============================================

class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerHeight = document.getElementById('header')?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ============================================
// Page Transitions
// ============================================

class PageTransitions {
    constructor() {
        this.duration = 280;
        this.init();
    }

    init() {
        document.body.classList.add('page-ready');

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link) return;

            if (link.target === '_blank' || link.hasAttribute('download')) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.href === window.location.href) return;

            event.preventDefault();
            document.body.classList.add('page-leaving');

            setTimeout(() => {
                window.location.href = url.href;
            }, this.duration);
        });
    }
}

// ============================================
// Video Background
// ============================================

class VideoBackground {
    constructor() {
        this.video = document.querySelector('.hero-video');
        this.init();
    }

    init() {
        if (!this.video) return;

        // Ensure video plays
        this.video.play().catch(() => {
            // If autoplay fails, show poster
            console.log('Video autoplay prevented');
        });

        // Pause video when not in viewport (performance)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.video.play();
                } else {
                    this.video.pause();
                }
            });
        }, { threshold: 0 });

        observer.observe(this.video);
    }
}

// ============================================
// Form Validation (for Partner Form)
// ============================================

class FormValidator {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validate()) {
                this.submit();
            }
        });

        // Real-time validation
        this.form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
        });
    }

    validate() {
        let isValid = true;
        this.form.querySelectorAll('[required]').forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // Required check
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = "Це поле обов'язкове";
        }

        // Email check
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                message = 'Введіть коректний email';
            }
        }

        // Phone check
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                isValid = false;
                message = 'Введіть коректний номер телефону';
            }
        }

        // Update field state
        this.setFieldState(field, isValid, message);
        return isValid;
    }

    setFieldState(field, isValid, message) {
        const wrapper = field.closest('.form-group');
        if (!wrapper) return;

        wrapper.classList.toggle('error', !isValid);
        
        let errorEl = wrapper.querySelector('.error-message');
        if (!isValid && message) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'error-message';
                wrapper.appendChild(errorEl);
            }
            errorEl.textContent = message;
        } else if (errorEl) {
            errorEl.remove();
        }
    }

    submit() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Collect categories from checkboxes
        const categories = [];
        this.form.querySelectorAll('input[name="categories"]:checked').forEach(cb => {
            categories.push(cb.value);
        });
        
        // Show loading state
        const submitBtn = this.form.querySelector('[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Відправка...';

        // Prepare data for API
        const apiData = {
            company_name: data.companyName || '',
            contact_name: data.contactName || '',
            phone: data.phone || '',
            email: data.email || '',
            city: data.city || '',
            business_type: data.businessType || '',
            categories: categories,
            message: data.message || ''
        };

        // Try to send to API, fallback to demo mode
        fetch('http://localhost:8000/api/partner-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                this.form.reset();
                this.showSuccess();
            } else {
                this.showError(result.message || 'Помилка при відправці');
            }
        })
        .catch(error => {
            // Demo mode - simulate success when API is unavailable
            console.log('Demo mode: API unavailable, simulating success');
            console.log('Form data:', apiData);
            this.form.reset();
            this.showSuccess();
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        });
    }

    showSuccess() {
        // Create success message
        const successMsg = document.createElement('div');
        successMsg.className = 'form-success';
        successMsg.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>Дякуємо! Ваша заявка успішно відправлена. Ми зв'яжемося з вами найближчим часом.</p>
        `;
        
        this.form.appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.remove();
        }, 5000);
    }

    showError(message) {
        // Create error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'form-error';
        errorMsg.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        `;
        
        this.form.appendChild(errorMsg);
        
        setTimeout(() => {
            errorMsg.remove();
        }, 5000);
    }
}

// ============================================
// Categories Dropdown
// ============================================

class CategoriesDropdown {
    constructor(selector) {
        this.dropdown = document.querySelector(selector);
        if (!this.dropdown) return;
        
        this.toggle = this.dropdown.querySelector('.categories-toggle');
        this.menu = this.dropdown.querySelector('.categories-list');
        this.checkboxes = this.dropdown.querySelectorAll('input[type="checkbox"]');
        this.placeholder = this.dropdown.querySelector('.categories-placeholder');
        
        this.init();
    }
    
    init() {
        // Toggle dropdown
        this.toggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.dropdown.classList.toggle('open');
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.dropdown.classList.remove('open');
            }
        });
        
        // Update text on checkbox change
        this.checkboxes.forEach(cb => {
            cb.addEventListener('change', () => this.updateText());
        });
    }
    
    updateText() {
        const checked = Array.from(this.checkboxes).filter(cb => cb.checked);
        
        if (checked.length === 0) {
            this.placeholder.textContent = 'Оберіть категорії';
            this.placeholder.classList.remove('has-selected');
        } else if (checked.length <= 2) {
            const names = checked.map(cb => cb.closest('.category-item').querySelector('.category-text').textContent);
            this.placeholder.textContent = names.join(', ');
            this.placeholder.classList.add('has-selected');
        } else {
            this.placeholder.textContent = `Обрано: ${checked.length} категорій`;
            this.placeholder.classList.add('has-selected');
        }
    }
}

// ============================================
// Auth Manager
// ============================================

class AuthManager {
    constructor() {
        this.loginBtn = document.getElementById('loginBtn');
        this.b2bPortalBtn = document.getElementById('b2bPortalBtn');
        this.init();
    }

    init() {
        if (!this.loginBtn || !this.b2bPortalBtn) return;

        // Check if user is authenticated
        this.checkAuthStatus();

        // Listen for auth changes (from localStorage or session)
        window.addEventListener('storage', () => {
            this.checkAuthStatus();
        });

        // Listen for custom auth events
        window.addEventListener('userLoggedIn', () => {
            this.showB2BPortal();
        });

        window.addEventListener('userLoggedOut', () => {
            this.showLogin();
        });
    }

    checkAuthStatus() {
        // Check localStorage for auth token or user session
        const isAuthenticated = localStorage.getItem('userToken') || 
                               localStorage.getItem('isAuthenticated') === 'true' ||
                               sessionStorage.getItem('userToken');

        if (isAuthenticated) {
            this.showB2BPortal();
        } else {
            this.showLogin();
        }
    }

    showB2BPortal() {
        if (this.loginBtn) this.loginBtn.style.display = 'none';
        if (this.b2bPortalBtn) {
            this.b2bPortalBtn.style.display = 'flex';
            // Update tooltip with translated text
            const lang = localStorage.getItem('selectedLanguage') || 'uk';
            const noteText = lang === 'en' ? 'For registered clients only' : 'Тільки для зареєстрованих клієнтів';
            this.b2bPortalBtn.setAttribute('title', noteText);
        }
    }

    showLogin() {
        if (this.loginBtn) this.loginBtn.style.display = 'flex';
        if (this.b2bPortalBtn) this.b2bPortalBtn.style.display = 'none';
    }
}

// ============================================
// Initialize Everything
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    new PageTransitions();

    // Core components
    new Preloader();
    new Header();
    new ScrollAnimations();
    new StatsCounter();
    new BackToTop();
    new SmoothScroll();
    new VideoBackground();

    // Map
    new UkraineMap();

    // Brands
    new BrandsMarquee();

    // Language
    new LanguageSwitcher();

    // Auth Manager
    new AuthManager();

    // Forms (if present)
    new FormValidator('#partnerForm');
    new FormValidator('#contactForm');

    console.log('NRG-UA initialized');
});

// ============================================
// Expose to global scope if needed
// ============================================

window.NRG = {
    utils,
    Preloader,
    Header,
    ScrollAnimations,
    StatsCounter,
    UkraineMap,
    BrandsMarquee,
    LanguageSwitcher,
    BackToTop,
    FormValidator,
    CategoriesDropdown,
    AuthManager,
    PageTransitions
};
