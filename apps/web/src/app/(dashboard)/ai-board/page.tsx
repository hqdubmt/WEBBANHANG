'use client';
import { useEffect, useState } from 'react';
import { aiBoardApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const fmtVND = (n: any) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + '₫';

const STATUS_STYLE: Record<string, string> = {
  Healthy: 'bg-green-100 text-green-700 border-green-300',
  Warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Critical: 'bg-red-100 text-red-700 border-red-300',
};

const P_STYLE: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 border-red-300',
  P1: 'bg-orange-100 text-orange-700 border-orange-300',
  P2: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  P3: 'bg-blue-100 text-blue-700 border-blue-300',
};

const BOARD_MEMBERS = [
  { key: 'ceo', icon: '👑', color: 'from-purple-500 to-indigo-600' },
  { key: 'cfo', icon: '💰', color: 'from-green-500 to-emerald-600' },
  { key: 'coo', icon: '⚙️', color: 'from-orange-500 to-amber-600' },
  { key: 'cto', icon: '🔧', color: 'from-blue-500 to-cyan-600' },
  { key: 'cmo', icon: '📣', color: 'from-pink-500 to-rose-600' },
  { key: 'cro', icon: '📈', color: 'from-teal-500 to-green-600' },
  { key: 'cso', icon: '🎯', color: 'from-violet-500 to-purple-600' },
];

function KpiChip({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value ?? '—'}</div>
    </div>
  );
}

function QnA({ q, a }: { q: string; a: any }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="text-xs text-gray-400 mb-0.5">{q}</div>
      <div className="text-sm text-gray-700">{String(a)}</div>
    </div>
  );
}

function BoardCard({ member, data }: { member: typeof BOARD_MEMBERS[0]; data: any }) {
  const [open, setOpen] = useState(false);
  if (!data) return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 animate-pulse h-36" />
  );

  const kpiEntries = Object.entries(data.kpi || {}).slice(0, 4);
  const questions = data.questions || {};

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${member.color} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{member.icon}</span>
            <div>
              <div className="font-bold text-base">{data.role}</div>
              <div className="text-xs opacity-80">{data.title}</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="text-white/80 hover:text-white text-xs bg-white/20 px-2 py-1 rounded-lg transition-colors"
          >
            {open ? 'Thu gọn' : 'Chi tiết'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="p-4 grid grid-cols-2 gap-2">
        {kpiEntries.map(([k, v]) => (
          <KpiChip
            key={k}
            label={k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
            value={typeof v === 'number' && k.toLowerCase().includes('revenue') ? fmtVND(v) : String(v)}
          />
        ))}
      </div>

      {/* Questions */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Câu hỏi lãnh đạo</div>
          {Object.entries(questions).map(([q, a]) => (
            <QnA
              key={q}
              q={q.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              a={Array.isArray(a) ? (a as string[]).join(', ') : a}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiBoardPage() {
  const [meeting, setMeeting] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'meeting'>('board');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    aiBoardApi.meeting()
      .then(setMeeting)
      .catch(() => setError('Không thể kết nối đến AI Board'))
      .finally(() => setLoading(false));
  }, []);

  const status = meeting?.systemStatus || 'Healthy';
  const reports = meeting?.boardReports || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="AI Board of Directors"
        subtitle="Ban điều hành AI — CEO · CFO · COO · CTO · CMO · CRO · CSO"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {/* System Status Bar */}
      {meeting && (
        <div className={`rounded-xl border px-4 py-3 mb-5 flex items-center gap-3 ${STATUS_STYLE[status] || STATUS_STYLE.Healthy}`}>
          <span className="text-lg">{status === 'Healthy' ? '✅' : status === 'Warning' ? '⚠️' : '🚨'}</span>
          <div className="flex-1">
            <span className="font-semibold">Hệ thống: {status}</span>
            <span className="mx-2 opacity-50">·</span>
            <span className="text-sm">{meeting.executiveSummary?.topIssue}</span>
          </div>
          <span className="text-xs opacity-60">{new Date(meeting.generatedAt).toLocaleTimeString('vi-VN')}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'board', label: 'Board Members' },
          { key: 'meeting', label: 'Daily Meeting' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Board Members Tab */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {BOARD_MEMBERS.map(m => (
            <BoardCard key={m.key} member={m} data={reports[m.key]} />
          ))}
        </div>
      )}

      {/* Daily Meeting Tab */}
      {activeTab === 'meeting' && meeting && (
        <div className="space-y-5">
          {/* Executive Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📋</span> Executive Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <KpiChip label="System Status" value={meeting.executiveSummary?.statusOverall} />
              <KpiChip label="Revenue Growth" value={meeting.executiveSummary?.revenueStatus} />
              <KpiChip label="Top Issue" value={meeting.executiveSummary?.topIssue?.slice(0, 40) + '...'} />
              <KpiChip label="Top Opportunity" value={meeting.executiveSummary?.topOpportunity?.slice(0, 40) + '...'} />
            </div>
            {meeting.executiveSummary?.immediateActions?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hành động ngay</div>
                <ul className="space-y-1">
                  {meeting.executiveSummary.immediateActions.map((a: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-indigo-500 mt-0.5">→</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Priority Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>⚡</span> Priority Actions
            </h2>
            <div className="space-y-2">
              {(meeting.priorityActions || []).map((a: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${P_STYLE[a.level] || P_STYLE.P3}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${P_STYLE[a.level]}`}>{a.level}</span>
                  <span className="flex-1 text-sm font-medium">{a.action}</span>
                  <span className="text-xs opacity-60">{a.owner}</span>
                </div>
              ))}
              {(!meeting.priorityActions || meeting.priorityActions.length === 0) && (
                <div className="text-sm text-gray-400 text-center py-4">Không có vấn đề ưu tiên — hệ thống hoạt động tốt</div>
              )}
            </div>
          </div>

          {/* Opportunities & Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>🚀</span> Top Opportunities
              </h2>
              <ul className="space-y-2">
                {(meeting.topOpportunities || []).map((o: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-bold mt-0.5">{i + 1}.</span> {o}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>⚠️</span> Top Risks
              </h2>
              <ul className="space-y-2">
                {(meeting.topRisks || []).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 font-bold mt-0.5">{i + 1}.</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Strategic Plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🗺️</span> Strategic Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Ngắn hạn (30 ngày)', items: meeting.strategicRecommendations?.shortTerm, color: 'border-blue-300 bg-blue-50' },
                { label: 'Trung hạn (90 ngày)', items: meeting.strategicRecommendations?.midTerm, color: 'border-purple-300 bg-purple-50' },
                { label: 'Dài hạn (1 năm)', items: meeting.strategicRecommendations?.longTerm, color: 'border-indigo-300 bg-indigo-50' },
              ].map(section => (
                <div key={section.label} className={`rounded-xl border ${section.color} p-3`}>
                  <div className="text-xs font-semibold text-gray-600 mb-2">{section.label}</div>
                  <ul className="space-y-1">
                    {(section.items || []).map((item: string, i: number) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50 h-40 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
