'use client';
import { useEffect, useState } from 'react';
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [token, loading, router]);

  // Close sidebar on route change
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
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

          {/* Logo — mobile right side */}
          <div className="md:hidden ml-auto">
            <Logo variant="name" size={28} nameClass="text-indigo-600" />
          </div>

          {/* Desktop: breadcrumb or empty spacer */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">AI Commerce OS</span>
            {pageTitle && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 font-medium">{pageTitle}</span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
