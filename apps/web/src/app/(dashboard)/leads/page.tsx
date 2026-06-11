'use client';
import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-500',
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

export default function LeadsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params: any = { page: String(page), limit: '20' };
    if (status) params.status = status;
    if (platform) params.platform = platform;
    const res = await leadsApi.list(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 }));
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, status, platform]);

  return (
    <div>
      <PageHeader title="🎯 Leads" subtitle={`${total} leads`} />

      <div className="mb-4 flex gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
          <option value="">Tất cả trạng thái</option>
          {['new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
          <option value="">Tất cả nền tảng</option>
          {['facebook', 'tiktok', 'telegram', 'zalo', 'website', 'email'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'name', label: 'Tên lead', render: (r) => (
            <div>
              <div className="font-medium text-gray-900">{r.name || 'Ẩn danh'}</div>
              <div className="text-xs text-gray-400">{r.phone || r.email}</div>
            </div>
          )},
          { key: 'platform', label: 'Nền tảng', render: (r) => (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{r.platform}</span>
          )},
          { key: 'score', label: 'Score', render: (r) => (
            <div className="flex items-center gap-2">
              <div className="w-14 bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, r.score || 0)}%` }} />
              </div>
              <span className="text-xs font-medium">{r.score || 0}</span>
            </div>
          )},
          { key: 'status', label: 'Trạng thái', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
              {r.status}
            </span>
          )},
          { key: 'message', label: 'Tin nhắn', render: (r) => (
            <span className="text-xs text-gray-500 max-w-xs truncate block">{r.message || '-'}</span>
          )},
          { key: 'createdAt', label: 'Ngày', render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} leads</span>
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
