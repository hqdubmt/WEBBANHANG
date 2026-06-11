'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import brand from '@/config/brand';

type Tab = 'login' | 'setup';

export default function LoginPage() {
  const { login, token, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('login');
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Setup form
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace('/');
  }, [token, loading, router]);

  useEffect(() => {
    api.get<{ needed: boolean }>('/auth/setup-status')
      .then((res) => {
        setSetupNeeded(res.needed);
        if (res.needed) setTab('setup');
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (setupPassword !== setupConfirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (setupPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setSubmitting(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: any }>(
        '/auth/setup',
        { email: setupEmail, password: setupPassword, name: setupName },
      );
      // Auto login after setup
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Tạo tài khoản thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <p className="text-indigo-300 text-sm">Đang khởi động...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Logo variant="full" size={56} nameClass="text-white" taglineClass="text-indigo-300" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs — chỉ hiện khi cần setup hoặc đã setup xong */}
          {setupNeeded && (
            <div className="flex border-b">
              <button
                onClick={() => { setTab('setup'); setError(''); }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'setup' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                🛡 Tạo Admin
              </button>
              <button
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                🔑 Đăng nhập
              </button>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* === SETUP TAB === */}
            {tab === 'setup' && (
              <>
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Thiết lập tài khoản Admin</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Tài khoản đầu tiên sẽ có toàn quyền quản trị hệ thống.
                    Sau khi tạo xong, chức năng này sẽ bị vô hiệu hóa.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
                )}

                <form onSubmit={handleSetup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      required
                      placeholder="Nguyễn Văn A"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      required
                      placeholder="admin@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <input
                      type="password"
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      value={setupConfirm}
                      onChange={(e) => setSetupConfirm(e.target.value)}
                      required
                      placeholder="Nhập lại mật khẩu"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    ⚠️ Ghi nhớ thông tin đăng nhập. Tài khoản Admin có toàn quyền xóa dữ liệu và quản lý hệ thống.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? 'Đang tạo...' : '🛡 Tạo tài khoản Admin'}
                  </button>
                </form>

                {!setupNeeded && (
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Hệ thống đã có Admin. Vui lòng{' '}
                    <button onClick={() => setTab('login')} className="text-indigo-600 hover:underline">đăng nhập</button>.
                  </p>
                )}
              </>
            )}

            {/* === LOGIN TAB === */}
            {tab === 'login' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-5">Đăng nhập</h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-indigo-400 mt-4">
          {brand.copyright} — Powered by NestJS + Next.js
        </p>
      </div>
    </div>
  );
}
