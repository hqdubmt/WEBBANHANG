'use client';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';

const ROLES = ['admin', 'manager', 'staff', 'viewer'];
const STATUSES = ['active', 'inactive', 'suspended'];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Admin',
  manager: '🔧 Manager',
  staff: '👤 Staff',
  viewer: '👁 Viewer',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

type ModalType = 'create' | 'reset' | 'delete' | null;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', role: 'viewer' });

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params: Record<string, any> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const [data, statsData] = await Promise.all([usersApi.list(params), usersApi.stats()]);
      setUsers(data.items || []);
      setTotal(data.total || 0);
      setStats(statsData);
    } catch (e: any) {
      setLoadError(e.message || 'Không tải được danh sách người dùng');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(); };

  const openModal = (type: ModalType, user?: User) => {
    setFormError('');
    setSelectedUser(user || null);
    if (type === 'create') setCreateForm({ email: '', password: '', name: '', role: 'viewer' });
    if (type === 'reset') { setNewPassword(''); setShowPwd(false); }
    setModal(type);
  };

  const closeModal = () => { setModal(null); setSelectedUser(null); setSaving(false); setFormError(''); };

  const updateRole = async (id: string, role: string) => {
    try { await usersApi.updateRole(id, role); load(); }
    catch (e: any) { alert(e.message || 'Lỗi cập nhật role'); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await usersApi.updateStatus(id, status); load(); }
    catch (e: any) { alert(e.message || 'Lỗi cập nhật trạng thái'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.name) {
      setFormError('Vui lòng điền đầy đủ thông tin'); return;
    }
    if (createForm.password.length < 6) { setFormError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setSaving(true); setFormError('');
    try {
      await usersApi.create(createForm);
      closeModal(); load();
    } catch (e: any) { setFormError(e.message || 'Lỗi tạo tài khoản'); }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword) { setFormError('Nhập mật khẩu mới'); return; }
    if (newPassword.length < 6) { setFormError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setSaving(true); setFormError('');
    try {
      await usersApi.resetPassword(selectedUser!.id, newPassword);
      closeModal();
    } catch (e: any) { setFormError(e.message || 'Lỗi reset mật khẩu'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await usersApi.delete(selectedUser!.id);
      closeModal(); load();
    } catch (e: any) { setFormError(e.message || 'Lỗi xóa tài khoản'); }
    setSaving(false);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <PageHeader
        title="🔐 Quản lý người dùng"
        subtitle={`${total} tài khoản`}
        action={
          isAdmin ? (
            <button onClick={() => openModal('create')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Tạo tài khoản
            </button>
          ) : undefined
        }
      />

      {loadError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{loadError}</span>
          <button onClick={load} className="ml-auto text-red-600 underline text-xs">Thử lại</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Tổng', value: stats.total, color: 'bg-gray-50' },
            { label: 'Admin', value: stats.byRole?.admins ?? 0, color: 'bg-red-50' },
            { label: 'Manager', value: stats.byRole?.managers ?? 0, color: 'bg-purple-50' },
            { label: 'Staff', value: stats.byRole?.staff ?? 0, color: 'bg-blue-50' },
            { label: 'Viewer', value: stats.byRole?.viewers ?? 0, color: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border border-gray-200 rounded-xl p-4 text-center`}>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">Tìm</button>
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Tất cả role</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Đăng nhập cuối</th>
                {isAdmin && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm flex items-center gap-1">
                            {u.name}
                            {isSelf && <span className="text-xs text-gray-400">(bạn)</span>}
                          </div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && !isSelf ? (
                        <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && !isSelf ? (
                        <select value={u.status} onChange={(e) => updateStatus(u.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[u.status] || 'bg-gray-100'}`}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[u.status] || 'bg-gray-100'}`}>
                          {u.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!isSelf ? (
                            <>
                              <button onClick={() => openModal('reset', u)}
                                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium px-2 py-1 rounded-lg transition-colors">
                                🔑 Reset MK
                              </button>
                              <button onClick={() => openModal('delete', u)}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-medium px-2 py-1 rounded-lg transition-colors">
                                🗑 Xóa
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic pr-2">Tài khoản của bạn</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Tổng: {total} người dùng</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40">← Trước</button>
              <span className="px-3 py-1 text-xs text-gray-600">Trang {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* ---- CREATE MODAL ---- */}
            {modal === 'create' && (
              <form onSubmit={handleCreate}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900">Tạo tài khoản mới</h2>
                    <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                      <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                      <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phân quyền</label>
                      <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="viewer">👁 Viewer — Chỉ xem</option>
                        <option value="staff">👤 Staff — Vận hành</option>
                        <option value="manager">🔧 Manager — Quản lý</option>
                        <option value="admin">👑 Admin — Toàn quyền</option>
                      </select>
                    </div>
                    <div className="bg-indigo-50 rounded-lg px-3 py-2 text-xs text-indigo-700">
                      {createForm.role === 'admin' && 'Toàn quyền, quản lý người dùng và cấu hình hệ thống'}
                      {createForm.role === 'manager' && 'Xem báo cáo, quản lý sản phẩm/đơn/khách, xem người dùng'}
                      {createForm.role === 'staff' && 'Xử lý đơn hàng, quản lý leads, chạy agents'}
                      {createForm.role === 'viewer' && 'Chỉ xem dữ liệu, không thể thay đổi bất kỳ thứ gì'}
                    </div>
                    {formError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</div>}
                  </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button type="button" onClick={closeModal}
                    className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                    {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            )}

            {/* ---- RESET PASSWORD MODAL ---- */}
            {modal === 'reset' && selectedUser && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Reset mật khẩu</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-base font-bold flex-shrink-0">
                    {selectedUser.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{selectedUser.name}</div>
                    <div className="text-xs text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Người dùng sẽ cần dùng mật khẩu này để đăng nhập lần tiếp</p>
                </div>

                {formError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{formError}</div>}

                <div className="flex gap-3">
                  <button onClick={closeModal}
                    className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button onClick={handleResetPassword} disabled={saving}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                    {saving ? 'Đang reset...' : '🔑 Đặt mật khẩu mới'}
                  </button>
                </div>
              </div>
            )}

            {/* ---- DELETE MODAL ---- */}
            {modal === 'delete' && selectedUser && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Xóa tài khoản</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200 mb-5">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-base font-bold flex-shrink-0">
                    {selectedUser.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{selectedUser.name}</div>
                    <div className="text-xs text-gray-500">{selectedUser.email}</div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${ROLE_COLORS[selectedUser.role]}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-red-700 font-medium">Cảnh báo: Hành động này không thể hoàn tác!</p>
                  <p className="text-xs text-red-600 mt-1">Tài khoản sẽ bị xóa vĩnh viễn khỏi hệ thống.</p>
                </div>

                {formError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{formError}</div>}

                <div className="flex gap-3">
                  <button onClick={closeModal}
                    className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button onClick={handleDelete} disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                    {saving ? 'Đang xóa...' : '🗑 Xác nhận xóa'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
