'use client';
import { useEffect, useState } from 'react';
import { whiteLabelApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const STATUS_COLORS: Record<string, string> = {
  onboarding: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-orange-100 text-orange-700',
  churned: 'bg-red-100 text-red-700',
};

export default function WhiteLabelPage() {
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyName: '', domain: '', contactEmail: '', monthlyFee: '' });

  const reload = async () => {
    const [s, c, a] = await Promise.all([
      whiteLabelApi.stats().catch(() => null),
      whiteLabelApi.list().catch(() => []),
      whiteLabelApi.agentStats().catch(() => null),
    ]);
    setStats(s); setClients(Array.isArray(c) ? c : []); setAgentStats(a);
  };

  useEffect(() => { reload().then(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    if (!form.companyName || !form.domain) return;
    await whiteLabelApi.create({ ...form, monthlyFee: parseFloat(form.monthlyFee) || 0 }).catch(() => null);
    await reload();
    setShowForm(false);
    setForm({ companyName: '', domain: '', contactEmail: '', monthlyFee: '' });
  };

  const handleCompleteOnboarding = async (id: string) => {
    await whiteLabelApi.completeOnboarding(id).catch(() => null);
    await reload();
  };

  const handleRunAgent = async () => {
    setAgentRunning(true);
    await whiteLabelApi.agentRun().catch(() => null);
    setAgentRunning(false);
    const a = await whiteLabelApi.agentStats().catch(() => null);
    setAgentStats(a);
  };

  if (loading) return <div className="p-6 text-gray-500">Đang tải...</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="White Label Portal" subtitle="Quản lý clients, onboarding, MRR" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Tổng Clients</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats?.active ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">MRR</div>
          <div className="text-2xl font-bold text-blue-600">{fmtVND(stats?.monthlyRecurringRevenue)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Avg Onboarding</div>
          <div className="text-2xl font-bold text-purple-600">{stats?.avgOnboardingDays ?? '—'} ngày</div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.inactiveRiskCount > 0 || stats?.totalCustomizationBacklog > 10) && (
        <div className="space-y-2">
          {stats?.inactiveRiskClients?.map((c: any) => (
            <div key={c.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
              Inactive Risk — <b>{c.name}</b>: không hoạt động{' '}
              {c.lastActiveAt ? `từ ${new Date(c.lastActiveAt).toLocaleDateString('vi-VN')}` : '(chưa từng active)'}
            </div>
          ))}
          {stats?.totalCustomizationBacklog > 10 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Customization backlog cao: <b>{stats.totalCustomizationBacklog} requests</b> đang chờ xử lý
            </div>
          )}
        </div>
      )}

      {/* Agent */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-800">Agent 25 — Whitelabel Onboarding</div>
          <div className="text-sm text-gray-500">Cron mỗi 4h | Theo dõi tiến độ onboarding, inactive risk</div>
          {agentStats?.recentRuns?.[0] && (
            <div className="text-xs text-gray-400 mt-1">
              Lần chạy gần nhất: {agentStats.recentRuns[0].status} —{' '}
              {new Date(agentStats.recentRuns[0].createdAt).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
        <button
          onClick={handleRunAgent}
          disabled={agentRunning}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {agentRunning ? 'Đang chạy...' : 'Chạy ngay'}
        </button>
      </div>

      {/* Client list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold text-gray-800">Clients ({clients.length})</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            + Thêm Client
          </button>
        </div>

        {showForm && (
          <div className="p-4 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-4 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Tên công ty *"
              value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Domain *"
              value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email liên hệ"
              value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Monthly fee (VND)"
              value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: e.target.value })} />
            <button onClick={handleCreate}
              className="col-span-2 md:col-span-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Tạo client
            </button>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Domain</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Monthly Fee</th>
              <th className="px-4 py-3 text-right">Backlog</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có client nào</td></tr>
            )}
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{c.companyName}</div>
                  <div className="text-gray-400 text-xs">{c.contactEmail}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">{c.domain}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtVND(c.monthlyFee)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={c.customizationBacklog > 5 ? 'text-orange-600 font-bold' : 'text-gray-500'}>
                    {c.customizationBacklog}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {c.status === 'onboarding' && (
                    <button
                      onClick={() => handleCompleteOnboarding(c.id)}
                      className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                    >
                      Hoàn thành onboarding
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
