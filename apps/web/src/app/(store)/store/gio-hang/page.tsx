'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function getCart(): any[] {
  try { return JSON.parse(localStorage.getItem('sf_cart') || '[]'); } catch { return []; }
}
function saveCart(cart: any[]) {
  localStorage.setItem('sf_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('sf_cart_update'));
}

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCart(getCart());
    setMounted(true);
  }, []);

  const update = (productId: string, qty: number) => {
    const c = qty <= 0
      ? cart.filter(i => i.productId !== productId)
      : cart.map(i => i.productId === productId ? { ...i, quantity: qty } : i);
    saveCart(c);
    setCart(c);
  };

  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-3">Giỏ hàng trống</h2>
        <p className="text-gray-400 mb-8">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục</p>
        <Link href="/store/san-pham" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Xem sản phẩm →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Giỏ hàng</h1>
        <span className="text-sm text-gray-400">{totalItems} sản phẩm</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={item.productId} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-start">
              <Link href={`/store/san-pham/${item.productId}`} className="flex-none w-20 h-20 bg-gray-50 rounded-xl overflow-hidden">
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200">🛍️</div>
                }
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/store/san-pham/${item.productId}`} className="font-medium text-gray-800 text-sm leading-snug hover:text-indigo-600 line-clamp-2">
                  {item.name}
                </Link>
                <div className="text-indigo-600 font-bold text-sm mt-1">{fmtVND(item.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button onClick={() => update(item.productId, 0)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">✕</button>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <button onClick={() => update(item.productId, item.quantity - 1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50">−</button>
                  <span className="px-3 py-1.5 font-semibold border-x border-gray-200 min-w-[32px] text-center">{item.quantity}</span>
                  <button onClick={() => update(item.productId, item.quantity + 1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50">+</button>
                </div>
                <div className="text-sm font-semibold text-gray-700">{fmtVND(Number(item.price) * item.quantity)}</div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-2">
            <Link href="/store/san-pham" className="text-sm text-indigo-600 hover:underline">← Tiếp tục mua sắm</Link>
            <button onClick={() => { saveCart([]); setCart([]); }} className="text-sm text-gray-400 hover:text-red-400">Xoá giỏ hàng</button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-800 text-base mb-4">Tổng đơn hàng</h3>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính ({totalItems} sp)</span>
                <span>{fmtVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span className="text-green-600 font-medium">Thoả thuận</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-800">
                <span>Tổng cộng</span>
                <span className="text-indigo-600 text-base">{fmtVND(subtotal)}</span>
              </div>
            </div>

            <a href="/store/thanh-toan" className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-indigo-700 transition-colors active:scale-95">
              Đặt hàng ngay →
            </a>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span>🔒 Bảo mật</span>
              <span>✅ Đảm bảo</span>
              <span>🔄 Đổi trả</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
