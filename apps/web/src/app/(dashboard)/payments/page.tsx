'use client';
import { useEffect, useState } from 'react';
import { paymentsApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: string) => d ? new Date(d).toLocaleString('vi-VN') : '-';

export default function PaymentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      paymentsApi.list().catch(() => ({ items: [], total: 0 })),
      paymentsApi.stats().catch(() => null),
    ]).then(([res, s]) => {
      setItems(res.items);
      setTotal(res.total);
      setStats(s);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="💳 Thanh toán" subtitle={`${total} giao dịch`} />

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <StatCard label="Tổng giao dịch" value={stats.total || 0} icon="🧾" color="blue" />
          <StatCard label="Đã thanh toán" value={stats.paid || 0} icon="✅" color="green" />
          <StatCard label="Doanh thu hôm nay" value={fmtVND(stats.todayRevenue)} icon="💰" color="yellow" />
        </div>
      )}

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'orderId', label: 'Đơn hàng', render: (r) => <span className="font-mono text-xs text-indigo-600">{r.orderId?.slice(0, 8)}...</span> },
          { key: 'method', label: 'Phương thức', render: (r) => (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs uppercase">{r.method}</span>
          )},
          { key: 'amount', label: 'Số tiền', render: (r) => <span className="font-semibold text-gray-900">{fmtVND(r.amount)}</span> },
          { key: 'status', label: 'Trạng thái', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>{r.status}</span>
          )},
          { key: 'transactionId', label: 'Transaction ID', render: (r) => <span className="font-mono text-xs text-gray-400">{r.transactionId || '-'}</span> },
          { key: 'createdAt', label: 'Ngày', render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
        ]}
      />
    </div>
  );
}
