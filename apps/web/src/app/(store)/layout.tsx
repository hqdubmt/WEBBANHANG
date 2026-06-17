'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface StoreConfig {
  name: string; emoji: string; hotline: string; email: string;
  address: string; workingHours: string; facebook: string;
  zalo: string; telegram: string; copyright: string;
}

function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
        setCount(cart.reduce((s: number, i: any) => s + (i.quantity || 0), 0));
      } catch { setCount(0); }
    };
    update();
    window.addEventListener('sf_cart_update', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('sf_cart_update', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return count;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const cartCount = useCartCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cfg, setCfg] = useState<StoreConfig | null>(null);

  useEffect(() => {
    fetch('/api/brand/config').then(r => r.json()).then(setCfg).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/store" className="text-xl font-bold text-indigo-600 tracking-tight">
            🛍️ Shop AI
          </Link>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/store" className="hover:text-indigo-600 transition-colors">Trang chủ</Link>
            <Link href="/store/san-pham" className="hover:text-indigo-600 transition-colors">Sản phẩm</Link>
            <Link href="/store/theo-doi-don" className="hover:text-indigo-600 transition-colors">Theo dõi đơn</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <form action="/store/san-pham" method="GET" className="hidden md:flex">
              <input
                name="search"
                placeholder="Tìm sản phẩm..."
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </form>

            {/* Cart */}
            <Link href="/store/gio-hang" className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.4 5H19M7 13l-1.4 5m0 0h11.4" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2 text-sm">
            <Link href="/store" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Trang chủ</Link>
            <Link href="/store/san-pham" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Sản phẩm</Link>
            <Link href="/store/theo-doi-don" className="block py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Theo dõi đơn</Link>
            <form action="/store/san-pham" method="GET" className="pt-1">
              <input name="search" placeholder="Tìm sản phẩm..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </form>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-600">
          <div>
            <div className="text-lg font-bold text-indigo-600 mb-3">
              {cfg?.emoji || '🛍️'} {cfg?.name || 'Shop AI'}
            </div>
            <p className="text-gray-500 leading-relaxed">Mua sắm thông minh, giao hàng nhanh, chất lượng đảm bảo.</p>
            {/* Social links */}
            {(cfg?.facebook || cfg?.zalo || cfg?.telegram) && (
              <div className="flex gap-3 mt-3">
                {cfg.facebook && (
                  <a href={cfg.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Facebook</a>
                )}
                {cfg.zalo && (
                  <a href={cfg.zalo.startsWith('http') ? cfg.zalo : `https://zalo.me/${cfg.zalo}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">Zalo</a>
                )}
                {cfg.telegram && (
                  <a href={cfg.telegram.startsWith('http') ? cfg.telegram : `https://t.me/${cfg.telegram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline text-xs">Telegram</a>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-3">Hỗ trợ</div>
            <ul className="space-y-2">
              <li><Link href="/store/theo-doi-don" className="hover:text-indigo-600">Theo dõi đơn hàng</Link></li>
              <li><Link href="/store/san-pham" className="hover:text-indigo-600">Tất cả sản phẩm</Link></li>
              <li><Link href="/store/gio-hang" className="hover:text-indigo-600">Giỏ hàng</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-3">Liên hệ</div>
            <ul className="space-y-2">
              {cfg?.hotline ? (
                <li>
                  <a href={`tel:${cfg.hotline.replace(/\s/g,'')}`} className="hover:text-indigo-600">
                    📞 {cfg.hotline}
                  </a>
                </li>
              ) : (
                <li className="text-gray-400">📞 Chưa cấu hình hotline</li>
              )}
              {cfg?.email ? (
                <li>
                  <a href={`mailto:${cfg.email}`} className="hover:text-indigo-600">📧 {cfg.email}</a>
                </li>
              ) : null}
              {cfg?.address && <li>📍 {cfg.address}</li>}
              <li>🕐 {cfg?.workingHours || '8:00 – 22:00 hàng ngày'}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 text-center text-xs text-gray-400 py-4">
          {cfg?.copyright || `© ${new Date().getFullYear()} ${cfg?.name || 'Shop AI'} — Powered by AI Commerce OS`}
        </div>
      </footer>
    </div>
  );
}
