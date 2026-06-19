'use client';
import { useEffect, useState } from 'react';
import { customersApi, api } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import StatCard from '@/components/StatCard';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
  diamond: 'bg-blue-100 text-blue-700',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (search) params.search = search;
    if (tierFilter) params.tier = tierFilter;
    Promise.all([
      customersApi.list(params).catch(() => ({ items: [], total: 0 })),
      api.get<any>('/customers/stats').catch(() => null),
    ]).then(([res, s]) => {
      setItems(res.items || []);
      setTotal(res.total || 0);
      setStats(s);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [page, search, tierFilter]);

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '', address: '' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/customers', form);
      setModal(false);
      load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const openDetail = async (id: string) => {
    try {
      const d = await customersApi.get(id);
      setDetail(d);
      setDetailModal(true);
    } catch { /* ignore */ }
  };

  const deleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Xoá vĩnh viễn khách hàng "${name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await customersApi.delete(id);
      setDetailModal(false);
      load();
    } catch (e: any) { alert(e.message || 'Không có quyền xoá'); }
  };

  return (
    <div>
      <PageHeader
        title="👥 Khách hàng"
        subtitle={`${total} khách hàng`}
        action={
          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Thêm khách hàng
          </button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <StatCard label="Tổng khách hàng" value={total} icon="👥" color="blue" />
          <StatCard label="Đã gửi follow-up" value={stats.sent || 0} icon="📤" color="green" />
          <StatCard label="Đang chờ" value={stats.pending || 0} icon="⏳" color="yellow" />
          <StatCard label="Tổng" value={stats.total || 0} icon="📊" color="purple" />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
          placeholder="Tìm tên, email, SĐT..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
        >
          <option value="">Tất cả hạng</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="diamond">Diamond</option>
        </select>
      </div>

      <DataTable
        loading={loading}
        data={items}
        emptyText="Chưa có khách hàng nào"
        columns={[
          { key: 'name', label: 'Tên khách hàng', render: (r) => (
            <div>
              <button
                onClick={() => openDetail(r.id)}
                className="font-medium text-indigo-600 hover:underline text-left"
              >
                {r.name || '(Chưa có tên)'}
              </button>
              {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
            </div>
          )},
          { key: 'phone', label: 'SĐT', render: (r) => <span className="text-sm text-gray-600">{r.phone || '-'}</span> },
          { key: 'tier', label: 'Hạng', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[r.tier] || 'bg-gray-100 text-gray-500'}`}>
              {r.tier || 'bronze'}
            </span>
          )},
          { key: 'totalSpent', label: 'Chi tiêu', hideOnMobile: true, render: (r) => (
            <span className="text-sm font-medium text-green-700">{fmtVND(r.totalSpent || 0)}</span>
          )},
          { key: 'totalOrders', label: 'Đơn', hideOnMobile: true, render: (r) => (
            <span className="text-sm text-gray-600">{r.totalOrders || 0}</span>
          )},
          { key: 'createdAt', label: 'Ngày tạo', hideOnMobile: true, render: (r) => (
            <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
          )},
          { key: 'actions', label: '', render: (r) => (
            <div className="flex gap-3 items-center">
              <button onClick={() => openDetail(r.id)} className="text-xs text-indigo-600 hover:underline">Chi tiết</button>
              <button
                onClick={() => deleteCustomer(r.id, r.name || 'khách hàng')}
                className="text-xs text-red-500 hover:text-red-700 hover:underline"
              >
                Xoá
              </button>
            </div>
          )},
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} khách hàng</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-40">◀</button>
            <span className="px-3 py-1">Trang {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 border rounded-md disabled:opacity-40">▶</button>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Thêm khách hàng">
        <div className="space-y-3">
          {[
            { field: 'name', label: 'Họ tên *' },
            { field: 'phone', label: 'Số điện thoại' },
            { field: 'email', label: 'Email' },
            { field: 'address', label: 'Địa chỉ' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
              />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>

      {detail && (
        <Modal open={detailModal} onClose={() => setDetailModal(false)} title={`👤 ${detail.name || 'Khách hàng'}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Email', detail.email || '-'],
                ['SĐT', detail.phone || '-'],
                ['Địa chỉ', detail.address || '-'],
                ['Hạng', detail.tier || 'bronze'],
                ['Chi tiêu', fmtVND(detail.totalSpent)],
                ['Tổng đơn', detail.totalOrders || 0],
                ['Điểm tích lũy', detail.loyaltyPoints || 0],
                ['Ngày tạo', fmtDate(detail.createdAt)],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900">{value}</div>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Ghi chú</div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">{detail.notes}</p>
              </div>
            )}
            <div className="pt-2 flex justify-end border-t border-gray-100">
              <button
                onClick={() => deleteCustomer(detail.id, detail.name)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
              >
                Xoá khách hàng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
