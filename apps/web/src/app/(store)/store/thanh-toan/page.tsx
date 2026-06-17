'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function getCart(): any[] {
  try { return JSON.parse(localStorage.getItem('sf_cart') || '[]'); } catch { return []; }
}

const CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Biên Hòa', 'Nha Trang', 'Huế', 'Buôn Ma Thuột', 'Tỉnh/Thành khác'];

type F = { name: string; phone: string; email: string; address: string; city: string; note: string; paymentMethod: 'cod' | 'bank_transfer' };

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<F>({ name: '', phone: '', email: '', address: '', city: 'Hồ Chí Minh', note: '', paymentMethod: 'cod' });
  const [errors, setErrors] = useState<Partial<F>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; orderCode?: string; message?: string } | null>(null);

  useEffect(() => {
    setCart(getCart());
    try {
      const saved = JSON.parse(localStorage.getItem('sf_customer') || '{}');
      if (saved.phone) setForm(p => ({ ...p, ...saved }));
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Partial<F> = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên';
    if (!/^0[0-9]{9}$/.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ (VD: 0901234567)';
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          address: form.address,
          city: form.city,
          note: form.note || undefined,
          paymentMethod: form.paymentMethod,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem('sf_cart');
        localStorage.setItem('sf_customer', JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          address: form.address, city: form.city,
        }));
        window.dispatchEvent(new Event('sf_cart_update'));
        setResult({ success: true, orderCode: data.orderCode, message: data.message });
      } else {
        setResult({ success: false, message: data.message || 'Đặt hàng thất bại, vui lòng thử lại' });
      }
    } catch {
      setResult({ success: false, message: 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.' });
    }
    setSubmitting(false);
  };

  if (!mounted) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  // Success
  if (result?.success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Đặt hàng thành công!</h2>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-500 mb-1">Mã đơn hàng của bạn</div>
          <div className="text-xl font-bold text-indigo-600 font-mono">{result.orderCode}</div>
        </div>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">{result.message}</p>
        <div className="flex gap-3 justify-center">
          <a href="/store/theo-doi-don" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
            Theo dõi đơn →
          </a>
          <a href="/store" className="border border-gray-200 text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            Về trang chủ
          </a>
        </div>
      </div>
    );
  }

  // Empty cart
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h2 className="text-xl font-bold text-gray-700 mb-3">Giỏ hàng trống</h2>
        <Link href="/store/san-pham" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700">Xem sản phẩm →</Link>
      </div>
    );
  }

  const inp = (k: keyof F, rest?: object) => ({
    value: form[k],
    onChange: set(k),
    className: `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${(errors as any)[k] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`,
    ...rest,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <a href="/store/gio-hang" className="text-gray-400 hover:text-indigo-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </a>
        <h1 className="text-2xl font-bold text-gray-800">Thanh toán</h1>
      </div>

      {result && !result.success && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{result.message}</div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Thông tin giao hàng</h3>
              {form.phone && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('sf_customer');
                    setForm({ name: '', phone: '', email: '', address: '', city: 'Hồ Chí Minh', note: '', paymentMethod: form.paymentMethod });
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Xóa thông tin đã lưu
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                <input {...inp('name', { placeholder: 'Nguyễn Văn A' })} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <input {...inp('phone', { placeholder: '0901234567', type: 'tel' })} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (tuỳ chọn)</label>
                  <input {...inp('email', { placeholder: 'email@gmail.com', type: 'email' })} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label>
                <input {...inp('address', { placeholder: 'Số nhà, tên đường, phường/xã' })} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                <select value={form.city} onChange={set('city')} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tuỳ chọn)</label>
                <textarea value={form.note} onChange={set('note')} rows={2} placeholder="Yêu cầu đặc biệt, giờ giao hàng..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="font-bold text-gray-800 mb-4">Phương thức thanh toán</h3>
            <div className="space-y-3">
              {[
                { value: 'cod', icon: '💵', label: 'COD — Thanh toán khi nhận hàng', desc: 'Trả tiền mặt khi nhận hàng, an toàn và tiện lợi' },
                { value: 'bank_transfer', icon: '🏦', label: 'Chuyển khoản ngân hàng', desc: 'Nhân viên sẽ cung cấp thông tin tài khoản qua điện thoại' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${form.paymentMethod === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value={opt.value} checked={form.paymentMethod === opt.value} onChange={() => setForm(p => ({ ...p, paymentMethod: opt.value as 'cod' | 'bank_transfer' }))} className="mt-0.5 accent-indigo-600" />
                  <div>
                    <div className="font-medium text-sm text-gray-800">{opt.icon} {opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-800 text-base mb-4">Đơn hàng ({cart.length} sản phẩm)</h3>
            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto">
              {cart.map(item => (
                <div key={item.productId} className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-none">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg text-gray-200">🛍️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 line-clamp-1">{item.name}</div>
                    <div className="text-xs text-gray-400">x{item.quantity}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 flex-none">{fmtVND(Number(item.price) * item.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between text-gray-600"><span>Tạm tính</span><span>{fmtVND(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Phí vận chuyển</span><span className="text-green-600">Thoả thuận</span></div>
              <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{fmtVND(subtotal)}</span>
              </div>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${submitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
            >
              {submitting ? '⏳ Đang xử lý...' : `Đặt hàng — ${fmtVND(subtotal)}`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">Bấm đặt hàng đồng nghĩa bạn đồng ý với chính sách của chúng tôi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
