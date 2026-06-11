'use client';
import { useEffect, useState } from 'react';
import { campaignsApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
};

const TYPE_ICONS: Record<string, string> = {
  email: '📧', telegram: '✈️', facebook: '📘', tiktok: '🎵', sms: '📱', push: '🔔',
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', content: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    campaignsApi.list().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await campaignsApi.create(form);
      setModal(false);
      setForm({ name: '', type: 'email', subject: '', content: '' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="📣 Chiến dịch"
        subtitle={`${items.length} chiến dịch`}
        action={
          <button onClick={() => setModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Tạo chiến dịch
          </button>
        }
      />

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'name', label: 'Tên chiến dịch', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'type', label: 'Loại', render: (r) => (
            <span className="flex items-center gap-1 text-sm">
              {TYPE_ICONS[r.type] || '📣'} {r.type}
            </span>
          )},
          { key: 'status', label: 'Trạng thái', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
              {r.status}
            </span>
          )},
          { key: 'sentCount', label: 'Đã gửi', render: (r) => r.sentCount || 0 },
          { key: 'openRate', label: 'Open rate', render: (r) => r.openRate ? r.openRate + '%' : '-' },
          { key: 'createdAt', label: 'Ngày tạo', render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
        ]}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Tạo chiến dịch mới">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên chiến dịch</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
              placeholder="VD: Flash sale tháng 6" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại chiến dịch</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              {['email', 'telegram', 'facebook', 'tiktok', 'sms', 'push'].map((t) => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
            <textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={save} disabled={saving || !form.name}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Tạo chiến dịch'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
