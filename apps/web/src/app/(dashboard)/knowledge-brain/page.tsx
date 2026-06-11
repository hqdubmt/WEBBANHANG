'use client';
import { useEffect, useState } from 'react';
import { knowledgeBrainApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const DOMAIN_META: Record<string, { icon: string; color: string; label: string }> = {
  product: { icon: '📦', color: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Product' },
  customer: { icon: '👥', color: 'bg-purple-50 border-purple-200 text-purple-700', label: 'Customer' },
  business: { icon: '💰', color: 'bg-green-50 border-green-200 text-green-700', label: 'Business' },
  market: { icon: '📈', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', label: 'Market' },
  operational: { icon: '⚙️', color: 'bg-gray-50 border-gray-200 text-gray-700', label: 'Operational' },
};

const HEALTH_COLORS: Record<string, string> = {
  Healthy: 'bg-green-100 text-green-700',
  Warning: 'bg-yellow-100 text-yellow-700',
  Critical: 'bg-red-100 text-red-700',
};

const CONFIDENCE_COLOR = (c: number) =>
  c >= 80 ? 'text-green-600' : c >= 60 ? 'text-yellow-600' : 'text-red-500';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Card({ icon, title, children, color = 'border-gray-200' }: { icon: string; title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className={`bg-white rounded-2xl border ${color} p-5 mb-5`}>
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
        <span className="text-base">{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function KpiBox({ label, value, sub, highlight = false }: { label: string; value: any; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold leading-tight ${highlight ? 'text-indigo-700' : 'text-gray-800'}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function KnowledgeBrainPage() {
  const [dash, setDash] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'questions' | 'ask' | 'ingest'>('overview');
  const [loading, setLoading] = useState(true);

  const [askQuestion, setAskQuestion] = useState('');
  const [askResult, setAskResult] = useState<any>(null);
  const [asking, setAsking] = useState(false);

  const [ingestForm, setIngestForm] = useState({ domain: 'product', title: '', content: '', businessValue: 50 });
  const [ingesting, setIngesting] = useState(false);
  const [ingestDone, setIngestDone] = useState(false);

  useEffect(() => {
    Promise.all([
      knowledgeBrainApi.dashboard().catch(() => null),
      knowledgeBrainApi.executiveQuestions().catch(() => []),
    ]).then(([d, q]) => {
      setDash(d);
      setQuestions(q || []);
      setLoading(false);
    });
  }, []);

  const handleAsk = async () => {
    if (!askQuestion.trim()) return;
    setAsking(true);
    setAskResult(null);
    try {
      const result = await knowledgeBrainApi.ask(askQuestion);
      setAskResult(result);
    } catch {
      setAskResult({ error: 'Lỗi kết nối Knowledge Brain' });
    } finally {
      setAsking(false);
    }
  };

  const handleIngest = async () => {
    if (!ingestForm.title || !ingestForm.content) return;
    setIngesting(true);
    try {
      await knowledgeBrainApi.ingest(ingestForm);
      setIngestDone(true);
      setIngestForm({ domain: 'product', title: '', content: '', businessValue: 50 });
    } catch {
      // silent
    } finally {
      setIngesting(false);
    }
  };

  const domains = dash?.domains || {};
  const tiers = dash?.memoryTiers || {};
  const stats = dash?.knowledgeStats || {};
  const graph = dash?.graph || {};

  const TABS = [
    { key: 'overview', label: '5 Domains' },
    { key: 'questions', label: '8 Questions' },
    { key: 'ask', label: 'Ask Brain' },
    { key: 'ingest', label: 'Ingest' },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Knowledge Brain"
        subtitle="Bộ não tri thức trung tâm — Single Source of Truth cho mọi AI Agent"
      />

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">Đang tải Knowledge Brain...</div>
      )}

      {!loading && tab === 'overview' && (
        <>
          {/* Memory Tiers */}
          <Card icon="🗂" title="Memory Tiers — 3 lớp bộ nhớ" color="border-indigo-200">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{tiers.shortTerm ?? 0}</div>
                <div className="text-xs text-blue-600 font-medium mt-1">Short Term</div>
                <div className="text-xs text-gray-500 mt-0.5">Realtime / Chat</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                <div className="text-2xl font-bold text-indigo-700">{tiers.mediumTerm ?? 0}</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Medium Term</div>
                <div className="text-xs text-gray-500 mt-0.5">30 ngày / Campaigns</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">{tiers.longTerm ?? 0}</div>
                <div className="text-xs text-purple-600 font-medium mt-1">Long Term</div>
                <div className="text-xs text-gray-500 mt-0.5">Lịch sử / Chiến lược</div>
              </div>
            </div>
          </Card>

          {/* 5 Knowledge Domains */}
          <Card icon="🧠" title="5 Knowledge Domains">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(DOMAIN_META).map(([key, meta]) => {
                const data = domains[key] || {};
                return (
                  <div key={key} className={`rounded-xl border p-4 ${meta.color}`}>
                    <div className="text-2xl mb-2">{meta.icon}</div>
                    <div className="font-semibold text-sm mb-2">{meta.label}</div>
                    {key === 'product' && (
                      <>
                        <div className="text-xs">{data.totalProducts ?? 0} sản phẩm</div>
                        {data.topSeller && <div className="text-xs mt-1 truncate">Top: {data.topSeller}</div>}
                      </>
                    )}
                    {key === 'customer' && (
                      <>
                        <div className="text-xs">{data.total ?? 0} khách hàng</div>
                        <div className="text-xs">{data.vip ?? 0} VIP</div>
                      </>
                    )}
                    {key === 'business' && (
                      <>
                        <div className="text-xs">{fmtVND(data.revenue)}</div>
                        <div className="text-xs">Tăng trưởng: {data.growth ?? '0%'}</div>
                        <div className="text-xs">CVR: {data.conversion ?? '0%'}</div>
                      </>
                    )}
                    {key === 'market' && (
                      <>
                        <div className="text-xs">{data.priceAlerts ?? 0} cảnh báo giá</div>
                        <div className="text-xs">{data.trendCount ?? 0} xu hướng</div>
                      </>
                    )}
                    {key === 'operational' && (
                      <>
                        <div className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${HEALTH_COLORS[data.health] || HEALTH_COLORS['Healthy']}`}>
                          {data.health ?? 'Healthy'}
                        </div>
                        <div className="text-xs mt-1">{data.successRate ?? '100%'} success</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Knowledge Quality */}
          {stats.quality && (
            <Card icon="⭐" title="Knowledge Quality Score" color="border-yellow-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ScoreBar label="Accuracy" value={stats.quality.accuracy} />
                  <ScoreBar label="Completeness" value={stats.quality.completeness} />
                  <ScoreBar label="Freshness" value={stats.quality.freshness} />
                  <ScoreBar label="Business Value" value={stats.quality.businessValue} />
                </div>
                <div className="grid grid-cols-2 gap-2 content-start">
                  <KpiBox label="Tổng tri thức" value={stats.total ?? 0} />
                  <KpiBox label="Đã index" value={stats.indexed ?? 0} />
                  <KpiBox label="Coverage" value={stats.coverage ?? '0%'} highlight />
                  <KpiBox label="Domains" value={stats.byDomain?.length ?? 0} />
                </div>
              </div>
            </Card>
          )}

          {/* Relationship Graph */}
          {graph.nodes?.length > 0 && (
            <Card icon="🔗" title="Knowledge Relationship Graph">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {graph.nodes.map((n: any) => {
                  const meta = DOMAIN_META[n.domain] || DOMAIN_META.business;
                  return (
                    <div key={n.id} className={`rounded-lg border p-3 text-center text-xs ${meta.color}`}>
                      <div className="text-lg mb-1">{meta.icon}</div>
                      <div className="font-medium">{n.label}</div>
                      {n.count !== undefined && <div className="text-gray-500">{n.count}</div>}
                      {n.value !== undefined && <div className="text-gray-500">{fmtVND(n.value)}</div>}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1">
                {graph.edges?.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{e.from}</span>
                    <span>→ {e.label} →</span>
                    <span className="font-medium text-gray-700">{e.to}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!loading && tab === 'questions' && (
        <Card icon="❓" title="8 Executive Questions — Knowledge Brain phải trả lời được">
          <div className="space-y-3">
            {questions.map((q: any) => {
              const meta = DOMAIN_META[q.domain] || DOMAIN_META.business;
              return (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">Q{q.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">{q.question}</div>
                      <div className="text-sm text-gray-600">{q.answer}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-lg font-bold ${CONFIDENCE_COLOR(q.confidence)}`}>{q.confidence}%</div>
                      <div className="text-xs text-gray-400">confidence</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'ask' && (
        <Card icon="💬" title="Ask Knowledge Brain">
          <div className="mb-4">
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-indigo-400"
              rows={3}
              placeholder="Hỏi bất kỳ câu hỏi kinh doanh... VD: Sản phẩm nào nên tăng ngân sách quảng cáo? Khách hàng nào có nguy cơ rời bỏ?"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
            />
            <button
              onClick={handleAsk}
              disabled={asking || !askQuestion.trim()}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {asking ? '⏳ Đang tìm...' : '🔍 Hỏi Knowledge Brain'}
            </button>
          </div>
          {askResult && (
            <div className={`rounded-xl border p-4 ${askResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              {askResult.error ? (
                <p className="text-red-600 text-sm">{askResult.error}</p>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-2">
                    Confidence: <span className={`font-medium ${CONFIDENCE_COLOR(askResult.confidence)}`}>{askResult.confidence}%</span>
                    {askResult.hasContext && <span className="ml-2 text-green-600">✓ Có dữ liệu nội bộ</span>}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{askResult.answer}</p>
                </>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2 font-medium">Gợi ý câu hỏi:</div>
            <div className="flex flex-wrap gap-2">
              {[
                'Sản phẩm nào bán chạy nhất?',
                'Khách hàng nào có giá trị cao nhất?',
                'Điều gì đang làm mất doanh thu?',
                'Cơ hội tăng trưởng nhanh nhất là gì?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setAskQuestion(q)}
                  className="text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === 'ingest' && (
        <Card icon="📥" title="Ingest — Nạp tri thức mới vào Knowledge Brain">
          {ingestDone && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✓ Tri thức đã được nạp và index thành công!
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-400"
                value={ingestForm.domain}
                onChange={(e) => setIngestForm({ ...ingestForm, domain: e.target.value })}
              >
                <option value="product">📦 Product Knowledge</option>
                <option value="customer">👥 Customer Knowledge</option>
                <option value="business">💰 Business Knowledge</option>
                <option value="market">📈 Market Knowledge</option>
                <option value="operational">⚙️ Operational Knowledge</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-400"
                placeholder="VD: Chính sách hoàn trả sản phẩm"
                value={ingestForm.title}
                onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung tri thức</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:border-indigo-400"
                rows={5}
                placeholder="Nhập nội dung tri thức cần lưu vào Knowledge Brain..."
                value={ingestForm.content}
                onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Business Value: <span className="text-indigo-600 font-semibold">{ingestForm.businessValue}</span>/100
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={ingestForm.businessValue}
                onChange={(e) => setIngestForm({ ...ingestForm, businessValue: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
            <button
              onClick={handleIngest}
              disabled={ingesting || !ingestForm.title || !ingestForm.content}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {ingesting ? '⏳ Đang nạp...' : '📥 Nạp vào Knowledge Brain'}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
