'use client';
import { useEffect, useRef, useState } from 'react';
import { inboxApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const CHANNEL_ICON: Record<string, string> = {
  web_chat: '💬',
  facebook: '📘',
  telegram: '✈️',
  zalo: '💙',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  resolved: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
};

const fmtTime = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = (now.getTime() - dt.getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return dt.toLocaleDateString('vi-VN');
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ channel?: string; status?: string }>({});
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter.channel) params.channel = filter.channel;
    if (filter.status) params.status = filter.status;
    Promise.all([
      inboxApi.list(params).catch(() => ({ conversations: [], total: 0 })),
      inboxApi.stats().catch(() => null),
    ]).then(([res, s]) => {
      setConversations(res.conversations || []);
      setStats(s);
      setLoading(false);
    });
  };

  useEffect(() => { loadConversations(); }, [filter]);

  const openConversation = async (conv: any) => {
    setSelected(conv);
    setLoadingMsg(true);
    setMessages([]);
    try {
      const detail = await inboxApi.get(conv.id);
      setMessages(detail.messages || []);
    } catch {
      setMessages([]);
    }
    setLoadingMsg(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const ch = selected.channel;
      if (ch === 'facebook') await inboxApi.replyFacebook(selected.id, reply);
      else if (ch === 'telegram') await inboxApi.replyTelegram(selected.id, reply);
      else await inboxApi.replyWeb(selected.id, reply);
      setMessages((prev) => [...prev, {
        direction: 'outbound', content: reply,
        createdAt: new Date().toISOString(), role: 'agent',
      }]);
      setReply('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e: any) {
      alert(e.message || 'Gửi thất bại');
    }
    setSending(false);
  };

  const resolveConv = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      await inboxApi.resolve(selected.id);
      setSelected((s: any) => s ? { ...s, status: 'resolved' } : s);
      loadConversations();
    } catch (e: any) { alert(e.message); }
    setResolving(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      <PageHeader
        title="💬 Inbox"
        subtitle={stats ? `${stats.total || 0} hội thoại · ${stats.open || 0} đang mở` : 'Omnichannel inbox'}
      />

      {/* Stats row */}
      {stats && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {[
            { label: 'Tổng', value: stats.total || 0, color: 'bg-gray-100 text-gray-700' },
            { label: 'Đang mở', value: stats.open || 0, color: 'bg-green-100 text-green-700' },
            { label: 'Đã xử lý', value: stats.resolved || 0, color: 'bg-gray-100 text-gray-500' },
            { label: 'Web Chat', value: stats.byChannel?.web_chat || 0, color: 'bg-indigo-100 text-indigo-700' },
            { label: 'Facebook', value: stats.byChannel?.facebook || 0, color: 'bg-blue-100 text-blue-700' },
            { label: 'Telegram', value: stats.byChannel?.telegram || 0, color: 'bg-sky-100 text-sky-700' },
          ].map((s) => (
            <div key={s.label} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${s.color}`}>
              {s.label}: <span className="font-bold">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filter.channel || ''}
          onChange={(e) => setFilter({ ...filter, channel: e.target.value || undefined })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
        >
          <option value="">Tất cả kênh</option>
          <option value="web_chat">💬 Web Chat</option>
          <option value="facebook">📘 Facebook</option>
          <option value="telegram">✈️ Telegram</option>
        </select>
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="open">Đang mở</option>
          <option value="resolved">Đã xử lý</option>
          <option value="pending">Chờ xử lý</option>
        </select>
        <button
          onClick={loadConversations}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          🔄 Tải lại
        </button>
      </div>

      {/* Main layout: conversation list + chat window */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Conversation list */}
        <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Không có hội thoại nào</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selected?.id === conv.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">{CHANNEL_ICON[conv.channel] || '💬'}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {conv.customerName || conv.customerPhone || 'Khách ẩn danh'}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {conv.lastMessage?.content || conv.channel}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-400">{fmtTime(conv.updatedAt)}</div>
                    <span className={`mt-0.5 inline-block px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[conv.status] || 'bg-gray-100 text-gray-500'}`}>
                      {conv.status}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col min-h-0 min-w-0">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-5xl mb-3">💬</span>
              <p className="text-base font-medium text-gray-500">Chọn một hội thoại</p>
              <p className="text-sm mt-1">để xem tin nhắn và trả lời</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CHANNEL_ICON[selected.channel] || '💬'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {selected.customerName || selected.customerPhone || 'Khách ẩn danh'}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{selected.channel?.replace('_', ' ')} · {selected.status}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.status !== 'resolved' && (
                    <button
                      onClick={resolveConv}
                      disabled={resolving}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {resolving ? '...' : '✅ Đã xử lý'}
                    </button>
                  )}
                  {selected.status === 'resolved' && (
                    <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-lg">Đã xử lý</span>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                {loadingMsg ? (
                  <div className="flex justify-center py-10 text-gray-400 text-sm">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center py-10 text-gray-400 text-sm">Chưa có tin nhắn</div>
                ) : (
                  messages.map((msg: any, i: number) => {
                    const isOutbound = msg.direction === 'outbound' || msg.role === 'agent';
                    return (
                      <div key={msg.id || i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isOutbound
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}>
                          <p className="leading-relaxed">{msg.content || msg.text || msg.message}</p>
                          <p className={`text-xs mt-1 ${isOutbound ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {fmtTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                {selected.status === 'resolved' ? (
                  <p className="text-center text-sm text-gray-400 py-2">Hội thoại đã đóng — không thể gửi thêm tin nhắn</p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Nhập tin nhắn trả lời... (Enter để gửi)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                    >
                      {sending ? '...' : 'Gửi'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
