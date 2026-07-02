"""
Енергія - Main FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import os
import uuid
import json
import re
from pathlib import Path
from html import escape

from config import settings
from models.database import (
    get_db, init_db, SessionLocal, User, UserRole, Category, Brand, Product,
    Customer, Lead, LeadStatus, LeadSource, LeadActivity,
    Order, OrderStatus, OrderItem, ChatMessage, ProductReview, DailyStats
)

# Initialize app
app = FastAPI(
    title=settings.APP_NAME,
    description="API для управління інтернет-магазином систем безпеки",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ==================== PYDANTIC SCHEMAS ====================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.VIEWER

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class CategorySchema(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True

class BrandSchema(BaseModel):
    name: str
    slug: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True

class ProductSchema(BaseModel):
    sku: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    price: float
    price_old: Optional[float] = None
    cost_price: Optional[float] = None
    stock_quantity: int = 0
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    specifications: Optional[dict] = {}
    is_active: bool = True
    is_new: bool = False
    is_hit: bool = False
    is_sale: bool = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

class CustomerSchema(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    is_company: bool = False
    city: Optional[str] = None
    address: Optional[str] = None
    source: LeadSource = LeadSource.WEBSITE
    tags: List[str] = []
    notes: Optional[str] = None
    discount_percent: float = 0

class LeadSchema(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source: LeadSource = LeadSource.WEBSITE
    status: LeadStatus = LeadStatus.NEW
    estimated_value: float = 0
    probability: int = 50
    manager_id: Optional[int] = None
    customer_id: Optional[int] = None
    next_contact_at: Optional[datetime] = None

class OrderSchema(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    delivery_method: str
    delivery_address: str
    delivery_city: str
    payment_method: str
    customer_notes: Optional[str] = None
    items: List[dict]

class ChatMessageSchema(BaseModel):
    session_id: str
    role: str
    content: str
    customer_id: Optional[int] = None

class SiteContentItem(BaseModel):
    key: str
    value: str

class SiteContentApplyRequest(BaseModel):
    items: List[SiteContentItem]


# ==================== AUTH HELPERS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Невірні облікові дані",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Потрібні права адміністратора")
    return current_user

def require_manager(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Потрібні права менеджера")
    return current_user


# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Невірний логін або пароль")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Акаунт деактивовано")
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }

@app.post("/api/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if first user (make admin)
    user_count = db.query(User).count()
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email вже зареєстровано")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username вже зайнято")
    
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.ADMIN if user_count == 0 else user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Користувача створено успішно", "id": user.id}

@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value
    }


# ==================== USERS ENDPOINTS ====================

@app.get("/api/users")
async def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "full_name": u.full_name, 
             "role": u.role.value, "is_active": u.is_active} for u in users]

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), 
                      current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    return {"message": "Користувача оновлено"}


# ==================== CATEGORIES ENDPOINTS ====================

@app.get("/api/categories")
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.sort_order).all()
    return categories

@app.post("/api/categories")
async def create_category(data: CategorySchema, db: Session = Depends(get_db), 
                         current_user: User = Depends(require_manager)):
    if not data.slug:
        data.slug = data.name.lower().replace(" ", "-")
    
    category = Category(**data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@app.put("/api/categories/{category_id}")
async def update_category(category_id: int, data: CategorySchema, db: Session = Depends(get_db),
                         current_user: User = Depends(require_manager)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Категорію не знайдено")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(category, key, value)
    
    db.commit()
    return category

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(require_admin)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Категорію не знайдено")
    
    db.delete(category)
    db.commit()
    return {"message": "Категорію видалено"}


# ==================== BRANDS ENDPOINTS ====================

@app.get("/api/brands")
async def get_brands(db: Session = Depends(get_db)):
    return db.query(Brand).all()

@app.post("/api/brands")
async def create_brand(data: BrandSchema, db: Session = Depends(get_db),
                      current_user: User = Depends(require_manager)):
    if not data.slug:
        data.slug = data.name.lower().replace(" ", "-")
    
    brand = Brand(**data.dict())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


# ==================== PRODUCTS ENDPOINTS ====================

@app.get("/api/products")
async def get_products(
    page: int = 1,
    limit: int = 20,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if brand_id:
        query = query.filter(Product.brand_id == brand_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "items": products,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/products/{product_id}")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    return product

@app.post("/api/products")
async def create_product(data: ProductSchema, db: Session = Depends(get_db),
                        current_user: User = Depends(require_manager)):
    if not data.slug:
        data.slug = data.name.lower().replace(" ", "-")[:200]
    
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(status_code=400, detail="Артикул вже існує")
    
    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@app.put("/api/products/{product_id}")
async def update_product(product_id: int, data: ProductSchema, db: Session = Depends(get_db),
                        current_user: User = Depends(require_manager)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    product.updated_at = datetime.utcnow()
    db.commit()
    return product

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    db.delete(product)
    db.commit()
    return {"message": "Товар видалено"}

@app.post("/api/products/{product_id}/upload-image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    # Save file
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"uploads/products/{filename}"
    os.makedirs("uploads/products", exist_ok=True)
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update product
    if not product.main_image:
        product.main_image = filepath
    else:
        images = product.images or []
        images.append(filepath)
        product.images = images
    
    db.commit()
    return {"url": filepath}


# ==================== CUSTOMERS ENDPOINTS ====================

@app.get("/api/customers")
async def get_customers(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    query = db.query(Customer)
    
    if search:
        query = query.filter(
            (Customer.full_name.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%")) |
            (Customer.company_name.ilike(f"%{search}%"))
        )
    
    total = query.count()
    customers = query.order_by(desc(Customer.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    return {"items": customers, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@app.post("/api/customers")
async def create_customer(data: CustomerSchema, db: Session = Depends(get_db),
                         current_user: User = Depends(require_manager)):
    customer = Customer(**data.dict())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@app.put("/api/customers/{customer_id}")
async def update_customer(customer_id: int, data: CustomerSchema, db: Session = Depends(get_db),
                         current_user: User = Depends(require_manager)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Клієнта не знайдено")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(customer, key, value)
    
    db.commit()
    return customer


# ==================== LEADS (CRM FUNNEL) ENDPOINTS ====================

@app.get("/api/leads")
async def get_leads(
    status: Optional[LeadStatus] = None,
    manager_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    query = db.query(Lead)
    
    if status:
        query = query.filter(Lead.status == status)
    if manager_id:
        query = query.filter(Lead.manager_id == manager_id)
    
    leads = query.order_by(desc(Lead.created_at)).all()
    return leads

@app.get("/api/leads/funnel")
async def get_leads_funnel(db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    """Отримати ліди згруповані по статусах для воронки"""
    result = {}
    for status in LeadStatus:
        leads = db.query(Lead).filter(Lead.status == status).order_by(desc(Lead.created_at)).all()
        result[status.value] = {
            "count": len(leads),
            "total_value": sum(l.estimated_value for l in leads),
            "items": leads
        }
    return result


# ==================== PUBLIC PARTNER APPLICATION ====================

class PartnerApplicationSchema(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: str
    city: Optional[str] = None
    business_type: Optional[str] = None
    categories: List[str] = []
    message: Optional[str] = None

@app.post("/api/partner-application")
async def create_partner_application(data: PartnerApplicationSchema, db: Session = Depends(get_db)):
    """Публічний endpoint для заявок партнерів (без авторизації)"""
    # Створюємо лід з даних заявки
    categories_str = ", ".join(data.categories) if data.categories else ""
    description = f"Тип бізнесу: {data.business_type or '-'}\nКатегорії: {categories_str}\nПовідомлення: {data.message or '-'}"
    
    lead = Lead(
        name=data.contact_name,
        email=data.email,
        phone=data.phone,
        company=data.company_name,
        title=f"Заявка партнера: {data.company_name}",
        description=description,
        source=LeadSource.WEBSITE,
        status=LeadStatus.NEW,
        estimated_value=0,
        probability=30
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    return {"success": True, "message": "Заявку успішно надіслано", "id": lead.id}


@app.post("/api/leads")
async def create_lead(data: LeadSchema, db: Session = Depends(get_db),
                     current_user: User = Depends(require_manager)):
    lead = Lead(**data.dict())
    if not lead.manager_id:
        lead.manager_id = current_user.id
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@app.put("/api/leads/{lead_id}")
async def update_lead(lead_id: int, data: LeadSchema, db: Session = Depends(get_db),
                     current_user: User = Depends(require_manager)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Лід не знайдено")
    
    old_status = lead.status
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(lead, key, value)
    
    # Record status change
    if lead.status in [LeadStatus.WON, LeadStatus.LOST] and old_status != lead.status:
        lead.closed_at = datetime.utcnow()
    
    db.commit()
    return lead

@app.post("/api/leads/{lead_id}/activity")
async def add_lead_activity(lead_id: int, activity_type: str = Form(...), 
                           description: str = Form(...), db: Session = Depends(get_db),
                           current_user: User = Depends(require_manager)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Лід не знайдено")
    
    activity = LeadActivity(
        lead_id=lead_id,
        user_id=current_user.id,
        activity_type=activity_type,
        description=description
    )
    db.add(activity)
    db.commit()
    return {"message": "Активність додано"}


# ==================== ORDERS ENDPOINTS ====================

@app.get("/api/orders")
async def get_orders(
    status: Optional[OrderStatus] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    query = db.query(Order)
    
    if status:
        query = query.filter(Order.status == status)
    
    total = query.count()
    orders = query.order_by(desc(Order.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    return {"items": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@app.get("/api/orders/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(require_manager)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    return order

@app.post("/api/orders")
async def create_order(data: OrderSchema, db: Session = Depends(get_db)):
    # Generate order number
    today = datetime.now().strftime("%Y%m%d")
    count = db.query(Order).filter(Order.order_number.like(f"ORD-{today}%")).count()
    order_number = f"ORD-{today}-{count + 1:04d}"
    
    # Calculate totals
    subtotal = 0
    order_items = []
    
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Товар {item_data['product_id']} не знайдено")
        
        item_total = product.price * item_data["quantity"]
        subtotal += item_total
        
        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            product_sku=product.sku,
            quantity=item_data["quantity"],
            price=product.price,
            total=item_total
        ))
    
    order = Order(
        order_number=order_number,
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_phone=data.customer_phone,
        delivery_method=data.delivery_method,
        delivery_address=data.delivery_address,
        delivery_city=data.delivery_city,
        payment_method=data.payment_method,
        customer_notes=data.customer_notes,
        subtotal=subtotal,
        total=subtotal
    )
    
    db.add(order)
    db.flush()
    
    for item in order_items:
        item.order_id = order.id
        db.add(item)
    
    db.commit()
    db.refresh(order)
    return order

@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: int, status: OrderStatus, db: Session = Depends(get_db),
                             current_user: User = Depends(require_manager)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    order.status = status
    
    if status == OrderStatus.SHIPPED:
        order.shipped_at = datetime.utcnow()
    elif status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.utcnow()
    
    db.commit()
    return order


# ==================== ANALYTICS ENDPOINTS ====================

@app.get("/api/analytics/dashboard")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(require_manager)):
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)
    
    # Orders stats
    orders_today = db.query(Order).filter(func.date(Order.created_at) == today).count()
    orders_month = db.query(Order).filter(Order.created_at >= month_start).count()
    revenue_month = db.query(func.sum(Order.total)).filter(Order.created_at >= month_start).scalar() or 0
    
    # Leads stats
    leads_new = db.query(Lead).filter(Lead.status == LeadStatus.NEW).count()
    leads_month = db.query(Lead).filter(Lead.created_at >= month_start).count()
    leads_won = db.query(Lead).filter(Lead.status == LeadStatus.WON, Lead.closed_at >= month_start).count()
    
    # Products stats
    products_total = db.query(Product).filter(Product.is_active == True).count()
    low_stock = db.query(Product).filter(Product.stock_quantity < Product.min_stock_level).count()
    
    # Customers
    customers_total = db.query(Customer).count()
    customers_month = db.query(Customer).filter(Customer.created_at >= month_start).count()
    
    # Recent orders
    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(5).all()
    
    # Top products
    top_products = db.query(Product).order_by(desc(Product.sales_count)).limit(5).all()
    
    return {
        "orders": {
            "today": orders_today,
            "month": orders_month,
            "revenue_month": revenue_month
        },
        "leads": {
            "new": leads_new,
            "month": leads_month,
            "won_month": leads_won,
            "conversion": round((leads_won / leads_month * 100) if leads_month > 0 else 0, 1)
        },
        "products": {
            "total": products_total,
            "low_stock": low_stock
        },
        "customers": {
            "total": customers_total,
            "new_month": customers_month
        },
        "recent_orders": [{"id": o.id, "number": o.order_number, "total": o.total, 
                         "status": o.status.value, "customer": o.customer_name} for o in recent_orders],
        "top_products": [{"id": p.id, "name": p.name, "sales": p.sales_count, "price": p.price} for p in top_products]
    }

@app.get("/api/analytics/sales")
async def get_sales_analytics(days: int = 30, db: Session = Depends(get_db),
                             current_user: User = Depends(require_manager)):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily sales
    daily_sales = db.query(
        func.date(Order.created_at).label("date"),
        func.count(Order.id).label("orders"),
        func.sum(Order.total).label("revenue")
    ).filter(Order.created_at >= start_date).group_by(func.date(Order.created_at)).all()
    
    return [{
        "date": str(day.date),
        "orders": day.orders,
        "revenue": day.revenue or 0
    } for day in daily_sales]


# ==================== AI ENDPOINTS ====================

@app.post("/api/ai/generate-description")
async def generate_product_description(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Генерація опису товару за допомогою AI"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    if not settings.OPENAI_API_KEY:
        # Demo response if no API key
        description = f"""
        {product.name} - це професійне рішення для систем безпеки від компанії Енергія.
        
        Основні характеристики:
        - Висока надійність та якість збірки
        - Простота встановлення та налаштування
        - Сучасний дизайн
        - Гарантія від виробника
        
        Ідеально підходить для приватних будинків, квартир та офісних приміщень.
        """
        product.description_ai = description.strip()
        db.commit()
        return {"description": description.strip()}
    
    # Real OpenAI integration
    import openai
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""Створи професійний опис товару для інтернет-магазину систем безпеки.
    
    Назва: {product.name}
    Категорія: {product.category.name if product.category else 'Загальна'}
    Бренд: {product.brand.name if product.brand else 'ENERGIA'}
    Ціна: {product.price} грн
    Характеристики: {json.dumps(product.specifications, ensure_ascii=False) if product.specifications else 'Не вказано'}
    
    Опис має бути:
    - Українською мовою
    - SEO-оптимізованим
    - Містити переваги та особливості
    - 150-300 слів
    """
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )
    
    description = response.choices[0].message.content
    product.description_ai = description
    db.commit()
    
    return {"description": description}

@app.post("/api/ai/chat")
async def ai_chat(message: ChatMessageSchema, db: Session = Depends(get_db)):
    """AI чат-бот для підтримки клієнтів"""
    
    # Save user message
    user_msg = ChatMessage(
        session_id=message.session_id,
        role="user",
        content=message.content,
        customer_id=message.customer_id
    )
    db.add(user_msg)
    
    # Get chat history
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == message.session_id
    ).order_by(ChatMessage.created_at).limit(10).all()
    
    # Search for relevant products
    search_terms = message.content.lower().split()
    relevant_products = []
    for term in search_terms:
        if len(term) > 3:
            products = db.query(Product).filter(
                Product.name.ilike(f"%{term}%"),
                Product.is_active == True
            ).limit(3).all()
            relevant_products.extend(products)
    
    # Generate response
    if not settings.OPENAI_API_KEY:
        # Demo response
        if any(word in message.content.lower() for word in ["ціна", "вартість", "коштує"]):
            response_text = "Ціни на наші товари ви можете переглянути в каталозі на сайті. Для оптових покупців діють спеціальні умови - зверніться до менеджера."
        elif any(word in message.content.lower() for word in ["доставка", "доставляєте"]):
            response_text = "Ми доставляємо по всій Україні через Нову Пошту та Укрпошту. Безкоштовна доставка при замовленні від 2000 грн."
        elif any(word in message.content.lower() for word in ["гарантія", "гарантійний"]):
            response_text = "На всі товари надається офіційна гарантія від 12 до 60 місяців залежно від виробника."
        elif any(word in message.content.lower() for word in ["домофон", "відеодомофон"]):
            response_text = "У нас великий вибір домофонів від 1500 до 15000 грн. Популярні моделі: ENERGIA Classic, ENERGIA HD-700 Pro, Slinex SM-07MN. Яка діагональ екрану вас цікавить?"
        else:
            response_text = "Дякую за звернення! Чим можу допомогти? Я можу розповісти про наші товари, доставку, гарантію або з'єднати вас з менеджером."
    else:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_prompt = """Ти - консультант інтернет-магазину 'Енергія', який продає системи безпеки: домофони, відеоспостереження, контроль доступу.
        Відповідай українською, коротко і по суті. Будь ввічливим і професійним.
        Якщо питання не стосується товарів - ввічливо направ до менеджера."""
        
        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": message.content})
        
        if relevant_products:
            products_info = "\n".join([f"- {p.name}: {p.price} грн" for p in relevant_products[:3]])
            messages.append({"role": "system", "content": f"Знайдені товари:\n{products_info}"})
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=300
        )
        response_text = response.choices[0].message.content
    
    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=message.session_id,
        role="assistant",
        content=response_text,
        product_ids=[p.id for p in relevant_products[:3]] if relevant_products else []
    )
    db.add(assistant_msg)
    db.commit()
    
    return {
        "response": response_text,
        "products": [{"id": p.id, "name": p.name, "price": p.price} for p in relevant_products[:3]]
    }

@app.get("/api/ai/recommendations/{customer_id}")
async def get_product_recommendations(customer_id: int, db: Session = Depends(get_db)):
    """Рекомендації товарів для клієнта на основі історії покупок"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Клієнта не знайдено")
    
    # Get customer's order history
    orders = db.query(Order).filter(Order.customer_id == customer_id).all()
    purchased_product_ids = set()
    purchased_category_ids = set()
    
    for order in orders:
        for item in order.items:
            purchased_product_ids.add(item.product_id)
            if item.product.category_id:
                purchased_category_ids.add(item.product.category_id)
    
    # Recommend products from same categories but not yet purchased
    recommendations = db.query(Product).filter(
        Product.category_id.in_(purchased_category_ids) if purchased_category_ids else True,
        Product.id.notin_(purchased_product_ids) if purchased_product_ids else True,
        Product.is_active == True
    ).order_by(desc(Product.sales_count)).limit(6).all()
    
    # If not enough, add popular products
    if len(recommendations) < 6:
        popular = db.query(Product).filter(
            Product.id.notin_([r.id for r in recommendations]),
            Product.is_active == True
        ).order_by(desc(Product.sales_count)).limit(6 - len(recommendations)).all()
        recommendations.extend(popular)
    
    return [{"id": p.id, "name": p.name, "price": p.price, "main_image": p.main_image} for p in recommendations]


# ==================== SITE CONTENT EDITOR ====================

def _apply_site_keys_to_html(html_text: str, items: List[SiteContentItem]):
    updated_text = html_text
    per_key_matches = {}

    for item in items:
        key = item.key.strip()
        if not key:
            continue

        safe_value = escape(item.value or "", quote=False)
        pattern = re.compile(
            rf'(<(?P<tag>[a-zA-Z0-9]+)\b[^>]*\bdata-site-key="{re.escape(key)}"[^>]*>)(.*?)(</(?P=tag)>)',
            re.DOTALL,
        )

        updated_text, count = pattern.subn(lambda m: f"{m.group(1)}{safe_value}{m.group(4)}", updated_text)
        per_key_matches[key] = per_key_matches.get(key, 0) + count

    return updated_text, per_key_matches


@app.post("/api/site-content/apply")
async def apply_site_content(payload: SiteContentApplyRequest):
    project_root = Path(__file__).resolve().parent.parent

    editable_files = [project_root / "nrg-index.html"]
    editable_files.extend(sorted((project_root / "pages").glob("*.html")))

    processed_files = 0
    changed_files = 0
    total_replacements = 0
    key_hits = {}

    for file_path in editable_files:
        if not file_path.exists():
            continue

        processed_files += 1
        original = file_path.read_text(encoding="utf-8")
        updated, matches = _apply_site_keys_to_html(original, payload.items)

        for key, hits in matches.items():
            key_hits[key] = key_hits.get(key, 0) + hits
            total_replacements += hits

        if updated != original:
            file_path.write_text(updated, encoding="utf-8")
            changed_files += 1

    missing_keys = [item.key for item in payload.items if key_hits.get(item.key, 0) == 0]

    return {
        "ok": True,
        "processed_files": processed_files,
        "changed_files": changed_files,
        "total_replacements": total_replacements,
        "key_hits": key_hits,
        "missing_keys": missing_keys,
    }


# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    init_db()
    
    # Create demo data if empty
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            categories = [
                Category(name="Домофони", slug="domophones", icon="fa-door-open", sort_order=1),
                Category(name="Відеоспостереження", slug="video", icon="fa-video", sort_order=2),
                Category(name="Контроль доступу", slug="access", icon="fa-key", sort_order=3),
                Category(name="Інтеркоми", slug="intercom", icon="fa-building", sort_order=4),
                Category(name="Електрозамки", slug="locks", icon="fa-lock", sort_order=5),
                Category(name="Аксесуари", slug="accessories", icon="fa-tools", sort_order=6),
            ]
            db.add_all(categories)
            
            brands = [
                Brand(name="ENERGIA", slug="energia"),
                Brand(name="Hikvision", slug="hikvision"),
                Brand(name="Dahua", slug="dahua"),
                Brand(name="Slinex", slug="slinex"),
                Brand(name="Arny", slug="arny"),
            ]
            db.add_all(brands)
            db.commit()
            
            # Add demo products
            products = [
                Product(sku="ENR-HD700", name="Відеодомофон ENERGIA HD-700 Pro 7\"", slug="energia-hd-700-pro",
                       price=4599, category_id=1, brand_id=1, stock_quantity=25, is_new=True,
                       description="Професійний відеодомофон з 7-дюймовим IPS екраном"),
                Product(sku="ENR-CL7", name="Відеодомофон ENERGIA Classic 7\"", slug="energia-classic-7",
                       price=2999, category_id=1, brand_id=1, stock_quantity=50, is_hit=True),
                Product(sku="ENR-LT43", name="Відеодомофон ENERGIA Lite 4.3\"", slug="energia-lite-43",
                       price=1899, price_old=2499, category_id=1, brand_id=1, stock_quantity=30, is_sale=True),
                Product(sku="HIK-CAM4K", name="IP-камера Hikvision Pro 4K", slug="hikvision-pro-4k",
                       price=3299, category_id=2, brand_id=2, stock_quantity=15, is_new=True),
                Product(sku="DAH-NVR8", name="Відеореєстратор Dahua 8 каналів", slug="dahua-nvr-8ch",
                       price=3999, price_old=5499, category_id=2, brand_id=3, stock_quantity=10, is_sale=True),
            ]
            db.add_all(products)
            db.commit()
            
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
