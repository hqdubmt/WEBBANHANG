'use client';
import { useEffect, useState } from 'react';
import { sellerApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const PLATFORM_BADGE: Record<string, string> = {
  tiktok: 'bg-pink-100 text-pink-700 border-pink-200',
  lazada: 'bg-blue-100 text-blue-700 border-blue-200',
  shopee: 'bg-orange-100 text-orange-700 border-orange-200',
};
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok Shop',
  lazada: 'Lazada',
  shopee: 'Shopee',
};

type Tab = 'accounts' | 'products' | 'orders' | 'connect';

export default function SellerCenterPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [dashboard, setDashboard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any>({ items: [], total: 0 });
  const [orders, setOrders] = useState<any>({ items: [], total: 0 });
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // Connect form
  const [connectPlatform, setConnectPlatform] = useState<'shopee' | 'lazada' | 'tiktok'>('shopee');
  const [connectMode, setConnectMode] = useState<'login' | 'cookie'>('login');
  const [connectUser, setConnectUser] = useState('');
  const [connectPass, setConnectPass] = useState('');
  const [connectCookie, setConnectCookie] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [otpSession, setOtpSession] = useState('');
  const [otp, setOtp] = useState('');
  const [needOtp, setNeedOtp] = useState(false);

  const loadDashboard = async () => {
    const [dash, accs] = await Promise.all([
      sellerApi.dashboard().catch(() => null),
      sellerApi.accounts().catch(() => []),
    ]);
    setDashboard(dash);
    setAccounts(accs || []);
  };

  const loadProducts = () =>
    sellerApi.products({ limit: '20' }).then(r => setProducts(r)).catch(() => {});

  const loadOrders = () =>
    Promise.all([
      sellerApi.orders({ limit: '20' }).catch(() => ({ items: [], total: 0 })),
      sellerApi.pendingOrders().catch(() => ({ orders: [] })),
    ]).then(([o, p]) => { setOrders(o); setPendingOrders(p.orders || []); });

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'products') loadProducts();
    if (tab === 'orders') loadOrders();
  }, [tab]);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const handleSync = async (id: string, type: 'products' | 'orders') => {
    setSyncing(`${id}-${type}`);
    try {
      const r = type === 'products' ? await sellerApi.syncProducts(id) : await sellerApi.syncOrders(id);
      notify(`Đồng bộ xong: ${r.synced} ${type === 'products' ? 'sản phẩm' : 'đơn hàng'}`);
      await loadDashboard();
      if (type === 'products') loadProducts();
      else loadOrders();
    } catch { notify('Lỗi đồng bộ'); }
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    setSyncing('all');
    try {
      await sellerApi.syncAll();
      notify('Đồng bộ tất cả xong!');
      await loadDashboard();
    } catch { notify('Lỗi'); }
    setSyncing(null);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      if (connectMode === 'cookie') {
        await sellerApi.importCookie(connectPlatform, connectCookie, connectUser);
        notify(`Kết nối ${PLATFORM_LABEL[connectPlatform]} thành công!`);
        setConnectCookie(''); setConnectUser('');
        await loadDashboard();
        setTab('accounts');
      } else {
        const r = await sellerApi[`login${connectPlatform.charAt(0).toUpperCase() + connectPlatform.slice(1)}` as 'loginShopee'](connectUser, connectPass);
        if (r.needOtp) {
          setNeedOtp(true);
          setOtpSession(r.sessionId);
          notify(r.message);
        } else {
          notify(`Kết nối ${PLATFORM_LABEL[connectPlatform]} thành công!`);
          setConnectUser(''); setConnectPass('');
          await loadDashboard();
          setTab('accounts');
        }
      }
    } catch (e: any) {
      notify(e?.message || 'Kết nối thất bại');
    }
    setConnecting(false);
  };

  const handleVerifyOtp = async () => {
    setConnecting(true);
    try {
      await sellerApi.verifyOtp(otpSession, otp);
      notify('Kết nối TikTok thành công!');
      setNeedOtp(false); setOtp(''); setOtpSession('');
      await loadDashboard();
      setTab('accounts');
    } catch { notify('OTP sai hoặc đã hết hạn'); }
    setConnecting(false);
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Ngắt kết nối gian hàng này?')) return;
    await sellerApi.disconnect(id);
    notify('Đã ngắt kết nối');
    await loadDashboard();
  };

  const handleShip = async (id: string) => {
    const tracking = prompt('Nhập mã vận đơn (để trống nếu chưa có):') ?? '';
    await sellerApi.shipOrder(id, tracking || undefined);
    notify('Đã xác nhận giao hàng');
    loadOrders();
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'accounts', label: 'Gian hàng', badge: accounts.length },
    { key: 'products', label: 'Sản phẩm', badge: dashboard?.summary?.totalProducts },
    { key: 'orders', label: 'Đơn hàng', badge: pendingOrders.length || undefined },
    { key: 'connect', label: '+ Kết nối mới' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Seller Center"
          subtitle="Quản lý gian hàng TikTok Shop · Lazada · Shopee"
        />
        <button onClick={handleSyncAll} disabled={syncing === 'all'}
          className="btn-primary text-sm">
          {syncing === 'all' ? 'Đang đồng bộ...' : '↻ Đồng bộ tất cả'}
        </button>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm">
          {msg}
        </div>
      )}

      {/* Summary cards */}
      {dashboard?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Gian hàng', value: dashboard.totalAccounts, icon: '🏪' },
            { label: 'Sản phẩm', value: dashboard.summary.totalProducts, icon: '📦' },
            { label: 'Đơn hàng', value: dashboard.summary.totalOrders, icon: '🛒' },
            { label: 'Cần xử lý', value: dashboard.summary.pendingOrders, icon: '⚡', highlight: true },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-xl border p-4 ${c.highlight && c.value ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className={`text-2xl font-bold ${c.highlight && c.value ? 'text-orange-600' : 'text-gray-900'}`}>
                {c.value ?? '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.badge ? <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Accounts */}
      {tab === 'accounts' && (
        <div className="space-y-3">
          {loading && <p className="text-gray-500 text-sm">Đang tải...</p>}
          {!loading && accounts.length === 0 && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-gray-500 mb-3">Chưa có gian hàng nào được kết nối</p>
              <button onClick={() => setTab('connect')} className="btn-primary text-sm">Kết nối ngay</button>
            </div>
          )}
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${PLATFORM_BADGE[acc.platform] || 'bg-gray-100 text-gray-700'}`}>
                    {PLATFORM_LABEL[acc.platform] || acc.platform}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{acc.shopName || acc.username || acc.shopId || '—'}</p>
                    <p className="text-xs text-gray-400">
                      {acc.status === 'active' ? '🟢 Đang hoạt động' : '🔴 Ngắt kết nối'}
                      {acc.lastSyncAt && ` · Sync: ${new Date(acc.lastSyncAt).toLocaleString('vi-VN')}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSync(acc.id, 'products')} disabled={!!syncing}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    {syncing === `${acc.id}-products` ? '...' : '📦 Sync SP'}
                  </button>
                  <button onClick={() => handleSync(acc.id, 'orders')} disabled={!!syncing}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    {syncing === `${acc.id}-orders` ? '...' : '🛒 Sync ĐH'}
                  </button>
                  <button onClick={() => handleDisconnect(acc.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    Ngắt
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Products */}
      {tab === 'products' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Tổng: {products.total} sản phẩm</p>
          <div className="space-y-2">
            {products.items?.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 ${PLATFORM_BADGE[p.account?.platform] || 'bg-gray-100'}`}>
                      {PLATFORM_LABEL[p.account?.platform] || p.account?.platform}
                    </span>
                    SKU: {p.sku || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{fmtVND(p.price)}</p>
                  <p className="text-xs text-gray-400">Kho: {p.stock ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.status}
                </span>
              </div>
            ))}
            {!products.items?.length && <p className="text-gray-400 text-sm py-8 text-center">Chưa có sản phẩm — hãy Sync từ gian hàng</p>}
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {tab === 'orders' && (
        <div>
          {pendingOrders.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <p className="font-semibold text-orange-800 mb-2">⚡ {pendingOrders.length} đơn cần xử lý</p>
              <div className="space-y-2">
                {pendingOrders.slice(0, 5).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-orange-100">
                    <div>
                      <p className="text-sm font-medium">{o.platformOrderId}</p>
                      <p className="text-xs text-gray-400">{o.buyerName} · {fmtVND(o.totalAmount)}</p>
                    </div>
                    <button onClick={() => handleShip(o.id)}
                      className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">
                      Ship
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-3">Tổng: {orders.total} đơn hàng</p>
          <div className="space-y-2">
            {orders.items?.map((o: any) => (
              <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{o.platformOrderId}</p>
                    <p className="text-xs text-gray-400">{o.buyerName || '—'} · {o.platformCreatedAt ? new Date(o.platformCreatedAt).toLocaleDateString('vi-VN') : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmtVND(o.totalAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{o.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {!orders.items?.length && <p className="text-gray-400 text-sm py-8 text-center">Chưa có đơn hàng — hãy Sync từ gian hàng</p>}
          </div>
        </div>
      )}

      {/* Tab: Connect */}
      {tab === 'connect' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h3 className="font-semibold text-gray-900">Kết nối gian hàng mới</h3>

            {/* Platform */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sàn thương mại</label>
              <div className="flex gap-2">
                {(['shopee', 'lazada', 'tiktok'] as const).map(p => (
                  <button key={p} onClick={() => { setConnectPlatform(p); setNeedOtp(false); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      connectPlatform === p ? PLATFORM_BADGE[p] + ' border-current' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {PLATFORM_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Phương thức</label>
              <div className="flex gap-2">
                <button onClick={() => { setConnectMode('login'); setNeedOtp(false); }}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${connectMode === 'login' ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                  Tài khoản & Mật khẩu
                </button>
                <button onClick={() => { setConnectMode('cookie'); setNeedOtp(false); }}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${connectMode === 'cookie' ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                  Import Cookie
                </button>
              </div>
            </div>

            {!needOtp && connectMode === 'login' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email / Số điện thoại</label>
                  <input value={connectUser} onChange={e => setConnectUser(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
                  <input type="password" value={connectPass} onChange={e => setConnectPass(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="••••••••" />
                </div>
              </>
            )}

            {!needOtp && connectMode === 'cookie' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên / Email (tùy chọn)</label>
                  <input value={connectUser} onChange={e => setConnectUser(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Để nhận dạng gian hàng" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cookie string</label>
                  <p className="text-xs text-gray-400 mb-2">
                    Mở browser → đăng nhập {PLATFORM_LABEL[connectPlatform]} → F12 → Console → gõ <code className="bg-gray-100 px-1 rounded">document.cookie</code> → copy dán vào đây
                  </p>
                  <textarea value={connectCookie} onChange={e => setConnectCookie(e.target.value)} rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="SPC_EC=...; csrftoken=...; ..." />
                </div>
              </>
            )}

            {needOtp && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-yellow-800">📩 OTP đã được gửi về email/điện thoại</p>
                <p className="text-xs text-yellow-700">Kiểm tra email và nhập mã xác minh (có hiệu lực trong 10 phút)</p>
                <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6}
                  className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="______" />
                <button onClick={handleVerifyOtp} disabled={!otp || connecting}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {connecting ? 'Đang xác minh...' : 'Xác nhận OTP'}
                </button>
              </div>
            )}

            {!needOtp && (
              <button onClick={handleConnect} disabled={connecting || (connectMode === 'login' ? !connectUser || !connectPass : !connectCookie)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {connecting ? 'Đang kết nối (30-60 giây)...' : `Kết nối ${PLATFORM_LABEL[connectPlatform]}`}
              </button>
            )}

            {connectPlatform === 'shopee' && (
              <p className="text-xs text-gray-400 bg-orange-50 border border-orange-100 rounded p-2">
                ⚠️ Shopee có CAPTCHA — nên dùng <strong>Import Cookie</strong> thay vì đăng nhập tự động
              </p>
            )}
            {connectPlatform === 'tiktok' && (
              <p className="text-xs text-gray-400 bg-pink-50 border border-pink-100 rounded p-2">
                ℹ️ TikTok sẽ gửi OTP về email/điện thoại để xác minh thiết bị mới
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
