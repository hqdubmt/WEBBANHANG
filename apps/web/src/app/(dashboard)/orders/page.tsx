'use client';
import { useEffect, useState } from 'react';
import { ordersApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  confirmed: { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  shipping:  { label: 'Đang giao',    color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  delivered: { label: 'Đã giao',      color: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
  cancelled: { label: 'Đã huỷ',       color: 'bg-red-100 text-red-700',      dot: 'bg-red-400' },
};

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending',   label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping',  label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

export default function OrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const params: any = { page: String(page), limit: '20' };
    if (statusFilter) params.status = statusFilter;
    const [res, rev] = await Promise.all([
      ordersApi.list(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 })),
      ordersApi.revenue().catch(() => null),
    ]);
    setItems(res.items);
    setTotal(res.total);
    setRevenue(rev);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await ordersApi.updateStatus(id, status).catch(() => {});
    load();
  };

  const changeTab = (tab: string) => {
    setStatusFilter(tab);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="🛒 Đơn hàng"
        subtitle={`${total} đơn`}
        action={
          <button onClick={load} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            ↻ Làm mới
          </button>
        }
      />

      {/* Revenue summary */}
      {revenue && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Doanh thu 30 ngày', value: fmtVND(revenue.total), icon: '💰' },
            { label: 'Tổng đơn hàng', value: revenue.orders, icon: '📦' },
            { label: 'Giá trị TB', value: fmtVND(revenue.avgOrder), icon: '📊' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-xs text-gray-400">{s.icon} {s.label}</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => changeTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        loading={loading}
        data={items}
        emptyText={
          statusFilter === 'pending'
            ? '✅ Không có đơn nào chờ xác nhận'
            : 'Không có đơn hàng nào'
        }
        columns={[
          {
            key: 'order', label: 'Đơn hàng', render: (r) => (
              <div>
                <div className="font-mono text-xs font-semibold text-indigo-700">{r.orderCode}</div>
                <div className="text-xs text-gray-400 mt-0.5">{fmtDateTime(r.createdAt)}</div>
              </div>
            )
          },
          {
            key: 'customer', label: 'Khách hàng', render: (r) => (
              <div>
                <div className="font-medium text-gray-900 text-sm">{r.customerName || '—'}</div>
                {r.customerPhone && (
                  <a href={`tel:${r.customerPhone}`} className="text-xs text-indigo-600 hover:underline">{r.customerPhone}</a>
                )}
              </div>
            )
          },
          {
            key: 'items', label: 'Sản phẩm', hideOnMobile: true, render: (r) => (
              <div className="text-xs text-gray-600 max-w-[180px]">
                {(r.items || []).slice(0, 2).map((i: any, idx: number) => (
                  <div key={idx} className="truncate">{i.productName} <span className="text-gray-400">×{i.quantity}</span></div>
                ))}
                {(r.items || []).length > 2 && (
                  <div className="text-gray-400">+{r.items.length - 2} sản phẩm</div>
                )}
              </div>
            )
          },
          {
            key: 'total', label: 'Tổng', render: (r) => (
              <span className="font-semibold text-gray-900 whitespace-nowrap text-sm">{fmtVND(r.total)}</span>
            )
          },
          {
            key: 'status', label: 'Trạng thái', render: (r) => {
              const cfg = STATUS_CONFIG[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
              return (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              );
            }
          },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetail(r)}
                  className="text-xs text-gray-500 hover:text-indigo-600 whitespace-nowrap"
                >
                  Chi tiết
                </button>
                <select
                  value={r.status}
                  onChange={e => updateStatus(r.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
            )
          },
        ]}
      />

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Tổng {total} đơn</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-40">◀</button>
            <span className="px-3 py-1">Trang {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 border rounded-md disabled:opacity-40">▶</button>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {detail && (
        <Modal open={!!detail} onClose={() => setDetail(null)} title={`Đơn hàng ${detail.orderCode}`}>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                {(() => {
                  const cfg = STATUS_CONFIG[detail.status] || { label: detail.status, color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>
              <span className="text-xs text-gray-400">{fmtDateTime(detail.createdAt)}</span>
            </div>

            {/* Customer info */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Thông tin khách hàng</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Tên:</span> <span className="font-medium">{detail.customerName || '—'}</span></div>
                <div><span className="text-gray-400">SĐT:</span> {detail.customerPhone
                  ? <a href={`tel:${detail.customerPhone}`} className="font-medium text-indigo-600">{detail.customerPhone}</a>
                  : '—'
                }</div>
              </div>
              {detail.shippingAddress && (
                <div className="text-sm"><span className="text-gray-400">Địa chỉ:</span> <span className="font-medium">{detail.shippingAddress}</span></div>
              )}
              {detail.note && (
                <div className="text-sm"><span className="text-gray-400">Ghi chú:</span> <span className="italic text-gray-600">{detail.note}</span></div>
              )}
            </div>

            {/* Items */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sản phẩm</div>
              <div className="space-y-2">
                {(detail.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-none">
                      {item.productImage
                        ? <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.productName}</div>
                      <div className="text-xs text-gray-400">{fmtVND(item.price)} × {item.quantity}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{fmtVND(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Tổng cộng</span>
              <span className="text-xl font-bold text-indigo-700">{fmtVND(detail.total)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1">
              {detail.status === 'pending' && (
                <button
                  onClick={() => { updateStatus(detail.id, 'confirmed'); setDetail({ ...detail, status: 'confirmed' }); }}
                  className="flex-1 bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  ✓ Xác nhận đơn
                </button>
              )}
              {detail.status === 'confirmed' && (
                <button
                  onClick={() => { updateStatus(detail.id, 'shipping'); setDetail({ ...detail, status: 'shipping' }); }}
                  className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  🚚 Chuyển sang Giao hàng
                </button>
              )}
              {detail.status === 'shipping' && (
                <button
                  onClick={() => { updateStatus(detail.id, 'delivered'); setDetail({ ...detail, status: 'delivered' }); }}
                  className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  ✅ Đã giao hàng
                </button>
              )}
              {!['delivered', 'cancelled'].includes(detail.status) && (
                <button
                  onClick={() => { if (confirm('Huỷ đơn này?')) { updateStatus(detail.id, 'cancelled'); setDetail(null); } }}
                  className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50"
                >
                  Huỷ đơn
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
