"""
Моделі бази даних для NRG-UA - B2B Дистриб'ютор
Оптимізовано для корпоративного каталогу без публічних цін
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Enum, JSON, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

from config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==================== ENUMS ====================

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    PARTNER = "partner"  # B2B партнер з доступом до кабінету

class PartnerStatus(str, enum.Enum):
    PENDING = "pending"        # Заявка на розгляді
    VERIFIED = "verified"      # Перевірений, очікує договір
    ACTIVE = "active"          # Активний партнер
    SUSPENDED = "suspended"    # Призупинено
    REJECTED = "rejected"      # Відхилено

class PartnerType(str, enum.Enum):
    DEALER = "dealer"          # Дилер
    WHOLESALER = "wholesaler"  # Оптовик
    RETAIL_CHAIN = "retail_chain"  # Торгова мережа
    DISTRIBUTOR = "distributor"    # Субдистриб'ютор

class OrderStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class LeadSource(str, enum.Enum):
    WEBSITE_FORM = "website_form"
    PARTNER_REQUEST = "partner_request"
    PHONE = "phone"
    EMAIL = "email"
    EXHIBITION = "exhibition"
    REFERRAL = "referral"
    OTHER = "other"

class BranchType(str, enum.Enum):
    HEAD_OFFICE = "head_office"
    REGIONAL_OFFICE = "regional_office"
    WAREHOUSE = "warehouse"
    SHOWROOM = "showroom"


# ==================== ASSOCIATION TABLES ====================

product_tags = Table(
    'product_tags',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

brand_categories = Table(
    'brand_categories',
    Base.metadata,
    Column('brand_id', Integer, ForeignKey('brands.id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True)
)


# ==================== USER & AUTH MODELS ====================

class User(Base):
    """Користувачі системи (адміни, менеджери)"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    role = Column(Enum(UserRole), default=UserRole.MANAGER)
    avatar = Column(String(500))
    is_active = Column(Boolean, default=True)
    language = Column(String(5), default="uk")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)


# ==================== CATALOG MODELS ====================

class Category(Base):
    """Категорії товарів - ієрархічна структура"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name_uk = Column(String(255), nullable=False)
    name_en = Column(String(255))
    description_uk = Column(Text)
    description_en = Column(Text)
    
    slug = Column(String(255), unique=True, index=True)
    icon = Column(String(100))
    image = Column(String(500))
    
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    level = Column(Integer, default=0)
    path = Column(String(500))
    
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    meta_title_uk = Column(String(255))
    meta_title_en = Column(String(255))
    meta_description_uk = Column(Text)
    meta_description_en = Column(Text)
    
    products_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")
    children = relationship("Category", backref="parent", remote_side=[id])
    brands = relationship("Brand", secondary=brand_categories, back_populates="categories")


class Brand(Base):
    """Бренди/Виробники - ключові партнери NRG-UA"""
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    
    description_uk = Column(Text)
    description_en = Column(Text)
    short_description_uk = Column(String(500))
    short_description_en = Column(String(500))
    
    logo = Column(String(500))
    logo_white = Column(String(500))
    banner = Column(String(500))
    
    website = Column(String(255))
    
    is_exclusive = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    partnership_since = Column(DateTime)
    
    country = Column(String(100))
    country_code = Column(String(2))
    
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    meta_title_uk = Column(String(255))
    meta_title_en = Column(String(255))
    meta_description_uk = Column(Text)
    meta_description_en = Column(Text)
    
    products_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    products = relationship("Product", back_populates="brand")
    categories = relationship("Category", secondary=brand_categories, back_populates="brands")


class Tag(Base):
    """Теги для додаткової фільтрації товарів"""
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name_uk = Column(String(100), nullable=False)
    name_en = Column(String(100))
    slug = Column(String(100), unique=True, index=True)
    color = Column(String(7))
    
    products = relationship("Product", secondary=product_tags, back_populates="tags")


class Product(Base):
    """
    Товари каталогу NRG-UA
    ВАЖЛИВО: Ціни НЕ публічні, доступні лише партнерам в кабінеті
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    
    sku = Column(String(100), unique=True, index=True, nullable=False)
    manufacturer_sku = Column(String(100))
    barcode = Column(String(50))
    
    name_uk = Column(String(500), nullable=False)
    name_en = Column(String(500))
    description_uk = Column(Text)
    description_en = Column(Text)
    short_description_uk = Column(String(500))
    short_description_en = Column(String(500))
    
    slug = Column(String(500), unique=True, index=True)
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    brand_id = Column(Integer, ForeignKey("brands.id"))
    
    main_image = Column(String(500))
    images = Column(JSON, default=list)
    video_url = Column(String(500))
    
    specifications = Column(JSON, default=dict)
    
    unit = Column(String(50), default="шт")
    pack_quantity = Column(Integer, default=1)
    box_quantity = Column(Integer)
    pallet_quantity = Column(Integer)
    
    weight = Column(Float)
    length = Column(Float)
    width = Column(Float)
    height = Column(Float)
    
    files = Column(JSON, default=list)
    
    is_active = Column(Boolean, default=True)
    is_new = Column(Boolean, default=False)
    is_bestseller = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    meta_title_uk = Column(String(255))
    meta_title_en = Column(String(255))
    meta_description_uk = Column(Text)
    meta_description_en = Column(Text)
    
    views_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    one_c_id = Column(String(100), index=True)
    last_sync_at = Column(DateTime)
    
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    tags = relationship("Tag", secondary=product_tags, back_populates="products")
    prices = relationship("ProductPrice", back_populates="product")
    stock = relationship("ProductStock", back_populates="product")


class ProductPrice(Base):
    """Ціни товарів - ЗАКРИТА інформація для партнерів"""
    __tablename__ = "product_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    partner_type = Column(Enum(PartnerType), nullable=False)
    
    price = Column(Float, nullable=False)
    rrp = Column(Float)
    
    min_quantity = Column(Integer, default=1)
    
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = relationship("Product", back_populates="prices")


class ProductStock(Base):
    """Залишки товарів по складах"""
    __tablename__ = "product_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    
    quantity = Column(Integer, default=0)
    reserved = Column(Integer, default=0)
    available = Column(Integer, default=0)
    
    expected_date = Column(DateTime)
    expected_quantity = Column(Integer)
    
    last_sync_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="stock")
    branch = relationship("Branch", back_populates="stock")


# ==================== B2B PARTNER MODELS ====================

class Partner(Base):
    """B2B Партнери - дилери, оптовики, торгові мережі"""
    __tablename__ = "partners"
    
    id = Column(Integer, primary_key=True, index=True)
    
    company_name = Column(String(255), nullable=False)
    company_name_short = Column(String(100))
    legal_form = Column(String(50))
    edrpou = Column(String(10), unique=True, index=True)
    tax_number = Column(String(20))
    is_vat_payer = Column(Boolean, default=False)
    
    contact_name = Column(String(255), nullable=False)
    contact_position = Column(String(100))
    contact_phone = Column(String(50), nullable=False)
    contact_email = Column(String(255), nullable=False)
    
    legal_address = Column(Text)
    legal_city = Column(String(100))
    legal_region = Column(String(100))
    legal_postal_code = Column(String(10))
    
    actual_address = Column(Text)
    actual_city = Column(String(100))
    actual_region = Column(String(100))
    actual_postal_code = Column(String(10))
    
    partner_type = Column(Enum(PartnerType), default=PartnerType.DEALER)
    status = Column(Enum(PartnerStatus), default=PartnerStatus.PENDING)
    
    source = Column(Enum(LeadSource), default=LeadSource.WEBSITE_FORM)
    source_details = Column(String(255))
    
    manager_id = Column(Integer, ForeignKey("users.id"))
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    discount_percent = Column(Float, default=0)
    credit_limit = Column(Float, default=0)
    payment_terms = Column(Integer, default=0)
    
    documents = Column(JSON, default=list)
    
    notes = Column(Text)
    internal_notes = Column(Text)
    
    total_orders = Column(Integer, default=0)
    total_amount = Column(Float, default=0)
    last_order_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    verified_at = Column(DateTime)
    
    one_c_id = Column(String(100), index=True)
    
    manager = relationship("User", foreign_keys=[manager_id])
    user = relationship("User", foreign_keys=[user_id])
    orders = relationship("Order", back_populates="partner")


class PartnerApplication(Base):
    """Заявки на партнерство"""
    __tablename__ = "partner_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    company_name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    
    city = Column(String(100))
    business_type = Column(Enum(PartnerType))
    business_description = Column(Text)
    website = Column(String(255))
    
    interested_categories = Column(JSON, default=list)
    estimated_monthly_volume = Column(String(100))
    
    source = Column(Enum(LeadSource), default=LeadSource.WEBSITE_FORM)
    
    status = Column(String(50), default="new")
    manager_id = Column(Integer, ForeignKey("users.id"))
    manager_notes = Column(Text)
    
    partner_id = Column(Integer, ForeignKey("partners.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    manager = relationship("User")
    partner = relationship("Partner")


# ==================== ORDER MODELS ====================

class Order(Base):
    """Замовлення від B2B партнерів"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False)
    
    delivery_branch_id = Column(Integer, ForeignKey("branches.id"))
    delivery_address = Column(Text)
    delivery_city = Column(String(100))
    delivery_method = Column(String(100))
    
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    delivery_cost = Column(Float, default=0)
    total = Column(Float, default=0)
    
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    
    payment_status = Column(String(50), default="pending")
    paid_amount = Column(Float, default=0)
    
    customer_notes = Column(Text)
    manager_notes = Column(Text)
    
    manager_id = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    shipped_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    one_c_id = Column(String(100))
    invoice_number = Column(String(50))
    
    partner = relationship("Partner", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
    manager = relationship("User")


class OrderItem(Base):
    """Позиції замовлення"""
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    product_sku = Column(String(100))
    product_name = Column(String(500))
    
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)
    discount = Column(Float, default=0)
    total = Column(Float, nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")


# ==================== COMPANY STRUCTURE ====================

class Branch(Base):
    """Філіали та склади NRG-UA по Україні"""
    __tablename__ = "branches"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name_uk = Column(String(255), nullable=False)
    name_en = Column(String(255))
    
    branch_type = Column(Enum(BranchType), default=BranchType.WAREHOUSE)
    
    city = Column(String(100), nullable=False)
    region = Column(String(100))
    address = Column(Text)
    postal_code = Column(String(10))
    
    latitude = Column(Float)
    longitude = Column(Float)
    
    phone = Column(String(50))
    email = Column(String(255))
    
    working_hours = Column(JSON)
    
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_pickup_available = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    stock = relationship("ProductStock", back_populates="branch")


# ==================== CONTENT MODELS ====================

class NewsArticle(Base):
    """Новини та статті блогу"""
    __tablename__ = "news_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    title_uk = Column(String(500), nullable=False)
    title_en = Column(String(500))
    slug = Column(String(500), unique=True, index=True)
    
    excerpt_uk = Column(Text)
    excerpt_en = Column(Text)
    content_uk = Column(Text)
    content_en = Column(Text)
    
    cover_image = Column(String(500))
    gallery = Column(JSON, default=list)
    
    news_type = Column(String(50))
    
    meta_title_uk = Column(String(255))
    meta_title_en = Column(String(255))
    meta_description_uk = Column(Text)
    meta_description_en = Column(Text)
    
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    author_id = Column(Integer, ForeignKey("users.id"))
    
    views_count = Column(Integer, default=0)
    
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = relationship("User")


class Vacancy(Base):
    """Вакансії для HR-розділу"""
    __tablename__ = "vacancies"
    
    id = Column(Integer, primary_key=True, index=True)
    
    title_uk = Column(String(255), nullable=False)
    title_en = Column(String(255))
    slug = Column(String(255), unique=True, index=True)
    
    description_uk = Column(Text)
    description_en = Column(Text)
    requirements_uk = Column(Text)
    requirements_en = Column(Text)
    conditions_uk = Column(Text)
    conditions_en = Column(Text)
    
    city = Column(String(100))
    is_remote = Column(Boolean, default=False)
    
    salary_from = Column(Integer)
    salary_to = Column(Integer)
    salary_currency = Column(String(3), default="UAH")
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContactMessage(Base):
    """Повідомлення з форми зворотного зв'язку"""
    __tablename__ = "contact_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    
    subject = Column(String(255))
    department = Column(String(50))
    message = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False)
    is_replied = Column(Boolean, default=False)
    manager_id = Column(Integer, ForeignKey("users.id"))
    manager_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    replied_at = Column(DateTime)


# ==================== HELPER FUNCTIONS ====================

def init_db():
    """Створення всіх таблиць"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency для FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
