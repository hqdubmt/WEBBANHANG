'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value, color = 'text-gray-900' }: { label: string; value: any; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`font-semibold text-sm ${color}`}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [leads, setLeads] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [ai, setAi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.revenue().catch(() => null),
      analyticsApi.leads().catch(() => null),
      analyticsApi.customers().catch(() => null),
      analyticsApi.ai().catch(() => null),
    ]).then(([r, l, c, a]) => {
      setRevenue(r);
      setLeads(l);
      setCustomers(c);
      setAi(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400">Đang tải...</div>;

  return (
    <div>
      <PageHeader title="📈 Phân tích" subtitle="Tổng quan dữ liệu hệ thống" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Revenue */}
        <Section title="💰 Doanh thu">
          <KV label="Hôm nay" value={fmtVND(revenue?.today?.revenue)} color="text-green-700" />
          <KV label="Đơn hôm nay" value={revenue?.today?.orders || 0} />
          <KV label="Tháng này" value={fmtVND(revenue?.thisMonth?.revenue)} color="text-blue-700" />
          <KV label="Đơn tháng này" value={revenue?.thisMonth?.orders || 0} />
          <KV label="Tổng đơn hàng" value={revenue?.totalOrders || 0} />
        </Section>

        {/* Leads */}
        <Section title="🎯 Leads">
          <KV label="Tổng leads" value={leads?.total || 0} />
          <KV label="Đã chuyển đổi" value={leads?.converted || 0} color="text-green-700" />
          <KV label="Tỷ lệ chuyển đổi" value={leads?.conversionRate || '0%'} color="text-indigo-700" />
          {leads?.byPlatform?.map((p: any) => (
            <KV key={p.platform} label={`↳ ${p.platform}`} value={p.count} />
          ))}
        </Section>

        {/* Customers */}
        <Section title="👥 Khách hàng">
          <KV label="Tổng khách hàng" value={customers?.total || 0} />
          <KV label="VIP" value={customers?.vip || 0} color="text-purple-700" />
          <KV label="Regular" value={customers?.regular || 0} color="text-blue-700" />
          {customers?.topCustomers?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Top khách hàng</p>
              {customers.topCustomers.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="text-green-600 font-medium">{fmtVND(c.totalSpent)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* AI Agents */}
        <Section title="🤖 AI Agents">
          <KV label="Tổng lần chạy" value={ai?.totalRuns || 0} />
          <KV label="Thành công" value={ai?.successRuns || 0} color="text-green-700" />
          <KV label="Tỷ lệ thành công" value={ai?.successRate || '0%'} color="text-indigo-700" />
          <KV label="Tổng tokens dùng" value={Number(ai?.totalTokens || 0).toLocaleString()} />
          <KV label="Chi phí ước tính" value={'$' + Number(ai?.totalCost || 0).toFixed(4)} />
          {ai?.agentStats?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Theo agent</p>
              {ai.agentStats.slice(0, 5).map((s: any) => (
                <div key={s.agent} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-600">{s.agent}</span>
                  <span className="text-gray-700">{s.runs} runs</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
