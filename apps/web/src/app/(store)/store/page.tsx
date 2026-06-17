'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function addToCart(product: any) {
  try {
    const cart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
    const idx = cart.findIndex((i: any) => i.productId === product.id);
    if (idx >= 0) cart[idx].quantity += 1;
    else cart.push({ productId: product.id, name: product.name, price: Number(product.price), image: product.image, quantity: 1 });
    localStorage.setItem('sf_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('sf_cart_update'));
  } catch {}
}

function ProductCard({ p }: { p: any }) {
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link href={`/store/san-pham/${p.id}`} className="group bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col w-44 md:w-52 flex-none">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {p.image ? (
          <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">🛍️</div>
        )}
        {p.stock <= 5 && p.stock > 0 && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Sắp hết</span>
        )}
        {p.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">Hết hàng</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="font-medium text-gray-800 text-sm leading-snug mb-2 line-clamp-2 flex-1">{p.name}</div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-indigo-600 font-bold text-sm">{fmtVND(p.price)}</div>
          <button
            onClick={handleAdd}
            disabled={p.stock === 0}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex-none ${added ? 'bg-green-500 text-white' : p.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
          >
            {added ? '✓' : '+ Giỏ'}
          </button>
        </div>
      </div>
    </Link>
  );
}

function CategorySection({ name, products }: { name: string; products: any[] }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-indigo-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>
          <span className="text-sm text-gray-400">({products.length} sản phẩm)</span>
        </div>
        <Link
          href={`/store/san-pham?category=${encodeURIComponent(name)}`}
          className="text-sm text-indigo-600 hover:underline font-medium flex items-center gap-1"
        >
          Xem tất cả <span>→</span>
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-5 scrollbar-hide">
        {products.slice(0, 10).map(p => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

export default function StorePage() {
  const [grouped, setGrouped] = useState<{ name: string; products: any[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/storefront/products?limit=100`)
      .then(r => r.json())
      .then(data => {
        const items: any[] = data.items || [];
        // Group by category
        const map = new Map<string, any[]>();
        items.forEach(p => {
          const cat = p.category || 'Khác';
          if (!map.has(cat)) map.set(cat, []);
          map.get(cat)!.push(p);
        });
        // Sort categories by product count desc
        const result = Array.from(map.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([name, products]) => ({ name, products }));
        setGrouped(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = grouped.reduce((s, g) => s + g.products.length, 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium mb-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AI-Powered Commerce
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Mua sắm thông minh,<br />giá tốt nhất
            </h1>
            <p className="text-indigo-100 mb-8 text-base md:text-lg">
              {totalProducts > 0 ? `${totalProducts} sản phẩm` : 'Hàng ngàn sản phẩm'} chất lượng cao, giao hàng nhanh toàn quốc.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/store/san-pham" className="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors">
                Xem tất cả sản phẩm →
              </Link>
              <Link href="/store/theo-doi-don" className="border border-white/40 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
                📦 Theo dõi đơn
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-6 overflow-x-auto text-sm text-gray-600">
          {[
            { icon: '🚚', text: 'Giao hàng toàn quốc' },
            { icon: '✅', text: 'Chất lượng đảm bảo' },
            { icon: '🔄', text: 'Đổi trả 7 ngày' },
            { icon: '💳', text: 'COD / Chuyển khoản' },
            { icon: '📞', text: 'Hỗ trợ 24/7' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-1.5 flex-none">
              <span>{f.icon}</span>
              <span className="font-medium whitespace-nowrap">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          {[1, 2].map(i => (
            <div key={i}>
              <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="w-44 md:w-52 flex-none aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category sections */}
      {!loading && grouped.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <div className="text-6xl mb-4">🛒</div>
          <div className="text-lg font-medium">Chưa có sản phẩm nào</div>
          <div className="text-sm mt-2">Sản phẩm sẽ xuất hiện tại đây</div>
        </div>
      )}

      {!loading && grouped.map(g => (
        <CategorySection key={g.name} name={g.name} products={g.products} />
      ))}

      {/* Divider */}
      {!loading && grouped.length > 0 && <div className="border-t border-gray-200 mx-4 md:mx-auto md:max-w-6xl" />}

      {/* CTA */}
      {!loading && (
        <section className="bg-white py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Đã đặt hàng?</h3>
            <p className="text-gray-500 mb-6 text-sm">Tra cứu tình trạng đơn hàng bằng số điện thoại</p>
            <Link href="/store/theo-doi-don" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              📦 Theo dõi đơn hàng
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
