'use client';
import { useEffect, useState } from 'react';
import { videoAutomationApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

type Tab = 'dashboard' | 'runs' | 'sources' | 'run';

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  fetching:   'bg-blue-100 text-blue-700',
  scripting:  'bg-indigo-100 text-indigo-700',
  voicing:    'bg-purple-100 text-purple-700',
  rendering:  'bg-yellow-100 text-yellow-700',
  uploading:  'bg-orange-100 text-orange-700',
  done:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Chờ',
  fetching:  'Đang lấy tin',
  scripting: 'Viết kịch bản',
  voicing:   'Tạo giọng đọc',
  rendering: 'Ghép video',
  uploading: 'Upload',
  done:      'Hoàn thành',
  failed:    'Thất bại',
};

const STEP_ICONS = ['📡', '🤖', '🎙', '🎬', '☁️'];
const STEP_LABELS = ['Lấy tin', 'Ollama AI', 'Piper TTS', 'FFmpeg', 'YouTube / FB / TikTok'];

function fmtDur(ms: number) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ── Video Player & Download buttons ──────────────────────────────────────────
function VideoActions({ run }: { run: any }) {
  const [showPlayer, setShowPlayer] = useState(false);

  if (run?.status !== 'done') return null;

  const hasVideo    = !!run.storageUrl;
  const downloadUrl = videoAutomationApi.downloadUrl(run.id);
  // Player dùng /api/...view — stream qua NestJS (không cần port 8080 mở ra ngoài)
  const playerSrc   = videoAutomationApi.viewUrl(run.id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {hasVideo ? (
          <>
            <button
              onClick={() => setShowPlayer(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {showPlayer ? '⏸ Đóng player' : '▶ Xem video'}
            </button>
            <a
              href={downloadUrl}
              download={`video-${run.id.slice(0, 8)}.mp4`}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⬇ Tải video về
            </a>
            <a
              href={videoAutomationApi.viewUrl(run.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              🔗 Mở tab mới
            </a>
          </>
        ) : (
          <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
            ⚠ Video chưa có URL — nhấn "Ghép video cũ" ở Dashboard
          </span>
        )}
      </div>

      {showPlayer && playerSrc && (
        <div className="rounded-xl overflow-hidden border bg-black">
          <video
            src={playerSrc}
            controls
            autoPlay
            playsInline
            className="w-full"
            style={{ aspectRatio: '9/16', maxWidth: '270px', margin: '0 auto', display: 'block' }}
            onError={() => {}}
          >
            Trình duyệt không hỗ trợ video.
          </video>
          <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-900 truncate">{playerSrc}</div>
        </div>
      )}
    </div>
  );
}

export default function VideoAutomationPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(3);
  const [msg, setMsg] = useState('');
  const [runResult, setRunResult] = useState<any>(null);
  // Form thêm nguồn
  const [srcName, setSrcName] = useState('');
  const [srcType, setSrcType] = useState('rss');
  const [srcUrl, setSrcUrl] = useState('');
  const [srcKeyword, setSrcKeyword] = useState('');
  const [srcMax, setSrcMax] = useState(2);
  const [addingSource, setAddingSource] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const loadStats = async () => {
    const s = await videoAutomationApi.stats().catch(() => null);
    setStats(s);
  };

  const loadRuns = async () => {
    const r = await videoAutomationApi.runs(30).catch(() => []);
    setRuns(Array.isArray(r) ? r : []);
  };

  const loadSources = async () => {
    const s = await videoAutomationApi.sources().catch(() => []);
    setSources(Array.isArray(s) ? s : []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadRuns(), loadSources()]).finally(() => setLoading(false));
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await videoAutomationApi.run(count);
      setRunResult(res);
      notify(`Pipeline hoàn thành! Tạo được ${res.generated} video.`);
      await Promise.all([loadStats(), loadRuns()]);
    } catch (e: any) {
      notify(`Lỗi: ${e.message || 'Không kết nối được API'}`);
    }
    setRunning(false);
  };

  const handleViewRun = async (id: string) => {
    const r = await videoAutomationApi.getRun(id).catch(() => null);
    setSelectedRun(r);
    setTab('runs');
  };

  const TAB_CLASS = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="🎬 Video Automation"
        subtitle="Pipeline AI tự động: RSS → Ollama → TTS → FFmpeg → YouTube / Facebook / TikTok"
      />

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('Lỗi') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['dashboard', 'sources', 'runs', 'run'] as Tab[]).map(t => (
          <button key={t} className={TAB_CLASS(t)} onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 Dashboard'
              : t === 'sources' ? `📡 Nguồn tin${sources.length ? ` (${sources.filter((s:any)=>s.active).length}/${sources.length})` : ''}`
              : t === 'runs' ? '📋 Lịch sử'
              : '▶️ Chạy thủ công'}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Luồng pipeline tự động</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {STEP_ICONS.map((icon, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-2xl">
                      {icon}
                    </div>
                    <span className="text-xs text-gray-500 mt-1 text-center w-20">{STEP_LABELS[i]}</span>
                  </div>
                  {i < STEP_ICONS.length - 1 && <div className="text-gray-300 text-xl mb-4">→</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Lịch chạy tự động: <span className="font-semibold text-gray-600">06:00 · 12:00 · 18:00 · 22:00</span> mỗi ngày
              </div>
              <button
                onClick={async () => {
                  setBackfilling(true);
                  try {
                    const r = await videoAutomationApi.backfill();
                    notify(`Ghép xong: ${r.fixed} video có URL, ${r.skipped} không khớp`);
                    await loadRuns();
                  } catch { notify('Lỗi backfill'); }
                  setBackfilling(false);
                }}
                disabled={backfilling}
                className="text-xs px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {backfilling ? '⏳ Đang ghép...' : '🔧 Ghép video cũ'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Đang tải...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tổng runs', value: stats.total, icon: '📊', color: 'text-gray-700' },
                { label: 'Thành công', value: stats.done, icon: '✅', color: 'text-green-600' },
                { label: 'Thất bại', value: stats.failed, icon: '❌', color: 'text-red-600' },
                { label: 'Tỉ lệ', value: `${stats.successRate}%`, icon: '📈', color: 'text-indigo-600' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl border p-5">
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
              Không tải được thống kê. Kiểm tra kết nối API.
            </div>
          )}

          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Runs gần đây</h3>
              <button onClick={() => setTab('runs')} className="text-xs text-indigo-600 hover:underline">Xem tất cả →</button>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🎬</div>
                <div className="text-sm">Chưa có run nào. Nhấn "Chạy thủ công" để thử.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handleViewRun(r.id)}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">{r.storyTitle || '(không có tiêu đề)'}</span>
                    {r.storageUrl && <span className="text-xs text-indigo-500 flex-shrink-0">🎬 có video</span>}
                    <span className="text-xs text-gray-400 hidden sm:block">{fmtDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NGUỒN TIN ── */}
      {tab === 'sources' && (
        <div className="space-y-6">
          {/* Form thêm nguồn */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Thêm nguồn tin mới</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tên nguồn</label>
                <input value={srcName} onChange={e => setSrcName(e.target.value)}
                  placeholder="VD: Báo Tuổi Trẻ, Shopee Điện thoại..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Loại nguồn</label>
                <select value={srcType} onChange={e => setSrcType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="rss">RSS Feed</option>
                  <option value="tiki">Tiki (từ khoá)</option>
                  <option value="shopee">Shopee (từ khoá)</option>
                  <option value="website">Website / URL khác</option>
                </select>
              </div>
              {(srcType === 'rss' || srcType === 'website') && (
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">URL RSS / Website</label>
                  <input value={srcUrl} onChange={e => setSrcUrl(e.target.value)}
                    placeholder="https://tuoitre.vn/rss/tin-moi-nhat.rss"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              )}
              {(srcType === 'tiki' || srcType === 'shopee') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Từ khoá tìm kiếm</label>
                  <input value={srcKeyword} onChange={e => setSrcKeyword(e.target.value)}
                    placeholder="VD: điện thoại, laptop, mỹ phẩm..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Số tin mỗi lần chạy</label>
                <input type="number" min={1} max={10} value={srcMax} onChange={e => setSrcMax(Number(e.target.value))}
                  className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <button
              disabled={addingSource || !srcName}
              onClick={async () => {
                setAddingSource(true);
                try {
                  await videoAutomationApi.addSource({ name: srcName, type: srcType, url: srcUrl || undefined, keyword: srcKeyword || undefined, maxItems: srcMax });
                  setSrcName(''); setSrcUrl(''); setSrcKeyword(''); setSrcMax(2);
                  await loadSources();
                  notify('Đã thêm nguồn tin!');
                } catch { notify('Lỗi: không thêm được'); }
                setAddingSource(false);
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {addingSource ? '⏳ Đang thêm...' : '+ Thêm nguồn'}
            </button>
          </div>

          {/* Danh sách nguồn hiện tại */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Nguồn tin đang cấu hình</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tất cả nguồn đang bật chạy SONG SONG khi pipeline khởi động</p>
              </div>
              <button onClick={loadSources} className="text-xs text-indigo-600 hover:underline">Làm mới</button>
            </div>

            {/* Nguồn mặc định từ env */}
            <div className="px-6 py-3 bg-blue-50 border-b">
              <div className="text-xs text-blue-700 font-medium mb-1">Nguồn mặc định (env) — luôn chạy</div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📡 RSS_FEED_URLS</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🛒 Tiki top seller</span>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Chưa có nguồn nào. Thêm ở trên.</div>
            ) : (
              <div className="divide-y">
                {sources.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 px-6 py-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.active ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {s.type === 'rss' || s.type === 'website' ? s.url : `${s.type} · từ khoá: "${s.keyword || 'bán chạy'}"`}
                        {' · '}{s.maxItems} tin/lần
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      s.type === 'rss' ? 'bg-orange-100 text-orange-700'
                      : s.type === 'tiki' ? 'bg-blue-100 text-blue-700'
                      : s.type === 'shopee' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>{s.type}</span>
                    <button
                      onClick={async () => { await videoAutomationApi.toggleSource(s.id); loadSources(); }}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors flex-shrink-0 ${s.active ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {s.active ? 'Bật' : 'Tắt'}
                    </button>
                    <button
                      onClick={async () => { await videoAutomationApi.deleteSource(s.id); loadSources(); notify('Đã xoá nguồn'); }}
                      className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      Xoá
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sơ đồ parallel */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Cách chạy song song</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-indigo-500 font-mono text-xs mt-0.5">Promise.all([</span>
              </div>
              <div className="ml-4 space-y-1">
                <div className="flex items-center gap-2 text-xs bg-blue-50 rounded px-2 py-1">
                  <span>📡</span><span>RSS_FEED_URLS từ env</span><span className="ml-auto text-blue-500">parallel</span>
                </div>
                <div className="flex items-center gap-2 text-xs bg-blue-50 rounded px-2 py-1">
                  <span>🛒</span><span>Tiki top seller (mặc định)</span><span className="ml-auto text-blue-500">parallel</span>
                </div>
                {sources.filter((s:any) => s.active).map((s:any) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs bg-indigo-50 rounded px-2 py-1">
                    <span>{s.type === 'rss' ? '📡' : s.type === 'tiki' ? '🛒' : s.type === 'shopee' ? '🛍' : '🌐'}</span>
                    <span>{s.name}</span>
                    <span className="ml-auto text-indigo-500">parallel</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-500 font-mono">]) → merge → dedup → shuffle → pipeline</div>
            </div>
          </div>
        </div>
      )}

      {/* ── LỊCH SỬ ── */}
      {tab === 'runs' && (
        <div className="space-y-4">
          {selectedRun && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Chi tiết run</h3>
                <button onClick={() => setSelectedRun(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Đóng</button>
              </div>

              {/* ── Video player + nút tải ── */}
              <VideoActions run={selectedRun} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-400">Trạng thái:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[selectedRun.status]}`}>{STATUS_LABEL[selectedRun.status] || selectedRun.status}</span></div>
                <div><span className="text-gray-400">Nguồn:</span> <span className="ml-1 font-medium">{selectedRun.source}</span></div>
                <div><span className="text-gray-400">Thời gian:</span> <span className="ml-1 font-medium">{fmtDur(selectedRun.durationMs)}</span></div>
                <div><span className="text-gray-400">Tạo lúc:</span> <span className="ml-1">{fmtDate(selectedRun.createdAt)}</span></div>
                {selectedRun.youtubeUrl && <div><span className="text-gray-400">YouTube:</span> <span className="ml-1 text-red-600 font-medium">{selectedRun.youtubeUrl}</span></div>}
                {selectedRun.facebookUrl && <div><span className="text-gray-400">Facebook:</span> <span className="ml-1 text-blue-600 font-medium">{selectedRun.facebookUrl}</span></div>}
                {selectedRun.tiktokFile && <div><span className="text-gray-400">TikTok:</span> <span className="ml-1 text-pink-600 font-medium">Queued</span></div>}
              </div>

              {selectedRun.videoTitle && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Tiêu đề video AI</div>
                  <div className="text-sm text-gray-800 font-medium">{selectedRun.videoTitle}</div>
                </div>
              )}
              {selectedRun.script && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Kịch bản</div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">{selectedRun.script}</div>
                </div>
              )}
              {selectedRun.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedRun.hashtags.map((h: string, i: number) => (
                    <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{h}</span>
                  ))}
                </div>
              )}
              {selectedRun.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <span className="font-semibold">Lỗi:</span> {selectedRun.errorMessage}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Lịch sử pipeline ({runs.length})</h3>
              <button onClick={loadRuns} className="text-xs text-indigo-600 hover:underline">Làm mới</button>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🎬</div>
                <div className="text-sm">Chưa có run nào</div>
              </div>
            ) : (
              <div className="divide-y">
                {runs.map(r => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-6 py-3 text-sm ${selectedRun?.id === r.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    <span
                      className="flex-1 text-gray-700 truncate cursor-pointer hover:text-indigo-600"
                      onClick={() => handleViewRun(r.id)}
                    >
                      {r.storyTitle || '—'}
                    </span>
                    {/* Nút xem / tải nhanh ngay trên row */}
                    {r.status === 'done' && r.storageUrl && (
                      <div className="flex gap-1 flex-shrink-0">
                        <a
                          href={videoAutomationApi.viewUrl(r.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                        >
                          ▶ Xem
                        </a>
                        <a
                          href={videoAutomationApi.downloadUrl(r.id)}
                          download={`video-${r.id.slice(0,8)}.mp4`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          ⬇ Tải
                        </a>
                      </div>
                    )}
                    <span className="text-gray-400 flex-shrink-0 hidden lg:block">{fmtDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHẠY THỦ CÔNG ── */}
      {tab === 'run' && (
        <div className="space-y-6 max-w-xl">
          <div className="bg-white rounded-xl border p-6 space-y-5">
            <h3 className="font-semibold text-gray-800">Chạy pipeline thủ công</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Số video cần tạo</label>
              <input
                type="number" min={1} max={10} value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
              <div className="font-medium text-gray-700 mb-2">Pipeline sẽ thực hiện:</div>
              {STEP_ICONS.map((icon, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span>{icon}</span><span>{STEP_LABELS[i]}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleRun}
              disabled={running}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {running
                ? <><span className="animate-spin">⏳</span>Đang chạy pipeline...</>
                : <>▶️ Chạy ngay ({count} video)</>
              }
            </button>
          </div>

          {runResult && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold text-gray-800">Kết quả: {runResult.generated} video</h3>
              </div>
              {Array.isArray(runResult.runs) && runResult.runs.map((r: any, i: number) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status] || r.status}</span>
                    <span className="font-medium text-gray-800">{r.videoTitle || r.storyTitle}</span>
                  </div>

                  {/* Nút xem/tải ngay trong kết quả */}
                  <VideoActions run={r} />

                  {r.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.hashtags.map((h: string, j: number) => (
                        <span key={j} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {r.youtubeUrl && <span className="text-red-600">▶ YouTube: {r.youtubeUrl}</span>}
                    {r.facebookUrl && <span className="text-blue-600">f Facebook Reels</span>}
                    {r.tiktokFile && <span className="text-pink-600">♪ TikTok: queued</span>}
                    <span>⏱ {fmtDur(r.durationMs)}</span>
                  </div>
                  {r.errorMessage && (
                    <div className="text-red-600 text-xs bg-red-50 rounded px-2 py-1">{r.errorMessage}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
