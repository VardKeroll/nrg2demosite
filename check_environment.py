"""
Швидка перевірка що Python та середовище налаштовані правильно
"""
import sys
import platform

print("=" * 70)
print("NRG-UA Energy - Python Environment Check")
print("=" * 70)
print()

# Python версія
print(f"✓ Python версія: {sys.version}")
print(f"✓ Python шлях:   {sys.executable}")
print()

# Платформа
print(f"✓ ОС:            {platform.system()} {platform.release()}")
print(f"✓ Архітектура:   {platform.machine()}")
print()

# Перевірка залежностей
print("Перевірка встановлених пакетів:")
print("-" * 70)

required_packages = [
    'fastapi',
    'uvicorn',
    'sqlalchemy',
    'pydantic',
    'aiofiles',
    'httpx',
]

missing_packages = []

for package in required_packages:
    try:
        __import__(package)
        print(f"  ✓ {package:<20} - встановлено")
    except ImportError:
        print(f"  ✗ {package:<20} - НЕ ВСТАНОВЛЕНО")
        missing_packages.append(package)

print()
print("=" * 70)

if missing_packages:
    print("⚠ УВАГА: Деякі пакети не встановлені!")
    print(f"  Відсутні: {', '.join(missing_packages)}")
    print()
    print("  Запустіть SETUP.bat для встановлення залежностей")
    sys.exit(1)
else:
    print("✅ ВСЕ ПРАЦЮЄ! Середовище налаштовано правильно.")
    print()
    print("Для запуску проекту використовуйте:")
    print("  - START-DEMO.bat     (демо сайт)")
    print("  - START-BACKEND.bat  (backend API)")

print("=" * 70)
