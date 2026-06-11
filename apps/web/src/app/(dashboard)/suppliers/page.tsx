'use client';
import { useEffect, useState } from 'react';
import { suppliersApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [tab, setTab] = useState<'suppliers' | 'products'>('suppliers');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'supplier' | 'product'>('supplier');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    const res = await suppliersApi.list().catch(() => []);
    setSuppliers(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  const loadProducts = async () => {
    setLoading(true);
    const res = await suppliersApi.listProducts({ page: '1', limit: '50' }).catch(() => ({ items: [], total: 0 }));
    setProducts(res.items);
    setProductTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'suppliers') loadSuppliers();
    else loadProducts();
  }, [tab]);

  const openCreate = (type: 'supplier' | 'product') => {
    setEditItem(null);
    setModalType(type);
    setForm(type === 'supplier'
      ? { name: '', contactName: '', phone: '', email: '', address: '', taxCode: '', status: 'active' }
      : { supplierId: '', name: '', sku: '', importPrice: '', suggestedRetailPrice: '', stock: '0', unit: 'cái', category: '' });
    setModal(true);
  };

  const openEdit = (item: any, type: 'supplier' | 'product') => {
    setEditItem(item);
    setModalType(type);
    setForm(type === 'supplier'
      ? { name: item.name, contactName: item.contactName || '', phone: item.phone || '', email: item.email || '', address: item.address || '', taxCode: item.taxCode || '', status: item.status }
      : { supplierId: item.supplierId || '', name: item.name, sku: item.sku || '', importPrice: String(item.importPrice), suggestedRetailPrice: String(item.suggestedRetailPrice), stock: String(item.stock), unit: item.unit || 'cái', category: item.category || '' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modalType === 'supplier') {
        if (editItem) await suppliersApi.update(editItem.id, form);
        else await suppliersApi.create(form);
        loadSuppliers();
      } else {
        const body = { ...form, importPrice: Number(form.importPrice), suggestedRetailPrice: Number(form.suggestedRetailPrice), stock: Number(form.stock) };
        if (editItem) await suppliersApi.updateProduct(editItem.id, body);
        else await suppliersApi.createProduct(body);
        loadProducts();
      }
      setModal(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const removeSupplier = async (id: string) => {
    if (!confirm('Xóa nhà cung cấp này?')) return;
    await suppliersApi.delete(id).catch(() => {});
    loadSuppliers();
  };

  const removeProduct = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    await suppliersApi.deleteProduct(id).catch(() => {});
    loadProducts();
  };

  return (
    <div>
      <PageHeader
        title="🏭 Nhà cung cấp"
        subtitle={`${suppliers.length} nhà cung cấp | ${productTotal} sản phẩm`}
        action={
          <div className="flex gap-2">
            <button onClick={() => openCreate('supplier')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Thêm NCC
            </button>
            {tab === 'products' && (
              <button onClick={() => openCreate('product')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + Thêm sản phẩm
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {(['suppliers', 'products'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'suppliers' ? '🏭 Nhà cung cấp' : '📦 Sản phẩm NCC'}
          </button>
        ))}
      </div>

      {tab === 'suppliers' ? (
        <DataTable
          loading={loading}
          data={suppliers}
          columns={[
            { key: 'name', label: 'Tên NCC', render: (r) => (
              <div>
                <div className="font-medium text-gray-900">{r.name}</div>
                {r.contactName && <div className="text-xs text-gray-400">{r.contactName}</div>}
              </div>
            )},
            { key: 'phone', label: 'SĐT', render: (r) => <span className="text-sm text-gray-600">{r.phone || '—'}</span> },
            { key: 'email', label: 'Email', hideOnMobile: true, render: (r) => <span className="text-sm text-gray-600">{r.email || '—'}</span> },
            { key: 'rating', label: 'Rating', render: (r) => (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium">{Number(r.rating || 0).toFixed(1)}</span>
              </div>
            )},
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(r, 'supplier')} className="text-xs text-indigo-600 hover:underline">Sửa</button>
                <button onClick={() => removeSupplier(r.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
              </div>
            )},
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          data={products}
          columns={[
            { key: 'name', label: 'Sản phẩm', render: (r) => (
              <div>
                <div className="font-medium text-gray-900">{r.name}</div>
                {r.sku && <div className="text-xs text-gray-400">SKU: {r.sku}</div>}
              </div>
            )},
            { key: 'supplierName', label: 'Nhà cung cấp', hideOnMobile: true, render: (r) => <span className="text-sm text-gray-600">{r.supplierName || '—'}</span> },
            { key: 'importPrice', label: 'Giá nhập', render: (r) => <span className="font-medium text-red-600">{fmtVND(r.importPrice)}</span> },
            { key: 'suggestedRetailPrice', label: 'Giá đề xuất', render: (r) => <span className="font-medium text-green-600">{fmtVND(r.suggestedRetailPrice)}</span> },
            { key: 'stock', label: 'Tồn', render: (r) => <span className={`font-medium ${r.stock <= 0 ? 'text-red-600' : 'text-gray-700'}`}>{r.stock}</span> },
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(r, 'product')} className="text-xs text-indigo-600 hover:underline">Sửa</button>
                <button onClick={() => removeProduct(r.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
              </div>
            )},
          ]}
        />
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={
        modalType === 'supplier'
          ? (editItem ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp')
          : (editItem ? 'Sửa sản phẩm NCC' : 'Thêm sản phẩm NCC')
      }>
        <div className="space-y-3">
          {modalType === 'supplier' ? (
            <>
              {(['name', 'contactName', 'phone', 'email', 'address', 'taxCode'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field === 'name' ? 'Tên NCC *' : field === 'contactName' ? 'Người liên hệ' : field === 'phone' ? 'SĐT' : field === 'email' ? 'Email' : field === 'address' ? 'Địa chỉ' : 'Mã số thuế'}
                  </label>
                  <input value={form[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { k: 'name', l: 'Tên sản phẩm *' },
                { k: 'sku', l: 'SKU' },
                { k: 'supplierId', l: 'Supplier ID' },
                { k: 'importPrice', l: 'Giá nhập (VND)' },
                { k: 'suggestedRetailPrice', l: 'Giá đề xuất (VND)' },
                { k: 'stock', l: 'Tồn kho' },
                { k: 'unit', l: 'Đơn vị' },
                { k: 'category', l: 'Danh mục' },
              ].map(({ k, l }) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                  <input
                    type={['importPrice', 'suggestedRetailPrice', 'stock'].includes(k) ? 'number' : 'text'}
                    value={form[k] || ''}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
                  />
                </div>
              ))}
            </>
          )}
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
