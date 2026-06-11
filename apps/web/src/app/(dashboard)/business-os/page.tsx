'use client';
import { useEffect, useState } from 'react';
import { bosApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtPct = (n: any) => (Number(n) || 0).toFixed(1) + '%';
const fmtNum = (n: any) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 border-red-300',
  P1: 'bg-orange-100 text-orange-700 border-orange-300',
  P2: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  P3: 'bg-blue-100 text-blue-700 border-blue-300',
};

const STATUS_COLORS: Record<string, string> = {
  Healthy: 'bg-green-100 text-green-700',
  Warning: 'bg-yellow-100 text-yellow-700',
  Critical: 'bg-red-100 text-red-700',
};

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
      <h2 className="font-semibold text-gray-800 mb-4 text-base flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'gray' }: { label: string; value: any; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.gray}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800 leading-tight">{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function FunnelRow({ label, value, icon, accent }: { label: string; value: any; icon: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${accent ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span className={`font-semibold text-sm ${accent ? 'text-indigo-700' : 'text-gray-800'}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function BusinessOsPage() {
  const [bos, setBos] = useState<any>(null);
  const [tab, setTab] = useState<'dashboard' | 'daily' | 'weekly'>('dashboard');
  const [daily, setDaily] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bosApi.dashboard().catch(() => null).then((d) => {
      setBos(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (tab === 'daily' && !daily) {
      bosApi.dailyReport().catch(() => null).then(setDaily);
    }
    if (tab === 'weekly' && !weekly) {
      bosApi.weeklyReport().catch(() => null).then(setWeekly);
    }
  }, [tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🧠</div>
          <div className="text-sm">Đang phân tích doanh nghiệp...</div>
        </div>
      </div>
    );
  }

  const { funnel, kpi, intelligence, priorityIssues, plan, systemStatus } = bos || {};
  const p0Count = (priorityIssues || []).filter((i: any) => i.level === 'P0').length;
  const p1Count = (priorityIssues || []).filter((i: any) => i.level === 'P1').length;

  return (
    <div>
      <PageHeader
        title="Business Operating System"
        subtitle="CEO · COO · CFO · CMO · Head of Growth — All in One"
      />

      {/* System Status Bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[systemStatus] || STATUS_COLORS.Healthy}`}>
          {systemStatus === 'Healthy' ? '✅' : systemStatus === 'Warning' ? '⚠️' : '🚨'} System: {systemStatus}
        </span>
        {p0Count > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-300">
            🚨 {p0Count} vấn đề P0 cần xử lý ngay
          </span>
        )}
        {p1Count > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 border border-orange-300">
            ⚡ {p1Count} vấn đề P1 cần xử lý sớm
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          Cập nhật: {bos?.generatedAt ? new Date(bos.generatedAt).toLocaleTimeString('vi-VN') : '—'}
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-5">
        {(['dashboard', 'daily', 'weekly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'dashboard' ? '📊 Dashboard' : t === 'daily' ? '📋 Báo cáo ngày' : '📈 Báo cáo tuần'}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <>
          {/* Revenue KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Doanh thu hôm nay" value={fmtVND(kpi?.revenue?.today)} sub={`Tháng: ${fmtVND(kpi?.revenue?.thisMonth)}`} color="green" />
            <KpiCard label="Lợi nhuận gộp" value={fmtVND(kpi?.revenue?.grossProfit)} sub={`Net: ${fmtVND(kpi?.revenue?.netProfit)}`} color="blue" />
            <KpiCard label="Tăng trưởng" value={kpi?.revenue?.growth ?? 'N/A'} sub={`AOV: ${fmtVND(kpi?.revenue?.avgOrderValue)}`} color={parseFloat(kpi?.revenue?.growth) >= 0 ? 'green' : 'red'} />
            <KpiCard label="Tỷ lệ chuyển đổi" value={kpi?.sales?.conversionRate} sub={`${kpi?.sales?.orders || 0} đơn tháng này`} color="purple" />
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-0">
            {/* Business Funnel */}
            <Section title="Business Funnel" icon="🔻">
              <div className="space-y-0.5">
                <FunnelRow label="Traffic" value={fmtNum(funnel?.traffic)} icon="📡" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Leads" value={fmtNum(funnel?.leads)} icon="🎯" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Conversations" value={fmtNum(funnel?.conversations)} icon="💬" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Orders" value={fmtNum(funnel?.orders)} icon="🛒" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Revenue" value={fmtVND(funnel?.revenue)} icon="💰" accent />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Gross Profit (est.)" value={fmtVND(funnel?.grossProfit)} icon="📊" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Retention" value={funnel?.retention} icon="🔄" />
                <div className="text-center text-gray-300 text-xs">↓</div>
                <FunnelRow label="Customer LTV (est.)" value={fmtVND(funnel?.lifetimeValue)} icon="⭐" accent />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                Lead → Order conversion: <span className="font-semibold text-indigo-700">{funnel?.conversionLeadToOrder}</span>
              </div>
            </Section>

            {/* KPI Framework */}
            <div className="space-y-3">
              <Section title="Acquisition KPIs" icon="📡">
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="Visitors (est.)" value={fmtNum(kpi?.acquisition?.visitors)} color="blue" />
                  <KpiCard label="Leads" value={fmtNum(kpi?.acquisition?.leads)} color="indigo" />
                  <KpiCard label="Qualified Leads" value={fmtNum(kpi?.acquisition?.qualifiedLeads)} color="purple" />
                  <KpiCard label="Cost/Lead (est.)" value={fmtVND(kpi?.acquisition?.cpl)} color="yellow" />
                </div>
              </Section>
              <Section title="Customer KPIs" icon="👥">
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="Total Customers" value={fmtNum(kpi?.customer?.total)} color="blue" />
                  <KpiCard label="VIP" value={fmtNum(kpi?.customer?.vip)} color="purple" />
                  <KpiCard label="Retention Rate" value={kpi?.customer?.retentionRate} color="green" />
                  <KpiCard label="LTV (est.)" value={fmtVND(kpi?.customer?.ltv)} color="indigo" />
                </div>
              </Section>
            </div>
          </div>

          {/* Priority Issues */}
          <Section title="Priority Issues — Decision Framework" icon="⚡">
            {(priorityIssues || []).length === 0 ? (
              <div className="text-center text-gray-400 py-4 text-sm">Không có vấn đề nghiêm trọng</div>
            ) : (
              <div className="space-y-2">
                {(priorityIssues || []).map((issue: any, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_COLORS[issue.level] || PRIORITY_COLORS.P3}`}>
                    <span className="font-bold text-xs px-2 py-0.5 rounded bg-white/60 flex-shrink-0">{issue.level}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">[{issue.area}] {issue.issue}</div>
                      <div className="text-xs opacity-70 mt-0.5">Impact: {issue.impact}</div>
                      <div className="text-xs font-medium mt-1">→ {issue.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Opportunities */}
            <Section title="Top Opportunities" icon="🚀">
              <ol className="space-y-2">
                {(intelligence?.opportunities || []).map((o: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-green-500 font-bold flex-shrink-0">{i + 1}.</span>
                    <span className="text-gray-700">{o}</span>
                  </li>
                ))}
                {(intelligence?.opportunities || []).length === 0 && (
                  <li className="text-gray-400 text-sm">Đang phân tích...</li>
                )}
              </ol>
            </Section>

            {/* Risks */}
            <Section title="Top Risks" icon="⚠️">
              <ol className="space-y-2">
                {(intelligence?.risks || []).map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-red-500 font-bold flex-shrink-0">{i + 1}.</span>
                    <span className="text-gray-700">{r}</span>
                  </li>
                ))}
                {(intelligence?.risks || []).length === 0 && (
                  <li className="text-green-600 text-sm">Không phát hiện rủi ro</li>
                )}
              </ol>
            </Section>

            {/* Money Leaks */}
            <Section title="Money Leak Detection" icon="🔍">
              <ol className="space-y-2">
                {(intelligence?.moneyLeaks || []).map((m: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-orange-500 font-bold flex-shrink-0">💸</span>
                    <span className="text-gray-700">{m}</span>
                  </li>
                ))}
                {(intelligence?.moneyLeaks || []).length === 0 && (
                  <li className="text-green-600 text-sm">Không phát hiện thất thoát</li>
                )}
              </ol>
            </Section>
          </div>

          {/* Autonomous Plan */}
          <Section title="Autonomous Planning" icon="🗓">
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Daily (24h)</div>
                <ol className="space-y-1.5">
                  {(plan?.daily || []).map((a: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                      <span className="text-gray-700">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Weekly (7 ngày)</div>
                <ol className="space-y-1.5">
                  {(plan?.weekly || []).map((a: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                      <span className="text-gray-700">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Monthly (30 ngày)</div>
                <ol className="space-y-1.5">
                  {(plan?.monthly || []).map((a: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                      <span className="text-gray-700">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* ── DAILY REPORT TAB ──────────────────────────────────── */}
      {tab === 'daily' && (
        <>
          {!daily ? (
            <div className="text-center text-gray-400 py-12 text-sm animate-pulse">Đang tạo báo cáo...</div>
          ) : (
            <>
              {/* Executive Summary */}
              <Section title="Executive Summary" icon="👑">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <KpiCard label="System Status" value={daily.executiveSummary?.systemStatus} color={daily.executiveSummary?.systemStatus === 'Healthy' ? 'green' : 'red'} />
                  <KpiCard label="Revenue Status" value={daily.executiveSummary?.revenueStatus} color="blue" />
                  <KpiCard label="Doanh thu hôm nay" value={fmtVND(daily.executiveSummary?.todayRevenue)} color="green" />
                  <KpiCard label="Tăng trưởng" value={daily.executiveSummary?.revenueGrowth} color={parseFloat(daily.executiveSummary?.revenueGrowth) >= 0 ? 'green' : 'red'} />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <div><strong>Vấn đề lớn nhất:</strong> {daily.executiveSummary?.topIssue}</div>
                  <div className="mt-1"><strong>Cơ hội lớn nhất:</strong> {daily.executiveSummary?.topOpportunity}</div>
                </div>
              </Section>

              {/* Revenue + Funnel Side by Side */}
              <div className="grid md:grid-cols-2 gap-5">
                <Section title="Revenue Status" icon="💰">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Hôm nay</span><span className="font-bold">{fmtVND(daily.revenueStatus?.today)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Tháng này</span><span className="font-bold">{fmtVND(daily.revenueStatus?.thisMonth)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Tăng trưởng MoM</span><span className={`font-bold ${parseFloat(daily.revenueStatus?.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{daily.revenueStatus?.growth}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">AOV (đơn TB)</span><span className="font-bold">{fmtVND(daily.revenueStatus?.avgOrderValue)}</span></div>
                  </div>
                </Section>

                <Section title="Funnel Status" icon="🔻">
                  <div className="space-y-2">
                    <FunnelRow label="Leads" value={fmtNum(daily.funnelStatus?.leads)} icon="🎯" />
                    <FunnelRow label="Conversations" value={fmtNum(daily.funnelStatus?.conversations)} icon="💬" />
                    <FunnelRow label="Orders" value={fmtNum(daily.funnelStatus?.orders)} icon="🛒" accent />
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Conversion</span>
                      <span className="font-bold text-indigo-700">{daily.funnelStatus?.conversion}</span>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 text-xs rounded p-2">
                      📍 Bottleneck: {daily.funnelStatus?.bottleneck}
                    </div>
                  </div>
                </Section>
              </div>

              {/* Opportunities + Risks */}
              <div className="grid md:grid-cols-2 gap-5">
                <Section title="Top Opportunities" icon="🚀">
                  <ol className="space-y-2">
                    {(daily.topOpportunities || []).map((o: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm"><span className="text-green-500 font-bold">{i + 1}.</span><span>{o}</span></li>
                    ))}
                  </ol>
                </Section>
                <Section title="Top Risks" icon="⚠️">
                  <ol className="space-y-2">
                    {(daily.topRisks || []).map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm"><span className="text-red-500 font-bold">{i + 1}.</span><span>{r}</span></li>
                    ))}
                  </ol>
                </Section>
              </div>

              {/* Immediate Actions */}
              <Section title="Immediate Actions (Hôm nay)" icon="⚡">
                <div className="space-y-2">
                  {(daily.immediateActions || []).map((a: string, i: number) => (
                    <div key={i} className="flex gap-3 p-2 bg-indigo-50 rounded-lg text-sm">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-indigo-900">{a}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Priority Issues */}
              <Section title="Priority Issues" icon="🔥">
                <div className="space-y-2">
                  {(daily.priorityIssues || []).map((issue: any, i: number) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_COLORS[issue.level]}`}>
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-white/60 flex-shrink-0">{issue.level}</span>
                      <div>
                        <div className="text-sm font-medium">[{issue.area}] {issue.issue}</div>
                        <div className="text-xs opacity-70">→ {issue.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </>
      )}

      {/* ── WEEKLY REPORT TAB ─────────────────────────────────── */}
      {tab === 'weekly' && (
        <>
          {!weekly ? (
            <div className="text-center text-gray-400 py-12 text-sm animate-pulse">Đang tạo báo cáo tuần...</div>
          ) : (
            <>
              {/* KPI Summary */}
              <Section title="KPI Summary tuần này" icon="📊">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KpiCard label="Doanh thu tháng" value={fmtVND(weekly.kpiSummary?.revenue)} color="green" />
                  <KpiCard label="Tăng trưởng" value={weekly.kpiSummary?.growth} color={parseFloat(weekly.kpiSummary?.growth) >= 0 ? 'green' : 'red'} />
                  <KpiCard label="Đơn hàng" value={weekly.kpiSummary?.orders} color="blue" />
                  <KpiCard label="Conversion" value={weekly.kpiSummary?.conversionRate} color="purple" />
                  <KpiCard label="Khách hàng" value={fmtNum(weekly.kpiSummary?.customers)} color="indigo" />
                  <KpiCard label="Net Profit (est.)" value={fmtVND(weekly.kpiSummary?.netProfit)} color="green" />
                </div>
              </Section>

              <div className="grid md:grid-cols-2 gap-5">
                {/* What Worked */}
                <Section title="What Worked" icon="✅">
                  <ul className="space-y-2">
                    {(weekly.whatWorked || []).map((w: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-green-500 flex-shrink-0">✓</span> {w}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* What Failed */}
                <Section title="What Failed" icon="❌">
                  <ul className="space-y-2">
                    {(weekly.whatFailed || []).map((w: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-red-500 flex-shrink-0">✗</span> {w}
                      </li>
                    ))}
                    {(weekly.whatFailed || []).length === 0 && (
                      <li className="text-green-600 text-sm">Không có vấn đề lớn tuần này</li>
                    )}
                  </ul>
                </Section>
              </div>

              {/* Money Leaks */}
              <Section title="Money Leak Detected" icon="💸">
                <ul className="space-y-2">
                  {(weekly.moneyLeaks || []).map((m: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 bg-orange-50 p-2 rounded-lg">
                      <span className="flex-shrink-0">💸</span> {m}
                    </li>
                  ))}
                  {(weekly.moneyLeaks || []).length === 0 && (
                    <li className="text-green-600 text-sm">Không phát hiện thất thoát tiền</li>
                  )}
                </ul>
              </Section>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Recommended Focus */}
                <Section title="Recommended Focus — Tuần tới" icon="🎯">
                  <ol className="space-y-2">
                    {(weekly.recommendedFocus || []).map((f: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ol>
                </Section>

                {/* Revenue Growth Plan */}
                <Section title="Revenue Growth Plan — Tháng này" icon="📈">
                  <ol className="space-y-2">
                    {(weekly.revenueGrowthPlan || []).map((f: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
