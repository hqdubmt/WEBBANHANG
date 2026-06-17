'use client';
import { useEffect, useState } from 'react';
import { inventoryApi, productsApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import StatCard from '@/components/StatCard';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const TX_TYPES = [
  { value: 'import', label: '📦 Nhập kho', color: 'text-green-600' },
  { value: 'export', label: '🚚 Xuất kho', color: 'text-orange-600' },
  { value: 'adjust', label: '✏️ Điều chỉnh', color: 'text-blue-600' },
  { value: 'return', label: '↩️ Trả hàng', color: 'text-purple-600' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ productId: '', txType: 'import', quantity: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [prods, ls, v] = await Promise.all([
      productsApi.list({ limit: '200' }).then(r => r.items).catch(() => []),
      inventoryApi.lowStock().catch(() => []),
      inventoryApi.value().catch(() => null),
    ]);
    setProducts(prods);
    setLowStock(ls);
    setValue(v);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdjust = (productId = '') => {
    setForm({ productId, txType: 'import', quantity: '', note: '' });
    setModal(true);
  };

  const adjust = async () => {
    if (!form.productId || !form.quantity) return;
    setSaving(true);
    try {
      await inventoryApi.adjust({ ...form, quantity: Number(form.quantity) });
      setModal(false);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="🏭 Tồn kho"
        subtitle="Quản lý nhập/xuất kho"
        action={
          <button onClick={() => openAdjust()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Điều chỉnh kho
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng giá trị kho" value={fmtVND(value?.totalValue)} icon="💰" color="green" />
        <StatCard label="Tổng số lượng" value={(value?.totalUnits || 0).toLocaleString()} icon="📦" color="blue" />
        <StatCard label="Sắp hết hàng" value={lowStock.length} icon="⚠️" color="red" />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-5 bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="font-semibold text-red-700 mb-2 text-sm">⚠️ {lowStock.length} sản phẩm sắp hết hàng</div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <button
                key={p.id}
                onClick={() => openAdjust(p.id)}
                className="text-xs bg-white border border-red-200 rounded-lg px-3 py-1 text-red-700 hover:bg-red-50"
              >
                {p.name} <span className="font-bold">({p.stock})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Full product stock list */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-gray-800">Tất cả sản phẩm ({filtered.length})</h3>
        <input
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:max-w-xs focus:border-indigo-400 outline-none"
          placeholder="Tìm sản phẩm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={filtered}
        emptyText="Không có sản phẩm"
        columns={[
          {
            key: 'name', label: 'Sản phẩm', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-none">
                  {r.image
                    ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">🛍️</div>
                  }
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{r.name}</div>
                  {r.category && <div className="text-xs text-gray-400">{r.category}</div>}
                </div>
              </div>
            )
          },
          { key: 'price', label: 'Giá', render: (r) => <span className="text-sm text-gray-700">{fmtVND(r.price)}</span> },
          {
            key: 'stock', label: 'Tồn kho', render: (r) => (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${r.stock <= 0 ? 'text-red-600' : r.stock <= 10 ? 'text-orange-500' : 'text-gray-800'}`}>
                  {r.stock}
                </span>
                {r.stock <= 10 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    {r.stock <= 0 ? 'Hết' : 'Sắp hết'}
                  </span>
                )}
              </div>
            )
          },
          {
            key: 'value', label: 'Giá trị', hideOnMobile: true, render: (r) => (
              <span className="text-sm text-gray-500">{fmtVND(r.stock * r.price)}</span>
            )
          },
          {
            key: 'actions', label: '', render: (r) => (
              <button
                onClick={() => openAdjust(r.id)}
                className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
              >
                Điều chỉnh
              </button>
            )
          },
        ]}
      />

      {/* Adjust modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Điều chỉnh tồn kho" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
            <select
              value={form.productId}
              onChange={e => setForm({ ...form, productId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none bg-white"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (tồn: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
            <div className="grid grid-cols-2 gap-2">
              {TX_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, txType: t.value })}
                  className={`text-sm px-3 py-2 rounded-lg border text-left transition-all ${
                    form.txType === t.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            {form.txType === 'import' && 'Nhập kho: cộng thêm số lượng vào tồn kho hiện tại'}
            {form.txType === 'export' && 'Xuất kho: trừ số lượng khỏi tồn kho hiện tại'}
            {form.txType === 'adjust' && 'Điều chỉnh: đặt tồn kho về đúng số lượng nhập vào'}
            {form.txType === 'return' && 'Trả hàng: cộng lại hàng trả vào tồn kho'}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số lượng {form.txType === 'adjust' ? '(tồn kho mới)' : ''}
            </label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              placeholder={form.txType === 'adjust' ? 'Nhập số tồn kho thực tế' : 'Nhập số lượng'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <input
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="VD: Nhập hàng từ nhà cung cấp ABC"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button
              onClick={adjust}
              disabled={saving || !form.productId || !form.quantity}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700"
            >
              {saving ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
