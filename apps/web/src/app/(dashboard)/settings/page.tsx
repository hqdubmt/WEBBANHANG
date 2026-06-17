'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { bustBrandCache } from '@/components/Logo';

const COLOR_OPTIONS = [
  { value: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { value: 'blue', label: 'Blue', hex: '#2563eb' },
  { value: 'violet', label: 'Violet', hex: '#7c3aed' },
  { value: 'emerald', label: 'Emerald', hex: '#059669' },
  { value: 'rose', label: 'Rose', hex: '#e11d48' },
  { value: 'orange', label: 'Orange', hex: '#ea580c' },
  { value: 'teal', label: 'Teal', hex: '#0d9488' },
];

export default function SettingsPage() {
  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Brand text state
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [emoji, setEmoji] = useState('');
  const [primaryColor, setPrimaryColor] = useState('indigo');
  const [saving, setSaving] = useState(false);

  // Contact / support info state
  const [hotline, setHotline] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [workingHours, setWorkingHours] = useState('8:00 – 22:00 hàng ngày');
  const [facebook, setFacebook] = useState('');
  const [zalo, setZalo] = useState('');
  const [telegram, setTelegram] = useState('');
  const [copyright, setCopyright] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/brand/upload')
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.url ?? null));

    fetch('/api/brand/config')
      .then((r) => r.json())
      .then((d) => {
        setBrandName(d.name ?? '');
        setTagline(d.tagline ?? '');
        setEmoji(d.emoji ?? '');
        setPrimaryColor(d.primaryColor ?? 'indigo');
        setHotline(d.hotline ?? '');
        setEmail(d.email ?? '');
        setAddress(d.address ?? '');
        setWorkingHours(d.workingHours ?? '8:00 – 22:00 hàng ngày');
        setFacebook(d.facebook ?? '');
        setZalo(d.zalo ?? '');
        setTelegram(d.telegram ?? '');
        setCopyright(d.copyright ?? '');
      });
  }, []);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  // ── Logo upload ────────────────────────────────────────────────
  const upload = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/brand/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi upload');
      setLogoUrl(data.url);
      bustBrandCache();
      showMsg('ok', 'Upload logo thành công!');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    upload(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = async () => {
    if (!confirm('Xóa logo hiện tại?')) return;
    await fetch('/api/brand/upload', { method: 'DELETE' });
    setLogoUrl(null);
    bustBrandCache();
    showMsg('ok', 'Đã xóa logo');
  };

  // ── Brand text save ────────────────────────────────────────────
  const handleSaveBrand = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/brand/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName, tagline, emoji, primaryColor }),
      });
      if (!res.ok) throw new Error('Lỗi lưu');
      bustBrandCache();
      showMsg('ok', 'Đã lưu thông tin thương hiệu! Refresh trang để thấy thay đổi.');
    } catch {
      showMsg('err', 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Contact info save ──────────────────────────────────────────
  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const res = await fetch('/api/brand/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotline, email, address, workingHours, facebook, zalo, telegram, copyright }),
      });
      if (!res.ok) throw new Error('Lỗi lưu');
      showMsg('ok', 'Đã lưu thông tin liên hệ! Trang store sẽ hiển thị thay đổi ngay.');
    } catch {
      showMsg('err', 'Lưu thất bại');
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Cài đặt thương hiệu" subtitle="Tuỳ chỉnh tên, logo và màu sắc hiển thị trên toàn bộ app" />

      {/* Toast */}
      {msg && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      {/* ── Brand Text ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-5">Thông tin thương hiệu</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên thương hiệu
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="AI Commerce OS"
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Hiển thị trên sidebar và tiêu đề trang</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline / Mô tả ngắn
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="V3 · 16 AI Agents · Multi-channel"
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Dòng phụ hiển thị dưới tên (bỏ trống để ẩn)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emoji icon (fallback khi không có logo ảnh)
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🚀"
              maxLength={4}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Màu chủ đạo
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  title={c.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    primaryColor === c.value
                      ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Áp dụng sau khi rebuild (npm run build)</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={handleSaveBrand}
            disabled={saving || !brandName.trim()}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Lưu thương hiệu'}
          </button>
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Logo ảnh</h2>

        {/* Preview */}
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-3xl">{emoji || '🚀'}</span>
            )}
          </div>
          <div className="text-sm text-gray-500 leading-relaxed">
            <p className="font-medium text-gray-700 mb-1">Logo hiện tại</p>
            {logoUrl ? (
              <p className="text-green-600">✓ Đã có ảnh logo tuỳ chỉnh</p>
            ) : (
              <p>Đang dùng emoji. Upload ảnh để thay thế.</p>
            )}
            <p className="mt-1 text-xs">PNG, JPG, WEBP, SVG · Tối đa 2MB</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
          } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Đang tải lên...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📁</span>
              <p className="text-sm font-medium text-gray-700">Kéo ảnh vào đây hoặc click để chọn</p>
              <p className="text-xs text-gray-400">Hỗ trợ PNG, JPG, WEBP, SVG</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Chọn ảnh
          </button>
          {logoUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Xóa logo
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Sau khi upload, logo thay đổi ngay — không cần build lại.
        </p>
      </div>

      {/* ── Contact & Support Info ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Thông tin hỗ trợ & Liên hệ</h2>
        <p className="text-xs text-gray-400 mb-5">Hiển thị ở footer trang Store, trang theo dõi đơn hàng</p>

        <div className="space-y-4">
          {/* Row 1: Hotline + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📞 Hotline / Số điện thoại</label>
              <input
                type="text"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                placeholder="1900 xxxx hoặc 0901 234 567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📧 Email hỗ trợ</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="support@shop.vn"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Working hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🕐 Giờ làm việc</label>
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              placeholder="8:00 – 22:00 hàng ngày"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Row 3: Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Địa chỉ cửa hàng</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Row 4: Social links */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://fb.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zalo</label>
              <input
                type="text"
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
                placeholder="0901234567 hoặc link Zalo OA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username hoặc link"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Copyright */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">© Bản quyền (footer)</label>
            <input
              type="text"
              value={copyright}
              onChange={(e) => setCopyright(e.target.value)}
              placeholder={`© ${new Date().getFullYear()} ${brandName || 'Shop AI'} — All rights reserved`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Để trống sẽ dùng mặc định</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={handleSaveContact}
            disabled={savingContact}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {savingContact ? 'Đang lưu...' : 'Lưu thông tin liên hệ'}
          </button>
          <span className="text-xs text-gray-400">Thay đổi hiển thị ngay trên trang Store</span>
        </div>
      </div>
    </div>
  );
}
