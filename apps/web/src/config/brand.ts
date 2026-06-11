/**
 * ============================================================
 *  BRANDING CONFIG — thay đổi tất cả ở đây
 *  Sau khi chỉnh xong: npm run build && pm2 restart commerce-web
 * ============================================================
 */

const brand = {
  // Tên hiển thị trên toàn bộ app
  name: 'AI Commerce OS',

  // Dòng phụ (hiển thị dưới tên)
  tagline: 'V3 · 16 AI Agents · Multi-channel',

  // Phiên bản
  version: 'V3',

  // Emoji fallback (dùng khi không có file logo.png)
  emoji: '🚀',

  // Đường dẫn logo (đặt file vào public/brand/)
  // Để null nếu muốn dùng emoji thay logo ảnh
  logoImage: null as string | null,
  // Ví dụ nếu đã có file: logoImage: '/brand/logo.png',

  // Logo nằm ngang (dùng trong header rộng, email...)
  logoWide: null as string | null,
  // Ví dụ: logoWide: '/brand/logo-wide.png',

  // Màu chủ đạo (Tailwind class)
  // Thay 'indigo' → 'blue' | 'violet' | 'emerald' | 'rose' | 'orange' ...
  primaryColor: 'indigo' as
    | 'indigo'
    | 'blue'
    | 'violet'
    | 'emerald'
    | 'rose'
    | 'orange'
    | 'teal',

  // Màu sidebar (Tailwind background class)
  sidebarBg: 'bg-gray-900',

  // Copyright
  copyright: `© ${new Date().getFullYear()} AI Commerce OS`,
};

export default brand;

// Màu primary dạng hex (dùng cho inline style nếu cần)
export const PRIMARY_HEX: Record<typeof brand.primaryColor, string> = {
  indigo: '#4f46e5',
  blue: '#2563eb',
  violet: '#7c3aed',
  emerald: '#059669',
  rose: '#e11d48',
  orange: '#ea580c',
  teal: '#0d9488',
};
