# ===================================================================
# Автоматична установка Python та налаштування середовища
# ===================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Кольори для виводу
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   NRG-UA Energy - Автоматичне налаштування середовища     " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Потрібна версія Python
$REQUIRED_PYTHON_VERSION = "3.11.0"
$REQUIRED_PYTHON_MAJOR_MINOR = "3.11"

# ===================================================================
# Функція для перевірки версії Python
# ===================================================================
function Test-PythonVersion {
    try {
        $pythonVersion = & python --version 2>&1
        if ($pythonVersion -match "Python (\d+\.\d+\.\d+)") {
            $version = $matches[1]
            Write-Host "✓ Знайдено Python $version" -ForegroundColor Green
            
            # Перевіряємо чи версія підходить (3.11.x або 3.12.x)
            if ($version -match "^3\.1[12]\.") {
                return $true
            } else {
                Write-Host "⚠ Потрібна версія Python 3.11.x або 3.12.x, а встановлена $version" -ForegroundColor Yellow
                return $false
            }
        }
    } catch {
        Write-Host "✗ Python не знайдено" -ForegroundColor Red
        return $false
    }
    return $false
}

# ===================================================================
# Функція для установки Python через winget
# ===================================================================
function Install-PythonWithWinget {
    Write-Host ""
    Write-Host "Встановлюю Python $REQUIRED_PYTHON_MAJOR_MINOR через winget..." -ForegroundColor Cyan
    
    try {
        # Перевіряємо чи є winget
        $null = Get-Command winget -ErrorAction Stop
        
        # Встановлюємо Python
        Write-Host "Виконую: winget install Python.Python.$REQUIRED_PYTHON_MAJOR_MINOR --silent --accept-package-agreements --accept-source-agreements" -ForegroundColor Gray
        winget install "Python.Python.$REQUIRED_PYTHON_MAJOR_MINOR" --silent --accept-package-agreements --accept-source-agreements
        
        # Оновлюємо PATH для поточної сесії
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✓ Python встановлено!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Не вдалось встановити через winget: $_" -ForegroundColor Red
        return $false
    }
}

# ===================================================================
# Функція для завантаження та установки Python вручну
# ===================================================================
function Install-PythonManually {
    Write-Host ""
    Write-Host "Завантажую Python $REQUIRED_PYTHON_VERSION з офіційного сайту..." -ForegroundColor Cyan
    
    $installerPath = "$env:TEMP\python-$REQUIRED_PYTHON_VERSION-installer.exe"
    $downloadUrl = "https://www.python.org/ftp/python/$REQUIRED_PYTHON_VERSION/python-$REQUIRED_PYTHON_VERSION-amd64.exe"
    
    try {
        # Завантажуємо інсталятор
        Write-Host "Завантажую з $downloadUrl..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        # Запускаємо інсталятор
        Write-Host "Встановлюю Python (це може зайняти декілька хвилин)..." -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
        
        # Оновлюємо PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Видаляємо інсталятор
        Remove-Item $installerPath -Force
        
        Write-Host "✓ Python встановлено!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Помилка встановлення: $_" -ForegroundColor Red
        return $false
    }
}

# ===================================================================
# Головна логіка
# ===================================================================

# Крок 1: Перевіряємо наявність Python
Write-Host "Перевірка Python..." -ForegroundColor Yellow

if (Test-PythonVersion) {
    Write-Host "✓ Python вже встановлений і версія підходить" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Python потрібної версії не знайдено. Розпочинаю автоматичну установку..." -ForegroundColor Yellow
    
    # Пробуємо встановити через winget
    $installed = Install-PythonWithWinget
    
    # Якщо не вдалось через winget, пробуємо завантажити вручну
    if (-not $installed) {
        Write-Host ""
        Write-Host "Спробую завантажити та встановити Python вручну..." -ForegroundColor Yellow
        $installed = Install-PythonManually
    }
    
    if (-not $installed) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host "  ПОМИЛКА: Не вдалось автоматично встановити Python" -ForegroundColor Red
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        Write-Host "Будь ласка, встановіть Python вручну:" -ForegroundColor Yellow
        Write-Host "1. Відкрийте https://www.python.org/downloads/" -ForegroundColor White
        Write-Host "2. Завантажте Python $REQUIRED_PYTHON_MAJOR_MINOR" -ForegroundColor White
        Write-Host "3. Під час встановлення поставте галочку 'Add Python to PATH'" -ForegroundColor White
        Write-Host ""
        pause
        exit 1
    }
    
    # Перевіряємо ще раз після установки
    Start-Sleep -Seconds 2
    if (-not (Test-PythonVersion)) {
        Write-Host "⚠ Python встановлено, але потрібно перезапустити термінал" -ForegroundColor Yellow
        Write-Host "Будь ласка, закрийте це вікно та запустіть скрипт знову" -ForegroundColor Yellow
        pause
        exit 0
    }
}

# Крок 2: Створюємо віртуальне середовище
Write-Host ""
Write-Host "Налаштовую віртуальне середовище..." -ForegroundColor Yellow

# Перевіряємо чи вже існує venv або .venv
$venvPath = $null
if (Test-Path ".\venv") {
    $venvPath = ".\venv"
    Write-Host "✓ Віртуальне середовище вже існує (venv)" -ForegroundColor Green
} elseif (Test-Path ".\.venv") {
    $venvPath = ".\.venv"
    Write-Host "✓ Віртуальне середовище вже існує (.venv)" -ForegroundColor Green
} else {
    # Створюємо нове віртуальне середовище
    $venvPath = ".\venv"
    Write-Host "Створюю віртуальне середовище (venv)..." -ForegroundColor Gray
    python -m venv venv
    Write-Host "✓ Віртуальне середовище створено" -ForegroundColor Green
}

# Крок 3: Активуємо віртуальне середовище та встановлюємо залежності
Write-Host ""
Write-Host "Встановлюю залежності..." -ForegroundColor Yellow

# Визначаємо шлях до activate
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"

# Активуємо venv
if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "⚠ Не знайдено скрипт активації" -ForegroundColor Yellow
}

# Визначаємо pip з віртуального середовища
$pipPath = Join-Path $venvPath "Scripts\pip.exe"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"

# Визначаємо pip з віртуального середовища
$pipPath = Join-Path $venvPath "Scripts\pip.exe"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"

# Оновлюємо pip
Write-Host "Оновлюю pip..." -ForegroundColor Gray
if (Test-Path $pythonPath) {
    & $pythonPath -m pip install --upgrade pip --quiet
} else {
    python -m pip install --upgrade pip --quiet
}

# Встановлюємо залежності з requirements.txt
if (Test-Path ".\backend\requirements.txt") {
    Write-Host "Встановлюю пакети з requirements.txt..." -ForegroundColor Gray
    if (Test-Path $pipPath) {
        & $pipPath install -r .\backend\requirements.txt --quiet
    } else {
        pip install -r .\backend\requirements.txt --quiet
    }
    Write-Host "✓ Залежності встановлено" -ForegroundColor Green
} else {
    Write-Host "⚠ Файл requirements.txt не знайдено" -ForegroundColor Yellow
}

# Крок 4: Завершення
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "           ✓ Середовище налаштовано успішно!              " -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Віртуальне середовище: $venvPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для запуску демо використовуйте:" -ForegroundColor Cyan
Write-Host "  START-DEMO.bat" -ForegroundColor White
Write-Host ""
Write-Host "Для запуску backend API:" -ForegroundColor Cyan
Write-Host "  $pythonPath -m uvicorn main:app --reload" -ForegroundColor White
Write-Host "  або:" -ForegroundColor Gray
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  ..\venv\Scripts\activate (або .venv)" -ForegroundColor White
Write-Host "  uvicorn main:app --reload" -ForegroundColor White
Write-Host ""
