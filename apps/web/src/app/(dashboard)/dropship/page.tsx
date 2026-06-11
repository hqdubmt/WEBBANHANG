'use client';
import { useEffect, useState } from 'react';
import { dropshipApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  out_of_stock: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

export default function DropshipPage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [prodTotal, setProdTotal] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [productStats, setProductStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalType, setModalType] = useState<'product' | 'order'>('product');
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const [res, stats] = await Promise.all([
      dropshipApi.listProducts({ page: '1', limit: '50' }).catch(() => ({ items: [], total: 0 })),
      dropshipApi.statsProducts().catch(() => null),
    ]);
    setProducts(res.items);
    setProdTotal(res.total);
    setProductStats(stats);
    setLoading(false);
  };

  const loadOrders = async () => {
    setLoading(true);
    const [res, stats] = await Promise.all([
      dropshipApi.listOrders({ page: '1', limit: '50' }).catch(() => ({ items: [], total: 0 })),
      dropshipApi.statsOrders().catch(() => null),
    ]);
    setOrders(res.items);
    setOrderTotal(res.total);
    setOrderStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'products') loadProducts();
    else loadOrders();
  }, [tab]);

  const openProduct = (item?: any) => {
    setEditItem(item || null);
    setModalType('product');
    setForm(item
      ? { name: item.name, supplierName: item.supplierName || '', costPrice: String(item.costPrice), suggestedPrice: String(item.suggestedPrice), stock: String(item.stock), category: item.category || '', sourcePlatform: item.sourcePlatform || '' }
      : { name: '', supplierName: '', costPrice: '', suggestedPrice: '', stock: '0', category: '', sourcePlatform: '' });
    setModal(true);
  };

  const openOrder = () => {
    setEditItem(null);
    setModalType('order');
    setForm({ dropshipProductId: '', salePrice: '', customerName: '', customerPhone: '', customerAddress: '', quantity: '1' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modalType === 'product') {
        const body = { ...form, costPrice: Number(form.costPrice), suggestedPrice: Number(form.suggestedPrice), stock: Number(form.stock) };
        if (editItem) await dropshipApi.updateProduct(editItem.id, body);
        else await dropshipApi.createProduct(body);
        loadProducts();
      } else {
        await dropshipApi.createOrder({ ...form, salePrice: Number(form.salePrice), quantity: Number(form.quantity) });
        loadOrders();
      }
      setModal(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await dropshipApi.updateOrderStatus(id, status).catch(() => {});
    loadOrders();
  };

  return (
    <div>
      <PageHeader
        title="📦 Dropship Portal"
        subtitle={`${prodTotal} sản phẩm | ${orderTotal} đơn hàng`}
        action={
          tab === 'products' ? (
            <button onClick={() => openProduct()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Thêm sản phẩm
            </button>
          ) : (
            <button onClick={openOrder} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Tạo đơn
            </button>
          )
        }
      />

      {/* Stats */}
      {tab === 'products' && productStats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Tổng SP', value: productStats.total, color: 'text-gray-800' },
            { label: 'Đang bán', value: productStats.active, color: 'text-green-600' },
            { label: 'Hết hàng', value: productStats.outOfStock, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && orderStats && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Tổng đơn', value: orderStats.total, color: 'text-gray-800' },
            { label: 'Chờ xử lý', value: orderStats.pending, color: 'text-yellow-600' },
            { label: 'Đã giao', value: orderStats.delivered, color: 'text-green-600' },
            { label: 'Lợi nhuận', value: fmtVND(orderStats.totalProfit), color: 'text-indigo-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {(['products', 'orders'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'products' ? '📦 Sản phẩm' : '🛒 Đơn hàng'}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <DataTable
          loading={loading}
          data={products}
          columns={[
            { key: 'name', label: 'Sản phẩm', render: (r) => (
              <div>
                <div className="font-medium text-gray-900">{r.name}</div>
                {r.supplierName && <div className="text-xs text-gray-400">{r.supplierName}</div>}
              </div>
            )},
            { key: 'costPrice', label: 'Giá nhập', render: (r) => <span className="text-red-600 font-medium">{fmtVND(r.costPrice)}</span> },
            { key: 'suggestedPrice', label: 'Giá bán đề xuất', render: (r) => <span className="text-green-600 font-medium">{fmtVND(r.suggestedPrice)}</span> },
            { key: 'profitMargin', label: 'Margin', hideOnMobile: true, render: (r) => {
              const margin = r.costPrice > 0 ? ((Number(r.suggestedPrice) - Number(r.costPrice)) / Number(r.costPrice) * 100).toFixed(1) : '0';
              return <span className="text-indigo-600 font-medium">{margin}%</span>;
            }},
            { key: 'stock', label: 'Tồn', render: (r) => <span className={`font-medium ${r.stock <= 0 ? 'text-red-600' : 'text-gray-700'}`}>{r.stock}</span> },
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <button onClick={() => openProduct(r)} className="text-xs text-indigo-600 hover:underline">Sửa</button>
            )},
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          data={orders}
          columns={[
            { key: 'orderCode', label: 'Mã đơn', render: (r) => <span className="font-mono text-sm text-indigo-700">{r.orderCode}</span> },
            { key: 'productName', label: 'Sản phẩm', render: (r) => (
              <div>
                <div className="font-medium text-gray-900 text-sm">{r.productName}</div>
                <div className="text-xs text-gray-400">x{r.quantity}</div>
              </div>
            )},
            { key: 'customerName', label: 'Khách hàng', render: (r) => (
              <div>
                <div className="text-sm font-medium">{r.customerName}</div>
                <div className="text-xs text-gray-400">{r.customerPhone}</div>
              </div>
            )},
            { key: 'salePrice', label: 'Giá bán', render: (r) => <span className="font-medium text-green-600">{fmtVND(r.salePrice)}</span> },
            { key: 'profit', label: 'Lợi nhuận', render: (r) => <span className="font-medium text-indigo-700">{fmtVND(r.profit)}</span> },
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <select
                className="text-xs border border-gray-200 rounded px-1 py-0.5"
                value={r.status}
                onChange={(e) => updateStatus(r.id, e.target.value)}
              >
                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )},
          ]}
        />
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={
        modalType === 'product' ? (editItem ? 'Sửa sản phẩm dropship' : 'Thêm sản phẩm dropship') : 'Tạo đơn dropship'
      }>
        <div className="space-y-3">
          {(modalType === 'product' ? [
              { k: 'name', l: 'Tên sản phẩm *' },
              { k: 'supplierName', l: 'Nhà cung cấp' },
              { k: 'costPrice', l: 'Giá nhập (VND)' },
              { k: 'suggestedPrice', l: 'Giá bán đề xuất (VND)' },
              { k: 'stock', l: 'Tồn kho' },
              { k: 'category', l: 'Danh mục' },
              { k: 'sourcePlatform', l: 'Nguồn (Shopee/Lazada/...)' },
            ] : [
              { k: 'dropshipProductId', l: 'ID sản phẩm dropship *' },
              { k: 'salePrice', l: 'Giá bán (VND) *' },
              { k: 'quantity', l: 'Số lượng' },
              { k: 'customerName', l: 'Tên khách hàng *' },
              { k: 'customerPhone', l: 'SĐT khách' },
              { k: 'customerAddress', l: 'Địa chỉ giao hàng' },
            ]).map(({ k, l }) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
              <input
                type={['costPrice', 'suggestedPrice', 'stock', 'salePrice', 'quantity'].includes(k) ? 'number' : 'text'}
                value={form[k] || ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
              />
            </div>
          ))}
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
