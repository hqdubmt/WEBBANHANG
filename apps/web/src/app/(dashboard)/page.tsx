'use client';
import { useEffect, useState } from 'react';
import { analyticsApi, agentsApi, ordersApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';

const fmt = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n ?? 0);

const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';

const AGENTS = [
  { key: 'trend', name: 'Trend Hunter', icon: '🔥', path: '/agents/trend/run' },
  { key: 'affiliate', name: 'Affiliate Hunter', icon: '🔗', path: '/agents/affiliate/run' },
  { key: 'content', name: 'Content Creator', icon: '✍️', path: '/agents/content/run' },
  { key: 'publisher', name: 'Social Publisher', icon: '📣', path: '/agents/publisher/run' },
  { key: 'lead', name: 'Lead Hunter', icon: '🎯', path: '/agents/lead-hunter/run' },
  { key: 'sales', name: 'Sales Agent', icon: '💬', path: '/agents/sales/run' },
  { key: 'crm', name: 'CRM Agent', icon: '👥', path: '/agents/crm/run' },
  { key: 'video', name: 'Video Creator', icon: '🎬', path: '/agents/video/run' },
  { key: 'seo', name: 'SEO Agent', icon: '🔍', path: '/agents/seo/run' },
  { key: 'trend_predictor', name: 'Trend Predictor', icon: '📈', path: '/agents/trend-predictor/run' },
  { key: 'price', name: 'Price Intel', icon: '💰', path: '/agents/price/run' },
  { key: 'segmentation', name: 'Segmentation', icon: '🗂', path: '/agents/segmentation/run' },
  { key: 'email', name: 'Email Marketing', icon: '📧', path: '/agents/email/run' },
  { key: 'telegram', name: 'Telegram Bot', icon: '✈️', path: '/agents/telegram/run' },
  { key: 'knowledge', name: 'Knowledge Agent', icon: '🧠', path: '/agents/knowledge/sync' },
  { key: 'master', name: 'Executive AI', icon: '👑', path: '/agents/master/run' },
];

export default function DashboardPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [leads, setLeads] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.revenue().catch(() => null),
      analyticsApi.leads().catch(() => null),
      analyticsApi.customers().catch(() => null),
      agentsApi.masterKpi().catch(() => null),
    ]).then(([r, l, c, k]) => {
      setRevenue(r);
      setLeads(l);
      setCustomers(c);
      setKpi(k);
      setLoading(false);
    });
  }, []);

  const runAgent = async (key: string, path: string) => {
    setRunning(key);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Business Operating System — AI Social Commerce OS"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Doanh thu hôm nay"
          value={fmtVND(revenue?.today?.revenue)}
          icon="💰"
          sub={`${revenue?.today?.orders || 0} đơn`}
          color="green"
        />
        <StatCard
          label="Doanh thu tháng"
          value={fmtVND(revenue?.thisMonth?.revenue)}
          icon="📅"
          sub={`${revenue?.thisMonth?.orders || 0} đơn`}
          color="blue"
        />
        <StatCard
          label="Tổng khách hàng"
          value={fmt(customers?.total)}
          icon="👥"
          sub={`${customers?.vip || 0} VIP`}
          color="purple"
        />
        <StatCard
          label="Leads mới"
          value={fmt(leads?.total)}
          icon="🎯"
          sub={`Chuyển đổi: ${leads?.conversionRate || '0%'}`}
          color="yellow"
        />
      </div>

      {/* Agent KPI */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Runs 24h" value={kpi.totalRuns24h || 0} icon="🤖" color="indigo" />
          <StatCard label="Agents đang chạy" value={kpi.activeAgents || 0} icon="⚡" color="blue" />
          <StatCard label="Tỷ lệ thành công" value={(kpi.successRate || 0) + '%'} icon="✅" color="green" />
          <StatCard label="Thời gian TB" value={Math.round((kpi.avgDurationMs || 0) / 1000) + 's'} icon="⏱" color="yellow" />
        </div>
      )}

      {/* 16 Agents Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">⚡ 16 AI Agents</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AGENTS.map((agent) => (
            <button
              key={agent.key}
              onClick={() => runAgent(agent.key, agent.path)}
              disabled={running === agent.key}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center cursor-pointer ${
                running === agent.key
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 animate-pulse'
                  : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700'
              }`}
            >
              <span className="text-2xl">{agent.icon}</span>
              <span className="text-xs font-medium leading-tight">{agent.name}</span>
              <span className="text-xs text-gray-400">
                {running === agent.key ? '⏳ Đang chạy...' : '▶ Run'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/business-os', label: 'Business OS', icon: '🧠', color: 'bg-indigo-600' },
          { href: '/orders', label: 'Xem đơn hàng', icon: '🛒', color: 'bg-green-500' },
          { href: '/leads', label: 'Danh sách leads', icon: '🎯', color: 'bg-yellow-500' },
          { href: '/analytics', label: 'Phân tích chi tiết', icon: '📈', color: 'bg-purple-500' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`${item.color} text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="font-medium text-sm">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
