"""
Енергія - Backend API
Основний конфігураційний файл
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./energia.db"
    
    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # OpenAI for AI features
    OPENAI_API_KEY: Optional[str] = None
    
    # 1C Integration
    ONE_C_URL: Optional[str] = None
    ONE_C_TOKEN: Optional[str] = None
    
    # App settings
    APP_NAME: str = "Енергія API"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
