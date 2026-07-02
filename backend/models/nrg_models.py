"""
Моделі бази даних для NRG-UA B2B платформи
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Enum, JSON, Date
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


# ==================== ENUMS ====================

class PartnerStatus(str, enum.Enum):
    PENDING = "pending"          # Очікує підтвердження
    ACTIVE = "active"            # Активний партнер
    SUSPENDED = "suspended"      # Призупинений
    INACTIVE = "inactive"        # Неактивний

class PartnerType(str, enum.Enum):
    RETAIL = "retail"            # Роздрібний продавець
    WHOLESALE = "wholesale"      # Оптовий покупець
    DISTRIBUTOR = "distributor"  # Дистриб'ютор
    NETWORK = "network"          # Торгова мережа

class PriceLevel(str, enum.Enum):
    RETAIL = "retail"            # Роздрібна ціна
    SMALL_WHOLESALE = "small_wholesale"    # Дрібний опт
    WHOLESALE = "wholesale"      # Опт
    DISTRIBUTOR = "distributor"  # Дистриб'юторська ціна

class DocumentType(str, enum.Enum):
    INVOICE = "invoice"          # Рахунок
    ACT = "act"                  # Акт
    WAYBILL = "waybill"          # Накладна
    CONTRACT = "contract"        # Договір
    CERTIFICATE = "certificate"  # Сертифікат
    PRICELIST = "pricelist"      # Прайс-лист

class OrderStatusNRG(str, enum.Enum):
    DRAFT = "draft"              # Чернетка
    PENDING = "pending"          # Очікує підтвердження
    CONFIRMED = "confirmed"      # Підтверджено
    PROCESSING = "processing"    # В обробці
    SHIPPED = "shipped"          # Відправлено
    DELIVERED = "delivered"      # Доставлено
    CANCELLED = "cancelled"      # Скасовано

class ContentType(str, enum.Enum):
    NEWS = "news"                # Новина
    BANNER = "banner"            # Банер
    PAGE = "page"                # Сторінка
    FAQ = "faq"                  # FAQ
    PROMO = "promo"              # Акція


# ==================== PARTNER MODELS ====================

class Partner(Base):
    """Партнер/Клієнт B2B"""
    __tablename__ = "nrg_partners"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основна інформація
    company_name = Column(String(255), nullable=False)
    legal_name = Column(String(255))  # Юридична назва
    edrpou = Column(String(20), unique=True, index=True)  # ЄДРПОУ
    
    # Контактна особа
    contact_name = Column(String(255), nullable=False)
    contact_position = Column(String(100))
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    phone_additional = Column(String(50))
    
    # Адреса
    region = Column(String(100))  # Назва регіону (deprecated, використовуйте region_id)
    region_id = Column(Integer, ForeignKey("nrg_regions.id"), nullable=True)
    city = Column(String(100))
    address = Column(String(500))
    postal_code = Column(String(20))
    
    # Менеджер
    manager_id = Column(Integer, ForeignKey("nrg_managers.id"), nullable=True)
    
    # Авторизація
    password_hash = Column(String(255), nullable=False)
    
    # Статус та тип
    status = Column(Enum(PartnerStatus), default=PartnerStatus.PENDING)
    partner_type = Column(Enum(PartnerType), default=PartnerType.RETAIL)
    price_level = Column(Enum(PriceLevel), default=PriceLevel.RETAIL)
    
    # Фінанси
    credit_limit = Column(Float, default=0)
    balance = Column(Float, default=0)  # Баланс (від'ємний = борг)
    discount_percent = Column(Float, default=0)  # Персональна знижка
    
    # Документи
    contract_number = Column(String(100))
    contract_date = Column(Date)
    
    # Мета
    notes = Column(Text)
    is_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    last_order_at = Column(DateTime)
    
    # Relationships
    orders = relationship("NRGOrder", back_populates="partner")
    documents = relationship("PartnerDocument", back_populates="partner")
    cart_items = relationship("CartItem", back_populates="partner")
    favorites = relationship("PartnerFavorite", back_populates="partner")
    manager = relationship("Manager", back_populates="partners")
    region_obj = relationship("Region", back_populates="partners")
    telegram_account = relationship("TelegramUser", back_populates="partner", uselist=False)


class PartnerDocument(Base):
    """Документи партнера"""
    __tablename__ = "nrg_partner_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=False)
    
    doc_type = Column(Enum(DocumentType), nullable=False)
    doc_number = Column(String(100), nullable=False)
    doc_date = Column(Date, nullable=False)
    
    title = Column(String(255))
    description = Column(Text)
    file_path = Column(String(500))  # Шлях до файлу
    file_size = Column(Integer)
    
    amount = Column(Float)  # Сума документа
    is_paid = Column(Boolean, default=False)
    
    order_id = Column(Integer, ForeignKey("nrg_orders.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    partner = relationship("Partner", back_populates="documents")
    order = relationship("NRGOrder", back_populates="documents")


# ==================== PRODUCT MODELS ====================

class NRGCategory(Base):
    """Категорії товарів NRG"""
    __tablename__ = "nrg_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name_uk = Column(String(255), nullable=False)
    name_en = Column(String(255))
    slug = Column(String(255), unique=True, index=True)
    description_uk = Column(Text)
    description_en = Column(Text)
    icon = Column(String(100))
    image = Column(String(500))
    
    parent_id = Column(Integer, ForeignKey("nrg_categories.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    products = relationship("NRGProduct", back_populates="category")
    children = relationship("NRGCategory", backref="parent", remote_side=[id])


class NRGBrand(Base):
    """Бренди NRG"""
    __tablename__ = "nrg_brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    logo = Column(String(500))
    description_uk = Column(Text)
    description_en = Column(Text)
    website = Column(String(255))
    country = Column(String(100))
    is_exclusive = Column(Boolean, default=False)  # Ексклюзивний бренд
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    # Relationships
    products = relationship("NRGProduct", back_populates="brand")


class NRGProduct(Base):
    """Товари NRG"""
    __tablename__ = "nrg_products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    barcode = Column(String(50), index=True)
    
    # Назви (мультимовні)
    name_uk = Column(String(255), nullable=False)
    name_en = Column(String(255))
    slug = Column(String(255), unique=True, index=True)
    
    # Описи
    short_description_uk = Column(String(500))
    short_description_en = Column(String(500))
    description_uk = Column(Text)
    description_en = Column(Text)
    
    # Ціни (різні рівні)
    price_retail = Column(Float, nullable=False)  # РРЦ
    price_small_wholesale = Column(Float)  # Дрібний опт
    price_wholesale = Column(Float)  # Опт
    price_distributor = Column(Float)  # Дистриб'юторська
    
    # Собівартість
    cost_price = Column(Float)
    
    # Залишки
    stock_quantity = Column(Integer, default=0)
    stock_reserved = Column(Integer, default=0)
    min_order_qty = Column(Integer, default=1)
    
    # Одиниці виміру
    unit = Column(String(50), default="шт")
    pack_quantity = Column(Integer, default=1)  # К-сть в упаковці
    
    # Характеристики
    weight = Column(Float)  # Вага в кг
    dimensions = Column(String(100))  # Розміри ШхВхГ
    specifications = Column(JSON, default={})
    
    # Зображення
    image_main = Column(String(500))
    images = Column(JSON, default=[])
    
    # Зв'язки
    category_id = Column(Integer, ForeignKey("nrg_categories.id"))
    brand_id = Column(Integer, ForeignKey("nrg_brands.id"))
    
    # Мітки
    is_active = Column(Boolean, default=True)
    is_new = Column(Boolean, default=False)
    is_bestseller = Column(Boolean, default=False)
    is_promo = Column(Boolean, default=False)
    
    # SEO
    meta_title = Column(String(255))
    meta_description = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("NRGCategory", back_populates="products")
    brand = relationship("NRGBrand", back_populates="products")
    order_items = relationship("NRGOrderItem", back_populates="product")
    tags = relationship("ProductTag", back_populates="product")
    favorited_by = relationship("PartnerFavorite", back_populates="product")


# ==================== ORDER MODELS ====================

class NRGOrder(Base):
    """Замовлення NRG"""
    __tablename__ = "nrg_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=False)
    
    status = Column(Enum(OrderStatusNRG), default=OrderStatusNRG.PENDING)
    
    # Суми
    subtotal = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    shipping_cost = Column(Float, default=0)
    total = Column(Float, default=0)
    
    # Доставка
    delivery_method = Column(String(100))
    delivery_address = Column(String(500))
    delivery_city = Column(String(100))
    tracking_number = Column(String(100))
    
    # Оплата
    payment_method = Column(String(100))
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime)
    
    # Коментарі
    customer_notes = Column(Text)
    admin_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    shipped_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    # Relationships
    partner = relationship("Partner", back_populates="orders")
    items = relationship("NRGOrderItem", back_populates="order")
    documents = relationship("PartnerDocument", back_populates="order")


class NRGOrderItem(Base):
    """Позиції замовлення"""
    __tablename__ = "nrg_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("nrg_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("nrg_products.id"), nullable=False)
    
    sku = Column(String(100))
    name = Column(String(255))
    
    quantity = Column(Integer, default=1)
    price = Column(Float)  # Ціна за одиницю
    discount_percent = Column(Float, default=0)
    total = Column(Float)
    
    # Relationships
    order = relationship("NRGOrder", back_populates="items")
    product = relationship("NRGProduct", back_populates="order_items")


class CartItem(Base):
    """Кошик партнера"""
    __tablename__ = "nrg_cart_items"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("nrg_products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    partner = relationship("Partner", back_populates="cart_items")
    product = relationship("NRGProduct")


# ==================== CONTENT MODELS ====================

class Content(Base):
    """Контент сайту (новини, банери, сторінки)"""
    __tablename__ = "nrg_content"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(Enum(ContentType), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    
    # Заголовки
    title_uk = Column(String(255), nullable=False)
    title_en = Column(String(255))
    
    # Контент
    content_uk = Column(Text)
    content_en = Column(Text)
    
    # Короткий опис
    excerpt_uk = Column(String(500))
    excerpt_en = Column(String(500))
    
    # Медіа
    image = Column(String(500))
    image_alt = Column(String(255))
    
    # Для банерів
    link_url = Column(String(500))
    link_text_uk = Column(String(100))
    link_text_en = Column(String(100))
    
    # Мета
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    # Дати
    publish_date = Column(DateTime, default=datetime.utcnow)
    expire_date = Column(DateTime, nullable=True)
    
    # SEO
    meta_title_uk = Column(String(255))
    meta_title_en = Column(String(255))
    meta_description_uk = Column(String(500))
    meta_description_en = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    tags = relationship("ContentTag", back_populates="content")


# ==================== SETTINGS & TRANSLATIONS ====================

class Translation(Base):
    """Переклади для i18n"""
    __tablename__ = "nrg_translations"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)
    uk = Column(Text, nullable=False)
    en = Column(Text)
    context = Column(String(100))  # Контекст використання
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SiteSetting(Base):
    """Налаштування сайту"""
    __tablename__ = "nrg_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)
    value = Column(Text)
    value_type = Column(String(50), default="string")  # string, number, boolean, json
    description = Column(String(500))
    is_public = Column(Boolean, default=False)  # Чи доступно на фронтенді
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== STATISTICS ====================

class PartnerActivity(Base):
    """Активність партнерів для статистики"""
    __tablename__ = "nrg_partner_activity"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=False)
    action = Column(String(100))  # login, view_product, add_to_cart, order, etc.
    details = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== REGIONS & MANAGERS ====================

class Region(Base):
    """Регіони України для призначення менеджерів"""
    __tablename__ = "nrg_regions"
    
    id = Column(Integer, primary_key=True, index=True)
    name_uk = Column(String(100), nullable=False)
    name_en = Column(String(100))
    code = Column(String(10), unique=True, index=True)  # UA-05 для Вінницької обл.
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    managers = relationship("Manager", back_populates="region")
    partners = relationship("Partner", back_populates="region_obj")


class Manager(Base):
    """Менеджери компанії"""
    __tablename__ = "nrg_managers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основна інформація
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    phone_additional = Column(String(50))
    email = Column(String(255), nullable=False)
    
    # Telegram
    telegram_username = Column(String(100))  # @username
    telegram_chat_id = Column(String(50))  # для повідомлень
    
    # Регіон
    region_id = Column(Integer, ForeignKey("nrg_regions.id"))
    
    # Фото
    photo = Column(String(500))
    
    # Статус
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    region = relationship("Region", back_populates="managers")
    partners = relationship("Partner", back_populates="manager")


# ==================== TAGS ====================

class Tag(Base):
    """Теги для товарів та статей"""
    __tablename__ = "nrg_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name_uk = Column(String(100), nullable=False)
    name_en = Column(String(100))
    slug = Column(String(100), unique=True, index=True)
    color = Column(String(20), default="#6366f1")  # HEX колір для відображення
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    products = relationship("ProductTag", back_populates="tag")
    contents = relationship("ContentTag", back_populates="tag")


class ProductTag(Base):
    """Зв'язок товар-тег"""
    __tablename__ = "nrg_product_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("nrg_products.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("nrg_tags.id"), nullable=False)
    
    # Relationships
    product = relationship("NRGProduct", back_populates="tags")
    tag = relationship("Tag", back_populates="products")


class ContentTag(Base):
    """Зв'язок стаття/контент-тег"""
    __tablename__ = "nrg_content_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("nrg_content.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("nrg_tags.id"), nullable=False)
    
    # Relationships
    content = relationship("Content", back_populates="tags")
    tag = relationship("Tag", back_populates="contents")


# ==================== PARTNER FAVORITES ====================

class PartnerFavorite(Base):
    """Обрані товари партнера"""
    __tablename__ = "nrg_partner_favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("nrg_products.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String(500))  # Приватні нотатки партнера
    
    # Relationships
    partner = relationship("Partner", back_populates="favorites")
    product = relationship("NRGProduct", back_populates="favorited_by")


# ==================== TELEGRAM INTEGRATION ====================

class TelegramUser(Base):
    """Зв'язок Telegram з партнером"""
    __tablename__ = "nrg_telegram_users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), unique=True, index=True, nullable=False)
    telegram_username = Column(String(100))
    telegram_first_name = Column(String(100))
    telegram_last_name = Column(String(100))
    telegram_phone = Column(String(50))
    
    partner_id = Column(Integer, ForeignKey("nrg_partners.id"), nullable=True)
    
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    partner = relationship("Partner", back_populates="telegram_account")
