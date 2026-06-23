'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/ai-board', label: 'AI Board', icon: '👔' },
  { href: '/business-os', label: 'Business OS', icon: '🧠' },
  { href: '/knowledge-brain', label: 'Knowledge Brain', icon: '💡' },
  { href: '/self-improvement', label: 'Self-Improvement', icon: '🔄' },
  // Core Commerce
  { href: '/products', label: 'Sản phẩm', icon: '📦' },
  { href: '/orders', label: 'Đơn hàng', icon: '🛒' },
  { href: '/customers', label: 'Khách hàng', icon: '👥' },
  { href: '/leads', label: 'Leads', icon: '🎯' },
  { href: '/categories', label: 'Danh mục', icon: '🗂' },
  { href: '/brands', label: 'Thương hiệu', icon: '🏷' },
  { href: '/inventory', label: 'Tồn kho', icon: '📋' },
  { href: '/payments', label: 'Thanh toán', icon: '💳' },
  { href: '/inbox', label: 'Inbox / Chat', icon: '💬' },
  { href: '/campaigns', label: 'Chiến dịch', icon: '📣' },
  { href: '/reports', label: 'Báo cáo', icon: '📊' },
  // V4 — Portals
  { href: '/suppliers', label: 'Nhà cung cấp', icon: '🏭' },
  { href: '/dropship', label: 'Dropship', icon: '🚚' },
  { href: '/affiliates', label: 'Affiliate', icon: '🤝' },
  { href: '/accesstrade', label: 'AccessTrade', icon: '🔗' },
  { href: '/seller-center', label: 'Seller Center', icon: '🏪' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍' },
  // V5 — Enterprise & Growth
  { href: '/enterprise', label: 'Enterprise', icon: '🏢' },
  { href: '/white-label', label: 'White Label', icon: '🎨' },
  { href: '/mobile-metrics', label: 'Mobile App', icon: '📱' },
  // AI & Analytics
  { href: '/agents', label: 'AI Agents', icon: '🤖' },
  { href: '/analytics', label: 'Phân tích', icon: '📈' },
  { href: '/users', label: 'Người dùng', icon: '🔐', roles: ['admin', 'manager'] },
  { href: '/settings', label: 'Cài đặt', icon: '⚙️', roles: ['admin'] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const sidebarContent = (
    <aside className="w-64 h-full bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between">
        <Logo variant="full" size={36} nameClass="text-indigo-400" taglineClass="text-gray-500" />
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white p-1 rounded flex-shrink-0"
          aria-label="Đóng menu"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role))).map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(user?.name || user?.email || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-gray-200 truncate font-medium">{user?.name || 'Admin'}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-md transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex md:flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar — drawer with backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-10 flex-shrink-0">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
