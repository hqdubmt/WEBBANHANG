'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

export default function AccessTradePage() {
  const [config, setConfig] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);
  const [testUrl, setTestUrl] = useState('https://tiki.vn/dien-thoai-samsung-galaxy-s24-p123456.html');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [campaignId, setCampaignId] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [cfg, m, c, s] = await Promise.all([
      api.get<any>('/marketplace/accesstrade/config').catch(() => null),
      api.get<any>('/marketplace/accesstrade/me').catch(() => null),
      api.get<any>('/marketplace/accesstrade/campaigns').catch(() => null),
      api.get<any>('/marketplace/accesstrade/stats').catch(() => null),
    ]);
    setConfig(cfg);
    setMe(m);
    setCampaigns(c?.campaigns || []);
    setStats(s);
    setLoading(false);
  };

  const testLink = async () => {
    if (!testUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<any>('/marketplace/accesstrade/test-link', {
        url: testUrl,
        campaignId: campaignId || undefined,
      });
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ error: e.message });
    }
    setTesting(false);
  };

  const migrate = async () => {
    if (!confirm('Chuyển toàn bộ link Tiki sang AccessTrade tracking links? Hành động này sẽ cập nhật 159 sản phẩm.')) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const result = await api.post<any>('/marketplace/accesstrade/migrate-links', {
        campaignId: campaignId || undefined,
      });
      setMigrateResult(result);
    } catch (e: any) {
      setMigrateResult({ success: false, message: e.message });
    }
    setMigrating(false);
  };

  return (
    <div>
      <PageHeader
        title="🔗 AccessTrade"
        subtitle="Affiliate marketing qua AccessTrade.vn"
        action={
          <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            🔄 Refresh
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : (
        <div className="space-y-5">

          {/* Config Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">⚙️ Cấu hình</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl mb-1 ${config?.hasApiKey ? 'text-green-500' : 'text-red-400'}`}>
                  {config?.hasApiKey ? '✅' : '❌'}
                </div>
                <div className="text-xs text-gray-500">API Key</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl mb-1 ${config?.pid ? 'text-green-500' : 'text-gray-300'}`}>
                  {config?.pid ? '✅' : '⬜'}
                </div>
                <div className="text-xs text-gray-500">Publisher ID</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl mb-1 ${config?.tikiAid ? 'text-green-500' : 'text-gray-300'}`}>
                  {config?.tikiAid ? '✅' : '⬜'}
                </div>
                <div className="text-xs text-gray-500">Tiki AID</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1 text-blue-500">💰</div>
                <div className="text-xs text-gray-500">Commission {config?.commissionRate || 8}%</div>
              </div>
            </div>

            {!config?.hasApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>Cần điền ACCESSTRADE_API_KEY vào file .env</strong><br />
                Vào AccessTrade.vn → Tài khoản → API → Copy API Key → paste vào .env rồi restart PM2.
              </div>
            )}

            {config?.hasApiKey && (
              <div className="text-sm text-gray-600">
                Chế độ: <span className="font-medium text-indigo-600">{config.apiMode}</span>
              </div>
            )}
          </div>

          {/* Publisher Info */}
          {me && !me.error && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">👤 Thông tin Publisher</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(me).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-gray-400 capitalize">{k.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-medium text-gray-800">{String(v ?? '-')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaigns */}
          {campaigns.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">📋 Campaigns ({campaigns.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left pb-2">ID</th>
                      <th className="text-left pb-2">Tên Campaign</th>
                      <th className="text-left pb-2">Commission</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-left pb-2">Chọn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaigns.map((c: any) => (
                      <tr key={c.id} className={`hover:bg-gray-50 ${c.name?.toLowerCase().includes('tiki') ? 'bg-indigo-50' : ''}`}>
                        <td className="py-2 font-mono text-xs text-gray-400">{c.id}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {c.logo && <img src={c.logo} className="w-6 h-6 object-contain rounded" />}
                            <span className="font-medium text-gray-800">{c.name}</span>
                            {c.name?.toLowerCase().includes('tiki') && (
                              <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Tiki</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-green-600 font-medium">{c.commission_value || '-'}%</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.status || 'unknown'}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => setCampaignId(String(c.id))}
                            className={`text-xs px-2 py-1 rounded ${campaignId === String(c.id) ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-500 hover:border-indigo-300'}`}
                          >
                            {campaignId === String(c.id) ? 'Đã chọn' : 'Chọn'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {campaignId && (
                <div className="mt-2 text-sm text-indigo-600">✅ Campaign ID đang dùng: <code className="bg-indigo-50 px-1 rounded">{campaignId}</code></div>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && !stats.error && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">📊 Thống kê từ AT API</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.clicks && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Clicks</div>
                    <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-40">{JSON.stringify(stats.clicks, null, 2)}</pre>
                  </div>
                )}
                {stats.conversions && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Conversions</div>
                    <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-40">{JSON.stringify(stats.conversions, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Link */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3">🧪 Test tạo AT Tracking Link</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL sản phẩm Tiki</label>
                <input
                  value={testUrl}
                  onChange={e => setTestUrl(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400"
                  placeholder="https://tiki.vn/..."
                />
              </div>
              {campaignId && (
                <div className="text-xs text-gray-500">Campaign ID: <code>{campaignId}</code></div>
              )}
              <button
                onClick={testLink}
                disabled={testing || !testUrl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {testing ? '⏳ Đang test...' : '🔗 Tạo Tracking Link'}
              </button>
              {testResult && (
                <div className={`rounded-lg p-4 text-sm ${testResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {testResult.error ? (
                    <span className="text-red-700">❌ {testResult.error}</span>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Method:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${testResult.method === 'api' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {testResult.method === 'api' ? '✅ AT API' : '🔗 Deeplink URL'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Tracking URL:</div>
                        <div className="font-mono text-xs bg-white border border-green-200 rounded p-2 break-all select-all">
                          {testResult.trackingUrl}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Migrate */}
          <div className="bg-white border border-orange-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-2">🚀 Migrate 159 sản phẩm Tiki → AT Links</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cập nhật toàn bộ affiliateLink của 159 sản phẩm Tiki sang AccessTrade tracking links.
              {campaignId && <span className="text-indigo-600"> Campaign ID: {campaignId}</span>}
            </p>
            <button
              onClick={migrate}
              disabled={migrating || !config?.isConfigured}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {migrating ? '⏳ Đang migrate...' : '🔄 Migrate tất cả sản phẩm'}
            </button>
            {migrateResult && (
              <div className={`mt-3 rounded-lg p-4 text-sm ${migrateResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {migrateResult.success ? (
                  <div className="space-y-1">
                    <div className="font-semibold text-green-800">✅ {migrateResult.message}</div>
                    <div className="text-green-700 text-xs">
                      API links: {migrateResult.apiLinks} | Deeplinks: {migrateResult.deepLinks}
                      {migrateResult.campaignId && ` | Campaign: ${migrateResult.campaignId}`}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-700">❌ {migrateResult.message}</span>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
