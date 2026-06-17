'use client';
import { useEffect, useState } from 'react';
import { paymentsApi, api, ordersApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
  partial: 'bg-blue-100 text-blue-700',
};

const METHOD_ICON: Record<string, string> = {
  cod: '💵',
  bank_transfer: '🏦',
  momo: '📱',
  vnpay: '💳',
  zalopay: '💙',
  credit_card: '💳',
};

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDate = (d: string) => d ? new Date(d).toLocaleString('vi-VN') : '-';

export default function PaymentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'cod' | 'methods'>('list');

  // COD form
  const [orders, setOrders] = useState<any[]>([]);
  const [codForm, setCodForm] = useState({ orderId: '', amount: '' });
  const [codSaving, setCodSaving] = useState(false);
  const [codResult, setCodResult] = useState<any>(null);

  // Confirm payment modal
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const [confirmTxId, setConfirmTxId] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      paymentsApi.list().catch(() => ({ items: [], total: 0 })),
      paymentsApi.stats().catch(() => null),
      api.get<any>('/payments/methods').catch(() => ({ methods: [] })),
    ]).then(([res, s, m]) => {
      setItems(res.items || []);
      setTotal(res.total || 0);
      setStats(s);
      setMethods(m?.methods || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    ordersApi.list({ limit: '50', status: 'pending' }).then((r) => setOrders(r.items || [])).catch(() => {});
  }, []);

  const confirmPayment = async () => {
    if (!confirmItem) return;
    setConfirmSaving(true);
    try {
      await api.post(`/payments/${confirmItem.id}/confirm`, { transactionId: confirmTxId });
      setConfirmModal(false);
      setConfirmTxId('');
      load();
    } catch (e: any) { alert(e.message); }
    setConfirmSaving(false);
  };

  const codConfirm = async () => {
    if (!codForm.orderId || !codForm.amount) return;
    setCodSaving(true);
    try {
      const result = await api.post<any>('/payments/cod/confirm', {
        orderId: codForm.orderId,
        amount: Number(codForm.amount),
      });
      setCodResult(result);
      setCodForm({ orderId: '', amount: '' });
      load();
    } catch (e: any) { alert(e.message); }
    setCodSaving(false);
  };

  const TABS = [
    { key: 'list', label: '📋 Lịch sử' },
    { key: 'cod', label: '💵 Thu COD' },
    { key: 'methods', label: '🏧 Phương thức' },
  ];

  return (
    <div>
      <PageHeader title="💳 Thanh toán" subtitle={`${total} giao dịch`} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <StatCard label="Tổng giao dịch" value={stats.total || 0} icon="🧾" color="blue" />
          <StatCard label="Đã thanh toán" value={stats.paid || 0} icon="✅" color="green" />
          <StatCard label="Đang chờ" value={stats.pending || 0} icon="⏳" color="yellow" />
          <StatCard label="Hôm nay" value={fmtVND(stats.todayRevenue)} icon="💰" color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: List */}
      {tab === 'list' && (
        <DataTable
          loading={loading}
          data={items}
          emptyText="Chưa có giao dịch nào"
          columns={[
            { key: 'paymentCode', label: 'Mã TT', render: (r) => (
              <span className="font-mono text-xs text-indigo-600">{r.paymentCode}</span>
            )},
            { key: 'method', label: 'PT', render: (r) => (
              <span className="whitespace-nowrap">{METHOD_ICON[r.method] || '💳'} {r.method?.toUpperCase()}</span>
            )},
            { key: 'amount', label: 'Số tiền', render: (r) => (
              <span className="font-semibold text-gray-900 whitespace-nowrap">{fmtVND(r.amount)}</span>
            )},
            { key: 'status', label: 'Trạng thái', render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                {r.status}
              </span>
            )},
            { key: 'orderId', label: 'Đơn hàng', hideOnMobile: true, render: (r) => (
              <span className="font-mono text-xs text-gray-400">{r.orderId?.slice(0, 8)}...</span>
            )},
            { key: 'createdAt', label: 'Ngày', hideOnMobile: true, render: (r) => (
              <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.createdAt)}</span>
            )},
            { key: 'actions', label: '', render: (r) => (
              r.status === 'pending' ? (
                <button
                  onClick={() => { setConfirmItem(r); setConfirmModal(true); }}
                  className="text-xs text-green-600 hover:underline whitespace-nowrap"
                >
                  Xác nhận
                </button>
              ) : null
            )},
          ]}
        />
      )}

      {/* Tab: COD */}
      {tab === 'cod' && (
        <div className="max-w-md">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4">💵 Thu tiền mặt (COD)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Xác nhận thu tiền COD cho đơn hàng. Sẽ tạo bản ghi thanh toán và cập nhật trạng thái đơn.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn hàng (đang chờ)</label>
                <select
                  value={codForm.orderId}
                  onChange={(e) => {
                    const ord = orders.find((o) => o.id === e.target.value);
                    setCodForm({ orderId: e.target.value, amount: ord ? String(ord.totalAmount) : '' });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">-- Chọn đơn hàng --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(0, 8)} — {fmtVND(o.totalAmount)} — {o.customerName || o.customerId?.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu</label>
                <input
                  type="number"
                  value={codForm.amount}
                  onChange={(e) => setCodForm({ ...codForm, amount: e.target.value })}
                  placeholder="150000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {codForm.amount && <p className="text-xs text-indigo-600 mt-1">{fmtVND(codForm.amount)}</p>}
              </div>
              <button
                onClick={codConfirm}
                disabled={codSaving || !codForm.orderId || !codForm.amount}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {codSaving ? 'Đang xử lý...' : '✅ Xác nhận thu tiền COD'}
              </button>
            </div>
            {codResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="font-medium text-green-700">Thu tiền thành công!</p>
                <p className="text-green-600 mt-1">Mã TT: <span className="font-mono">{codResult.paymentCode}</span></p>
                <p className="text-green-600">COD Ref: <span className="font-mono">{codResult.codReference}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Methods */}
      {tab === 'methods' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
          {methods.map((m) => (
            <div
              key={m.key}
              className={`bg-white border rounded-xl p-4 flex items-center gap-3 ${m.enabled ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}
            >
              <span className="text-3xl">{m.icon}</span>
              <div>
                <div className="font-medium text-gray-900 text-sm">{m.name}</div>
                <div className={`text-xs mt-0.5 ${m.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {m.enabled ? '✓ Đã bật' : '✗ Chưa kích hoạt'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Xác nhận thanh toán" size="sm">
        <div className="space-y-3">
          {confirmItem && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã TT:</span>
                <span className="font-mono font-medium">{confirmItem.paymentCode}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Số tiền:</span>
                <span className="font-semibold text-green-700">{fmtVND(confirmItem.amount)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (tùy chọn)</label>
            <input
              value={confirmTxId}
              onChange={(e) => setConfirmTxId(e.target.value)}
              placeholder="TXN123456789"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setConfirmModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button
              onClick={confirmPayment}
              disabled={confirmSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {confirmSaving ? 'Đang xử lý...' : '✅ Xác nhận'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
