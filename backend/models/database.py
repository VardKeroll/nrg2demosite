"""
Моделі бази даних для системи Енергія
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Enum, JSON
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
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"

class OrderStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class LeadSource(str, enum.Enum):
    WEBSITE = "website"
    PHONE = "phone"
    EMAIL = "email"
    TELEGRAM = "telegram"
    REFERRAL = "referral"
    ADVERTISING = "advertising"
    OTHER = "other"


# ==================== USER MODELS ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== PRODUCT MODELS ====================

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    description = Column(Text)
    icon = Column(String(100))
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="category")
    children = relationship("Category", backref="parent", remote_side=[id])


class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    logo = Column(String(500))
    description = Column(Text)
    website = Column(String(255))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    products = relationship("Product", back_populates="brand")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)  # Артикул
    name = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, index=True)
    description = Column(Text)
    description_ai = Column(Text)  # AI-generated description
    
    # Pricing
    price = Column(Float, nullable=False)
    price_old = Column(Float)
    cost_price = Column(Float)  # Собівартість
    
    # Stock
    stock_quantity = Column(Integer, default=0)
    min_stock_level = Column(Integer, default=5)
    
    # Relations
    category_id = Column(Integer, ForeignKey("categories.id"))
    brand_id = Column(Integer, ForeignKey("brands.id"))
    
    # Media
    main_image = Column(String(500))
    images = Column(JSON, default=list)  # List of image URLs
    
    # Specifications
    specifications = Column(JSON, default=dict)
    
    # Flags
    is_active = Column(Boolean, default=True)
    is_new = Column(Boolean, default=False)
    is_hit = Column(Boolean, default=False)
    is_sale = Column(Boolean, default=False)
    
    # SEO
    meta_title = Column(String(255))
    meta_description = Column(Text)
    
    # Stats
    views_count = Column(Integer, default=0)
    sales_count = Column(Integer, default=0)
    rating = Column(Float, default=0)
    reviews_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 1C Sync
    one_c_id = Column(String(100))
    last_sync = Column(DateTime)
    
    # Relationships
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


# ==================== CRM MODELS ====================

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Contact info
    email = Column(String(255), index=True)
    phone = Column(String(50), index=True)
    full_name = Column(String(255))
    
    # Company info (for B2B)
    company_name = Column(String(255))
    company_code = Column(String(50))  # ЄДРПОУ
    is_company = Column(Boolean, default=False)
    
    # Address
    city = Column(String(100))
    address = Column(Text)
    postal_code = Column(String(20))
    
    # CRM Data
    source = Column(Enum(LeadSource), default=LeadSource.WEBSITE)
    manager_id = Column(Integer, ForeignKey("users.id"))
    tags = Column(JSON, default=list)
    notes = Column(Text)
    
    # Financial
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0)
    discount_percent = Column(Float, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_order_at = Column(DateTime)
    
    # Relationships
    orders = relationship("Order", back_populates="customer")
    leads = relationship("Lead", back_populates="customer")
    manager = relationship("User")


class Lead(Base):
    """Воронка продажів - ліди"""
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Contact
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    
    # Lead info
    title = Column(String(500))  # Тема запиту
    description = Column(Text)
    source = Column(Enum(LeadSource), default=LeadSource.WEBSITE)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    
    # Value
    estimated_value = Column(Float, default=0)
    probability = Column(Integer, default=50)  # % ймовірності закриття
    
    # Assignment
    manager_id = Column(Integer, ForeignKey("users.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    next_contact_at = Column(DateTime)
    closed_at = Column(DateTime)
    
    # Relationships
    customer = relationship("Customer", back_populates="leads")
    manager = relationship("User")
    activities = relationship("LeadActivity", back_populates="lead")


class LeadActivity(Base):
    """Історія дій по ліду"""
    __tablename__ = "lead_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    activity_type = Column(String(50))  # call, email, meeting, note
    description = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lead = relationship("Lead", back_populates="activities")
    user = relationship("User")


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    
    # Customer
    customer_id = Column(Integer, ForeignKey("customers.id"))
    
    # Contact info (snapshot)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    
    # Delivery
    delivery_method = Column(String(100))  # Нова Пошта, Укрпошта, Самовивіз
    delivery_address = Column(Text)
    delivery_city = Column(String(100))
    delivery_cost = Column(Float, default=0)
    tracking_number = Column(String(100))
    
    # Payment
    payment_method = Column(String(100))  # Накладений платіж, Карткою, Рахунок
    payment_status = Column(String(50), default="pending")
    
    # Totals
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.NEW)
    
    # Notes
    customer_notes = Column(Text)
    manager_notes = Column(Text)
    
    # Assignment
    manager_id = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    shipped_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    # 1C Sync
    one_c_id = Column(String(100))
    
    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
    manager = relationship("User")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    # Product snapshot
    product_name = Column(String(500))
    product_sku = Column(String(100))
    
    # Quantity & Price
    quantity = Column(Integer, default=1)
    price = Column(Float)
    discount = Column(Float, default=0)
    total = Column(Float)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# ==================== AI & CHAT MODELS ====================

class ChatMessage(Base):
    """Історія чат-боту для аналізу та навчання"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True)
    
    role = Column(String(20))  # user, assistant, system
    content = Column(Text)
    
    # Context
    customer_id = Column(Integer, ForeignKey("customers.id"))
    product_ids = Column(JSON, default=list)  # Згадані товари
    
    # Analysis
    sentiment = Column(String(20))  # positive, negative, neutral
    intent = Column(String(100))  # buy, support, info, complaint
    
    created_at = Column(DateTime, default=datetime.utcnow)


class ProductReview(Base):
    __tablename__ = "product_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    
    rating = Column(Integer)  # 1-5
    title = Column(String(255))
    content = Column(Text)
    
    # AI Analysis
    sentiment = Column(String(20))
    sentiment_score = Column(Float)
    key_points = Column(JSON, default=list)
    
    # Moderation
    is_approved = Column(Boolean, default=False)
    is_spam = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== ANALYTICS ====================

class DailyStats(Base):
    """Щоденна статистика для аналітики"""
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True, unique=True)
    
    # Traffic
    visits = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)
    
    # Sales
    orders_count = Column(Integer, default=0)
    orders_total = Column(Float, default=0)
    
    # CRM
    new_leads = Column(Integer, default=0)
    converted_leads = Column(Integer, default=0)
    new_customers = Column(Integer, default=0)
    
    # Products
    products_sold = Column(Integer, default=0)
    top_products = Column(JSON, default=list)


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)


# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
