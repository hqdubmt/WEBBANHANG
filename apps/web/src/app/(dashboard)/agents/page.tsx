'use client';
import { useEffect, useState, useRef } from 'react';
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
  category: string;
}

const AGENTS: Agent[] = [
  { key: 'trend',          name: 'Trend Hunter',      icon: '🔥', desc: 'Quét xu hướng TikTok, FB, Google',          cron: 'Cron 4h',       runPath: '/agents/trend/run',            category: 'Marketing' },
  { key: 'affiliate',      name: 'Affiliate Hunter',  icon: '🔗', desc: 'Tìm sản phẩm affiliate Shopee/Lazada',      cron: 'Cron 6h',       runPath: '/agents/affiliate/run',        category: 'Marketing' },
  { key: 'content',        name: 'Content Creator',   icon: '✍️', desc: 'Tạo nội dung Facebook, TikTok, Telegram',  cron: 'Cron 1h',       runPath: '/agents/content/run',          category: 'Marketing' },
  { key: 'publisher',      name: 'Social Publisher',  icon: '📣', desc: 'Đăng bài tự động 3 lần/ngày',              cron: '8h, 12h, 18h',  runPath: '/agents/publisher/run',        statsPath: '/agents/publisher/stats',   category: 'Marketing' },
  { key: 'seo',            name: 'SEO Agent',         icon: '🔍', desc: 'Bài SEO, meta tags, cluster keywords',      cron: 'Cron 7h',       runPath: '/agents/seo/run',              category: 'Marketing' },
  { key: 'email',          name: 'Email Marketing',   icon: '📧', desc: 'Welcome, upsell, remarketing emails',       cron: 'Cron 8h',       runPath: '/agents/email/run',            category: 'Marketing' },
  { key: 'telegram',       name: 'Telegram Bot',      icon: '✈️', desc: 'Deals, flash sale, customer care',          cron: '9h, 15h, 21h',  runPath: '/agents/telegram/run',         category: 'Marketing' },
  { key: 'lead',           name: 'Lead Hunter',       icon: '🎯', desc: 'Quét và phân loại leads AI',               cron: 'Cron 30min',    runPath: '/agents/lead-hunter/run',      statsPath: '/agents/lead-hunter/stats', category: 'Sales' },
  { key: 'sales',          name: 'Sales Agent',       icon: '💬', desc: 'AI tư vấn và chốt đơn tự động',           cron: 'Real-time',     runPath: '/agents/sales/chat',           category: 'Sales' },
  { key: 'crm',            name: 'CRM Agent',         icon: '👥', desc: 'Upgrade tier, chống churn, nurturing',      cron: 'Cron 2h',       runPath: '/agents/crm/run',              statsPath: '/agents/crm/stats',         category: 'Sales' },
  { key: 'price',          name: 'Price Intel',       icon: '💰', desc: 'Theo dõi giá đối thủ, đề xuất action',     cron: 'Cron 1h',       runPath: '/agents/price/run',            category: 'Operations' },
  { key: 'segmentation',   name: 'Segmentation',      icon: '🗂', desc: 'Phân khúc khách hàng tự động',             cron: 'Cron 2h',       runPath: '/agents/segmentation/run',     category: 'Operations' },
  { key: 'trend_predictor',name: 'Trend Predictor',   icon: '📈', desc: 'Dự báo xu hướng đa nguồn',                cron: 'Cron 6h',       runPath: '/agents/trend-predictor/run',  category: 'Operations' },
  { key: 'video',          name: 'Video Creator',     icon: '🎬', desc: 'Script → TTS → Video → TikTok',            cron: 'Cron 10h',      runPath: '/agents/video/run',            category: 'Operations' },
  { key: 'knowledge',      name: 'Knowledge Agent',   icon: '🧠', desc: 'Sync RAG/Qdrant, AI Q&A',                 cron: 'Cron 3h',       runPath: '/agents/knowledge/sync',       statsPath: '/agents/knowledge/stats',   category: 'System' },
  { key: 'master',         name: 'Executive AI',      icon: '👑', desc: 'Điều phối toàn bộ hệ thống, KPI',         cron: 'Cron 1h',       runPath: '/agents/master/run',           category: 'System' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: 'bg-purple-50 border-purple-200 text-purple-700',
  Sales: 'bg-blue-50 border-blue-200 text-blue-700',
  Operations: 'bg-orange-50 border-orange-200 text-orange-700',
  System: 'bg-gray-50 border-gray-200 text-gray-700',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function ResultPanel({ agent, data, duration, onClose }: {
  agent: Agent; data: any; duration: number; onClose: () => void;
}) {
  const isArray = Array.isArray(data);
  const items = isArray ? data : null;
  const obj = !isArray ? data : null;

  const renderItems = () => {
    if (!items || items.length === 0) return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">📭</div>
        <div className="text-sm">Không có dữ liệu mới</div>
      </div>
    );

    const sample = items[0] || {};

    // Trend products
    if ('trendScore' in sample || 'platform' in sample) {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
              <div className="text-2xl">{item.image ? <img src={item.image} className="w-10 h-10 object-cover rounded" /> : '🛍️'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{item.name || item.productName}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.platform && <span className="text-xs bg-white border rounded px-1.5 py-0.5">📦 {item.platform}</span>}
                  {item.price && <span className="text-xs bg-white border rounded px-1.5 py-0.5">💰 {fmtVND(item.price)}</span>}
                  {item.sales && <span className="text-xs bg-white border rounded px-1.5 py-0.5">📊 {Number(item.sales).toLocaleString()} sales</span>}
                  {item.commission && <span className="text-xs bg-white border rounded px-1.5 py-0.5">🔗 {item.commission}% HH</span>}
                  {item.trendScore && <span className={`text-xs rounded px-1.5 py-0.5 font-semibold ${item.trendScore >= 80 ? 'bg-green-100 text-green-700' : item.trendScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>⭐ {item.trendScore} điểm</span>}
                </div>
                {item.trendReason && <div className="text-xs text-gray-500 mt-1 italic">💡 {item.trendReason}</div>}
                {item.category && <div className="text-xs text-gray-400 mt-0.5">📁 {item.category}</div>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Content items
    if ('content' in sample || 'platform' in sample && 'type' in sample) {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-white border rounded px-1.5 py-0.5 font-medium">{item.platform || item.type}</span>
                {item.status && <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{item.status}</span>}
              </div>
              {item.title && <div className="text-sm font-medium text-gray-900">{item.title}</div>}
              {item.content && <div className="text-xs text-gray-600 mt-1 line-clamp-3">{item.content}</div>}
              {item.hashtags && <div className="text-xs text-indigo-500 mt-1">{Array.isArray(item.hashtags) ? item.hashtags.join(' ') : item.hashtags}</div>}
            </div>
          ))}
        </div>
      );
    }

    // Leads
    if ('phone' in sample || 'source' in sample || 'email' in sample) {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">
                {(item.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name || 'Không tên'}</div>
                <div className="flex gap-2 flex-wrap mt-0.5">
                  {item.phone && <span className="text-xs text-gray-500">📞 {item.phone}</span>}
                  {item.source && <span className="text-xs text-gray-500">🌐 {item.source}</span>}
                  {item.status && <span className="text-xs bg-green-50 text-green-700 rounded px-1.5">{item.status}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Generic array
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
            {typeof item === 'string' ? item : (
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderObj = () => {
    if (!obj) return null;
    const keys = Object.keys(obj);
    if (keys.length === 0) return <div className="text-center py-6 text-gray-400 text-sm">Agent hoàn thành không có output</div>;
    return (
      <div className="grid grid-cols-2 gap-2">
        {keys.map(k => (
          <div key={k} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 capitalize">{k}</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {typeof obj[k] === 'object' ? JSON.stringify(obj[k]).slice(0, 80) : String(obj[k])}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <div className="font-bold text-gray-900">{agent.name}</div>
              <div className="text-xs text-gray-500">Hoàn thành trong {(duration / 1000).toFixed(1)}s</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        {/* Summary bar */}
        <div className="px-5 py-3 border-b border-gray-50 bg-green-50 flex items-center gap-3">
          <span className="text-green-600 text-lg">✅</span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-green-800">
              {isArray ? `Tìm được ${items!.length} kết quả` : 'Chạy thành công'}
            </span>
            {isArray && items!.length > 0 && (
              <span className="text-xs text-green-600 ml-2">• {new Date().toLocaleTimeString('vi-VN')}</span>
            )}
          </div>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">⏱ {(duration / 1000).toFixed(1)}s</span>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {isArray ? renderItems() : renderObj()}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Agent: {agent.key} • {agent.cron}</span>
          <button
            onClick={onClose}
            className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AgentsPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<{ agent: Agent; data: any; duration: number } | null>(null);
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    agentsApi.masterKpi().then(setKpi).catch(() => {});
    analyticsApi.ai().then(setAiStats).catch(() => {});
  }, []);

  const runAgent = async (agent: Agent) => {
    setRunning(r => ({ ...r, [agent.key]: true }));
    setResults(r => ({ ...r, [agent.key]: '⏳ Đang chạy...' }));
    const t0 = Date.now();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api${agent.runPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      const duration = Date.now() - t0;
      const count = Array.isArray(data) ? data.length : null;
      setResults(r => ({ ...r, [agent.key]: res.ok ? `✅ Xong${count !== null ? ` (${count})` : ''}` : `❌ ${data.message || 'Lỗi'}` }));
      if (res.ok) setPanel({ agent, data, duration });
    } catch (e: any) {
      setResults(r => ({ ...r, [agent.key]: `❌ ${e.message}` }));
    } finally {
      setRunning(r => ({ ...r, [agent.key]: false }));
    }
  };

  const categories = ['', ...Array.from(new Set(AGENTS.map(a => a.category)))];
  const filtered = filterCat ? AGENTS.filter(a => a.category === filterCat) : AGENTS;

  return (
    <div>
      <PageHeader
        title="🤖 AI Agents"
        subtitle={`${AGENTS.length} agents tự động`}
        action={
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              fetch('/api/agents/master/run', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            👑 Run All
          </button>
        }
      />

      {/* KPI */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Runs 24h', value: kpi.totalRuns24h || 0, icon: '🔄' },
            { label: 'Active agents', value: kpi.activeAgents || 0, icon: '⚡' },
            { label: 'Success rate', value: (kpi.successRate || 0) + '%', icon: '✅' },
            { label: 'Avg duration', value: Math.round((kpi.avgDurationMs || 0) / 1000) + 's', icon: '⏱' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterCat === cat ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            {cat || 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((agent, idx) => (
          <div
            key={agent.key}
            className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition-all ${
              running[agent.key] ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="text-2xl">{agent.icon}</span>
              <span className="text-xs text-gray-400 font-mono">#{String(AGENTS.indexOf(agent) + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{agent.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[agent.category]}`}>{agent.category}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{agent.desc}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">⏰ {agent.cron}</span>
                {results[agent.key] && (
                  <button
                    onClick={() => panel?.agent.key === agent.key ? null : runAgent(agent)}
                    className="text-xs text-gray-600"
                  >
                    {results[agent.key]}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => runAgent(agent)}
                disabled={running[agent.key]}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  running[agent.key]
                    ? 'bg-indigo-100 text-indigo-600 animate-pulse cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {running[agent.key] ? '⏳' : '▶ Run'}
              </button>
              {results[agent.key]?.startsWith('✅') && (
                <button
                  onClick={() => {
                    if (panel?.agent.key === agent.key) return;
                    // Re-open last result for this agent would need stored data
                    // For now just re-run
                    runAgent(agent);
                  }}
                  className="px-3 py-1 rounded-lg text-xs text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  👁 Xem
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Stats */}
      {aiStats?.agentStats && aiStats.agentStats.length > 0 && (
        <div className="mt-5 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📊 Lịch sử chạy (30 ngày)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left pb-2">Agent</th>
                  <th className="text-right pb-2">Lần chạy</th>
                  <th className="text-right pb-2">Thành công</th>
                  <th className="text-right pb-2">Thất bại</th>
                  <th className="text-right pb-2">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {aiStats.agentStats.map((s: any) => {
                  const failed = s.runs - s.success;
                  const rate = s.runs ? Math.round((s.success / s.runs) * 100) : 0;
                  return (
                    <tr key={s.agent} className="hover:bg-gray-50">
                      <td className="py-2 text-gray-700 font-medium">
                        {AGENTS.find(a => a.key === s.agent)?.icon || '🤖'} {s.agent}
                      </td>
                      <td className="py-2 text-right text-gray-600">{s.runs}</td>
                      <td className="py-2 text-right text-green-600">{s.success}</td>
                      <td className="py-2 text-right text-red-500">{failed || 0}</td>
                      <td className="py-2 text-right text-gray-400">{Number(s.tokens || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result Panel */}
      {panel && (
        <ResultPanel
          agent={panel.agent}
          data={panel.data}
          duration={panel.duration}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
