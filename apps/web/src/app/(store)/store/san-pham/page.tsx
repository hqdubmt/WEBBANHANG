'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

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

function getParams() {
  if (typeof window === 'undefined') return { page: 1, search: '', category: '' };
  const p = new URLSearchParams(window.location.search);
  return {
    page: Number(p.get('page') || 1),
    search: p.get('search') || '',
    category: p.get('category') || '',
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ page: 1, search: '', category: '' });
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // Read URL params on mount + popstate
  useEffect(() => {
    const read = () => setParams(getParams());
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  // Fetch products when params change
  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(params.page), limit: '20' });
    if (params.search) q.set('search', params.search);
    if (params.category) q.set('category', params.category);

    fetch(`/api/storefront/products?${q}`)
      .then(r => r.json())
      .then(d => {
        setProducts(d.items || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [params.page, params.search, params.category]);

  // Fetch categories once
  useEffect(() => {
    fetch('/api/storefront/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const navigate = (overrides: Partial<typeof params>) => {
    const next = { ...params, ...overrides, page: 1, ...('page' in overrides ? { page: overrides.page! } : {}) };
    const q = new URLSearchParams();
    if (next.page > 1) q.set('page', String(next.page));
    if (next.search) q.set('search', next.search);
    if (next.category) q.set('category', next.category);
    const url = '/store/san-pham' + (q.toString() ? '?' + q.toString() : '');
    window.history.pushState({}, '', url);
    setParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: searchRef.current?.value || '', page: 1 });
  };

  const handleAdd = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    addToCart(p);
    setAdded(a => ({ ...a, [p.id]: true }));
    setTimeout(() => setAdded(a => ({ ...a, [p.id]: false })), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tất cả sản phẩm</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} sản phẩm</p>}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={searchRef}
            defaultValue={params.search}
            placeholder="Tìm kiếm sản phẩm..."
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">Tìm</button>
        </form>
      </div>

      <div className="flex gap-6">
        {/* Sidebar categories — desktop */}
        {categories.length > 0 && (
          <aside className="hidden md:block w-48 flex-none">
            <p className="font-semibold text-gray-700 text-sm mb-3">Danh mục</p>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  onClick={() => navigate({ category: '', page: 1 })}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${!params.category ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Tất cả
                </button>
              </li>
              {categories.map((c: any) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate({ category: c.name, page: 1 })}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${params.category === c.name ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {/* Mobile category pills */}
          {categories.length > 0 && (
            <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => navigate({ category: '', page: 1 })}
                className={`flex-none text-xs px-3 py-1.5 rounded-full font-medium ${!params.category ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Tất cả
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => navigate({ category: c.name, page: 1 })}
                  className={`flex-none text-xs px-3 py-1.5 rounded-full font-medium ${params.category === c.name ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Active filter badge */}
          {(params.search || params.category) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {params.category && (
                <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full">
                  Danh mục: {params.category}
                  <button onClick={() => navigate({ category: '', page: 1 })} className="hover:text-indigo-900">✕</button>
                </span>
              )}
              {params.search && (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                  Tìm: {params.search}
                  <button onClick={() => { navigate({ search: '', page: 1 }); if (searchRef.current) searchRef.current.value = ''; }} className="hover:text-gray-900">✕</button>
                </span>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl animate-pulse aspect-[3/4]" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && products.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium text-gray-500">Không tìm thấy sản phẩm</p>
              <p className="text-sm mt-1">Thử thay đổi từ khoá hoặc danh mục</p>
              <button
                onClick={() => { navigate({ search: '', category: '', page: 1 }); if (searchRef.current) searchRef.current.value = ''; }}
                className="mt-4 text-sm text-indigo-600 underline"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          )}

          {/* Product grid */}
          {!loading && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <Link
                    key={p.id}
                    href={`/store/san-pham/${p.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">🛍️</div>
                      }
                      {p.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded">Hết hàng</span>
                        </div>
                      )}
                      {p.stock > 0 && p.stock <= 5 && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Sắp hết</span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      {p.category && <p className="text-xs text-gray-400 mb-1 truncate">{p.category}</p>}
                      <p className="text-sm font-medium text-gray-800 line-clamp-2 flex-1 mb-2">{p.name}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-indigo-600 font-bold text-sm">{fmtVND(p.price)}</span>
                        <button
                          onClick={e => handleAdd(e, p)}
                          disabled={p.stock === 0}
                          className={`flex-none text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                            added[p.id] ? 'bg-green-500 text-white' :
                            p.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                            'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                          }`}
                        >
                          {added[p.id] ? '✓' : '+ Giỏ'}
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => navigate({ page: params.page - 1 })}
                    disabled={params.page <= 1}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Trước
                  </button>
                  <span className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                    {params.page} / {totalPages}
                  </span>
                  <button
                    onClick={() => navigate({ page: params.page + 1 })}
                    disabled={params.page >= totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Tiếp →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
