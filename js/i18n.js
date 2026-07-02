/**
 * NRG-UA i18n (Internationalization) Library
 * Автоматичний переклад сайту на основі JSON файлів
 */

class NRGi18n {
    constructor(options = {}) {
        this.defaultLang = options.defaultLang || 'uk';
        this.supportedLangs = options.supportedLangs || ['uk', 'en'];
        this.basePath = options.basePath || '/data/i18n';
        this.translations = {};
        this.currentLang = this.defaultLang;
        this.initialized = false;
        
        // Атрибути для перекладу
        this.dataAttr = 'data-i18n';
        this.dataAttrPlaceholder = 'data-i18n-placeholder';
        this.dataAttrTitle = 'data-i18n-title';
        this.dataAttrAlt = 'data-i18n-alt';
    }

    /**
     * Ініціалізація бібліотеки
     */
    async init() {
        // Отримати збережену мову або визначити з браузера
        const savedLang = localStorage.getItem('nrg-lang');
        const browserLang = navigator.language.split('-')[0];
        
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
        } else if (this.supportedLangs.includes(browserLang)) {
            this.currentLang = browserLang;
        }
        
        // Завантажити переклади для поточної мови
        await this.loadTranslations(this.currentLang);
        
        // Застосувати переклади
        this.applyTranslations();
        
        // Оновити активний стан кнопок мови
        this.updateLangButtons();
        
        // Прослуховувати кліки на кнопках зміни мови
        this.bindLangSwitchers();
        
        this.initialized = true;
        
        // Відправити подію про готовність
        document.dispatchEvent(new CustomEvent('i18n:ready', { 
            detail: { lang: this.currentLang } 
        }));
        
        return this;
    }

    /**
     * Завантажити файл перекладів
     */
    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }
        
        try {
            const response = await fetch(`${this.basePath}/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${lang}`);
            }
            const data = await response.json();
            this.translations[lang] = data;
            return data;
        } catch (error) {
            console.error(`i18n: Error loading ${lang}:`, error);
            // Якщо не вдалося завантажити, спробувати завантажити мову за замовчуванням
            if (lang !== this.defaultLang) {
                return this.loadTranslations(this.defaultLang);
            }
            return {};
        }
    }

    /**
     * Отримати переклад за ключем (підтримує вкладені ключі: "nav.home")
     */
    t(key, params = {}) {
        const translation = this.getNestedValue(
            this.translations[this.currentLang], 
            key
        );
        
        if (translation === undefined) {
            console.warn(`i18n: Missing translation for key "${key}" in ${this.currentLang}`);
            return key;
        }
        
        // Заміна параметрів {param}
        let result = translation;
        Object.keys(params).forEach(param => {
            result = result.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });
        
        return result;
    }

    /**
     * Отримати вкладене значення з об'єкта
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * Застосувати переклади до всіх елементів з data-i18n атрибутами
     */
    applyTranslations() {
        // Текстовий контент
        document.querySelectorAll(`[${this.dataAttr}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttr);
            const translation = this.t(key);
            if (translation !== key) {
                el.textContent = translation;
            }
        });
        
        // Placeholder
        document.querySelectorAll(`[${this.dataAttrPlaceholder}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttrPlaceholder);
            const translation = this.t(key);
            if (translation !== key) {
                el.placeholder = translation;
            }
        });
        
        // Title
        document.querySelectorAll(`[${this.dataAttrTitle}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttrTitle);
            const translation = this.t(key);
            if (translation !== key) {
                el.title = translation;
            }
        });
        
        // Alt (для зображень)
        document.querySelectorAll(`[${this.dataAttrAlt}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttrAlt);
            const translation = this.t(key);
            if (translation !== key) {
                el.alt = translation;
            }
        });
        
        // Оновити lang атрибут HTML
        document.documentElement.lang = this.currentLang;
        
        // Відправити подію про зміну
        document.dispatchEvent(new CustomEvent('i18n:translated', { 
            detail: { lang: this.currentLang } 
        }));
    }

    /**
     * Змінити мову
     */
    async setLanguage(lang) {
        if (!this.supportedLangs.includes(lang)) {
            console.warn(`i18n: Unsupported language "${lang}"`);
            return false;
        }
        
        if (lang === this.currentLang && this.initialized) {
            return true;
        }
        
        // Завантажити переклади
        await this.loadTranslations(lang);
        
        // Змінити поточну мову
        this.currentLang = lang;
        
        // Зберегти вибір
        localStorage.setItem('nrg-lang', lang);
        
        // Застосувати переклади
        this.applyTranslations();
        
        // Оновити кнопки
        this.updateLangButtons();
        
        // Відправити подію
        document.dispatchEvent(new CustomEvent('i18n:langChanged', { 
            detail: { lang: this.currentLang } 
        }));
        
        return true;
    }

    /**
     * Прив'язати обробники до кнопок зміни мови
     */
    bindLangSwitchers() {
        // Кнопки з класом .lang-btn або атрибутом data-lang
        document.querySelectorAll('.lang-btn, [data-lang]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.dataset.lang || btn.textContent.toLowerCase().trim();
                if (this.supportedLangs.includes(lang)) {
                    this.setLanguage(lang);
                }
            });
        });
    }

    /**
     * Оновити активний стан кнопок мови
     */
    updateLangButtons() {
        document.querySelectorAll('.lang-btn, [data-lang]').forEach(btn => {
            const btnLang = btn.dataset.lang || btn.textContent.toLowerCase().trim();
            if (btnLang === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Отримати поточну мову
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Отримати всі підтримувані мови
     */
    getSupportedLanguages() {
        return this.supportedLangs;
    }

    /**
     * Перекласти HTML рядок
     */
    translateHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        temp.querySelectorAll(`[${this.dataAttr}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttr);
            const translation = this.t(key);
            if (translation !== key) {
                el.textContent = translation;
            }
        });
        
        return temp.innerHTML;
    }

    /**
     * Перекласти елемент і всіх його нащадків
     */
    translateElement(element) {
        if (element.hasAttribute && element.hasAttribute(this.dataAttr)) {
            const key = element.getAttribute(this.dataAttr);
            const translation = this.t(key);
            if (translation !== key) {
                element.textContent = translation;
            }
        }
        
        element.querySelectorAll(`[${this.dataAttr}]`).forEach(el => {
            const key = el.getAttribute(this.dataAttr);
            const translation = this.t(key);
            if (translation !== key) {
                el.textContent = translation;
            }
        });
    }
}

// Створити глобальний екземпляр
window.i18n = new NRGi18n();

// Автоматична ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
});

// Експорт для модульного використання
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NRGi18n;
}
