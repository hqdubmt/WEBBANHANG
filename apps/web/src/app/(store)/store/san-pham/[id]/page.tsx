'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function addToCart(product: any, qty: number) {
  try {
    const cart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
    const idx = cart.findIndex((i: any) => i.productId === product.id);
    if (idx >= 0) cart[idx].quantity += qty;
    else cart.push({ productId: product.id, name: product.name, price: Number(product.price), image: product.image, quantity: qty });
    localStorage.setItem('sf_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('sf_cart_update'));
  } catch {}
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ product: any; related: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyNow, setBuyNow] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/storefront/products/${id}`).then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleAddCart = () => {
    if (!data) return;
    addToCart(data.product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!data) return;
    addToCart(data.product, qty);
    setBuyNow(true);
    setTimeout(() => { window.location.href = '/store/gio-hang'; }, 300);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
            <div className="h-6 bg-gray-100 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <div className="text-xl font-bold text-gray-700 mb-2">Sản phẩm không tồn tại</div>
        <Link href="/store/san-pham" className="text-indigo-600 hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  const { product, related } = data;
  const inStock = product.stock > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/store" className="hover:text-indigo-600">Trang chủ</Link>
        <span>/</span>
        <Link href="/store/san-pham" className="hover:text-indigo-600">Sản phẩm</Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
          {product.image
            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-8xl text-gray-200">🛍️</div>
          }
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.category && <div className="text-sm text-indigo-600 font-medium mb-2">{product.category}</div>}
          <h1 className="text-2xl font-bold text-gray-800 mb-3 leading-snug">{product.name}</h1>

          <div className="text-3xl font-bold text-indigo-600 mb-4">{fmtVND(product.price)}</div>

          {/* Stock badge */}
          <div className="mb-5">
            {inStock
              ? <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full font-medium">✓ Còn hàng ({product.stock} sản phẩm)</span>
              : <span className="inline-flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full font-medium">✗ Hết hàng</span>
            }
          </div>

          {/* Quantity picker */}
          {inStock && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-gray-600 font-medium">Số lượng:</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50 text-lg font-medium">−</button>
                <span className="px-4 py-2 text-gray-800 font-semibold text-sm border-x border-gray-200">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-50 text-lg font-medium">+</button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mb-4">
            <button onClick={handleAddCart} disabled={!inStock} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${added ? 'bg-green-500 text-white' : !inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}>
              {added ? '✓ Đã thêm vào giỏ!' : '+ Thêm vào giỏ hàng'}
            </button>
            <button onClick={handleBuyNow} disabled={!inStock || buyNow} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
              {buyNow ? 'Đang chuyển...' : 'Mua ngay →'}
            </button>
          </div>
          {/* Affiliate link - redirect trực tiếp Tiki/Shopee */}
          {product.affiliateLink && (
            <a
              href={product.affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all mb-6"
            >
              🛒 Mua trên {product.source === 'tiki' ? 'Tiki' : product.source === 'shopee' ? 'Shopee' : 'Sàn TMĐT'} (giá tốt nhất)
            </a>
          )}

          {/* Perks */}
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            {[
              { icon: '🚚', text: 'Giao hàng toàn quốc' },
              { icon: '✅', text: 'Đảm bảo chính hãng' },
              { icon: '🔄', text: 'Đổi trả 7 ngày' },
              { icon: '💳', text: 'COD / Chuyển khoản' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-2">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Mô tả sản phẩm</h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl p-6">
            {product.description}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {related.map((p: any) => (
              <Link key={p.id} href={`/store/san-pham/${p.id}`} className="group bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">🛍️</div>}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{p.name}</div>
                  <div className="text-indigo-600 font-bold text-sm">{fmtVND(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
