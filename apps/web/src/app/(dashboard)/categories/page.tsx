'use client';
import { useEffect, useState } from 'react';
import { categoriesApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    categoriesApi.list().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await categoriesApi.create(form);
      setModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return;
    await categoriesApi.delete(id).catch(() => {});
    load();
  };

  return (
    <div>
      <PageHeader
        title="🗂 Danh mục"
        subtitle={`${items.length} danh mục`}
        action={
          <button onClick={() => setModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Thêm danh mục
          </button>
        }
      />

      <DataTable
        loading={loading}
        data={items}
        columns={[
          { key: 'name', label: 'Tên danh mục', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'slug', label: 'Slug', render: (r) => <span className="font-mono text-xs text-gray-400">{r.slug}</span> },
          { key: 'description', label: 'Mô tả', render: (r) => <span className="text-xs text-gray-500">{r.description || '-'}</span> },
          { key: 'isActive', label: 'Trạng thái', render: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {r.isActive ? 'Active' : 'Inactive'}
            </span>
          )},
          { key: 'actions', label: '', render: (r) => (
            <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
          )},
        ]}
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Thêm danh mục" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" placeholder="VD: Điện thoại" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
