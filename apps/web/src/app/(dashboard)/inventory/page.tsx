'use client';
import { useEffect, useState } from 'react';
import { inventoryApi, productsApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import StatCard from '@/components/StatCard';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ productId: '', type: 'import', quantity: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      inventoryApi.lowStock().catch(() => []),
      inventoryApi.value().catch(() => null),
    ]).then(([ls, v]) => {
      setLowStock(ls);
      setValue(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    productsApi.list({ limit: '100' }).then((r) => setProducts(r.items)).catch(() => {});
  }, []);

  const adjust = async () => {
    setSaving(true);
    try {
      await inventoryApi.adjust({ ...form, quantity: Number(form.quantity) });
      setModal(false);
      setForm({ productId: '', type: 'import', quantity: '', note: '' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="🏭 Tồn kho"
        subtitle="Quản lý nhập/xuất kho"
        action={
          <button onClick={() => setModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Điều chỉnh kho
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng giá trị kho" value={fmtVND(value?.totalValue)} icon="💰" color="green" />
        <StatCard label="Tổng số lượng" value={value?.totalUnits?.toLocaleString() || 0} icon="📦" color="blue" />
        <StatCard label="Sắp hết hàng" value={lowStock.length} icon="⚠️" color="red" />
      </div>

      <h3 className="font-semibold text-gray-800 mb-3">⚠️ Sản phẩm sắp hết ({lowStock.length})</h3>
      <DataTable
        loading={loading}
        data={lowStock}
        emptyText="Không có sản phẩm nào sắp hết hàng ✅"
        columns={[
          { key: 'name', label: 'Sản phẩm', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'stock', label: 'Còn lại', render: (r) => (
            <span className="font-bold text-red-600">{r.stock}</span>
          )},
          { key: 'status', label: 'Trạng thái', render: (r) => (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">Sắp hết</span>
          )},
        ]}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Điều chỉnh tồn kho" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="">-- Chọn sản phẩm --</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjust">Điều chỉnh</option>
              <option value="return">Trả hàng</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={adjust} disabled={saving || !form.productId || !form.quantity}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
