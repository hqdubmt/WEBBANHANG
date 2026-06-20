import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Theo dõi Tạp Hoá Online — Deal tốt mỗi ngày',
  description: 'Nhận deal Tiki, flash sale và khuyến mãi độc quyền mỗi ngày qua Telegram và Discord. Miễn phí, không spam.',
  openGraph: {
    title: 'Tạp Hoá Online — Deal hot mỗi ngày',
    description: 'Theo dõi để nhận deal Tiki giảm giá, flash sale và khuyến mãi độc quyền.',
    type: 'website',
  },
};

const channels = [
  {
    name: 'Telegram',
    handle: '@banhang1',
    url: 'https://t.me/banhang1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.194 1.006.131.833.94z" />
      </svg>
    ),
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    btnColor: 'bg-blue-500 hover:bg-blue-600',
    description: 'Nhận deal ngay trong app Telegram. Deal mới mỗi 2 giờ, 8h–22h mỗi ngày.',
    badge: '🔥 Đang hoạt động',
  },
  {
    name: 'Discord',
    handle: 'Server Tạp Hoá',
    url: 'https://discord.gg/jNVNf5Kwq',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    color: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    textColor: 'text-indigo-700',
    btnColor: 'bg-indigo-500 hover:bg-indigo-600',
    description: 'Cộng đồng mua sắm thông minh. Thảo luận, review sản phẩm và chia sẻ deal.',
    badge: '💬 Cộng đồng',
  },
];

const perks = [
  { icon: '⚡', title: 'Deal mới mỗi 2 giờ', desc: 'Từ 8h sáng đến 10h tối, tự động cập nhật' },
  { icon: '💰', title: 'Giá tốt nhất', desc: 'Top sản phẩm bán chạy Tiki, giảm giá thật' },
  { icon: '🛒', title: 'Đa danh mục', desc: 'Điện tử, thời trang, làm đẹp, đồ gia dụng...' },
  { icon: '🚀', title: 'Hoàn toàn miễn phí', desc: 'Không mất phí, không spam, unfollow bất kỳ lúc nào' },
];

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🛍️</div>
          <h1 className="text-3xl font-bold mb-3">Tạp Hoá Online</h1>
          <p className="text-orange-100 text-lg">
            Deal Tiki hot — Flash sale — Khuyến mãi độc quyền<br />
            Cập nhật tự động mỗi ngày, hoàn toàn miễn phí
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Perks */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          {perks.map((p) => (
            <div key={p.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="font-semibold text-gray-800 text-sm">{p.title}</div>
              <div className="text-gray-500 text-xs mt-1">{p.desc}</div>
            </div>
          ))}
        </div>

        {/* Channel Cards */}
        <h2 className="text-center text-gray-600 font-medium mb-6">Chọn nền tảng bạn muốn theo dõi:</h2>
        <div className="space-y-4">
          {channels.map((ch) => (
            <div key={ch.name} className={`${ch.bg} border ${ch.border} rounded-2xl p-6`}>
              <div className="flex items-start gap-4">
                <div className={`${ch.textColor} flex-shrink-0 mt-1`}>{ch.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800 text-lg">{ch.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ch.bg} ${ch.textColor} border ${ch.border} font-medium`}>
                      {ch.badge}
                    </span>
                  </div>
                  <div className={`text-sm ${ch.textColor} font-medium mb-2`}>{ch.handle}</div>
                  <p className="text-gray-600 text-sm mb-4">{ch.description}</p>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 ${ch.btnColor} text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm`}
                  >
                    Theo dõi ngay →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-400 text-sm mt-10">
          Hệ thống AI tự động tìm deal tốt nhất từ Tiki mỗi ngày.<br />
          Không spam • Không quảng cáo rác • Unfollow bất kỳ lúc nào
        </p>
      </div>
    </main>
  );
}
