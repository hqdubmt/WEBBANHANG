'use client';
import { useEffect, useState } from 'react';
import { enterpriseApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-orange-100 text-orange-700',
  churned: 'bg-red-100 text-red-700',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function EnterprisePage() {
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', contactEmail: '', plan: 'starter' });

  useEffect(() => {
    Promise.all([
      enterpriseApi.stats().catch(() => null),
      enterpriseApi.list().catch(() => []),
      enterpriseApi.agentStats().catch(() => null),
    ]).then(([s, t, a]) => {
      setStats(s);
      setTenants(Array.isArray(t) ? t : []);
      setAgentStats(a);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.slug) return;
    await enterpriseApi.create(form).catch(() => null);
    const [s, t] = await Promise.all([enterpriseApi.stats(), enterpriseApi.list()]);
    setStats(s); setTenants(Array.isArray(t) ? t : []);
    setShowForm(false);
    setForm({ name: '', slug: '', contactEmail: '', plan: 'starter' });
  };

  const handleRunAgent = async () => {
    setAgentRunning(true);
    const result = await enterpriseApi.agentRun().catch(() => null);
    setAgentRunning(false);
    const a = await enterpriseApi.agentStats().catch(() => null);
    setAgentStats(a);
  };

  if (loading) return <div className="p-6 text-gray-500">Đang tải...</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Enterprise Management" subtitle="Quản lý tenants, SLA, churn risk" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Tổng Tenants</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats?.active ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">MRR</div>
          <div className="text-2xl font-bold text-blue-600">{fmtVND(stats?.totalMonthlyRevenue)}</div>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border ${(stats?.slaViolationCount ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className="text-sm text-gray-500">SLA Violations</div>
          <div className={`text-2xl font-bold ${(stats?.slaViolationCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {stats?.slaViolationCount ?? 0}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.slaViolationCount > 0 || stats?.churnRiskCount > 0) && (
        <div className="space-y-2">
          {stats?.slaViolations?.map((v: any) => (
            <div key={v.tenantId} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              P0 SLA VIOLATION — <b>{v.name}</b>: uptime {v.uptime}% &lt; target {v.target}%
            </div>
          ))}
          {stats?.churnRiskTenants?.map((c: any) => (
            <div key={c.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              Churn Risk — <b>{c.name}</b>: chưa đăng nhập {c.lastLoginAt ? `từ ${new Date(c.lastLoginAt).toLocaleDateString('vi-VN')}` : '(chưa từng login)'}
            </div>
          ))}
        </div>
      )}

      {/* Agent */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-800">Agent 24 — Enterprise Health</div>
          <div className="text-sm text-gray-500">Cron mỗi 1h | Kiểm tra SLA, churn, API abuse</div>
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
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {agentRunning ? 'Đang chạy...' : 'Chạy ngay'}
        </button>
      </div>

      {/* Tenant list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="font-semibold text-gray-800">Danh sách Tenants ({tenants.length})</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Thêm Tenant
          </button>
        </div>

        {showForm && (
          <div className="p-4 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Tên tenant *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Slug *"
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Email liên hệ"
              value={form.contactEmail}
              onChange={e => setForm({ ...form, contactEmail: e.target.value })}
            />
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.plan}
              onChange={e => setForm({ ...form, plan: e.target.value })}
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              onClick={handleCreate}
              className="col-span-2 md:col-span-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Tạo tenant
            </button>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Uptime</th>
              <th className="px-4 py-3 text-right">MRR</th>
              <th className="px-4 py-3 text-right">API hôm nay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có tenant nào</td></tr>
            )}
            {tenants.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[t.plan] || ''}`}>
                    {t.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>
                    {t.status}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono text-xs ${parseFloat(t.uptimePercent) < t.slaTarget ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                  {parseFloat(t.uptimePercent).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtVND(t.monthlyRevenue)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {t.apiCallsToday?.toLocaleString()} / {t.apiQuotaDaily?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
