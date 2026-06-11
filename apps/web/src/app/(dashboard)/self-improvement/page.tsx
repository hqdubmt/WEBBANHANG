'use client';
import { useEffect, useState } from 'react';
import { selfImprovementApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

const SCORE_BG = (s: number) =>
  s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-500' : 'bg-red-500';

const OUTCOME_STYLE: Record<string, string> = {
  success: 'bg-green-100 text-green-700 border-green-300',
  failure: 'bg-red-100 text-red-700 border-red-300',
  partial: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  pending: 'bg-gray-100 text-gray-600 border-gray-300',
};

const LEVEL_ICON = ['🌱', '🤝', '👑', '🧠', '💡', '👔', '🔄', '🚀'];

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold ${SCORE_COLOR(score)}`}>{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${SCORE_BG(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ q }: { q: { id: number; question: string; answer: string } }) {
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex gap-2 items-start">
        <span className="text-xs font-bold text-indigo-500 mt-0.5 w-4 shrink-0">{q.id}</span>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">{q.question}</div>
          <div className="text-sm text-gray-700">{q.answer}</div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TagList({ items, color = 'gray' }: { items: string[]; color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const cls: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  if (!items?.length) return <p className="text-xs text-gray-400">Không có dữ liệu</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs border rounded-lg px-2.5 py-1.5 ${cls[color]}`}>{item}</span>
      ))}
    </div>
  );
}

export default function SelfImprovementPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [winStrategies, setWinStrategies] = useState<any[]>([]);
  const [failStrategies, setFailStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'monthly' | 'decisions' | 'experiments' | 'library'>('overview');

  useEffect(() => {
    Promise.all([
      selfImprovementApi.dashboard(),
      selfImprovementApi.weeklyRetrospective(),
      selfImprovementApi.monthlyEvolution(),
      selfImprovementApi.decisions(),
      selfImprovementApi.experiments(),
      selfImprovementApi.winningStrategies(),
      selfImprovementApi.failedStrategies(),
    ]).then(([d, w, m, dec, exp, ws, fs]) => {
      setDashboard(d);
      setWeekly(w);
      setMonthly(m);
      setDecisions(Array.isArray(dec) ? dec : []);
      setExperiments(Array.isArray(exp) ? exp : []);
      setWinStrategies(Array.isArray(ws) ? ws : []);
      setFailStrategies(Array.isArray(fs) ? fs : []);
    }).finally(() => setLoading(false));
  }, []);

  const sc = dashboard?.scorecard;
  const daily = dashboard?.dailyLoop;
  const stats = dashboard?.stats;
  const evLevel = dashboard?.evolutionLevel;

  const TABS = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'weekly', label: 'Tuần' },
    { key: 'monthly', label: 'Tháng' },
    { key: 'decisions', label: 'Quyết định' },
    { key: 'experiments', label: 'Thử nghiệm' },
    { key: 'library', label: 'Thư viện' },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Self-Improvement Loop"
        subtitle="Vòng lặp tự học — Observe → Measure → Analyze → Learn → Improve → Execute"
      />

      {/* Evolution Level Banner */}
      {evLevel && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{LEVEL_ICON[(evLevel.level - 1) % LEVEL_ICON.length] || '🌱'}</span>
            <div>
              <div className="text-xs opacity-75 uppercase tracking-wider mb-0.5">Level {evLevel.level}/8</div>
              <div className="text-xl font-bold">{evLevel.label}</div>
              {evLevel.desc && <div className="text-xs opacity-60 mt-0.5">{evLevel.desc}</div>}
              {evLevel.nextLevel && (
                <div className="text-xs opacity-75 mt-1">→ Level {evLevel.nextLevel}: {evLevel.nextLabel}</div>
              )}
            </div>
          </div>
          {sc && (
            <div className="text-right">
              <div className="text-4xl font-bold">{sc.overallScore}</div>
              <div className="text-xs opacity-75">Overall Score</div>
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Chiến thắng', value: stats.winningStrategies, color: 'text-green-600' },
            { label: 'Thất bại', value: stats.failedStrategies, color: 'text-red-600' },
            { label: 'Mô hình', value: stats.provenPatterns, color: 'text-indigo-600' },
            { label: 'Quyết định', value: stats.totalDecisions, color: 'text-gray-700' },
            { label: 'Chờ review', value: stats.pendingDecisions, color: 'text-yellow-600' },
            { label: 'Thử nghiệm', value: stats.activeExperiments, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Overview Tab */}
      {!loading && activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Scorecard */}
          {sc && (
            <SectionCard title="Performance Scorecard Hôm Nay" icon="📊">
              <div className="space-y-3">
                <ScoreBar label="Revenue" score={sc.revenueScore} />
                <ScoreBar label="Profit" score={sc.profitScore} />
                <ScoreBar label="Growth" score={sc.growthScore} />
                <ScoreBar label="Marketing" score={sc.marketingScore} />
                <ScoreBar label="Operations" score={sc.operationsScore} />
                <ScoreBar label="Technology" score={sc.technologyScore} />
                <ScoreBar label="Customer" score={sc.customerScore} />
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Overall Score</span>
                    <span className={`text-2xl font-bold ${SCORE_COLOR(sc.overallScore)}`}>{sc.overallScore}/100</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Daily Loop */}
          {daily && (
            <SectionCard title="Daily Learning Loop" icon="🔄">
              <div className="text-xs text-gray-400 mb-3">{daily.date}</div>
              {(daily.questions || []).map((q: any) => (
                <QuestionCard key={q.id} q={q} />
              ))}
              {daily.activeWarnings > 0 && (
                <div className="mt-3 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-3 py-2">
                  ⚠️ {daily.activeWarnings} cảnh báo đang hoạt động cần chú ý
                </div>
              )}
            </SectionCard>
          )}

          {/* Recent Decisions */}
          <SectionCard title="Quyết định Gần Đây" icon="🧠">
            {dashboard?.recentDecisions?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recentDecisions.map((d: any) => (
                  <div key={d.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{d.decision}</div>
                      <div className="text-xs text-gray-400">{d.area}</div>
                    </div>
                    <span className={`text-xs border rounded-full px-2 py-0.5 shrink-0 ${OUTCOME_STYLE[d.outcome] || OUTCOME_STYLE.pending}`}>
                      {d.outcome}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Chưa có quyết định nào được ghi nhận</p>
            )}
          </SectionCard>

          {/* Running Experiments */}
          <SectionCard title="Thử Nghiệm Đang Chạy" icon="🧪">
            {dashboard?.runningExperiments?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.runningExperiments.map((e: any) => (
                  <div key={e.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{e.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{e.hypothesis}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{e.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Không có thử nghiệm nào đang chạy</p>
            )}
          </SectionCard>
        </div>
      )}

      {/* Weekly Retrospective Tab */}
      {!loading && activeTab === 'weekly' && weekly && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 col-span-full">
            <div className="text-sm text-blue-600 font-medium mb-1">Tuần {weekly.weekRange?.from} → {weekly.weekRange?.to}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Đơn hàng', value: weekly.metrics?.orders },
                { label: 'Doanh thu', value: new Intl.NumberFormat('vi-VN').format(weekly.metrics?.revenue || 0) + '₫' },
                { label: 'Leads', value: weekly.metrics?.leads },
                { label: 'Agent rate', value: weekly.metrics?.agentSuccessRate },
              ].map((m) => (
                <div key={m.label} className="bg-white/70 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gray-800">{m.value ?? '—'}</div>
                  <div className="text-xs text-gray-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <SectionCard title="Wins 🏆" icon="✅">
            <TagList items={weekly.wins} color="green" />
          </SectionCard>

          <SectionCard title="Losses 📉" icon="❌">
            <TagList items={weekly.losses} color="red" />
          </SectionCard>

          <SectionCard title="Opportunities 🎯" icon="💡">
            <TagList items={weekly.opportunities} color="blue" />
          </SectionCard>

          <SectionCard title="Risks ⚠️" icon="🚨">
            <TagList items={weekly.risks} color="yellow" />
          </SectionCard>

          <SectionCard title="Điều Chỉnh Chiến Lược" icon="🧭">
            <div className="space-y-2">
              {weekly.strategicAdjustments?.map((s: string, i: number) => (
                <div key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-indigo-500 font-bold shrink-0">→</span>
                  <span>{s}</span>
                </div>
              ))}
              {!weekly.strategicAdjustments?.length && (
                <p className="text-sm text-gray-400">Chưa có điều chỉnh</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Monthly Evolution Tab */}
      {!loading && activeTab === 'monthly' && monthly && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="col-span-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="text-sm opacity-75 mb-2">Đánh giá tháng {monthly.month}</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Doanh thu', value: monthly.evolution?.revenueGrowth },
                { label: 'Lợi nhuận', value: monthly.evolution?.profitGrowth },
                { label: 'Khách hàng', value: monthly.evolution?.customerGrowth },
                { label: 'AI Perf', value: monthly.evolution?.aiPerformance },
                { label: 'Vị thế', value: monthly.evolution?.marketPosition },
              ].map((m) => (
                <div key={m.label} className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold">{m.value ?? '—'}</div>
                  <div className="text-xs opacity-75">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <SectionCard title="Knowledge Brain" icon="🧠">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tổng bài học', value: monthly.knowledgeBrain?.lessons, color: 'text-gray-800' },
                { label: 'Chiến thắng', value: monthly.knowledgeBrain?.winningStrategies, color: 'text-green-600' },
                { label: 'Thất bại', value: monthly.knowledgeBrain?.failedStrategies, color: 'text-red-600' },
                { label: 'Mô hình đã chứng minh', value: monthly.knowledgeBrain?.provenPatterns, color: 'text-indigo-600' },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-xl p-3">
                  <div className={`text-2xl font-bold ${m.color}`}>{m.value ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Evolution Level" icon="🚀">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{LEVEL_ICON[(monthly.evolutionLevel?.level || 1) - 1]}</span>
              <div>
                <div className="text-lg font-bold text-gray-800">Level {monthly.evolutionLevel?.level}/8</div>
                <div className="text-sm text-gray-600">{monthly.evolutionLevel?.label}</div>
                {monthly.evolutionLevel?.desc && (
                  <div className="text-xs text-gray-400 mt-0.5">{monthly.evolutionLevel.desc}</div>
                )}
                {monthly.evolutionLevel?.nextLevel && (
                  <div className="text-xs text-indigo-500 mt-1">
                    → Mục tiêu: Level {monthly.evolutionLevel.nextLevel}: {monthly.evolutionLevel.nextLabel}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              {(monthly.evolutionLevel?.allLevels || [
                { level: 1, label: 'Agent System' },
                { level: 2, label: 'Multi-Agent System' },
                { level: 3, label: 'Executive AI' },
                { level: 4, label: 'Business Operating System' },
                { level: 5, label: 'Knowledge Brain' },
                { level: 6, label: 'AI Board Of Directors' },
                { level: 7, label: 'Self Improvement Loop' },
                { level: 8, label: 'Autonomous Company' },
              ]).map((lvl: any) => (
                <div key={lvl.level} className={`flex items-center gap-2 ${lvl.level <= (monthly.evolutionLevel?.level || 1) ? 'text-indigo-600 font-medium' : ''}`}>
                  <span>{lvl.level <= (monthly.evolutionLevel?.level || 1) ? '✓' : '○'}</span>
                  <span>L{lvl.level}: {lvl.label}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Decisions Tab */}
      {!loading && activeTab === 'decisions' && (
        <SectionCard title="Decision Memory" icon="🧠">
          {decisions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Chưa có quyết định nào được ghi nhận</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Quyết định</th>
                    <th className="pb-2 font-medium">Lĩnh vực</th>
                    <th className="pb-2 font-medium">Kỳ vọng</th>
                    <th className="pb-2 font-medium">Kết quả</th>
                    <th className="pb-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 max-w-[200px]">
                        <div className="font-medium text-gray-800 truncate">{d.decision}</div>
                        <div className="text-xs text-gray-400 truncate">{d.reason}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 capitalize">{d.area}</td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[150px] truncate">{d.expectedOutcome}</td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[150px] truncate">{d.actualOutcome || '—'}</td>
                      <td className="py-3">
                        <span className={`text-xs border rounded-full px-2 py-0.5 ${OUTCOME_STYLE[d.outcome] || OUTCOME_STYLE.pending}`}>
                          {d.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Experiments Tab */}
      {!loading && activeTab === 'experiments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {experiments.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="text-4xl mb-3">🧪</div>
              <p className="text-gray-500">Chưa có thử nghiệm nào</p>
            </div>
          ) : experiments.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-800">{e.title}</h3>
                <span className={`text-xs border rounded-full px-2 py-0.5 shrink-0 ${
                  e.status === 'running' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  e.status === 'decided' ? 'bg-green-50 text-green-600 border-green-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>{e.status}</span>
              </div>
              <div className="text-xs text-gray-400 mb-1">Hypothesis</div>
              <div className="text-sm text-gray-700 mb-3">{e.hypothesis}</div>
              {e.evaluation && (
                <>
                  <div className="text-xs text-gray-400 mb-1">Đánh giá</div>
                  <div className="text-sm text-gray-700 mb-2">{e.evaluation}</div>
                </>
              )}
              {e.decision !== 'pending' && (
                <span className={`text-xs border rounded-full px-2 py-0.5 ${
                  e.decision === 'adopt' ? 'bg-green-50 text-green-600 border-green-200' :
                  e.decision === 'discard' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-yellow-50 text-yellow-600 border-yellow-200'
                }`}>
                  {e.decision === 'adopt' ? '✓ Áp dụng' : e.decision === 'discard' ? '✗ Loại bỏ' : '↻ Lặp lại'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Knowledge Library Tab */}
      {!loading && activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Chiến Lược Thành Công" icon="🏆">
            {winStrategies.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có chiến lược nào được xác nhận</p>
            ) : (
              <div className="space-y-3">
                {winStrategies.slice(0, 8).map((l) => (
                  <div key={l.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{l.whatHappened}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{l.whatWeLearned}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{l.domain}</span>
                      {l.isProven && <span className="text-xs text-indigo-600">✓ Đã chứng minh</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Chiến Lược Thất Bại" icon="⚠️">
            {failStrategies.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa ghi nhận chiến lược thất bại</p>
            ) : (
              <div className="space-y-3">
                {failStrategies.slice(0, 8).map((l) => (
                  <div key={l.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{l.whatHappened}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Nguyên nhân: {l.whyItHappened}</div>
                    <div className="text-xs text-red-600 mt-0.5">{l.whatToChange}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Mô Hình Đã Chứng Minh" icon="🔬">
            {winStrategies.filter((l) => l.isProven).length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có mô hình được xác nhận</p>
            ) : (
              <div className="space-y-3">
                {winStrategies.filter((l) => l.isProven).slice(0, 8).map((l) => (
                  <div key={l.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{l.whatHappened}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{l.whatWeLearned}</div>
                    <div className="text-xs text-indigo-600 mt-0.5">Áp dụng {l.timesSucceeded}x thành công</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
