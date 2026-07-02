"""
NRG-UA FastAPI Application
B2B платформа - API для адмін-панелі та кабінету партнера
"""
from fastapi import FastAPI, Depends, HTTPException, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta, date
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import os
import uuid
import json

from config import settings
from telegram_bot import router as telegram_router

# Initialize app
app = FastAPI(
    title="NRG-UA API",
    description="API для B2B платформи NRG-UA - адмін-панель та кабінет партнера",
    version="1.0.0"
)

# CORS - дозволяємо всі origins для розробки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/documents", exist_ok=True)
os.makedirs("uploads/content", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Telegram router
app.include_router(telegram_router)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


# ==================== PYDANTIC SCHEMAS ====================

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str  # "admin" or "partner"
    user: dict

class AdminLogin(BaseModel):
    username: str
    password: str

class PartnerLogin(BaseModel):
    email: str
    password: str

class PartnerRegister(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str
    password: str
    city: Optional[str] = None
    edrpou: Optional[str] = None

# Partner Schemas
class PartnerUpdate(BaseModel):
    company_name: Optional[str] = None
    legal_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_position: Optional[str] = None
    phone: Optional[str] = None
    phone_additional: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None

class PartnerAdminUpdate(PartnerUpdate):
    status: Optional[str] = None
    partner_type: Optional[str] = None
    price_level: Optional[str] = None
    credit_limit: Optional[float] = None
    discount_percent: Optional[float] = None
    is_verified: Optional[bool] = None

# Product Schemas
class ProductCreate(BaseModel):
    sku: str
    name_uk: str
    name_en: Optional[str] = None
    short_description_uk: Optional[str] = None
    description_uk: Optional[str] = None
    price_retail: float
    price_small_wholesale: Optional[float] = None
    price_wholesale: Optional[float] = None
    price_distributor: Optional[float] = None
    stock_quantity: int = 0
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    is_active: bool = True

class ProductUpdate(BaseModel):
    name_uk: Optional[str] = None
    name_en: Optional[str] = None
    short_description_uk: Optional[str] = None
    short_description_en: Optional[str] = None
    description_uk: Optional[str] = None
    description_en: Optional[str] = None
    price_retail: Optional[float] = None
    price_small_wholesale: Optional[float] = None
    price_wholesale: Optional[float] = None
    price_distributor: Optional[float] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_new: Optional[bool] = None
    is_bestseller: Optional[bool] = None

# Category Schemas
class CategoryCreate(BaseModel):
    name_uk: str
    name_en: Optional[str] = None
    slug: Optional[str] = None
    description_uk: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True

# Brand Schemas
class BrandCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description_uk: Optional[str] = None
    description_en: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    is_exclusive: bool = False
    is_active: bool = True

# Order Schemas
class OrderCreate(BaseModel):
    items: List[dict]  # [{product_id, quantity}]
    delivery_method: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    payment_method: Optional[str] = None
    customer_notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None

# Content Schemas
class ContentCreate(BaseModel):
    content_type: str
    slug: Optional[str] = None
    title_uk: str
    title_en: Optional[str] = None
    content_uk: Optional[str] = None
    content_en: Optional[str] = None
    excerpt_uk: Optional[str] = None
    image: Optional[str] = None
    link_url: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    publish_date: Optional[datetime] = None

# Translation Schemas
class TranslationCreate(BaseModel):
    key: str
    uk: str
    en: Optional[str] = None
    context: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

def generate_order_number():
    """Генерує номер замовлення"""
    today = date.today()
    return f"NRG-{today.strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def slugify(text: str) -> str:
    """Створює slug з тексту"""
    import re
    # Транслітерація українських букв
    translit_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
        'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y',
        'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
        'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
        'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya'
    }
    text = text.lower()
    result = ''
    for char in text:
        if char in translit_map:
            result += translit_map[char]
        elif char.isalnum():
            result += char
        elif char in ' -_':
            result += '-'
    result = re.sub(r'-+', '-', result)
    return result.strip('-')


# ==================== DEMO DATA ====================
# Тимчасові дані для демонстрації без бази даних

demo_partners = [
    {
        "id": 1, "company_name": "ТОВ \"Світло-Сервіс\"", "legal_name": "ТОВ \"Світло-Сервіс\"",
        "edrpou": "12345678", "contact_name": "Олександр Петренко", "email": "partner@test.com",
        "phone": "+380501234567", "city": "Київ", "status": "active", "partner_type": "wholesale",
        "price_level": "wholesale", "balance": 15000, "discount_percent": 5,
        "created_at": "2024-01-15", "last_order_at": "2024-03-10"
    },
    {
        "id": 2, "company_name": "ФОП Коваленко", "contact_name": "Марія Коваленко",
        "email": "kovalenko@ukr.net", "phone": "+380671112233", "city": "Харків",
        "status": "active", "partner_type": "retail", "price_level": "small_wholesale",
        "balance": -2500, "discount_percent": 0, "created_at": "2024-02-20"
    },
    {
        "id": 3, "company_name": "Мережа \"Електротовари\"", "contact_name": "Ігор Бондаренко",
        "email": "electro@network.ua", "phone": "+380933334455", "city": "Одеса",
        "status": "pending", "partner_type": "network", "price_level": "distributor",
        "balance": 0, "created_at": "2024-03-18"
    }
]

demo_categories = [
    {"id": 1, "name_uk": "Світлотехніка", "name_en": "Lighting", "slug": "lighting", "icon": "fa-lightbulb", "products_count": 45, "is_active": True},
    {"id": 2, "name_uk": "Елементи живлення", "name_en": "Batteries", "slug": "batteries", "icon": "fa-battery-full", "products_count": 120, "is_active": True},
    {"id": 3, "name_uk": "Сад і город", "name_en": "Garden", "slug": "garden", "icon": "fa-seedling", "products_count": 80, "is_active": True},
    {"id": 4, "name_uk": "Господарські товари", "name_en": "Household", "slug": "household", "icon": "fa-spray-can-sparkles", "products_count": 200, "is_active": True},
    {"id": 5, "name_uk": "Товари для кухні", "name_en": "Kitchen", "slug": "kitchen", "icon": "fa-utensils", "products_count": 95, "is_active": True},
    {"id": 6, "name_uk": "Електротовари", "name_en": "Electrical", "slug": "electrical", "icon": "fa-plug", "products_count": 150, "is_active": True}
]

demo_brands = [
    {"id": 1, "name": "Energizer", "slug": "energizer", "country": "USA", "is_exclusive": True, "products_count": 85},
    {"id": 2, "name": "Philips", "slug": "philips", "country": "Netherlands", "is_exclusive": False, "products_count": 120},
    {"id": 3, "name": "Osram", "slug": "osram", "country": "Germany", "is_exclusive": True, "products_count": 65},
    {"id": 4, "name": "GP Batteries", "slug": "gp-batteries", "country": "Hong Kong", "is_exclusive": False, "products_count": 95},
    {"id": 5, "name": "Gardena", "slug": "gardena", "country": "Germany", "is_exclusive": True, "products_count": 45}
]

demo_products = [
    {"id": 1, "sku": "BAT-001", "name_uk": "Батарейка Energizer AA", "name_en": "Energizer AA Battery", "category_id": 2, "category_name": "Елементи живлення", "brand_id": 1, "brand_name": "Energizer", "price_retail": 45, "price_wholesale": 32, "stock_quantity": 5000, "is_active": True, "is_bestseller": True},
    {"id": 2, "sku": "LED-001", "name_uk": "LED лампа Philips 10W", "name_en": "Philips LED Bulb 10W", "category_id": 1, "category_name": "Світлотехніка", "brand_id": 2, "brand_name": "Philips", "price_retail": 89, "price_wholesale": 65, "stock_quantity": 1200, "is_active": True, "is_new": True},
    {"id": 3, "sku": "GRD-001", "name_uk": "Шланг садовий Gardena 25м", "name_en": "Gardena Garden Hose 25m", "category_id": 3, "category_name": "Сад і город", "brand_id": 5, "brand_name": "Gardena", "price_retail": 850, "price_wholesale": 680, "stock_quantity": 150, "is_active": True},
    {"id": 4, "sku": "BAT-002", "name_uk": "Батарейка GP AAA 4шт", "name_en": "GP AAA Battery 4pcs", "category_id": 2, "category_name": "Елементи живлення", "brand_id": 4, "brand_name": "GP Batteries", "price_retail": 65, "price_wholesale": 48, "stock_quantity": 3500, "is_active": True},
    {"id": 5, "sku": "LED-002", "name_uk": "Світлодіодна стрічка Osram 5м", "name_en": "Osram LED Strip 5m", "category_id": 1, "category_name": "Світлотехніка", "brand_id": 3, "brand_name": "Osram", "price_retail": 420, "price_wholesale": 340, "stock_quantity": 280, "is_active": True, "is_promo": True}
]

demo_orders = [
    {"id": 1, "order_number": "NRG-240315-A1B2C3", "partner_id": 1, "partner_name": "ТОВ \"Світло-Сервіс\"", "total": 45600, "status": "delivered", "items_count": 12, "created_at": "2024-03-15T10:30:00"},
    {"id": 2, "order_number": "NRG-240318-D4E5F6", "partner_id": 2, "partner_name": "ФОП Коваленко", "total": 8900, "status": "shipped", "items_count": 5, "created_at": "2024-03-18T14:20:00"},
    {"id": 3, "order_number": "NRG-240320-G7H8I9", "partner_id": 1, "partner_name": "ТОВ \"Світло-Сервіс\"", "total": 125000, "status": "processing", "items_count": 28, "created_at": "2024-03-20T09:15:00"},
    {"id": 4, "order_number": "NRG-240322-J0K1L2", "partner_id": 2, "partner_name": "ФОП Коваленко", "total": 3200, "status": "pending", "items_count": 3, "created_at": "2024-03-22T16:45:00"}
]

demo_content = [
    {"id": 1, "content_type": "news", "slug": "spring-sale-2024", "title_uk": "Весняний розпродаж 2024", "title_en": "Spring Sale 2024", "excerpt_uk": "Знижки до 30% на всю світлотехніку!", "is_active": True, "is_featured": True, "publish_date": "2024-03-01"},
    {"id": 2, "content_type": "news", "slug": "new-energizer-lineup", "title_uk": "Нова лінійка Energizer", "title_en": "New Energizer Lineup", "excerpt_uk": "Представляємо нові батарейки підвищеної ємності", "is_active": True, "publish_date": "2024-03-10"},
    {"id": 3, "content_type": "banner", "slug": "main-banner-1", "title_uk": "Ексклюзивний дистриб'ютор", "link_url": "/pages/about.html", "is_active": True, "is_featured": True},
    {"id": 4, "content_type": "promo", "slug": "batteries-promo", "title_uk": "Акція на батарейки", "title_en": "Battery Promo", "excerpt_uk": "-20% на батарейки GP при замовленні від 1000 грн", "is_active": True, "publish_date": "2024-03-15"}
]

demo_translations = {
    "nav.home": {"uk": "Головна", "en": "Home"},
    "nav.about": {"uk": "Про нас", "en": "About"},
    "nav.catalog": {"uk": "Каталог", "en": "Catalog"},
    "nav.brands": {"uk": "Бренди", "en": "Brands"},
    "nav.partners": {"uk": "Партнерам", "en": "Partners"},
    "nav.news": {"uk": "Новини", "en": "News"},
    "nav.contacts": {"uk": "Контакти", "en": "Contacts"},
    "btn.login": {"uk": "Увійти", "en": "Login"},
    "btn.register": {"uk": "Реєстрація", "en": "Register"},
    "btn.become_partner": {"uk": "Стати партнером", "en": "Become a Partner"},
    "btn.add_to_cart": {"uk": "Додати до кошика", "en": "Add to Cart"},
    "btn.order": {"uk": "Замовити", "en": "Order"},
    "hero.title": {"uk": "Національний B2B-дистриб'ютор", "en": "National B2B Distributor"},
    "hero.subtitle": {"uk": "Товари для дому та бізнесу", "en": "Products for Home and Business"},
    "footer.copyright": {"uk": "© 2024 NRG-UA. Всі права захищені.", "en": "© 2024 NRG-UA. All rights reserved."}
}

demo_stats = {
    "partners_total": 156,
    "partners_active": 134,
    "partners_new_month": 12,
    "orders_total": 1847,
    "orders_month": 156,
    "revenue_month": 2450000,
    "revenue_prev_month": 2180000,
    "products_total": 690,
    "products_active": 645,
    "products_low_stock": 23
}

# Регіони України
demo_regions = [
    {"id": 1, "name_uk": "Вінницька область", "name_en": "Vinnytsia Oblast", "code": "UA-05"},
    {"id": 2, "name_uk": "Волинська область", "name_en": "Volyn Oblast", "code": "UA-07"},
    {"id": 3, "name_uk": "Дніпропетровська область", "name_en": "Dnipropetrovsk Oblast", "code": "UA-12"},
    {"id": 4, "name_uk": "Донецька область", "name_en": "Donetsk Oblast", "code": "UA-14"},
    {"id": 5, "name_uk": "Житомирська область", "name_en": "Zhytomyr Oblast", "code": "UA-18"},
    {"id": 6, "name_uk": "Закарпатська область", "name_en": "Zakarpattia Oblast", "code": "UA-21"},
    {"id": 7, "name_uk": "Запорізька область", "name_en": "Zaporizhzhia Oblast", "code": "UA-23"},
    {"id": 8, "name_uk": "Івано-Франківська область", "name_en": "Ivano-Frankivsk Oblast", "code": "UA-26"},
    {"id": 9, "name_uk": "Київська область", "name_en": "Kyiv Oblast", "code": "UA-32"},
    {"id": 10, "name_uk": "Кіровоградська область", "name_en": "Kirovohrad Oblast", "code": "UA-35"},
    {"id": 11, "name_uk": "Луганська область", "name_en": "Luhansk Oblast", "code": "UA-44"},
    {"id": 12, "name_uk": "Львівська область", "name_en": "Lviv Oblast", "code": "UA-46"},
    {"id": 13, "name_uk": "Миколаївська область", "name_en": "Mykolaiv Oblast", "code": "UA-48"},
    {"id": 14, "name_uk": "Одеська область", "name_en": "Odesa Oblast", "code": "UA-51"},
    {"id": 15, "name_uk": "Полтавська область", "name_en": "Poltava Oblast", "code": "UA-53"},
    {"id": 16, "name_uk": "Рівненська область", "name_en": "Rivne Oblast", "code": "UA-56"},
    {"id": 17, "name_uk": "Сумська область", "name_en": "Sumy Oblast", "code": "UA-59"},
    {"id": 18, "name_uk": "Тернопільська область", "name_en": "Ternopil Oblast", "code": "UA-61"},
    {"id": 19, "name_uk": "Харківська область", "name_en": "Kharkiv Oblast", "code": "UA-63"},
    {"id": 20, "name_uk": "Херсонська область", "name_en": "Kherson Oblast", "code": "UA-65"},
    {"id": 21, "name_uk": "Хмельницька область", "name_en": "Khmelnytskyi Oblast", "code": "UA-68"},
    {"id": 22, "name_uk": "Черкаська область", "name_en": "Cherkasy Oblast", "code": "UA-71"},
    {"id": 23, "name_uk": "Чернівецька область", "name_en": "Chernivtsi Oblast", "code": "UA-77"},
    {"id": 24, "name_uk": "Чернігівська область", "name_en": "Chernihiv Oblast", "code": "UA-74"},
    {"id": 25, "name_uk": "м. Київ", "name_en": "Kyiv City", "code": "UA-30"},
]

# Менеджери
demo_managers = [
    {"id": 1, "full_name": "Олександр Петренко", "phone": "+380501234567", "email": "petrenk@nrg-ua.com", "telegram_username": "@petrenk_nrg", "region_id": 9, "region_name": "Київська область", "is_active": True, "photo": None},
    {"id": 2, "full_name": "Марія Коваленко", "phone": "+380671112233", "email": "kovalenko@nrg-ua.com", "telegram_username": "@kovalenko_nrg", "region_id": 19, "region_name": "Харківська область", "is_active": True, "photo": None},
    {"id": 3, "full_name": "Іван Шевченко", "phone": "+380933334455", "email": "shevchenko@nrg-ua.com", "telegram_username": "@shevchenko_nrg", "region_id": 14, "region_name": "Одеська область", "is_active": True, "photo": None},
    {"id": 4, "full_name": "Анна Бондаренко", "phone": "+380661234567", "email": "bondarenko@nrg-ua.com", "telegram_username": "@bondarenko_nrg", "region_id": 12, "region_name": "Львівська область", "is_active": True, "photo": None},
    {"id": 5, "full_name": "Сергій Мельник", "phone": "+380981234567", "email": "melnyk@nrg-ua.com", "telegram_username": "@melnyk_nrg", "region_id": 3, "region_name": "Дніпропетровська область", "is_active": True, "photo": None},
]

# Теги
demo_tags = [
    {"id": 1, "name_uk": "LED освітлення", "name_en": "LED lighting", "slug": "led-lighting", "color": "#10b981"},
    {"id": 2, "name_uk": "Енергозбереження", "name_en": "Energy saving", "slug": "energy-saving", "color": "#6366f1"},
    {"id": 3, "name_uk": "Акумулятори", "name_en": "Batteries", "slug": "batteries", "color": "#f59e0b"},
    {"id": 4, "name_uk": "Садовий інструмент", "name_en": "Garden tools", "slug": "garden-tools", "color": "#22c55e"},
    {"id": 5, "name_uk": "Новинки", "name_en": "New arrivals", "slug": "new-arrivals", "color": "#ef4444"},
    {"id": 6, "name_uk": "Розумний дім", "name_en": "Smart home", "slug": "smart-home", "color": "#8b5cf6"},
    {"id": 7, "name_uk": "Кабелі та шнури", "name_en": "Cables and wires", "slug": "cables-wires", "color": "#64748b"},
]

# Зв'язок товарів з тегами
demo_product_tags = {
    1: [3],       # Батарейка Energizer AA - Акумулятори
    2: [1, 2],    # LED лампа Philips - LED освітлення, Енергозбереження
    3: [4],       # Шланг Gardena - Садовий інструмент
    4: [3],       # Батарейка GP AAA - Акумулятори
    5: [1, 2, 5], # Світлодіодна стрічка Osram - LED, Енергозбереження, Новинки
}

# Зв'язок контенту з тегами
demo_content_tags = {
    1: [1, 2],    # Весняний розпродаж - LED, Енергозбереження
    2: [3],       # Нова лінійка Energizer - Акумулятори
    4: [3],       # Акція на батарейки - Акумулятори
}

# Обрані товари партнерів
demo_partner_favorites = {
    1: [1, 2, 5],  # Партнер 1 обрав товари 1, 2, 5
    2: [3, 4],     # Партнер 2 обрав товари 3, 4
}

# Оновлюємо партнерів з менеджерами та регіонами
demo_partners[0]["region_id"] = 9   # Київська область
demo_partners[0]["manager_id"] = 1  # Олександр Петренко
demo_partners[1]["region_id"] = 19  # Харківська область
demo_partners[1]["manager_id"] = 2  # Марія Коваленко
demo_partners[2]["region_id"] = 14  # Одеська область
demo_partners[2]["manager_id"] = 3  # Іван Шевченко


# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/admin/login", response_model=Token)
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Авторизація адміністратора"""
    # Demo login
    if form_data.username == "admin" and form_data.password == "admin123":
        user_data = {"id": 1, "username": "admin", "full_name": "Адміністратор", "role": "admin"}
        token = create_access_token({"sub": "admin:1", "type": "admin"})
        return Token(access_token=token, token_type="bearer", user_type="admin", user=user_data)
    raise HTTPException(status_code=401, detail="Невірний логін або пароль")


@app.post("/api/auth/partner/login", response_model=Token)
async def partner_login(data: PartnerLogin):
    """Авторизація партнера"""
    # Demo login
    if data.email == "partner@test.com" and data.password == "partner123":
        partner = demo_partners[0]
        token = create_access_token({"sub": f"partner:{partner['id']}", "type": "partner"})
        return Token(access_token=token, token_type="bearer", user_type="partner", user=partner)
    raise HTTPException(status_code=401, detail="Невірний email або пароль")


@app.post("/api/auth/partner/register")
async def partner_register(data: PartnerRegister):
    """Реєстрація нового партнера"""
    # Тут буде створення партнера в базі
    return {
        "success": True,
        "message": "Реєстрація успішна! Очікуйте підтвердження менеджера."
    }


@app.get("/api/auth/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Отримати поточного користувача"""
    if not token:
        raise HTTPException(status_code=401, detail="Не авторизовано")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub = payload.get("sub", "")
        user_type = payload.get("type", "")
        
        if user_type == "admin":
            return {"id": 1, "username": "admin", "full_name": "Адміністратор", "role": "admin", "type": "admin"}
        elif user_type == "partner":
            return {**demo_partners[0], "type": "partner"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Невалідний токен")


# ==================== ADMIN: DASHBOARD ====================

@app.get("/api/admin/dashboard/stats")
async def get_dashboard_stats():
    """Статистика для дашборду адмін-панелі"""
    return {
        "partners": {
            "total": demo_stats["partners_total"],
            "active": demo_stats["partners_active"],
            "new_this_month": demo_stats["partners_new_month"],
            "pending": 3
        },
        "orders": {
            "total": demo_stats["orders_total"],
            "this_month": demo_stats["orders_month"],
            "pending": 12,
            "processing": 8
        },
        "revenue": {
            "this_month": demo_stats["revenue_month"],
            "prev_month": demo_stats["revenue_prev_month"],
            "growth_percent": round((demo_stats["revenue_month"] - demo_stats["revenue_prev_month"]) / demo_stats["revenue_prev_month"] * 100, 1)
        },
        "products": {
            "total": demo_stats["products_total"],
            "active": demo_stats["products_active"],
            "low_stock": demo_stats["products_low_stock"],
            "out_of_stock": 5
        }
    }


@app.get("/api/admin/dashboard/recent-orders")
async def get_recent_orders():
    """Останні замовлення"""
    return demo_orders[:5]


@app.get("/api/admin/dashboard/recent-partners")
async def get_recent_partners():
    """Нові партнери"""
    return demo_partners[:5]


# ==================== ADMIN: PARTNERS ====================

@app.get("/api/admin/partners")
async def list_partners(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Список партнерів"""
    partners = demo_partners.copy()
    
    if status:
        partners = [p for p in partners if p.get("status") == status]
    
    if search:
        search_lower = search.lower()
        partners = [p for p in partners if 
            search_lower in p.get("company_name", "").lower() or
            search_lower in p.get("email", "").lower() or
            search_lower in p.get("contact_name", "").lower()
        ]
    
    return {
        "items": partners,
        "total": len(partners),
        "page": page,
        "limit": limit
    }


@app.get("/api/admin/partners/{partner_id}")
async def get_partner(partner_id: int):
    """Деталі партнера"""
    partner = next((p for p in demo_partners if p["id"] == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Партнера не знайдено")
    return partner


@app.put("/api/admin/partners/{partner_id}")
async def update_partner(partner_id: int, data: PartnerAdminUpdate):
    """Оновити партнера"""
    partner = next((p for p in demo_partners if p["id"] == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Партнера не знайдено")
    
    update_data = data.dict(exclude_unset=True)
    partner.update(update_data)
    return partner


@app.post("/api/admin/partners/{partner_id}/approve")
async def approve_partner(partner_id: int):
    """Підтвердити партнера"""
    partner = next((p for p in demo_partners if p["id"] == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Партнера не знайдено")
    
    partner["status"] = "active"
    partner["is_verified"] = True
    return {"success": True, "message": "Партнера підтверджено"}


# ==================== ADMIN: PRODUCTS ====================

@app.get("/api/admin/products")
async def list_products(
    page: int = 1,
    limit: int = 20,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    search: Optional[str] = None
):
    """Список товарів"""
    products = demo_products.copy()
    
    if category_id:
        products = [p for p in products if p.get("category_id") == category_id]
    
    if brand_id:
        products = [p for p in products if p.get("brand_id") == brand_id]
    
    if search:
        search_lower = search.lower()
        products = [p for p in products if 
            search_lower in p.get("name_uk", "").lower() or
            search_lower in p.get("sku", "").lower()
        ]
    
    return {
        "items": products,
        "total": len(products),
        "page": page,
        "limit": limit
    }


@app.post("/api/admin/products")
async def create_product(data: ProductCreate):
    """Створити товар"""
    new_id = max(p["id"] for p in demo_products) + 1
    new_product = {
        "id": new_id,
        **data.dict(),
        "created_at": datetime.utcnow().isoformat()
    }
    demo_products.append(new_product)
    return new_product


@app.put("/api/admin/products/{product_id}")
async def update_product(product_id: int, data: ProductUpdate):
    """Оновити товар"""
    product = next((p for p in demo_products if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    update_data = data.dict(exclude_unset=True)
    product.update(update_data)
    return product


@app.delete("/api/admin/products/{product_id}")
async def delete_product(product_id: int):
    """Видалити товар"""
    global demo_products
    demo_products = [p for p in demo_products if p["id"] != product_id]
    return {"success": True, "message": "Товар видалено"}


# ==================== ADMIN: CATEGORIES ====================

@app.get("/api/admin/categories")
async def list_categories():
    """Список категорій"""
    return {"items": demo_categories, "total": len(demo_categories)}


@app.post("/api/admin/categories")
async def create_category(data: CategoryCreate):
    """Створити категорію"""
    new_id = max(c["id"] for c in demo_categories) + 1
    new_category = {
        "id": new_id,
        **data.dict(),
        "slug": data.slug or slugify(data.name_uk),
        "products_count": 0
    }
    demo_categories.append(new_category)
    return new_category


@app.put("/api/admin/categories/{category_id}")
async def update_category(category_id: int, data: CategoryCreate):
    """Оновити категорію"""
    category = next((c for c in demo_categories if c["id"] == category_id), None)
    if not category:
        raise HTTPException(status_code=404, detail="Категорію не знайдено")
    
    category.update(data.dict(exclude_unset=True))
    return category


# ==================== ADMIN: BRANDS ====================

@app.get("/api/admin/brands")
async def list_brands():
    """Список брендів"""
    return {"items": demo_brands, "total": len(demo_brands)}


@app.post("/api/admin/brands")
async def create_brand(data: BrandCreate):
    """Створити бренд"""
    new_id = max(b["id"] for b in demo_brands) + 1
    new_brand = {
        "id": new_id,
        **data.dict(),
        "slug": data.slug or slugify(data.name),
        "products_count": 0
    }
    demo_brands.append(new_brand)
    return new_brand


# ==================== ADMIN: REGIONS ====================

@app.get("/api/admin/regions")
async def list_regions():
    """Список регіонів"""
    return {"items": demo_regions, "total": len(demo_regions)}


@app.get("/api/admin/regions/{region_id}")
async def get_region(region_id: int):
    """Деталі регіону"""
    region = next((r for r in demo_regions if r["id"] == region_id), None)
    if not region:
        raise HTTPException(status_code=404, detail="Регіон не знайдено")
    return region


# ==================== ADMIN: MANAGERS ====================

@app.get("/api/admin/managers")
async def list_managers(region_id: Optional[int] = None):
    """Список менеджерів"""
    managers = demo_managers.copy()
    
    if region_id:
        managers = [m for m in managers if m.get("region_id") == region_id]
    
    return {"items": managers, "total": len(managers)}


@app.post("/api/admin/managers")
async def create_manager(
    full_name: str = Body(...),
    phone: str = Body(...),
    email: str = Body(...),
    region_id: int = Body(None),
    telegram_username: str = Body(None),
    photo: str = Body(None)
):
    """Створити менеджера"""
    new_id = max(m["id"] for m in demo_managers) + 1 if demo_managers else 1
    
    region = next((r for r in demo_regions if r["id"] == region_id), None)
    region_name = region["name_uk"] if region else None
    
    new_manager = {
        "id": new_id,
        "full_name": full_name,
        "phone": phone,
        "email": email,
        "region_id": region_id,
        "region_name": region_name,
        "telegram_username": telegram_username,
        "photo": photo,
        "is_active": True
    }
    demo_managers.append(new_manager)
    return new_manager


@app.put("/api/admin/managers/{manager_id}")
async def update_manager(
    manager_id: int,
    full_name: str = Body(None),
    phone: str = Body(None),
    email: str = Body(None),
    region_id: int = Body(None),
    telegram_username: str = Body(None),
    photo: str = Body(None),
    is_active: bool = Body(None)
):
    """Оновити менеджера"""
    manager = next((m for m in demo_managers if m["id"] == manager_id), None)
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджера не знайдено")
    
    if full_name is not None: manager["full_name"] = full_name
    if phone is not None: manager["phone"] = phone
    if email is not None: manager["email"] = email
    if telegram_username is not None: manager["telegram_username"] = telegram_username
    if photo is not None: manager["photo"] = photo
    if is_active is not None: manager["is_active"] = is_active
    
    if region_id is not None:
        manager["region_id"] = region_id
        region = next((r for r in demo_regions if r["id"] == region_id), None)
        manager["region_name"] = region["name_uk"] if region else None
    
    return manager


@app.delete("/api/admin/managers/{manager_id}")
async def delete_manager(manager_id: int):
    """Видалити менеджера"""
    global demo_managers
    demo_managers = [m for m in demo_managers if m["id"] != manager_id]
    return {"success": True, "message": "Менеджера видалено"}


# ==================== ADMIN: TAGS ====================

@app.get("/api/admin/tags")
async def list_tags():
    """Список тегів"""
    # Додаємо кількість товарів та статей для кожного тегу
    tags_with_counts = []
    for tag in demo_tags:
        products_count = sum(1 for pt in demo_product_tags.values() if tag["id"] in pt)
        content_count = sum(1 for ct in demo_content_tags.values() if tag["id"] in ct)
        tags_with_counts.append({
            **tag,
            "products_count": products_count,
            "content_count": content_count
        })
    
    return {"items": tags_with_counts, "total": len(tags_with_counts)}


@app.post("/api/admin/tags")
async def create_tag(
    name_uk: str = Body(...),
    name_en: str = Body(None),
    color: str = Body("#6366f1")
):
    """Створити тег"""
    new_id = max(t["id"] for t in demo_tags) + 1 if demo_tags else 1
    
    new_tag = {
        "id": new_id,
        "name_uk": name_uk,
        "name_en": name_en or name_uk,
        "slug": slugify(name_uk),
        "color": color,
        "is_active": True
    }
    demo_tags.append(new_tag)
    return new_tag


@app.put("/api/admin/tags/{tag_id}")
async def update_tag(
    tag_id: int,
    name_uk: str = Body(None),
    name_en: str = Body(None),
    color: str = Body(None),
    is_active: bool = Body(None)
):
    """Оновити тег"""
    tag = next((t for t in demo_tags if t["id"] == tag_id), None)
    if not tag:
        raise HTTPException(status_code=404, detail="Тег не знайдено")
    
    if name_uk is not None:
        tag["name_uk"] = name_uk
        tag["slug"] = slugify(name_uk)
    if name_en is not None: tag["name_en"] = name_en
    if color is not None: tag["color"] = color
    if is_active is not None: tag["is_active"] = is_active
    
    return tag


@app.delete("/api/admin/tags/{tag_id}")
async def delete_tag(tag_id: int):
    """Видалити тег"""
    global demo_tags
    demo_tags = [t for t in demo_tags if t["id"] != tag_id]
    return {"success": True, "message": "Тег видалено"}


@app.post("/api/admin/products/{product_id}/tags")
async def set_product_tags(product_id: int, tag_ids: List[int] = Body(...)):
    """Встановити теги для товару"""
    demo_product_tags[product_id] = tag_ids
    return {"success": True, "product_id": product_id, "tags": tag_ids}


@app.post("/api/admin/content/{content_id}/tags")
async def set_content_tags(content_id: int, tag_ids: List[int] = Body(...)):
    """Встановити теги для контенту"""
    demo_content_tags[content_id] = tag_ids
    return {"success": True, "content_id": content_id, "tags": tag_ids}


@app.post("/api/admin/partners/{partner_id}/assign-manager")
async def assign_manager_to_partner(partner_id: int, manager_id: int = Body(...)):
    """Призначити менеджера партнеру"""
    partner = next((p for p in demo_partners if p["id"] == partner_id), None)
    if not partner:
        raise HTTPException(status_code=404, detail="Партнера не знайдено")
    
    manager = next((m for m in demo_managers if m["id"] == manager_id), None)
    if not manager:
        raise HTTPException(status_code=404, detail="Менеджера не знайдено")
    
    partner["manager_id"] = manager_id
    return {"success": True, "message": f"Менеджера {manager['full_name']} призначено партнеру"}


# ==================== ADMIN: ORDERS ====================

@app.get("/api/admin/orders")
async def list_orders(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    partner_id: Optional[int] = None
):
    """Список замовлень"""
    orders = demo_orders.copy()
    
    if status:
        orders = [o for o in orders if o.get("status") == status]
    
    if partner_id:
        orders = [o for o in orders if o.get("partner_id") == partner_id]
    
    return {
        "items": orders,
        "total": len(orders),
        "page": page,
        "limit": limit
    }


@app.get("/api/admin/orders/{order_id}")
async def get_order(order_id: int):
    """Деталі замовлення"""
    order = next((o for o in demo_orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    # Додаємо items до замовлення
    order["items"] = [
        {"product_id": 1, "name": "Батарейка Energizer AA", "sku": "BAT-001", "quantity": 100, "price": 32, "total": 3200},
        {"product_id": 2, "name": "LED лампа Philips 10W", "sku": "LED-001", "quantity": 50, "price": 65, "total": 3250}
    ]
    return order


@app.put("/api/admin/orders/{order_id}/status")
async def update_order_status(order_id: int, data: OrderStatusUpdate):
    """Оновити статус замовлення"""
    order = next((o for o in demo_orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    order["status"] = data.status
    if data.tracking_number:
        order["tracking_number"] = data.tracking_number
    if data.admin_notes:
        order["admin_notes"] = data.admin_notes
    
    return order


# ==================== ADMIN: CONTENT ====================

@app.get("/api/admin/content")
async def list_content(content_type: Optional[str] = None):
    """Список контенту"""
    content = demo_content.copy()
    
    if content_type:
        content = [c for c in content if c.get("content_type") == content_type]
    
    return {"items": content, "total": len(content)}


@app.post("/api/admin/content")
async def create_content(data: ContentCreate):
    """Створити контент"""
    new_id = max(c["id"] for c in demo_content) + 1
    new_content = {
        "id": new_id,
        **data.dict(),
        "slug": data.slug or slugify(data.title_uk),
        "created_at": datetime.utcnow().isoformat()
    }
    demo_content.append(new_content)
    return new_content


@app.put("/api/admin/content/{content_id}")
async def update_content(content_id: int, data: ContentCreate):
    """Оновити контент"""
    content = next((c for c in demo_content if c["id"] == content_id), None)
    if not content:
        raise HTTPException(status_code=404, detail="Контент не знайдено")
    
    content.update(data.dict(exclude_unset=True))
    return content


@app.delete("/api/admin/content/{content_id}")
async def delete_content(content_id: int):
    """Видалити контент"""
    global demo_content
    demo_content = [c for c in demo_content if c["id"] != content_id]
    return {"success": True, "message": "Контент видалено"}


# ==================== ADMIN: TRANSLATIONS ====================

@app.get("/api/admin/translations")
async def list_translations():
    """Список перекладів"""
    return demo_translations


@app.post("/api/admin/translations")
async def save_translation(data: TranslationCreate):
    """Зберегти переклад"""
    demo_translations[data.key] = {"uk": data.uk, "en": data.en or data.uk}
    return {"success": True, "key": data.key}


@app.put("/api/admin/translations/{key}")
async def update_translation(key: str, uk: str = Body(...), en: str = Body(None)):
    """Оновити переклад"""
    demo_translations[key] = {"uk": uk, "en": en or uk}
    return {"success": True}


# ==================== PARTNER CABINET API ====================

@app.get("/api/partner/profile")
async def get_partner_profile(token: str = Depends(oauth2_scheme)):
    """Профіль партнера"""
    # Тут перевірка токена і отримання партнера
    return demo_partners[0]


@app.put("/api/partner/profile")
async def update_partner_profile(data: PartnerUpdate, token: str = Depends(oauth2_scheme)):
    """Оновити профіль партнера"""
    partner = demo_partners[0]
    partner.update(data.dict(exclude_unset=True))
    return partner


@app.get("/api/partner/catalog")
async def get_partner_catalog(
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    search: Optional[str] = None,
    token: str = Depends(oauth2_scheme)
):
    """Каталог товарів для партнера (з оптовими цінами)"""
    products = demo_products.copy()
    
    # Партнер бачить оптові ціни
    for p in products:
        p["my_price"] = p.get("price_wholesale", p.get("price_retail"))
    
    if category_id:
        products = [p for p in products if p.get("category_id") == category_id]
    
    if brand_id:
        products = [p for p in products if p.get("brand_id") == brand_id]
    
    if search:
        search_lower = search.lower()
        products = [p for p in products if search_lower in p.get("name_uk", "").lower()]
    
    return {"items": products, "total": len(products)}


@app.get("/api/partner/orders")
async def get_partner_orders(token: str = Depends(oauth2_scheme)):
    """Замовлення партнера"""
    # Фільтруємо замовлення поточного партнера
    partner_orders = [o for o in demo_orders if o.get("partner_id") == 1]
    return {"items": partner_orders, "total": len(partner_orders)}


@app.post("/api/partner/orders")
async def create_partner_order(data: OrderCreate, token: str = Depends(oauth2_scheme)):
    """Створити замовлення"""
    new_id = max(o["id"] for o in demo_orders) + 1
    new_order = {
        "id": new_id,
        "order_number": generate_order_number(),
        "partner_id": 1,
        "partner_name": demo_partners[0]["company_name"],
        "status": "pending",
        "total": sum(item.get("quantity", 1) * 100 for item in data.items),  # Спрощено
        "items_count": len(data.items),
        "created_at": datetime.utcnow().isoformat(),
        **data.dict(exclude={"items"})
    }
    demo_orders.append(new_order)
    return new_order


@app.get("/api/partner/documents")
async def get_partner_documents(token: str = Depends(oauth2_scheme)):
    """Документи партнера"""
    return {
        "items": [
            {"id": 1, "doc_type": "contract", "doc_number": "ДГ-2024/001", "doc_date": "2024-01-15", "title": "Договір поставки", "file_path": "/documents/contract-001.pdf"},
            {"id": 2, "doc_type": "invoice", "doc_number": "РХ-2024/156", "doc_date": "2024-03-15", "title": "Рахунок на оплату", "amount": 45600, "is_paid": True},
            {"id": 3, "doc_type": "waybill", "doc_number": "ВН-2024/089", "doc_date": "2024-03-16", "title": "Видаткова накладна", "amount": 45600},
            {"id": 4, "doc_type": "act", "doc_number": "АКТ-2024/045", "doc_date": "2024-03-18", "title": "Акт звірки", "file_path": "/documents/act-045.pdf"}
        ],
        "total": 4
    }


@app.get("/api/partner/balance")
async def get_partner_balance(token: str = Depends(oauth2_scheme)):
    """Баланс та історія оплат партнера"""
    return {
        "balance": 15000,
        "credit_limit": 50000,
        "available_credit": 35000,
        "transactions": [
            {"id": 1, "date": "2024-03-18", "type": "payment", "amount": 45600, "description": "Оплата за замовлення NRG-240315-A1B2C3"},
            {"id": 2, "date": "2024-03-15", "type": "order", "amount": -45600, "description": "Замовлення NRG-240315-A1B2C3"},
            {"id": 3, "date": "2024-03-10", "type": "payment", "amount": 30000, "description": "Часткова оплата"}
        ]
    }


@app.get("/api/partner/manager")
async def get_partner_manager(token: str = Depends(oauth2_scheme)):
    """Контакти менеджера партнера"""
    # Отримуємо partner_id з токена (в demo режимі - partner 1)
    partner = demo_partners[0]
    manager_id = partner.get("manager_id")
    
    if not manager_id:
        # Якщо менеджер не призначений - призначаємо за регіоном
        region_id = partner.get("region_id")
        manager = next((m for m in demo_managers if m.get("region_id") == region_id), None)
    else:
        manager = next((m for m in demo_managers if m["id"] == manager_id), None)
    
    if not manager:
        # Повертаємо першого доступного менеджера
        manager = demo_managers[0] if demo_managers else None
    
    if manager:
        return {
            "id": manager["id"],
            "full_name": manager["full_name"],
            "phone": manager["phone"],
            "phone_additional": manager.get("phone_additional"),
            "email": manager["email"],
            "telegram": manager.get("telegram_username"),
            "photo": manager.get("photo"),
            "region": manager.get("region_name")
        }
    
    return {"message": "Менеджера ще не призначено"}


@app.get("/api/partner/favorites")
async def get_partner_favorites(token: str = Depends(oauth2_scheme)):
    """Обрані товари партнера"""
    partner_id = 1  # В реальності з токена
    favorite_ids = demo_partner_favorites.get(partner_id, [])
    
    favorites = []
    for product in demo_products:
        if product["id"] in favorite_ids:
            # Додаємо теги товару
            product_tags = []
            tag_ids = demo_product_tags.get(product["id"], [])
            for tag_id in tag_ids:
                tag = next((t for t in demo_tags if t["id"] == tag_id), None)
                if tag:
                    product_tags.append({"id": tag["id"], "name": tag["name_uk"], "color": tag["color"]})
            
            favorites.append({
                **product,
                "tags": product_tags,
                "my_price": product.get("price_wholesale", product.get("price_retail"))
            })
    
    return {"items": favorites, "total": len(favorites)}


@app.post("/api/partner/favorites/{product_id}")
async def add_to_favorites(product_id: int, token: str = Depends(oauth2_scheme)):
    """Додати товар до обраного"""
    partner_id = 1  # В реальності з токена
    
    if partner_id not in demo_partner_favorites:
        demo_partner_favorites[partner_id] = []
    
    if product_id not in demo_partner_favorites[partner_id]:
        demo_partner_favorites[partner_id].append(product_id)
    
    return {"success": True, "message": "Товар додано до обраного"}


@app.delete("/api/partner/favorites/{product_id}")
async def remove_from_favorites(product_id: int, token: str = Depends(oauth2_scheme)):
    """Видалити товар з обраного"""
    partner_id = 1  # В реальності з токена
    
    if partner_id in demo_partner_favorites and product_id in demo_partner_favorites[partner_id]:
        demo_partner_favorites[partner_id].remove(product_id)
    
    return {"success": True, "message": "Товар видалено з обраного"}


@app.get("/api/partner/recommended-articles")
async def get_recommended_articles(token: str = Depends(oauth2_scheme)):
    """Рекомендовані статті за тегами обраних товарів партнера"""
    partner_id = 1  # В реальності з токена
    favorite_ids = demo_partner_favorites.get(partner_id, [])
    
    # Збираємо всі теги обраних товарів
    partner_tag_ids = set()
    for product_id in favorite_ids:
        tag_ids = demo_product_tags.get(product_id, [])
        partner_tag_ids.update(tag_ids)
    
    # Шукаємо статті з цими тегами
    recommended_articles = []
    for content in demo_content:
        if content.get("content_type") == "news" and content.get("is_active"):
            content_tag_ids = set(demo_content_tags.get(content["id"], []))
            # Перевіряємо перетин тегів
            matching_tags = partner_tag_ids.intersection(content_tag_ids)
            if matching_tags:
                # Отримуємо назви тегів
                tags = []
                for tag_id in content_tag_ids:
                    tag = next((t for t in demo_tags if t["id"] == tag_id), None)
                    if tag:
                        tags.append({"id": tag["id"], "name": tag["name_uk"], "color": tag["color"]})
                
                recommended_articles.append({
                    "id": content["id"],
                    "slug": content["slug"],
                    "title": content["title_uk"],
                    "excerpt": content.get("excerpt_uk"),
                    "image": content.get("image"),
                    "publish_date": content.get("publish_date"),
                    "tags": tags,
                    "relevance": len(matching_tags)  # Чим більше спільних тегів, тим релевантніше
                })
    
    # Сортуємо за релевантністю
    recommended_articles.sort(key=lambda x: x["relevance"], reverse=True)
    
    return {"items": recommended_articles, "total": len(recommended_articles)}


@app.get("/api/partner/updates")
async def get_partner_updates(token: str = Depends(oauth2_scheme)):
    """Оновлення для партнера (новини компанії, акції тощо)"""
    # Загальні новини та оновлення
    updates = []
    
    for content in demo_content:
        if content.get("is_active") and content.get("content_type") in ["news", "promo"]:
            updates.append({
                "id": content["id"],
                "type": content["content_type"],
                "title": content["title_uk"],
                "excerpt": content.get("excerpt_uk"),
                "image": content.get("image"),
                "link_url": content.get("link_url"),
                "publish_date": content.get("publish_date"),
                "is_featured": content.get("is_featured", False)
            })
    
    # Сортуємо за датою (featured спочатку)
    updates.sort(key=lambda x: (not x["is_featured"], x.get("publish_date", "")), reverse=True)
    
    return {"items": updates[:10], "total": len(updates)}


# ==================== PUBLIC API (i18n) ====================

@app.get("/api/translations/{lang}")
async def get_public_translations(lang: str = "uk"):
    """Публічні переклади для сайту"""
    if lang not in ["uk", "en"]:
        lang = "uk"
    
    result = {}
    for key, value in demo_translations.items():
        result[key] = value.get(lang, value.get("uk", ""))
    
    return result


@app.get("/api/public/categories")
async def get_public_categories(lang: str = "uk"):
    """Публічний список категорій"""
    categories = []
    for c in demo_categories:
        categories.append({
            "id": c["id"],
            "name": c.get(f"name_{lang}", c.get("name_uk")),
            "slug": c["slug"],
            "icon": c.get("icon")
        })
    return categories


@app.get("/api/public/brands")
async def get_public_brands():
    """Публічний список брендів"""
    return [{"id": b["id"], "name": b["name"], "slug": b["slug"], "logo": b.get("logo")} for b in demo_brands]


@app.get("/api/public/content/{content_type}")
async def get_public_content(content_type: str, lang: str = "uk"):
    """Публічний контент (новини, банери)"""
    content = [c for c in demo_content if c.get("content_type") == content_type and c.get("is_active")]
    
    result = []
    for c in content:
        result.append({
            "id": c["id"],
            "slug": c["slug"],
            "title": c.get(f"title_{lang}", c.get("title_uk")),
            "excerpt": c.get(f"excerpt_{lang}", c.get("excerpt_uk")),
            "image": c.get("image"),
            "link_url": c.get("link_url"),
            "publish_date": c.get("publish_date")
        })
    
    return result


# ==================== STARTUP ====================

@app.on_event("startup")
async def startup():
    """Ініціалізація при запуску"""
    print("🚀 NRG-UA API started")
    print("📊 Demo mode active - using in-memory data")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
