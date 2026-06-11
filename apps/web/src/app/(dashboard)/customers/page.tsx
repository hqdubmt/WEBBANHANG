'use client';
import { useEffect, useState } from 'react';
import { customersApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';

const TIER_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  regular: 'bg-blue-100 text-blue-700',
  vip: 'bg-purple-100 text-purple-700',
  potential: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-red-100 text-red-500',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params: any = { page: String(page), limit: '20' };
    if (search) params.search = search;
    if (tier) params.tier = tier;
    const res = await customersApi.list(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 }));
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search, tier]);

  return (
    <div>
      <PageHeader title="👥 Khách hàng" subtitle={`${total} khách hàng`} />

      <div className="mb-4 flex gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:border-indigo-400 outline-none"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
          <option value="">Tất cả tier</option>
          {['new', 'regular', 'vip', 'potential', 'inactive'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'name', label: 'Tên', render: (r) => (
            <div>
              <div className="font-medium text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-400">{r.phone || r.email}</div>
            </div>
          )},
          { key: 'tier', label: 'Tier', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[r.tier] || 'bg-gray-100'}`}>
              {r.tier}
            </span>
          )},
          { key: 'totalOrders', label: 'Đơn hàng', render: (r) => r.totalOrders || 0 },
          { key: 'totalSpent', label: 'Đã chi', render: (r) => <span className="font-medium text-green-700">{fmtVND(r.totalSpent)}</span> },
          { key: 'createdAt', label: 'Ngày tham gia', render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} khách</span>
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
