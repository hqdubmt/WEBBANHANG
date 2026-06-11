'use client';
import { useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const PLATFORM_COLORS: Record<string, string> = {
  shopee: 'bg-orange-100 text-orange-700',
  lazada: 'bg-blue-100 text-blue-700',
  tiktok: 'bg-pink-100 text-pink-700',
};

export default function MarketplacePage() {
  const [status, setStatus] = useState<any>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generateUrl, setGenerateUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      marketplaceApi.status().catch(() => null),
      marketplaceApi.trending(30).catch(() => []),
    ]).then(([s, t]) => {
      setStatus(s);
      setTrending(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    const res = await marketplaceApi.search(searchQ, 20).catch(() => []);
    setSearchResults(Array.isArray(res) ? res : []);
    setSearching(false);
  };

  const handleGenerate = async () => {
    if (!generateUrl.trim()) return;
    setGenerating(true);
    const res = await marketplaceApi.generateLink(generateUrl).catch(() => null);
    setGeneratedLink(res);
    setGenerating(false);
  };

  return (
    <div>
      <PageHeader
        title="🛒 Marketplace"
        subtitle="Tích hợp Shopee · Lazada · TikTok Shop"
      />

      {/* Platform Status */}
      {status && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Trạng thái kết nối</h3>
          <div className="flex flex-wrap gap-3">
            {['shopee', 'lazada', 'tiktok'].map((platform) => {
              const configured = status.configured?.includes(platform);
              return (
                <div key={platform} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${configured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <span className={`w-2 h-2 rounded-full ${configured ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`text-sm font-medium capitalize ${platform === 'shopee' ? 'text-orange-700' : platform === 'lazada' ? 'text-blue-700' : 'text-pink-700'}`}>
                    {platform}
                  </span>
                  <span className="text-xs text-gray-500">{configured ? 'Đã cấu hình' : 'Chưa cấu hình'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Affiliate Link */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tạo link affiliate</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
            placeholder="Dán URL sản phẩm Shopee/Lazada/TikTok..."
            value={generateUrl}
            onChange={(e) => setGenerateUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {generating ? 'Đang tạo...' : 'Tạo link'}
          </button>
        </div>
        {generatedLink && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Link affiliate:</div>
            <a href={generatedLink.affiliateLink || generatedLink.link} target="_blank" rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline break-all">
              {generatedLink.affiliateLink || generatedLink.link || JSON.stringify(generatedLink)}
            </a>
            {generatedLink.platform && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[generatedLink.platform] || 'bg-gray-100 text-gray-500'}`}>
                {generatedLink.platform}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tìm sản phẩm trên các sàn</h3>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 outline-none"
            placeholder="Tìm sản phẩm..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {searching ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.name || item.productName}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[item.platform] || 'bg-gray-100 text-gray-500'}`}>{item.platform}</span>
                    <span className="text-xs text-gray-500">{fmtVND(item.price)}</span>
                    {item.commissionRate && <span className="text-xs text-green-600">+{item.commissionRate}%</span>}
                  </div>
                </div>
                {item.affiliateLink && (
                  <a href={item.affiliateLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline whitespace-nowrap ml-2">
                    Link affiliate
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Sản phẩm đang trending</h3>
        {loading ? (
          <div className="text-center text-gray-400 py-8">Đang tải...</div>
        ) : trending.length === 0 ? (
          <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-200">
            <div className="text-3xl mb-2">📡</div>
            <div className="text-sm">Cần cấu hình API key để lấy dữ liệu trending</div>
            <div className="text-xs text-gray-400 mt-1">SHOPEE_AFFILIATE_TOKEN, LAZADA_APP_KEY, TIKTOK_APP_ID</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[item.platform] || 'bg-gray-100 text-gray-500'}`}>{item.platform}</span>
                  {item.commissionRate && <span className="text-xs text-green-600 font-medium">+{item.commissionRate}%</span>}
                </div>
                <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{item.name || item.productName}</div>
                <div className="text-sm font-bold text-indigo-700">{fmtVND(item.price)}</div>
                {item.affiliateLink && (
                  <a href={item.affiliateLink} target="_blank" rel="noopener noreferrer"
                    className="mt-2 block text-center text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-1.5 rounded-lg transition-colors">
                    Lấy link affiliate
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
