# Thư mục Logo & Branding

Đây là nơi chứa tất cả file logo và hình ảnh thương hiệu.
Thay thế file tại đây để cập nhật logo toàn bộ hệ thống.

## Các file logo

| File | Kích thước khuyến nghị | Dùng ở đâu |
|---|---|---|
| `logo.png` | 200×200 px (1:1) | Sidebar, Login page |
| `logo-wide.png` | 400×120 px (wide) | Header, email, báo cáo |
| `favicon.png` | 32×32 px | Tab trình duyệt |

## Cách thay logo

### Bước 1 — Thay file ảnh
Đặt file logo mới vào thư mục này với đúng tên file:
- `logo.png` — logo chính (hình vuông hoặc tròn)
- `logo-wide.png` — logo nằm ngang (tùy chọn)
- `favicon.png` — icon tab (32×32)

### Bước 2 — Thay tên, màu sắc, tagline
Mở file: `apps/web/src/config/brand.ts`
Chỉnh các giá trị theo ý muốn, sau đó rebuild.

### Bước 3 — Rebuild
```bash
cd apps/web
npm run build
pm2 restart commerce-web
```

## Lưu ý
- Hỗ trợ định dạng: PNG, JPG, SVG, WebP
- Nếu không có file logo.png → hệ thống dùng emoji fallback tự động
- Không cần thay đổi code — chỉ cần thay file và rebuild
