# 🌐 NRG-UA Energy - GitHub Pages

Цей проект налаштовано для автоматичного деплою на GitHub Pages.

## 🚀 Як опублікувати на GitHub Pages

### Крок 1: Створіть репозиторій на GitHub
1. Перейдіть на https://github.com
2. Натисніть "New repository"
3. Назва: `nrg-ua-energy` (або будь-яка інша)
4. Public або Private (для GitHub Pages краще Public)
5. НЕ створюйте README, .gitignore (вони вже є)
6. Натисніть "Create repository"

### Крок 2: Завантажте код на GitHub

Відкрийте термінал (PowerShell) в папці проекту і виконайте:

```powershell
# Ініціалізувати Git (якщо ще не зроблено)
git init

# Додати всі файли
git add .

# Зробити перший коміт
git commit -m "Initial commit - NRG-UA Energy project"

# Додати віддалений репозиторій (замініть YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/nrg-ua-energy.git

# Завантажити на GitHub
git branch -M main
git push -u origin main
```

### Крок 3: Налаштуйте GitHub Pages

1. Перейдіть у ваш репозиторій на GitHub
2. Натисніть "Settings" (Налаштування)
3. У лівому меню оберіть "Pages"
4. У розділі "Build and deployment":
   - Source: "GitHub Actions" (рекомендовано)
   - АБО Source: "Deploy from a branch" → Branch: "main" → Folder: "/ (root)"
5. Натисніть "Save"

### Крок 4: Дочекайтесь деплою

- Перейдіть на вкладку "Actions" у вашому репозиторії
- Дочекайтесь завершення workflow "Deploy to GitHub Pages" (зелена галочка ✓)
- Після успішного деплою сайт буде доступний за адресою:

```
https://YOUR_USERNAME.github.io/nrg-ua-energy/nrg-index.html
```

## 📋 Альтернативний метод (без GitHub Actions)

Якщо використовуєте "Deploy from a branch":

1. Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`
4. Folder: `/ (root)`
5. Save
6. Сайт буде доступний через кілька хвилин

## 🔗 Посилання на ваш сайт

Після деплою:
- **Головна сторінка**: `https://YOUR_USERNAME.github.io/nrg-ua-energy/nrg-index.html`
- **Про нас**: `https://YOUR_USERNAME.github.io/nrg-ua-energy/pages/nrg-about.html`
- **Каталог**: `https://YOUR_USERNAME.github.io/nrg-ua-energy/pages/nrg-catalog.html`

## ⚙️ Автоматичний деплой

Файл `.github/workflows/deploy.yml` налаштовано для автоматичного деплою:
- При кожному push в main/master
- Можна запустити вручну через вкладку "Actions"

## 📝 Оновлення сайту

Після зміни коду локально:

```powershell
git add .
git commit -m "Опис змін"
git push
```

Сайт автоматично оновиться на GitHub Pages!

## 🎯 Кастомний домен (опціонально)

Якщо є власний домен:
1. Settings → Pages → Custom domain
2. Введіть ваш домен (наприклад: `nrg-energy.com`)
3. Налаштуйте DNS записи у вашого реєстратора доменів

## ⚠️ Важливо

- `.nojekyll` файл вимкнено обробку Jekyll (щоб працювали всі файли)
- Репозиторій має бути **Public** для безкоштовного GitHub Pages
- Backend (Python/FastAPI) НЕ працюватиме на GitHub Pages (тільки статичні файли)
- Для Backend потрібен окремий хостинг (Heroku, Railway, Render тощо)

## 🔧 Troubleshooting

**Проблема**: Сайт не відображається
- Перевірте що деплой завершився успішно (Actions → зелена галочка)
- Відкрийте правильну URL з `/nrg-index.html` в кінці
- Почекайте 2-5 хвилин після першого деплою

**Проблема**: 404 помилка
- Перевірте що файл існує в репозиторії
- GitHub Pages чутливий до регістру (file.html ≠ File.html)

**Проблема**: CSS/JS не завантажуються
- Перевірте шляхи до файлів (мають бути відносними)
- Видаліть `.github/workflows/deploy.yml` і використайте "Deploy from branch"

## 📞 Підтримка

Після деплою на GitHub Pages, поділіться посиланням:
- `https://YOUR_USERNAME.github.io/nrg-ua-energy/nrg-index.html`

---

**Готово!** Ваш проект тепер може бути опублікований на GitHub Pages! 🎉
