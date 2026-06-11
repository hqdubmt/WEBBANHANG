'use client';
import { useEffect, useState } from 'react';
import { affiliatePortalApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-600',
  rejected: 'bg-gray-100 text-gray-500',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-indigo-100 text-indigo-700',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

export default function AffiliatesPage() {
  const [tab, setTab] = useState<'partners' | 'conversions'>('partners');
  const [partners, setPartners] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [partnerTotal, setPartnerTotal] = useState(0);
  const [conversionTotal, setConversionTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadPartners = async () => {
    setLoading(true);
    const [res, s] = await Promise.all([
      affiliatePortalApi.listPartners({ page: '1', limit: '50' }).catch(() => ({ items: [], total: 0 })),
      affiliatePortalApi.statsPartners().catch(() => null),
    ]);
    setPartners(res.items);
    setPartnerTotal(res.total);
    setStats(s);
    setLoading(false);
  };

  const loadConversions = async () => {
    setLoading(true);
    const res = await affiliatePortalApi.listConversions({ page: '1', limit: '50' }).catch(() => ({ items: [], total: 0 }));
    setConversions(res.items);
    setConversionTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'partners') loadPartners();
    else loadConversions();
  }, [tab]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', email: '', phone: '', website: '', socialFacebook: '', socialTiktok: '', commissionRate: '5' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, commissionRate: Number(form.commissionRate) };
      if (editItem) await affiliatePortalApi.updatePartner(editItem.id, body);
      else await affiliatePortalApi.createPartner(body);
      setModal(false);
      loadPartners();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const approve = async (id: string) => {
    await affiliatePortalApi.approvePartner(id).catch(() => {});
    loadPartners();
  };

  const suspend = async (id: string) => {
    if (!confirm('Tạm dừng partner này?')) return;
    await affiliatePortalApi.suspendPartner(id).catch(() => {});
    loadPartners();
  };

  const approveConversion = async (id: string) => {
    await affiliatePortalApi.approveConversion(id).catch(() => {});
    loadConversions();
  };

  const payConversion = async (id: string) => {
    await affiliatePortalApi.payConversion(id).catch(() => {});
    loadConversions();
  };

  return (
    <div>
      <PageHeader
        title="🤝 Affiliate Portal"
        subtitle={`${partnerTotal} partners | ${conversionTotal} conversions`}
        action={
          tab === 'partners' && (
            <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Thêm partner
            </button>
          )
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Tổng partners', value: stats.total, color: 'text-gray-800' },
            { label: 'Đang hoạt động', value: stats.active, color: 'text-green-600' },
            { label: 'Chờ duyệt', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Hoa hồng tổng', value: fmtVND(stats.totalCommission), color: 'text-indigo-600' },
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
        {(['partners', 'conversions'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'partners' ? '🤝 Partners' : '💰 Conversions'}
          </button>
        ))}
      </div>

      {tab === 'partners' ? (
        <DataTable
          loading={loading}
          data={partners}
          columns={[
            { key: 'name', label: 'Partner', render: (r) => (
              <div>
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-400">{r.email}</div>
              </div>
            )},
            { key: 'referralCode', label: 'Code', render: (r) => (
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.referralCode}</span>
            )},
            { key: 'tier', label: 'Tier', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[r.tier] || 'bg-gray-100 text-gray-500'}`}>{r.tier}</span>
            )},
            { key: 'commissionRate', label: 'Hoa hồng', render: (r) => <span className="font-medium text-indigo-700">{r.commissionRate}%</span> },
            { key: 'totalEarned', label: 'Đã kiếm', render: (r) => <span className="font-medium text-green-600">{fmtVND(r.totalEarned)}</span> },
            { key: 'totalClicks', label: 'Clicks', hideOnMobile: true, render: (r) => (
              <div className="text-sm">
                <span className="text-gray-700">{r.totalClicks}</span>
                <span className="text-gray-400 ml-1">→ {r.totalConversions}</span>
              </div>
            )},
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <button onClick={() => approve(r.id)} className="text-xs text-green-600 hover:underline whitespace-nowrap">Duyệt</button>
                )}
                {r.status === 'active' && (
                  <button onClick={() => suspend(r.id)} className="text-xs text-red-500 hover:underline">Tạm dừng</button>
                )}
              </div>
            )},
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          data={conversions}
          columns={[
            { key: 'referralCode', label: 'Code', render: (r) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.referralCode}</span> },
            { key: 'productName', label: 'Sản phẩm', render: (r) => <span className="text-sm">{r.productName || '—'}</span> },
            { key: 'orderValue', label: 'Giá trị đơn', render: (r) => <span className="font-medium">{fmtVND(r.orderValue)}</span> },
            { key: 'commissionRate', label: 'Tỷ lệ', render: (r) => <span className="text-indigo-700">{r.commissionRate}%</span> },
            { key: 'commissionAmount', label: 'Hoa hồng', render: (r) => <span className="font-medium text-green-600">{fmtVND(r.commissionAmount)}</span> },
            { key: 'status', label: 'TT', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <button onClick={() => approveConversion(r.id)} className="text-xs text-blue-600 hover:underline">Duyệt</button>
                )}
                {r.status === 'approved' && (
                  <button onClick={() => payConversion(r.id)} className="text-xs text-green-600 hover:underline">Thanh toán</button>
                )}
              </div>
            )},
          ]}
        />
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Sửa affiliate partner' : 'Thêm affiliate partner'}>
        <div className="space-y-3">
          {[
            { k: 'name', l: 'Tên đầy đủ *' },
            { k: 'email', l: 'Email *' },
            { k: 'phone', l: 'SĐT' },
            { k: 'website', l: 'Website' },
            { k: 'socialFacebook', l: 'Facebook' },
            { k: 'socialTiktok', l: 'TikTok' },
            { k: 'commissionRate', l: 'Tỷ lệ hoa hồng (%)' },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
              <input
                type={k === 'commissionRate' ? 'number' : 'text'}
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
