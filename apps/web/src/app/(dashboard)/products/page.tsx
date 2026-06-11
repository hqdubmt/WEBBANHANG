'use client';
import { useEffect, useState } from 'react';
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

export default function ProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', price: '', stock: '', description: '', category: '', status: 'active' });
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
    setForm({ name: '', price: '', stock: '', description: '', category: '', status: 'active' });
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, price: String(item.price), stock: String(item.stock), description: item.description || '', category: item.category || '', status: item.status });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editItem) await productsApi.update(editItem.id, body);
      else await productsApi.create(body);
      setModal(false);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    await productsApi.delete(id).catch(() => {});
    load();
  };

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

      {/* Search */}
      <div className="mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:max-w-xs focus:border-indigo-400 outline-none"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'name', label: 'Tên sản phẩm', render: (r) => (
            <div>
              <div className="font-medium text-gray-900 whitespace-nowrap">{r.name}</div>
              {r.category && <div className="text-xs text-gray-400">{r.category}</div>}
            </div>
          )},
          { key: 'price', label: 'Giá', render: (r) => <span className="font-medium text-indigo-700 whitespace-nowrap">{fmtVND(r.price)}</span> },
          { key: 'stock', label: 'Tồn', render: (r) => (
            <span className={`font-medium ${r.stock <= 5 ? 'text-red-600' : 'text-gray-700'}`}>{r.stock}</span>
          )},
          { key: 'status', label: 'TT', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
              {r.status}
            </span>
          )},
          { key: 'trendScore', label: 'Trend', hideOnMobile: true, render: (r) => (
            <div className="flex items-center gap-1">
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(r.trendScore || 0))}%` }} />
              </div>
              <span className="text-xs text-gray-500">{Number(r.trendScore || 0).toFixed(0)}</span>
            </div>
          )},
          { key: 'actions', label: '', render: (r) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(r)} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">Sửa</button>
              <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">Xóa</button>
            </div>
          )},
        ]}
      />

      {/* Pagination */}
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

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}>
        <div className="space-y-3">
          {(['name', 'price', 'stock', 'description'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field === 'name' ? 'Tên sản phẩm' : field === 'price' ? 'Giá (VND)' : field === 'stock' ? 'Tồn kho' : 'Mô tả'}</label>
              {field === 'description' ? (
                <textarea rows={3} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
              ) : (
                <input type={field === 'price' || field === 'stock' ? 'number' : 'text'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
