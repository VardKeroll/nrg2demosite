"""
Telegram Bot інтеграція для NRG-UA
Bot: @NRGCATBOT

Цей модуль забезпечує:
1. Реєстрацію партнерів через Telegram
2. Авторизацію через Telegram
3. Сповіщення для партнерів
"""
import os
import hashlib
import hmac
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Telegram Bot Token (з .env або налаштувань)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = "@NRGCATBOT"

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


# ==================== SCHEMAS ====================

class TelegramAuthData(BaseModel):
    """Дані авторизації від Telegram Login Widget"""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class TelegramRegisterData(BaseModel):
    """Дані реєстрації нового партнера через Telegram"""
    telegram_id: str
    telegram_username: Optional[str] = None
    telegram_first_name: str
    telegram_last_name: Optional[str] = None
    phone: str
    company_name: str
    email: Optional[str] = None
    region_id: Optional[int] = None
    city: Optional[str] = None


class TelegramWebhookUpdate(BaseModel):
    """Оновлення від Telegram webhook"""
    update_id: int
    message: Optional[dict] = None
    callback_query: Optional[dict] = None


# ==================== HELPERS ====================

def verify_telegram_auth(data: TelegramAuthData) -> bool:
    """
    Перевірка підпису від Telegram Login Widget
    https://core.telegram.org/widgets/login#checking-authorization
    """
    if not TELEGRAM_BOT_TOKEN:
        # В demo режимі приймаємо всі запити
        return True
    
    # Перевіряємо чи не застарілі дані (не старіші 24 годин)
    if time.time() - data.auth_date > 86400:
        return False
    
    # Формуємо строку для перевірки
    check_dict = data.dict()
    check_hash = check_dict.pop('hash')
    
    check_arr = [f"{k}={v}" for k, v in sorted(check_dict.items()) if v is not None]
    check_string = "\n".join(check_arr)
    
    # Обчислюємо секретний ключ
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    
    # Перевіряємо хеш
    calculated_hash = hmac.new(
        secret_key,
        check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == check_hash


def generate_telegram_link(partner_id: int) -> str:
    """Генерує посилання для прив'язки Telegram"""
    # Параметр start з закодованим partner_id
    code = hashlib.md5(f"nrg_{partner_id}_{time.time()}".encode()).hexdigest()[:12]
    return f"https://t.me/{TELEGRAM_BOT_USERNAME.replace('@', '')}?start=link_{partner_id}_{code}"


# ==================== DEMO DATA ====================

demo_telegram_users = {}


# ==================== ENDPOINTS ====================

@router.post("/auth")
async def telegram_auth(data: TelegramAuthData):
    """
    Авторизація через Telegram Login Widget
    Використовується на сторінці входу кабінету
    """
    # Перевіряємо підпис
    if not verify_telegram_auth(data):
        raise HTTPException(status_code=401, detail="Невалідні дані авторизації Telegram")
    
    # Шукаємо партнера за telegram_id
    telegram_id = str(data.id)
    
    # В реальному коді тут пошук в базі
    # partner = db.query(Partner).join(TelegramUser).filter(TelegramUser.telegram_id == telegram_id).first()
    
    # Demo: перевіряємо чи є зареєстрований користувач
    if telegram_id in demo_telegram_users:
        user_data = demo_telegram_users[telegram_id]
        return {
            "success": True,
            "registered": True,
            "partner": user_data,
            "message": "Авторизація успішна"
        }
    
    # Користувач не знайдений - потрібна реєстрація
    return {
        "success": True,
        "registered": False,
        "telegram_data": {
            "id": telegram_id,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "username": data.username
        },
        "message": "Необхідна реєстрація"
    }


@router.post("/register")
async def telegram_register(data: TelegramRegisterData):
    """
    Реєстрація нового партнера через Telegram
    """
    # Перевіряємо чи телефон вже зареєстрований
    # В реальному коді перевірка в базі
    
    # Створюємо партнера
    new_partner = {
        "id": len(demo_telegram_users) + 1,
        "company_name": data.company_name,
        "contact_name": f"{data.telegram_first_name} {data.telegram_last_name or ''}".strip(),
        "phone": data.phone,
        "email": data.email,
        "city": data.city,
        "region_id": data.region_id,
        "telegram_id": data.telegram_id,
        "telegram_username": data.telegram_username,
        "status": "pending",  # Очікує підтвердження менеджера
        "created_at": datetime.utcnow().isoformat()
    }
    
    demo_telegram_users[data.telegram_id] = new_partner
    
    return {
        "success": True,
        "message": "Реєстрація успішна! Очікуйте підтвердження від менеджера.",
        "partner_id": new_partner["id"]
    }


@router.get("/link")
async def get_telegram_link(partner_id: int):
    """
    Отримати посилання для прив'язки Telegram до існуючого акаунту
    """
    link = generate_telegram_link(partner_id)
    return {
        "link": link,
        "bot_username": TELEGRAM_BOT_USERNAME,
        "instructions": "Відкрийте посилання та натисніть 'Start' в боті для прив'язки акаунту"
    }


@router.post("/webhook")
async def telegram_webhook(update: TelegramWebhookUpdate):
    """
    Webhook для отримання повідомлень від Telegram Bot
    Налаштовується через BotFather
    """
    if update.message:
        chat_id = update.message.get("chat", {}).get("id")
        text = update.message.get("text", "")
        contact = update.message.get("contact")
        
        # Обробка команди /start
        if text.startswith("/start"):
            # Перевіряємо чи є параметр прив'язки
            if "link_" in text:
                # Прив'язка до існуючого акаунту
                parts = text.split("_")
                if len(parts) >= 3:
                    partner_id = parts[1]
                    return {
                        "method": "sendMessage",
                        "chat_id": chat_id,
                        "text": f"✅ Ваш Telegram успішно прив'язано до акаунту партнера #{partner_id}!"
                    }
            
            # Звичайний старт - пропонуємо реєстрацію
            return {
                "method": "sendMessage",
                "chat_id": chat_id,
                "text": "👋 Вітаємо в NRG-UA Bot!\n\n"
                       "🔹 Для реєстрації як партнер, поділіться своїм контактом.\n"
                       "🔹 Якщо у вас вже є акаунт, увійдіть через наш сайт.",
                "reply_markup": {
                    "keyboard": [[{
                        "text": "📱 Поділитися контактом",
                        "request_contact": True
                    }]],
                    "resize_keyboard": True,
                    "one_time_keyboard": True
                }
            }
        
        # Обробка контакту
        if contact:
            phone = contact.get("phone_number", "")
            user_id = str(contact.get("user_id", ""))
            first_name = contact.get("first_name", "")
            
            # Зберігаємо телефон для подальшої реєстрації
            demo_telegram_users[f"pending_{user_id}"] = {
                "phone": phone,
                "telegram_id": user_id,
                "first_name": first_name
            }
            
            return {
                "method": "sendMessage",
                "chat_id": chat_id,
                "text": f"✅ Дякуємо!\n\n"
                       f"📱 Ваш номер: {phone}\n\n"
                       f"Тепер перейдіть на сайт для завершення реєстрації:\n"
                       f"https://nrg-ua.com/register?telegram_id={user_id}"
            }
    
    return {"ok": True}


@router.get("/verify-phone")
async def verify_telegram_phone(telegram_id: str = Query(...)):
    """
    Перевірка чи є підтверджений телефон від Telegram
    Використовується при реєстрації на сайті
    """
    pending_key = f"pending_{telegram_id}"
    
    if pending_key in demo_telegram_users:
        data = demo_telegram_users[pending_key]
        return {
            "verified": True,
            "phone": data.get("phone"),
            "telegram_id": telegram_id,
            "first_name": data.get("first_name")
        }
    
    return {
        "verified": False,
        "message": "Телефон не підтверджено через Telegram"
    }


# ==================== NOTIFICATION FUNCTIONS ====================

async def send_telegram_notification(telegram_id: str, message: str):
    """
    Відправити сповіщення партнеру в Telegram
    """
    # В реальному коді тут виклик Telegram API
    # https://api.telegram.org/bot{token}/sendMessage
    print(f"[Telegram] Sending to {telegram_id}: {message}")
    return True


async def notify_new_partner(partner_data: dict, manager_telegram_id: str = None):
    """
    Сповіщення менеджеру про нового партнера
    """
    message = (
        f"🆕 Новий партнер!\n\n"
        f"🏢 {partner_data.get('company_name')}\n"
        f"👤 {partner_data.get('contact_name')}\n"
        f"📱 {partner_data.get('phone')}\n"
        f"📍 {partner_data.get('city', '-')}\n\n"
        f"Статус: Очікує підтвердження"
    )
    
    if manager_telegram_id:
        await send_telegram_notification(manager_telegram_id, message)


async def notify_order_status(partner_telegram_id: str, order_number: str, status: str):
    """
    Сповіщення партнеру про зміну статусу замовлення
    """
    status_texts = {
        "confirmed": "✅ Підтверджено",
        "processing": "⚙️ В обробці",
        "shipped": "🚚 Відправлено",
        "delivered": "📦 Доставлено"
    }
    
    status_text = status_texts.get(status, status)
    message = f"📋 Замовлення {order_number}\n\nНовий статус: {status_text}"
    
    await send_telegram_notification(partner_telegram_id, message)
