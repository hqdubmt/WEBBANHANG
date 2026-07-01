import { Injectable } from '@nestjs/common';

export type PostStyle = 'deal_A' | 'deal_B' | 'deal_C';
export type EngagementType =
  | 'poll_skincare' | 'poll_fashion' | 'tips_smart' | 'tips_baby'
  | 'relatable' | 'question_need' | 'tips_skincare'
  | 'giveaway' | 'share_chain' | 'guess_price' | 'morning_deal' | 'top5_week';

interface DealProduct {
  name: string;
  price: number;
  category: string;
  brand?: string;
  discount?: number;
  affiliateLink: string;
}

// ─── Hashtag sets theo category ───────────────────────────────────────────────
const HASHTAGS: Record<string, string> = {
  'Làm đẹp':               '#skincare #lamde #duongda #kemchongnang #muasamincare #beautydeals #thefaceshop #dhcvietnam',
  'Làm đẹp & Sức khỏe':   '#skincare #lamde #suckhoe #duongda #vitaminhangngay #dhcvietnam #thefaceshop',
  'Sức khỏe':              '#suckhoe #vitaminhangngay #thucphamchucnang #skhoe #healthvn',
  'Mẹ & Bé':               '#meandbe #concung #beyte #mebo #suabot #bimbe #tabe #mamnonline #dungotre',
  'Thời trang nữ':         '#thoidtrangnu #fashionvn #ootdvn #juno #stylenu #trangphucnu #tunisale',
  'Hành lý & Balo':        '#luggage #balo #tuidulich #lug #hanh_li #dulich #xachtaydep',
  'Điện thoại & Phụ kiện': '#dienthoai #iphone #samsung #smartphone #techvn #hoanghamobile #cellphones',
  'Đồng hồ thông minh':    '#dongho #smartwatch #applewatch #techvn #phukhienthoai',
  'Flash Sale':             '#flashsale #sale #giamgia #dealngon #muasamonline',
  'Shopee':                 '#shopee #muasamonline #dealshopee #giamgia #khuyenmai',
};

const DEFAULT_HASHTAGS = '#deal #muasamonline #giamgia #khuyenmai #dealhot';

const FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=1181780431684077';
const FOLLOW_CTA = `👉 LIKE + THEO DÕI trang để không bỏ lỡ deal nào!\n📢 Telegram cập nhật sớm hơn: https://t.me/banhang1`;

// Hashtags trending theo ngày trong tuần (thứ 2-CN)
const TRENDING_BY_WEEKDAY: string[] = [
  '#thứhai #dealthứhai #mondaydeal #muasamdauTuan',       // 0 = CN (Sunday)
  '#thứhai #dealthứhai #mondaydeal #muasamdauTuan',       // 1 = Mon
  '#thứba #flashsaletuần #tuesdaydeal',                   // 2 = Tue
  '#thứtư #midweekdeal #wednesdayvibes',                  // 3 = Wed
  '#thứnăm #dealthứnăm #thursdaysale',                    // 4 = Thu
  '#thứsáu #fridaydeals #thứsáuvuivẻ #cuoituandeal',     // 5 = Fri
  '#thứbảy #weekendsale #shopweekend #muasamcuoituan',   // 6 = Sat
];

@Injectable()
export class FanpageContentService {
  private styleCounter = 0;

  private nextStyle(): PostStyle {
    const styles: PostStyle[] = ['deal_A', 'deal_B', 'deal_C'];
    return styles[this.styleCounter++ % 3];
  }

  private fmt(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  private hashtags(category: string, brand?: string): string {
    const base = HASHTAGS[category] ?? DEFAULT_HASHTAGS;
    const brandTag = brand ? ` #${brand.replace(/\s/g, '').replace(/[.&\-\/]/g, '')}` : '';
    const trending = TRENDING_BY_WEEKDAY[new Date().getDay()] ?? '';
    return `${base}${brandTag} ${trending}`.trim();
  }

  private trendingTag(): string {
    return TRENDING_BY_WEEKDAY[new Date().getDay()] ?? '';
  }

  // ─── Deal post theo category + style ─────────────────────────────────────────

  buildDealPost(product: DealProduct): string {
    const style = this.nextStyle();
    const pf = this.fmt(product.price);
    const tags = this.hashtags(product.category, product.brand);
    const discountLine = (product.discount || 0) >= 15
      ? `🔥 GIẢM ${product.discount}% — tiết kiệm ${this.fmt(Math.round(product.price * product.discount / (100 - product.discount)))} ngay!\n\n`
      : '';

    const cat = product.category.toLowerCase();
    const isBeauty  = cat.includes('đẹp') || cat.includes('sức khỏe') || cat.includes('skincare');
    const isBaby    = cat.includes('bé') || cat.includes('mẹ');
    const isFashion = cat.includes('thời trang') || cat.includes('hành lý') || cat.includes('balo');
    const isTech    = cat.includes('điện thoại') || cat.includes('điện tử') || cat.includes('đồng hồ');

    if (isBeauty)  return this.beautyPost(product, pf, discountLine, style, tags);
    if (isBaby)    return this.babyPost(product, pf, discountLine, style, tags);
    if (isFashion) return this.fashionPost(product, pf, discountLine, style, tags);
    if (isTech)    return this.techPost(product, pf, discountLine, style, tags);
    return this.generalPost(product, pf, discountLine, style, tags);
  }

  // ─── BEAUTY templates ─────────────────────────────────────────────────────

  private beautyPost(p: DealProduct, pf: string, disc: string, style: PostStyle, tags: string): string {
    switch (style) {
      case 'deal_A': return [
        `💄 MỰC TÌM ĐƯỢC DEAL NÀY — SHARE NGAY CHO CHỊ EM!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 Giá hôm nay: ${pf}`,
        `✅ Hàng chính hãng — có tem, có hóa đơn`,
        ``,
        `Mình dùng dòng này lâu rồi, da không bị kích ứng. Bạn nào da nhạy cảm có thể thử trước size mini nhé!`,
        ``,
        `👉 Link deal tại đây: ${p.affiliateLink}`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_B': return [
        `⚡ FLASH DEAL SKINCARE — Có khi hết sớm lắm!`,
        ``,
        `${disc}✨ ${p.name}`,
        ``,
        `💰 ${pf} — hàng chính hãng ${p.brand || p.category}`,
        ``,
        `Tại sao mình recommend cái này?`,
        `→ Thương hiệu uy tín, không lo hàng giả`,
        `→ Giá deal hôm nay tốt hơn mua trực tiếp tại cửa hàng`,
        `→ Mình hay mua online loại này, dùng tốt lắm`,
        ``,
        `👉 Mua ngay kẻo hết: ${p.affiliateLink}`,
        ``,
        `💬 Bạn đang dùng gì? Comment cho mình biết nhé!`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_C': return [
        `🌟 GỢI Ý CHO BẠN — ${p.category.toUpperCase()} ĐÁNG MUA NHẤT TUẦN NÀY`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 Giá: ${pf}`,
        ``,
        `Bạn đang tìm gì cho routine skincare?`,
        `→ Chống nắng ban ngày?`,
        `→ Serum dưỡng ẩm buổi tối?`,
        `→ Toner cân bằng da?`,
        ``,
        `Cái này đang deal tốt, mình chọn lọc kỹ trước khi đăng nhé!`,
        ``,
        `👉 Xem ngay: ${p.affiliateLink}`,
        ``,
        `💬 Tag bạn bè đang cần chăm sóc da cùng bạn! 👇`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');
    }
  }

  // ─── BABY / MẸ & BÉ templates ────────────────────────────────────────────

  private babyPost(p: DealProduct, pf: string, disc: string, style: PostStyle, tags: string): string {
    switch (style) {
      case 'deal_A': return [
        `👶 GỬI CÁC MẸ ĐANG NUÔI CON NHỎ — Deal này đừng bỏ qua!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 ${pf} — hàng chính hãng tại Con Cưng`,
        `✅ An toàn cho bé, có kiểm định chất lượng`,
        ``,
        `Mình hiểu chi phí nuôi con tốn kém thế nào rồi. Deal này thật sự đáng mua — tiết kiệm được kha khá mỗi tháng nếu mua đúng lúc có khuyến mãi.`,
        ``,
        `👉 Mua ngay: ${p.affiliateLink}`,
        ``,
        `💬 Tag mẹ bỉm nào đang cần nhé! 🤱`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_B': return [
        `🍼 ĐẠI HẠ GIÁ ĐỒ CHO BÉ — Mẹ ơi vào xem nhanh!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 Giá: ${pf}`,
        `🏪 Nguồn: Con Cưng — không lo hàng nhái`,
        ``,
        `Gợi ý nhỏ cho mẹ:`,
        `→ Mua combo nhiều hơn tiết kiệm hơn`,
        `→ Tích điểm thẻ Con Cưng để có voucher sau`,
        `→ Đặt online giao tận nhà, khỏi bế con ra cửa hàng 😄`,
        ``,
        `👉 Xem deal: ${p.affiliateLink}`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_C': return [
        `💛 TRANG CỦA MÌNH — Chuyên tìm deal cho mẹ & bé`,
        ``,
        `Sản phẩm hôm nay:`,
        `${disc}${p.name}`,
        ``,
        `💰 ${pf} — giá chính hãng, không qua trung gian`,
        ``,
        `Nuôi con mà biết mua đúng chỗ, đúng lúc có deal`,
        `→ Tiết kiệm vài trăm nghìn mỗi tháng`,
        `→ Đó là lý do mình lập trang này 💪`,
        ``,
        `👉 Đặt hàng ngay: ${p.affiliateLink}`,
        ``,
        `💬 Bé nhà bạn đang dùng gì? Kể mình nghe nhé!`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');
    }
  }

  // ─── FASHION / HÀNH LÝ templates ────────────────────────────────────────

  private fashionPost(p: DealProduct, pf: string, disc: string, style: PostStyle, tags: string): string {
    switch (style) {
      case 'deal_A': return [
        `👗 ITEM NÀY QUÁ XINH — Mình tìm deal xong phải share ngay!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 Giá: ${pf}`,
        `✅ Hàng chính hãng ${p.brand || ''} — chất lượng đảm bảo`,
        ``,
        `Style này đang rất được ưa chuộng, diện đi làm hoặc cafe đều hợp.`,
        `Mình chỉ đăng những cái mình thấy đáng mua thật sự — không quảng cáo bừa nhé!`,
        ``,
        `👉 Xem sản phẩm: ${p.affiliateLink}`,
        ``,
        `💬 Bạn thích màu nào nhất? Comment xuống dưới! 👇`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_B': return [
        `✨ KHUYẾN MÃI THỜI TRANG — Đừng bỏ lỡ!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 ${pf}`,
        `🏷️ ${p.category} — ${p.brand || 'thương hiệu uy tín'}`,
        ``,
        `Tại sao nên mua online thay vì đến cửa hàng?`,
        `→ Giá thường rẻ hơn do không tốn chi phí mặt bằng`,
        `→ Deal online thường tốt hơn deal tại store`,
        `→ Giao hàng tận nơi, đổi trả dễ`,
        ``,
        `👉 Deal hôm nay tại đây: ${p.affiliateLink}`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_C': return [
        `🛍️ TÌM ĐƯỢC CÁI NÀY — Xứng đáng share cho chị em!`,
        ``,
        `${p.name}`,
        `${disc}`,
        `💰 Giá sale: ${pf}`,
        ``,
        `Mình hay check giá ở nhiều nơi trước khi mua. Cái này đang có deal tốt nhất từ đầu tháng đến giờ.`,
        ``,
        `👉 Xem ngay trước khi hết: ${p.affiliateLink}`,
        ``,
        `💬 Tag bạn thích mua sắm cùng bạn! 👇`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');
    }
  }

  // ─── TECH templates ──────────────────────────────────────────────────────

  private techPost(p: DealProduct, pf: string, disc: string, style: PostStyle, tags: string): string {
    switch (style) {
      case 'deal_A': return [
        `📱 DEAL CÔNG NGHỆ HÔM NAY — Giá tốt nhất mình tìm được!`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 Giá: ${pf}`,
        `✅ Hàng chính hãng VN/A — bảo hành đầy đủ`,
        ``,
        `Mình chỉ đăng hàng chính hãng — không phải xách tay, không lo bảo hành.`,
        `Nếu bạn đang có nhu cầu đổi máy, đây là thời điểm giá tốt để mua.`,
        ``,
        `👉 Xem chi tiết + đặt hàng: ${p.affiliateLink}`,
        ``,
        `💬 Bạn đang dùng máy gì? Comment cho mình biết nhé!`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_B': return [
        `⚡ ĐIỆN THOẠI / THIẾT BỊ ĐANG GIẢM GIÁ`,
        ``,
        `${disc}${p.name}`,
        ``,
        `💰 ${pf}`,
        `🏪 Nguồn: ${p.brand || p.category} — cam kết chính hãng`,
        ``,
        `Trước khi mua điện thoại online, bạn nên biết:`,
        `→ Luôn chọn hàng VN/A (bảo hành Việt Nam)`,
        `→ Kiểm tra IMEI ngay khi nhận hàng`,
        `→ Mua qua đây có deal tốt hơn mua tại cửa hàng`,
        ``,
        `👉 Xem deal: ${p.affiliateLink}`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'deal_C': return [
        `🔥 ${p.name.slice(0, 60)} — DEAL KHÔNG THỂ BỎ QUA`,
        ``,
        `${disc}💰 Giá: ${pf}`,
        `✅ Chính hãng, bảo hành theo hãng`,
        ``,
        `Công nghệ thay đổi nhanh — mua đúng lúc có deal tiết kiệm được cả triệu đồng.`,
        `Mình chọn lọc kỹ trước khi đăng nhé!`,
        ``,
        `👉 Đặt hàng tại đây: ${p.affiliateLink}`,
        ``,
        tags,
        ``,
        FOLLOW_CTA,
      ].join('\n');
    }
  }

  // ─── GENERAL template ──────────────────────────────────────────────────

  private generalPost(p: DealProduct, pf: string, disc: string, style: PostStyle, tags: string): string {
    const hooks = ['🔥 HOT DEAL', '💥 GIÁ SỐC HÔM NAY', '⚡ DEAL NGON ĐỪNG BỎ LỠ', '🎯 GỢI Ý MUA SẮM', '✨ ƯU ĐÃI ĐÁNG MUA'];
    const hook = hooks[this.styleCounter % hooks.length];
    return [
      `${hook}`,
      ``,
      `${disc}${p.name}`,
      ``,
      `💰 Giá: ${pf}`,
      `🏷️ ${p.category}`,
      ``,
      `Hàng chính hãng, giá tốt nhất mình tìm được hôm nay.`,
      ``,
      `👉 Xem & đặt hàng: ${p.affiliateLink}`,
      ``,
      tags,
      ``,
      FOLLOW_CTA,
    ].join('\n');
  }

  // ─── Engagement posts (không bán hàng — xây dựng follow) ─────────────────

  buildEngagementPost(type: EngagementType): string {
    switch (type) {
      case 'poll_skincare': return [
        `☀️ QUESTION CỦA NGÀY — Mình muốn biết để tìm deal cho bạn!`,
        ``,
        `Bạn đang dùng kem chống nắng gì?`,
        ``,
        `🅰️ THEFACESHOP — Dạng sữa nhẹ`,
        `🅱️ Anessa — Chống nước tốt`,
        `🅲️ Innisfree — Tone up, kiềm dầu`,
        `🅳️ Loại khác (comment tên nhé!)`,
        ``,
        `Mình hỏi vì đang chuẩn bị post deal kem chống nắng tuần này —`,
        `Loại nào nhiều người dùng → mình ưu tiên săn deal trước! 🎯`,
        ``,
        `💬 Comment & tag bạn bè cùng vote nhé!`,
        ``,
        `#kemchongnang #skincare #beautyqna #reviewlamde #duongda`,
      ].join('\n');

      case 'poll_fashion': return [
        `👗 CHỊ EM ƠI — Giúp mình chọn deal tuần này với!`,
        ``,
        `Bạn đang cần mua cái gì nhất?`,
        ``,
        `👜 Túi xách / tote bag đi làm`,
        `👗 Váy / đầm mùa hè`,
        `👠 Giày sandal / sneaker`,
        `🧳 Vali / balo du lịch`,
        ``,
        `Vote bằng cách COMMENT số tương ứng bên dưới nhé!`,
        `Mình sẽ ưu tiên đăng deal cho mục nào nhiều vote nhất 🎁`,
        ``,
        `#fashionvn #muasamonline #vote #thoidtrangnu #sale`,
      ].join('\n');

      case 'tips_smart': return [
        `💡 SAVE LẠI ĐI — 5 cách mua online không bao giờ bị hớ`,
        ``,
        `1️⃣ Check giá lịch sử trước khi mua`,
        `   → "Sale 50%" nhiều khi chỉ là giá gốc bị thổi phồng`,
        ``,
        `2️⃣ Mua cuối tháng hoặc ngày lương`,
        `   → Shopee, Tiki hay có flash sale 25/tháng`,
        ``,
        `3️⃣ Tận dụng voucher freeship`,
        `   → Đặt đủ điều kiện tối thiểu để free ship là tiết kiệm nhất`,
        ``,
        `4️⃣ Đọc kỹ mô tả và ảnh thật từ người mua`,
        `   → Ảnh seller khác ảnh thật — scroll xuống xem review`,
        ``,
        `5️⃣ Follow trang deal uy tín`,
        `   → Để người khác tìm giúp, bạn chỉ cần "Like và Mua" 😄`,
        ``,
        `📌 SHARE cho bạn bè cùng biết nhé!`,
        ``,
        `#muasamthongminh #tiettiem #tips #muasamonline #kinh_nghiem`,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'tips_baby': return [
        `👶 SAVE LẠI — Những đồ CHO BÉ SƠ SINH nào cần mua, nào chờ được?`,
        ``,
        `✅ PHẢI MUA TRƯỚC KHI SINH:`,
        `→ Tã/bỉm size NB (mua trước 2-3 pack nhỏ)`,
        `→ Quần áo size 0-3M (5-7 bộ là đủ)`,
        `→ Khăn sữa xô (10 cái+)`,
        `→ Khăn ướt không mùi`,
        ``,
        `⏳ CHỜ SAU KHI SINH RỒI HÃY MUA:`,
        `→ Xe đẩy — mượn trước dùng thử`,
        `→ Cũi — nhiều bé thích ngủ cùng bố mẹ hơn`,
        `→ Đồ chơi — 0-3 tháng chưa cần nhiều`,
        ``,
        `❌ KHÔNG NÊN MUA:`,
        `→ Combo trọn bộ quảng cáo — hay thừa đồ không dùng`,
        ``,
        `📌 SHARE cho mẹ bầu đang chuẩn bị nhé! 🙏`,
        `Mình hay có deal tã & sữa chính hãng — FOLLOW để cập nhật!`,
        ``,
        `#mebo #sinhcon #concung #beyte #mamnonline #meandbe`,
      ].join('\n');

      case 'relatable': return [
        `😆 THÚ THẬT ĐI — Lần mua hàng online hối hận nhất của bạn là gì?`,
        ``,
        `Mình đi trước nhé:`,
        `→ Mua máy massage mặt 450k trên Shopee`,
        `→ Dùng đúng 3 lần rồi bỏ xó đến giờ 💀`,
        `→ Ảnh seller vs thực tế... không cần nói thêm 😭`,
        ``,
        `Từ đó mình học được bài học:`,
        `✅ Chỉ mua hàng có review thật + ảnh người mua`,
        `✅ Ưu tiên brand có cửa hàng để đổi trả dễ`,
        `✅ Follow trang deal để check giá trước khi mua`,
        ``,
        `💬 Kể chuyện của bạn xuống comment đi — đọc cho vui 😂`,
        `Tag bạn bè cùng share chuyện bị hớ nhé!`,
        ``,
        `#muasamonline #fail #shopee #review #kinhnghiem`,
      ].join('\n');

      case 'question_need': return [
        `🎯 MÌNH ĐANG CHUẨN BỊ POST DEAL TUẦN NÀY —`,
        ``,
        `Bạn đang cần tìm mua gì?`,
        ``,
        `Mình có thể tìm deal cho:`,
        `💄 Mỹ phẩm, chăm sóc da`,
        `👶 Đồ dùng mẹ & bé`,
        `👗 Thời trang nữ`,
        `📱 Điện thoại & phụ kiện`,
        `🧳 Túi xách, hành lý`,
        ``,
        `💬 Comment ngay tên sản phẩm/thương hiệu bạn đang cần nhé!`,
        `Mình sẽ ưu tiên tìm deal cho mục được nhắc nhiều nhất 🔍`,
        ``,
        `👇 COMMENT BÊN DƯỚI — Mình đọc hết nha!`,
        ``,
        `#muasamonline #deal #request #skincare #meandbe #fashionvn`,
      ].join('\n');

      case 'tips_skincare': return [
        `💄 SAVE LẠI — Routine skincare đơn giản nhất cho da Việt`,
        ``,
        `Buổi SÁNG (5 phút):`,
        `☀️ Rửa mặt → Toner → Kem chống nắng SPF 50+`,
        ``,
        `Buổi TỐI (10 phút):`,
        `🌙 Tẩy trang → Rửa mặt → Serum → Dưỡng ẩm`,
        ``,
        `3 sai lầm phổ biến cần tránh:`,
        `❌ Rửa mặt nhiều hơn 2 lần/ngày → mất cân bằng da`,
        `❌ Skip kem chống nắng mùa mưa → UV vẫn có đó`,
        `❌ Dùng nhiều sản phẩm cùng lúc → da không kịp hấp thụ`,
        ``,
        `📌 SHARE cho bạn bè có ích nhé! Follow trang để nhận deal skincare hằng ngày 💕`,
        ``,
        `#skincare #duongda #routine #lamde #beautybasic ${this.trendingTag()}`,
      ].join('\n');

      // ─── VIRAL FORMATS ────────────────────────────────────────────────────────

      case 'giveaway': return [
        `🎁 MINI GIVEAWAY — Mình tặng VOUCHER mua hàng cho 3 bạn may mắn!`,
        ``,
        `Cách tham gia (MIỄN PHÍ):`,
        `1️⃣ LIKE bài này`,
        `2️⃣ FOLLOW trang (quan trọng!)`,
        `3️⃣ TAG 2 bạn bè vào comment bên dưới`,
        ``,
        `⏰ Kết quả: 48 giờ sau khi bài đạt 50 comment`,
        `🎯 Giải thưởng: Voucher deal hot được tổng hợp từ trang`,
        ``,
        `💬 Comment "THAM GIA + tag bạn" ngay bên dưới! 👇`,
        ``,
        `📢 SHARE bài này để bạn bè cùng biết nhé! Càng nhiều người biết trang mình, mình càng tìm được nhiều deal hơn cho mọi người 💪`,
        ``,
        `#giveaway #quà #tặng #muasamonline #dealviệt ${this.trendingTag()}`,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'share_chain': return [
        `🔥 BÍ QUYẾT MUA HÀNG RẺ MÀ NHIỀU NGƯỜI CHƯA BIẾT`,
        ``,
        `Trang này mình lập ra chỉ để làm 1 việc:`,
        `→ Mỗi ngày tìm 5-10 deal tốt nhất từ Shopee, Tiki, các brand chính hãng`,
        `→ Đăng lên đây MIỄN PHÍ cho mọi người`,
        `→ Không quảng cáo bừa, không deal ảo`,
        ``,
        `Nhưng trang còn mới — nhiều người chưa biết 😅`,
        ``,
        `🙏 NẾU BẠN THẤY HỮU ÍCH:`,
        `→ SHARE bài này để bạn bè cùng biết`,
        `→ TAG người hay mua sắm online vào comment`,
        `→ FOLLOW để không bỏ lỡ deal ngày mai`,
        ``,
        `Cảm ơn bạn rất nhiều! Mỗi lượt share giúp mình reach được nhiều người hơn 💕`,
        ``,
        `#dealhot #muasamonline #tiếtkiệm #chia_se #follow ${this.trendingTag()}`,
      ].join('\n');

      case 'guess_price': return [
        `🤔 ĐỐ BẠN — Sản phẩm này giá bao nhiêu trên Tiki/Shopee?`,
        ``,
        `[Ảnh sản phẩm đang deal hot hôm nay]`,
        ``,
        `💬 Comment dự đoán giá của bạn bên dưới!`,
        ``,
        `→ Ai đoán đúng (hoặc gần nhất) sẽ được MÌNH REPLY link deal đặc biệt 🎯`,
        `→ Kết quả công bố sau 2 tiếng!`,
        ``,
        `Hint: Giá gốc là một con số tròn... 😏`,
        ``,
        `💬 COMMENT ngay! Tag bạn bè cùng đoán cho vui 👇`,
        ``,
        `#doangia #quiz #fun #muasamonline #dealkhoe ${this.trendingTag()}`,
        ``,
        FOLLOW_CTA,
      ].join('\n');

      case 'morning_deal': {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const today = days[new Date().getDay()];
        return [
          `☀️ CHÀO BUỔI SÁNG ${today.toUpperCase()}! Deal hot hôm nay đã sẵn sàng 🔥`,
          ``,
          `Hôm nay mình đã dậy sớm săn deal cho cả nhà:`,
          ``,
          `✅ Skincare: Đang giảm đến 40% tại THEFACESHOP, DHC`,
          `✅ Mẹ & Bé: Con Cưng flash sale nhiều mặt hàng`,
          `✅ Thời trang: Juno, Hành lý LUG đang khuyến mãi`,
          `✅ Tech: CellphoneS, FPT Shop có deal cuối tuần`,
          ``,
          `👉 Vào xem bài deal cụ thể trên trang nhé!`,
          ``,
          `💬 Hôm nay bạn cần mua gì? Comment để mình tìm deal riêng cho! 🎯`,
          ``,
          `${this.trendingTag()} #sangsangkhoe #dealbuoisan #muasamvui`,
          ``,
          FOLLOW_CTA,
        ].join('\n');
      }

      case 'top5_week': return [
        `🏆 TOP 5 DEAL ĐÁNG MUA NHẤT TUẦN NÀY`,
        ``,
        `Mình tổng hợp từ hàng trăm sản phẩm → chọn ra 5 cái TỐT NHẤT:`,
        ``,
        `5️⃣ Skincare THEFACESHOP — đang giảm 30-40%`,
        `4️⃣ Balo/Vali LUG — chất lượng, giá deal`,
        `3️⃣ Đồ cho bé Con Cưng — hàng chính hãng, an toàn`,
        `2️⃣ Thời trang Juno — mẫu mới nhất, giá sale`,
        `1️⃣ 🥇 Flash sale Tiki — giảm mạnh nhất tuần`,
        ``,
        `👉 Xem chi tiết từng deal trên trang nhé — mình đăng link riêng từng cái!`,
        ``,
        `💬 Bạn thích deal nào nhất? Comment số 1-5 bên dưới! 👇`,
        `📌 SAVE bài này để xem lại!`,
        `SHARE cho bạn bè cùng biết nhé 🙏`,
        ``,
        `#top5deal #weeklydeals #muasamthongminh #dealtuannay ${this.trendingTag()}`,
        ``,
        FOLLOW_CTA,
      ].join('\n');
    }
  }

  // Xoay vòng các loại engagement post (12 types, 2 tuần mới lặp lại)
  private engagementCounter = 0;
  private readonly ENGAGEMENT_SEQUENCE: EngagementType[] = [
    'morning_deal', 'poll_skincare', 'giveaway',
    'tips_smart', 'share_chain', 'question_need',
    'top5_week', 'poll_fashion', 'guess_price',
    'tips_baby', 'relatable', 'tips_skincare',
  ];

  nextEngagementPost(): string {
    const type = this.ENGAGEMENT_SEQUENCE[this.engagementCounter++ % this.ENGAGEMENT_SEQUENCE.length];
    return this.buildEngagementPost(type);
  }
}
