'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/brand/upload')
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.url ?? null));
  }, []);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/brand/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi upload');
      setLogoUrl(data.url);
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
    showMsg('ok', 'Đã xóa logo');
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Cài đặt thương hiệu" subtitle="Thay logo hiển thị trên sidebar và toàn bộ app" />

      {/* Toast */}
      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Logo</h2>

        {/* Preview */}
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-3xl">🚀</span>
            )}
          </div>
          <div className="text-sm text-gray-500 leading-relaxed">
            <p className="font-medium text-gray-700 mb-1">Logo hiện tại</p>
            {logoUrl ? (
              <p className="text-green-600">✓ Đã có ảnh logo tuỳ chỉnh</p>
            ) : (
              <p>Đang dùng emoji mặc định. Upload ảnh để thay thế.</p>
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

        {/* Actions */}
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
    </div>
  );
}
