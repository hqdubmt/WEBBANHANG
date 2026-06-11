'use client';
import { useEffect, useState } from 'react';
import { mobileApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

export default function MobileMetricsPage() {
  const [stats, setStats] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      mobileApi.stats().catch(() => null),
      mobileApi.retention().catch(() => null),
      mobileApi.agentStats().catch(() => null),
    ]).then(([s, r, a]) => {
      setStats(s); setRetention(r); setAgentStats(a);
      setLoading(false);
    });
  }, []);

  const handleRunAgent = async () => {
    setAgentRunning(true);
    await mobileApi.agentRun().catch(() => null);
    setAgentRunning(false);
    const a = await mobileApi.agentStats().catch(() => null);
    setAgentStats(a);
  };

  if (loading) return <div className="p-6 text-gray-500">Đang tải...</div>;

  const crashAlert = stats?.crashAlert;
  const retentionD7 = parseFloat(retention?.d7Retention || '0');
  const retentionAlert = retentionD7 < 20;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Mobile App Metrics" subtitle="DAU/MAU, crash rate, retention, push engagement" />

      {/* Alerts */}
      {(crashAlert || retentionAlert) && (
        <div className="space-y-2">
          {crashAlert && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              CRITICAL: Crash rate <b>{stats.crashRatePercent}%</b> vượt ngưỡng 1% — cần deploy hotfix ngay
            </div>
          )}
          {retentionAlert && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
              WARNING: D7 Retention <b>{retention?.d7Retention}%</b> thấp hơn mục tiêu 20% — review onboarding flow
            </div>
          )}
        </div>
      )}

      {/* Core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">DAU (hôm nay)</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.dau?.toLocaleString() ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">WAU (7 ngày)</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.wau?.toLocaleString() ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">MAU (30 ngày)</div>
          <div className="text-2xl font-bold text-indigo-600">{stats?.mau?.toLocaleString() ?? 0}</div>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border ${crashAlert ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className="text-sm text-gray-500">Crash Rate</div>
          <div className={`text-2xl font-bold ${crashAlert ? 'text-red-600' : 'text-green-600'}`}>
            {stats?.crashRatePercent ?? 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Avg Session Duration</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.avgSessionSeconds ?? 0}s</div>
        </div>

        {/* Retention */}
        {retention && (
          <>
            <div className={`rounded-xl p-4 shadow-sm border ${parseFloat(retention.d1Retention) < 30 ? 'bg-orange-50' : 'bg-white'}`}>
              <div className="text-sm text-gray-500">D1 Retention</div>
              <div className={`text-2xl font-bold ${parseFloat(retention.d1Retention) < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                {retention.d1Retention}%
              </div>
              <div className="text-xs text-gray-400 mt-1">Cohort: {retention.cohortSize} users</div>
            </div>
            <div className={`rounded-xl p-4 shadow-sm border ${retentionAlert ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className="text-sm text-gray-500">D7 Retention</div>
              <div className={`text-2xl font-bold ${retentionAlert ? 'text-orange-600' : 'text-green-600'}`}>
                {retention.d7Retention}%
              </div>
              <div className="text-xs text-gray-400">Target: &gt;20%</div>
            </div>
          </>
        )}
      </div>

      {/* Platform breakdown */}
      {stats?.byPlatform?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-3">Platform Breakdown (7 ngày)</h3>
          <div className="flex gap-4">
            {stats.byPlatform.map((p: any) => (
              <div key={p.platform} className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  p.platform === 'ios' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                }`}>
                  {p.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                </span>
                <span className="text-gray-600 text-sm">{parseInt(p.count).toLocaleString()} sessions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-800">Agent 23 — Mobile Engagement</div>
          <div className="text-sm text-gray-500">Cron mỗi 12h | Phân tích crash, retention, push strategy</div>
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
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {agentRunning ? 'Đang chạy...' : 'Chạy ngay'}
        </button>
      </div>

      {/* Recent runs */}
      {agentStats?.recentRuns?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b font-semibold text-gray-800">Lịch sử chạy gần đây</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agentStats.recentRuns.map((r: any) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-gray-600">{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      r.status === 'success' ? 'bg-green-100 text-green-700' :
                      r.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
