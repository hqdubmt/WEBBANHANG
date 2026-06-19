'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const CAT_EMOJI: Record<string, string> = {
  'Điện thoại': '📱', 'Làm đẹp': '💄', 'Sức khỏe': '💊',
  'Thực phẩm': '🍎', 'Đồ chơi': '🧸', 'Nhà cửa': '🏠',
  'Thời trang nữ': '👗', 'Thời trang nam': '👔',
};

function getEmoji(cat: string) {
  return Object.entries(CAT_EMOJI).find(([k]) => cat?.includes(k))?.[1] ?? '🛒';
}

function ProductCard({ p }: { p: any }) {
  return (
    <a
      href={p.affiliateLink || `/store/san-pham/${p.id}`}
      target={p.affiliateLink ? '_blank' : '_self'}
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg active:scale-95 transition-all duration-150 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {p.image
          ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">{getEmoji(p.category)}</div>
        }
        {p.commission > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            HH {p.commission}%
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-indigo-500 font-medium mb-1">{getEmoji(p.category)} {p.category}</p>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1 mb-2 leading-snug">{p.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-red-500">{fmtVND(p.price)}</span>
          <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg font-semibold">Mua ngay</span>
        </div>
      </div>
    </a>
  );
}

export default function DealPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/storefront/affiliate/products?limit=200`)
      .then(r => r.json())
      .then(data => {
        const items: any[] = data.items || [];
        setProducts(items);
        const cats = [...new Set(items.map((p: any) => p.category).filter(Boolean))];
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = category ? products.filter(p => p.category === category) : products;
  const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 60);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TikTok-style header */}
      <div className="bg-gradient-to-r from-pink-500 via-red-500 to-orange-400 text-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">🔥 Deal Hot Hôm Nay</h1>
            <p className="text-xs text-white/80">Sản phẩm chất - Giá tốt - Giao nhanh</p>
          </div>
          <a href="/store" className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-medium hover:bg-white/30">
            Xem thêm →
          </a>
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategory('')}
            className={`flex-none text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!category ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tất cả
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? '' : cat)}
              className={`flex-none text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${cat === category ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {getEmoji(cat)} {cat}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto px-3 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 text-center">{shuffled.length} sản phẩm đang khuyến mãi</p>
            <div className="grid grid-cols-2 gap-3">
              {shuffled.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          </>
        )}

        {/* Telegram channel CTA */}
        <div className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 text-white text-center">
          <div className="text-2xl mb-2">📢</div>
          <h3 className="font-bold text-sm mb-1">Tham gia kênh Telegram</h3>
          <p className="text-xs text-white/80 mb-3">Nhận deal mới nhất mỗi ngày miễn phí!</p>
          <a
            href="https://t.me/Quangdu_ai_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-600 font-semibold text-xs px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Tham gia ngay →
          </a>
        </div>
      </div>
    </div>
  );
}
