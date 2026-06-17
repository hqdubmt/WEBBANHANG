'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtNum = (n: any) => Number(n || 0).toLocaleString('vi-VN');

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-800 mb-4 text-base">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, sub, highlight }: { label: string; value: any; sub?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <span className={`font-semibold text-sm ${highlight ? 'text-green-700' : 'text-gray-900'}`}>{value}</span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [fulfillment, setFulfillment] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [analyticsRevenue, setAnalyticsRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = () => {
    setLoading(true);
    Promise.all([
      reportsApi.revenue(days).catch(() => null),
      reportsApi.orderStats().catch(() => null),
      reportsApi.fulfillment().catch(() => null),
      reportsApi.customerStats().catch(() => null),
      reportsApi.paymentStats().catch(() => null),
      reportsApi.analyticsRevenue().catch(() => null),
    ]).then(([r, o, f, c, p, ar]) => {
      setRevenue(r);
      setOrderStats(o);
      setFulfillment(f);
      setCustomerStats(c);
      setPaymentStats(p);
      setAnalyticsRevenue(ar);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [days]);

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Đang tải báo cáo...</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="📊 Báo cáo"
        subtitle="Tổng hợp dữ liệu kinh doanh"
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
          </select>
        }
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Doanh thu hôm nay" value={fmtVND(analyticsRevenue?.today?.revenue)} icon="💰" color="green" />
        <StatCard label="Đơn hôm nay" value={fmtNum(analyticsRevenue?.today?.orders)} icon="🛒" color="blue" />
        <StatCard label="Tháng này" value={fmtVND(analyticsRevenue?.thisMonth?.revenue)} icon="📅" color="yellow" />
        <StatCard label="Tổng đơn" value={fmtNum(analyticsRevenue?.totalOrders)} icon="📦" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Revenue detail */}
        <Section title="💰 Doanh thu">
          <Row label="Hôm nay" value={fmtVND(analyticsRevenue?.today?.revenue)} highlight />
          <Row label="Đơn hôm nay" value={fmtNum(analyticsRevenue?.today?.orders)} />
          <Row label="Tháng này" value={fmtVND(analyticsRevenue?.thisMonth?.revenue)} highlight />
          <Row label="Đơn tháng này" value={fmtNum(analyticsRevenue?.thisMonth?.orders)} />
          {revenue?.dailyRevenue?.slice(-5).reverse().map((d: any) => (
            <Row key={d.date} label={new Date(d.date).toLocaleDateString('vi-VN')} value={fmtVND(d.revenue)} sub={`${d.orders} đơn`} />
          ))}
        </Section>

        {/* Order stats */}
        <Section title="🛒 Đơn hàng theo trạng thái">
          {orderStats?.byStatus?.map((s: any) => (
            <Row key={s.status} label={s.status} value={fmtNum(s.count)} sub={fmtVND(s.revenue)} />
          ))}
          {(!orderStats?.byStatus || orderStats.byStatus.length === 0) && (
            <p className="text-sm text-gray-400 py-2">Chưa có dữ liệu</p>
          )}
        </Section>

        {/* Fulfillment */}
        <Section title="🚚 Giao hàng">
          {fulfillment && (
            <>
              <Row label="Tổng cần giao" value={fmtNum(fulfillment.totalPending)} />
              <Row label="Đang giao" value={fmtNum(fulfillment.totalShipping)} />
              <Row label="Đã giao" value={fmtNum(fulfillment.totalDelivered)} highlight />
              <Row label="Đã huỷ" value={fmtNum(fulfillment.totalCancelled)} />
              {fulfillment.byStatus?.map((s: any) => (
                <Row key={s.status} label={`↳ ${s.status}`} value={fmtNum(s.count)} />
              ))}
            </>
          )}
        </Section>

        {/* Customers */}
        <Section title="👥 Khách hàng">
          {customerStats && (
            <>
              <Row label="Tổng tham chiếu" value={fmtNum(customerStats.total)} />
              <Row label="Đã gửi" value={fmtNum(customerStats.sent)} />
              <Row label="Đang chờ" value={fmtNum(customerStats.pending)} />
            </>
          )}
        </Section>

        {/* Payments */}
        <Section title="💳 Thanh toán">
          {paymentStats && (
            <>
              <Row label="Tổng giao dịch" value={fmtNum(paymentStats.total)} />
              <Row label="Đã thanh toán" value={fmtNum(paymentStats.paid)} highlight />
              <Row label="Đang chờ" value={fmtNum(paymentStats.pending)} />
              <Row label="Thất bại" value={fmtNum(paymentStats.failed)} />
              <Row label="Hoàn tiền" value={fmtNum(paymentStats.refunded)} />
              <Row label="Doanh thu hôm nay" value={fmtVND(paymentStats.todayRevenue)} highlight />
            </>
          )}
        </Section>

        {/* Top products from revenue */}
        {revenue?.topProducts && revenue.topProducts.length > 0 && (
          <Section title="📦 Sản phẩm bán chạy">
            {revenue.topProducts.slice(0, 8).map((p: any, i: number) => (
              <Row key={p.id || i} label={`${i + 1}. ${p.name}`} value={fmtNum(p.sold)} sub={fmtVND(p.revenue)} />
            ))}
          </Section>
        )}
      </div>

      <div className="mt-4 text-center">
        <button onClick={load} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          🔄 Tải lại báo cáo
        </button>
      </div>
    </div>
  );
}
