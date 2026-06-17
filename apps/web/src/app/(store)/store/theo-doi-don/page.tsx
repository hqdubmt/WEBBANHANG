'use client';
import { useState } from 'react';
import Link from 'next/link';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: any) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_STEPS = ['pending', 'confirmed', 'shipping', 'delivered'];

export default function TrackOrderPage() {
  const [phone, setPhone] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const cancelOrder = async (code: string) => {
    if (!confirm(`Bạn có chắc muốn huỷ đơn hàng ${code}?`)) return;
    setCancelling(code);
    try {
      const res = await fetch('/api/storefront/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, orderCode: code }),
      }).then(r => r.json());
      if (res.success) {
        // Update local state
        setResult((prev: any) => ({
          ...prev,
          orders: prev.orders.map((o: any) =>
            o.orderCode === code ? { ...o, status: 'cancelled', statusText: 'Đã huỷ' } : o
          ),
        }));
      } else {
        alert(res.message || 'Không thể huỷ đơn hàng');
      }
    } catch {
      alert('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setCancelling(null);
    }
  };

  const search = async () => {
    if (!phone.match(/^0[0-9]{9}$/)) {
      setError('Số điện thoại không hợp lệ (VD: 0901234567)');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({ phone });
      if (orderCode) params.set('orderCode', orderCode);
      const res = await fetch(`/api/storefront/track?${params}`).then(r => r.json());
      setResult(res);
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Theo dõi đơn hàng</h1>
        <p className="text-gray-500 text-sm">Nhập số điện thoại để xem tất cả đơn hàng của bạn</p>
      </div>

      {/* Search form */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại *</label>
            <input
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="0901234567"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${error ? 'border-red-400' : 'border-gray-200'}`}
            />
            {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã đơn hàng (tuỳ chọn)</label>
            <input
              value={orderCode}
              onChange={e => setOrderCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="VD: WEB-LK5A2B-XYZ"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
          >
            {loading ? 'Đang tìm...' : '🔍 Tra cứu đơn hàng'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        !result.found ? (
          <div className="text-center py-8 bg-white border border-gray-100 rounded-2xl">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold text-gray-700">{result.message}</div>
            <div className="text-sm text-gray-400 mt-1">Kiểm tra lại số điện thoại hoặc liên hệ hotline</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              <span>Tìm thấy <strong>{result.orders.length}</strong> đơn hàng của <strong>{result.customerName}</strong></span>
            </div>

            {result.orders.map((order: any) => (
              <div key={order.orderCode} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Order header */}
                <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{order.orderCode}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.statusText}
                    </span>
                    <span className="font-bold text-indigo-600">{fmtVND(order.total)}</span>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => cancelOrder(order.orderCode)}
                        disabled={cancelling === order.orderCode}
                        className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {cancelling === order.orderCode ? 'Đang huỷ...' : 'Huỷ đơn'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar (only for non-cancelled) */}
                {order.status !== 'cancelled' && (
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center">
                      {STATUS_STEPS.map((step, idx) => {
                        const currentIdx = STATUS_STEPS.indexOf(order.status);
                        const done = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        const labels = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao'];
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'} ${isCurrent ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}>
                                {done ? '✓' : idx + 1}
                              </div>
                              <div className={`text-xs mt-1.5 text-center w-16 leading-tight ${isCurrent ? 'text-indigo-600 font-semibold' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                                {labels[idx]}
                              </div>
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1 transition-all ${idx < currentIdx ? 'bg-indigo-600' : 'bg-gray-100'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order body */}
                <div className="px-5 py-4">
                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                        <span className="text-gray-700 font-medium">{fmtVND(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="text-xs text-gray-400 space-y-1">
                    {order.shippingAddress && <div>📍 {order.shippingAddress}</div>}
                    {order.trackingNumber && <div>🚚 Mã vận đơn: <span className="font-mono font-semibold text-gray-600">{order.trackingNumber}</span></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Help */}
      <div className="mt-8 text-center text-sm text-gray-400">
        Cần hỗ trợ? Gọi hotline <a href="tel:1900xxxx" className="text-indigo-600 font-medium hover:underline">1900 xxxx</a> (8:00 – 22:00)
      </div>

      <div className="mt-4 text-center">
        <Link href="/store" className="text-sm text-indigo-600 hover:underline">← Về trang chủ</Link>
      </div>
    </div>
  );
}
