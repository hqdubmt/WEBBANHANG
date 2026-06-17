'use client';
import { useEffect, useRef, useState } from 'react';
import { productsApi, categoriesApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload thất bại');
      onChange(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) upload(files[0]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm</label>

      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex-none overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span className="text-2xl text-gray-300">🖼️</span>
          )}
        </div>

        {/* Drop zone */}
        <div className="flex-1">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-4 py-3 text-center cursor-pointer transition-all text-sm ${
              dragging ? 'border-indigo-400 bg-indigo-50' :
              uploading ? 'border-gray-200 bg-gray-50 opacity-60 pointer-events-none' :
              'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Đang tải lên...
              </div>
            ) : (
              <div className="text-gray-500">
                <span className="font-medium text-indigo-600">Chọn ảnh</span> hoặc kéo thả
                <div className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, GIF · Tối đa 5MB</div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          {value && (
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400 truncate max-w-[180px]">{value}</span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-red-400 hover:text-red-600 ml-2 flex-none"
              >
                Xóa
              </button>
            </div>
          )}

          {/* URL input fallback */}
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Hoặc dán URL ảnh..."
            className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-600"
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', price: '', stock: '', description: '', category: '', status: 'active', image: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const params: any = { page: String(page), limit: '20' };
    if (search) params.search = search;
    const res = await productsApi.list(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 }));
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);
  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', price: '', stock: '', description: '', category: '', status: 'active', image: '' });
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name,
      price: String(item.price),
      stock: String(item.stock),
      description: item.description || '',
      category: item.category || '',
      status: item.status,
      image: item.image || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    setSaving(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        image: form.image || null,
      };
      if (editItem) await productsApi.update(editItem.id, body);
      else await productsApi.create(body);
      setModal(false);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    await productsApi.delete(id).catch(() => {});
    load();
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="📦 Sản phẩm"
        subtitle={`${total} sản phẩm`}
        action={
          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Thêm sản phẩm
          </button>
        }
      />

      <div className="mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:max-w-xs focus:border-indigo-400 outline-none"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          {
            key: 'name', label: 'Sản phẩm', render: (r) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-none">
                  {r.image
                    ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg text-gray-300">🛍️</div>
                  }
                </div>
                <div>
                  <div className="font-medium text-gray-900 whitespace-nowrap">{r.name}</div>
                  {r.category && <div className="text-xs text-gray-400">{r.category}</div>}
                </div>
              </div>
            )
          },
          { key: 'price', label: 'Giá', render: (r) => <span className="font-medium text-indigo-700 whitespace-nowrap">{fmtVND(r.price)}</span> },
          {
            key: 'stock', label: 'Tồn', render: (r) => (
              <span className={`font-medium ${r.stock <= 5 ? 'text-red-600' : 'text-gray-700'}`}>{r.stock}</span>
            )
          },
          {
            key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                {r.status}
              </span>
            )
          },
          {
            key: 'trendScore', label: 'Trend', hideOnMobile: true, render: (r) => (
              <div className="flex items-center gap-1">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(r.trendScore || 0))}%` }} />
                </div>
                <span className="text-xs text-gray-500">{Number(r.trendScore || 0).toFixed(0)}</span>
              </div>
            )
          },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">Sửa</button>
                <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">Xóa</button>
              </div>
            )
          },
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} sản phẩm</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-40">◀</button>
            <span className="px-3 py-1">Trang {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 border rounded-md disabled:opacity-40">▶</button>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}>
        <div className="space-y-4">
          {/* Image upload */}
          <ImageUpload value={form.image} onChange={url => setForm(p => ({ ...p, image: url }))} />

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
            <input value={form.name} onChange={f('name')} placeholder="Nhập tên sản phẩm" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VND)</label>
              <input type="number" value={form.price} onChange={f('price')} placeholder="0" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tồn kho {editItem && <span className="text-xs text-gray-400 font-normal">(chỉnh tại Tồn kho)</span>}
              </label>
              {editItem ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-medium">
                    {form.stock}
                  </div>
                  <a href="/inventory" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">→ Điều chỉnh</a>
                </div>
              ) : (
                <input type="number" value={form.stock} onChange={f('stock')} placeholder="0" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
              )}
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
              <select value={form.category} onChange={f('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none bg-white">
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select value={form.status} onChange={f('status')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none bg-white">
                <option value="active">Active — Hiển thị</option>
                <option value="pending">Pending — Chờ duyệt</option>
                <option value="inactive">Inactive — Ẩn</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea rows={3} value={form.description} onChange={f('description')} placeholder="Mô tả sản phẩm..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700">
              {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Tạo sản phẩm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
