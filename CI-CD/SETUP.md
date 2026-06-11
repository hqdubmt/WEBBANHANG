# CI/CD Setup Guide

## Bước 1 — Init Git repo & push lên GitHub

```bash
cd /home/hqdu/quangdu/webbanhang
git init
git add -A
git commit -m "feat: init AI Commerce project"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

---

## Bước 2 — Cài GitHub Actions Runner trên VPS

```bash
bash CI-CD/setup-runner.sh
```

Sau đó vào **GitHub repo > Settings > Actions > Runners > New self-hosted runner**
copy lệnh `./config.sh ...` và chạy trên VPS.

---

## Bước 3 — Thêm Secrets vào GitHub

Vào **GitHub repo > Settings > Secrets and variables > Actions > New repository secret**

| Secret name          | Giá trị                                      |
|----------------------|----------------------------------------------|
| `PROD_ENV`           | Toàn bộ nội dung file `.env` của bạn         |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram (tuỳ chọn)                |
| `TELEGRAM_CHAT_ID`   | Chat ID nhận thông báo (tuỳ chọn)            |

### Lấy Telegram Chat ID:
```bash
# Gửi tin nhắn cho bot trước, rồi chạy:
curl https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
# Tìm "id" trong "chat" object
```

---

## Bước 4 — Trigger deploy

Mỗi lần push code lên nhánh `main` → workflow tự chạy:

```bash
git add -A
git commit -m "feat: ..."
git push origin main
```

Hoặc chạy thủ công: **GitHub repo > Actions > Deploy AI Commerce > Run workflow**

---

## Workflow làm gì?

```
push main
   │
   ▼
[VPS Runner]
   ├─ git pull (lấy code mới)
   ├─ tạo .env từ secret
   ├─ npm ci + build API (NestJS → dist/)
   ├─ npm ci + build Web (Next.js → .next/)
   ├─ pm2 restart commerce-api
   ├─ pm2 restart commerce-web
   └─ health check
   │
   ▼
[Telegram] ✅ Deploy thành công!
```
