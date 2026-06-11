'use client';
import { useEffect, useState } from 'react';
import { agentsApi, analyticsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface Agent {
  key: string;
  name: string;
  icon: string;
  desc: string;
  runPath: string;
  statsPath?: string;
  cron: string;
}

const AGENTS: Agent[] = [
  { key: 'trend', name: 'Trend Hunter', icon: '🔥', desc: 'Quét xu hướng TikTok, FB, Google', cron: 'Cron 4h', runPath: '/agents/trend/run' },
  { key: 'affiliate', name: 'Affiliate Hunter', icon: '🔗', desc: 'Tìm sản phẩm affiliate Shopee/Lazada/TikTok', cron: 'Cron 6h', runPath: '/agents/affiliate/run' },
  { key: 'content', name: 'Content Creator', icon: '✍️', desc: 'Tạo nội dung Facebook, TikTok, Telegram', cron: 'Cron 1h', runPath: '/agents/content/run' },
  { key: 'publisher', name: 'Social Publisher', icon: '📣', desc: 'Đăng bài tự động 3 lần/ngày', cron: '8h, 12h, 18h', runPath: '/agents/publisher/run', statsPath: '/agents/publisher/stats' },
  { key: 'lead', name: 'Lead Hunter', icon: '🎯', desc: 'Quét và phân loại leads AI', cron: 'Cron 30min', runPath: '/agents/lead-hunter/run', statsPath: '/agents/lead-hunter/stats' },
  { key: 'sales', name: 'Sales Agent', icon: '💬', desc: 'AI tư vấn và chốt đơn tự động', cron: 'Real-time', runPath: '/agents/sales/chat' },
  { key: 'crm', name: 'CRM Agent', icon: '👥', desc: 'Upgrade tier, chống churn, nurturing', cron: 'Cron 2h', runPath: '/agents/crm/run', statsPath: '/agents/crm/stats' },
  { key: 'video', name: 'Video Creator', icon: '🎬', desc: 'Script → TTS → Video → TikTok', cron: 'Cron 10h', runPath: '/agents/video/run' },
  { key: 'seo', name: 'SEO Agent', icon: '🔍', desc: 'Bài SEO, meta tags, cluster keywords', cron: 'Cron 7h', runPath: '/agents/seo/run' },
  { key: 'trend_predictor', name: 'Trend Predictor', icon: '📈', desc: 'Dự báo xu hướng đa nguồn', cron: 'Cron 6h', runPath: '/agents/trend-predictor/run' },
  { key: 'price', name: 'Price Intel', icon: '💰', desc: 'Theo dõi giá đối thủ, đề xuất action', cron: 'Cron 1h', runPath: '/agents/price/run' },
  { key: 'segmentation', name: 'Segmentation', icon: '🗂', desc: 'Phân khúc khách hàng tự động', cron: 'Cron 2h', runPath: '/agents/segmentation/run' },
  { key: 'email', name: 'Email Marketing', icon: '📧', desc: 'Welcome, upsell, remarketing emails', cron: 'Cron 8h', runPath: '/agents/email/run' },
  { key: 'telegram', name: 'Telegram Bot', icon: '✈️', desc: 'Deals, flash sale, customer care', cron: '9h, 15h, 21h', runPath: '/agents/telegram/run' },
  { key: 'knowledge', name: 'Knowledge Agent', icon: '🧠', desc: 'Sync RAG/Qdrant, AI Q&A', cron: 'Cron 3h', runPath: '/agents/knowledge/sync', statsPath: '/agents/knowledge/stats' },
  { key: 'master', name: 'Executive AI', icon: '👑', desc: 'Điều phối toàn bộ hệ thống, KPI', cron: 'Cron 1h', runPath: '/agents/master/run' },
];

export default function AgentsPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    agentsApi.masterKpi().then(setKpi).catch(() => {});
    analyticsApi.ai().then(setAiStats).catch(() => {});
  }, []);

  const runAgent = async (agent: Agent) => {
    setRunning((r) => ({ ...r, [agent.key]: true }));
    setResults((r) => ({ ...r, [agent.key]: '⏳ Đang chạy...' }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api${agent.runPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data) ? `✅ Xong (${data.length} items)` : res.ok ? '✅ Thành công' : `❌ ${data.message || 'Lỗi'}`;
      setResults((r) => ({ ...r, [agent.key]: msg }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [agent.key]: `❌ ${e.message}` }));
    } finally {
      setRunning((r) => ({ ...r, [agent.key]: false }));
    }
  };

  return (
    <div>
      <PageHeader
        title="🤖 AI Agents"
        subtitle="16 agents tự động — quản lý và kích hoạt thủ công"
        action={
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              fetch('/api/agents/master/run', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            👑 Run All (Master)
          </button>
        }
      />

      {/* KPI */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Runs 24h', value: kpi.totalRuns24h || 0, icon: '🔄' },
            { label: 'Active agents', value: kpi.activeAgents || 0, icon: '⚡' },
            { label: 'Success rate', value: (kpi.successRate || 0) + '%', icon: '✅' },
            { label: 'Avg duration', value: Math.round((kpi.avgDurationMs || 0) / 1000) + 's', icon: '⏱' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent, idx) => (
          <div
            key={agent.key}
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${
              running[agent.key] ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Number + icon */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <span className="text-2xl">{agent.icon}</span>
              <span className="text-xs text-gray-400 font-mono">#{String(idx + 1).padStart(2, '0')}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm">{agent.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{agent.desc}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">⏰ {agent.cron}</span>
                {results[agent.key] && (
                  <span className="text-xs text-gray-600">{results[agent.key]}</span>
                )}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={() => runAgent(agent)}
              disabled={running[agent.key]}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                running[agent.key]
                  ? 'bg-indigo-100 text-indigo-600 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {running[agent.key] ? '⏳' : '▶ Run'}
            </button>
          </div>
        ))}
      </div>

      {/* AI Stats */}
      {aiStats?.agentStats && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📊 Thống kê Agent (30 ngày)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left pb-2">Agent</th>
                  <th className="text-right pb-2">Runs</th>
                  <th className="text-right pb-2">Success</th>
                  <th className="text-right pb-2">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {aiStats.agentStats.map((s: any) => (
                  <tr key={s.agent}>
                    <td className="py-2 text-gray-700 font-medium">{s.agent}</td>
                    <td className="py-2 text-right text-gray-600">{s.runs}</td>
                    <td className="py-2 text-right text-green-600">{s.success}</td>
                    <td className="py-2 text-right text-gray-400">{Number(s.tokens || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
