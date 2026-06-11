'use client';
import { useEffect, useState } from 'react';
import { ordersApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

export default function OrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const params: any = { page: String(page), limit: '20' };
    if (statusFilter) params.status = statusFilter;
    const [res, rev] = await Promise.all([
      ordersApi.list(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 })),
      ordersApi.revenue().catch(() => null),
    ]);
    setItems(res.items);
    setTotal(res.total);
    setRevenue(rev);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await ordersApi.updateStatus(id, status).catch(() => {});
    load();
  };

  return (
    <div>
      <PageHeader title="🛒 Đơn hàng" subtitle={`${total} đơn hàng`} />

      {/* Revenue summary */}
      {revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Tổng doanh thu', value: fmtVND(revenue.total), icon: '💰' },
            { label: 'Tổng đơn hàng', value: revenue.orders, icon: '📦' },
            { label: 'Đơn trung bình', value: fmtVND(revenue.avgOrder), icon: '📊' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">{s.icon} {s.label}</div>
              <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none w-full sm:w-auto"
        >
          <option value="">Tất cả trạng thái</option>
          {['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'orderCode', label: 'Mã đơn', render: (r) => <span className="font-mono text-xs font-semibold text-indigo-700 whitespace-nowrap">{r.orderCode}</span> },
          { key: 'total', label: 'Tổng tiền', render: (r) => <span className="font-semibold text-gray-900 whitespace-nowrap">{fmtVND(r.total)}</span> },
          { key: 'status', label: 'Trạng thái', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
              {r.status}
            </span>
          )},
          { key: 'source', label: 'Kênh', hideOnMobile: true, render: (r) => <span className="text-xs text-gray-400">{r.source || 'website'}</span> },
          { key: 'createdAt', label: 'Ngày tạo', hideOnMobile: true, render: (r) => <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.createdAt)}</span> },
          { key: 'actions', label: 'Đổi TT', render: (r) => (
            <select
              value={r.status}
              onChange={(e) => updateStatus(r.id, e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
            >
              {['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )},
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} đơn</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-40">◀</button>
            <span className="px-3 py-1">Trang {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 border rounded-md disabled:opacity-40">▶</button>
          </div>
        </div>
      )}
    </div>
  );
}
