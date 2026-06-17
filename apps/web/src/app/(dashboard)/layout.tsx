'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Logo from '@/components/Logo';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Sản phẩm',
  '/orders': 'Đơn hàng',
  '/customers': 'Khách hàng',
  '/leads': 'Leads',
  '/categories': 'Danh mục',
  '/brands': 'Thương hiệu',
  '/inventory': 'Tồn kho',
  '/payments': 'Thanh toán',
  '/campaigns': 'Chiến dịch',
  '/agents': 'AI Agents',
  '/analytics': 'Phân tích',
  '/users': 'Người dùng',
};

const fmtTime = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return date.toLocaleDateString('vi-VN');
};

function NotificationBell({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/orders/notifications/admin?limit=15', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread || 0);
      setItems(data.items || []);
    } catch { /* ignore */ }
  };

  const markRead = async () => {
    if (!unread) return;
    try {
      await fetch('/api/orders/notifications/admin/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(0);
    } catch { /* ignore */ }
  };

  // Poll every 30s
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open) {
      load();
      markRead();
    }
    setOpen(v => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        title="Thông báo"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Thông báo</span>
            {items.length > 0 && (
              <a href="/orders" className="text-xs text-indigo-600 hover:underline">Xem đơn hàng →</a>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Chưa có thông báo nào
              </div>
            ) : (
              items.map(n => (
                <a
                  key={n.id}
                  href={n.meta?.orderId ? `/orders` : '#'}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-none text-sm">
                      🛒
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                      {n.meta?.phone && (
                        <div className="text-xs text-gray-400 mt-1">📞 {n.meta.phone}</div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-none mt-0.5">{fmtTime(n.createdAt)}</span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [token, loading, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <p className="text-gray-500 text-sm">Đang tải hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] || '';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Mở menu"
          >
            <div className="space-y-1">
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
            </div>
          </button>

          {/* Page title — mobile */}
          <h1 className="md:hidden text-sm font-semibold text-gray-800 truncate">{pageTitle}</h1>

          {/* Logo — mobile */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <NotificationBell token={token} />
            <Logo variant="name" size={28} nameClass="text-indigo-600" />
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 flex-1">
            <span className="text-gray-400">AI Commerce OS</span>
            {pageTitle && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 font-medium">{pageTitle}</span>
              </>
            )}
          </div>

          {/* Desktop: notification bell */}
          <div className="hidden md:block">
            <NotificationBell token={token} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
