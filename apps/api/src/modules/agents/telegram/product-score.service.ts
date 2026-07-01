import { Injectable } from '@nestjs/common';
import { BrandProduct } from './priority-brands.service';

export interface ScoredProduct extends BrandProduct {
  score: number;
  epc: number;       // Estimated Per-Click revenue (VND) — hoa hồng kỳ vọng mỗi click
  fakeDiscount: boolean;
}

// ─── Hoa hồng thực tế từ AccessTrade campaigns đã được duyệt ─────────────────
const BRAND_COMMISSION: Record<string, number> = {
  'THEFACESHOP':     0.12,   // 12% — mỹ phẩm cao cấp
  'bestme.vn':       0.12,   // 12% — DHC supplements
  'Con Cưng':        0.07,   // 7%  — mẹ & bé
  'Juno':            0.10,   // 10% — thời trang nữ
  'LUG':             0.10,   // 10% — hành lý
  'CellphoneS':      0.015,  // 1.5% — điện thoại
  'FPT Shop':        0.015,  // 1.5% — điện thoại
  'Hoàng Hà Mobile': 0.02,   // 2%  — điện thoại
  'Shopee':          0.04,   // 4%  — đa ngành
  'Tiki Flash Sale': 0.08,   // 8%  — flash sale
  'Tiki':            0.08,
};

// ─── CTR × CVR kết hợp cho social media (Telegram / Facebook post) ────────────
// Không phải CVR tuyệt đối — là hệ số tương đối so sánh giữa các ngành
// Cao: nhu cầu cao + dễ impulse buy từ post → thấp: cần nghiên cứu trước khi mua
const SOCIAL_FACTOR: Record<string, number> = {
  'Làm đẹp':               3.0,
  'Làm đẹp & Sức khỏe':   3.0,
  'Sức khỏe':              2.5,
  'Mẹ & Bé':               2.8,   // cha mẹ rất reactive với sp cho con
  'Thời trang nữ':         2.0,
  'Thời trang nam':        1.5,
  'Hành lý & Balo':        1.8,
  'Flash Sale':            2.5,
  'Điện thoại & Phụ kiện': 0.6,   // mua điện thoại cần nghiên cứu, CVR social thấp
  'Đồng hồ thông minh':    0.8,
  'Máy tính bảng':         0.5,
  'Shopee':                1.8,
};

const DEFAULT_COMMISSION = 0.05;
const DEFAULT_SOCIAL_FACTOR = 1.5;

@Injectable()
export class ProductScoreService {
  private readonly MIN_SCORE = 20;

  // Hoa hồng ước tính mỗi click (đơn vị: VND/1000 clicks để dễ đọc log)
  // Công thức: min(price, 2M) × commission × social_factor / scaling
  // Giới hạn price 2M vì sp >2M khó convert qua social dù commission cao
  estimatedEPC(product: Pick<BrandProduct, 'brand' | 'price' | 'category'>): number {
    const commission = BRAND_COMMISSION[product.brand] ?? DEFAULT_COMMISSION;
    const factor = SOCIAL_FACTOR[product.category] ?? DEFAULT_SOCIAL_FACTOR;
    const effectivePrice = Math.min(product.price, 2_000_000);
    return Math.round(effectivePrice * commission * factor);
  }

  // Phát hiện reference price giả (giá gốc được thổi phồng 4× trở lên)
  // Thường thấy trên Shopee: "giá gốc 2tr, bán 100k" — không phải giảm giá thật
  isFakeDiscount(product: BrandProduct): boolean {
    if (!product.originalPrice || !product.discount) return false;
    return product.originalPrice > product.price * 4;
  }

  score(product: BrandProduct): ScoredProduct {
    let s = 0;
    const fake = this.isFakeDiscount(product);

    // === 1. EPC Score — 40 điểm (thành phần quan trọng nhất) ==================
    // CEO nhìn vào tiền, không nhìn vào % giảm giá đơn thuần
    const epc = this.estimatedEPC(product);
    // EPC 12,000+ = full 40pts. Scale: mỗi 300 EPC = 1pt
    s += Math.min(40, Math.floor(epc / 300));

    // === 2. Impulse-buy price range — 25 điểm ================================
    const p = product.price;
    s += p <= 100_000  ? 25 :
         p <= 300_000  ? 23 :
         p <= 500_000  ? 20 :
         p <= 1_000_000 ? 14 :
         p <= 2_000_000 ? 7  : 2;

    // === 3. Discount quality — 20 điểm (fake = penalty) ======================
    const disc = product.discount || 0;
    if (fake) {
      s -= 5; // phạt giảm giá ảo — giá gốc bị thổi phồng làm lệch quyết định
    } else {
      s += disc >= 50 ? 20 :
           disc >= 40 ? 17 :
           disc >= 30 ? 13 :
           disc >= 20 ? 8  :
           disc >= 10 ? 4  : 0;
    }

    // === 4. Brand trust — 15 điểm ============================================
    // Tier 1 (hoa hồng 10-15%): THEFACESHOP, DHC, Con Cưng, Juno, LUG
    // Tier 3 (hoa hồng <3%): tech brands
    const commission = BRAND_COMMISSION[product.brand] ?? DEFAULT_COMMISSION;
    s += commission >= 0.10 ? 15 :
         commission >= 0.07 ? 12 :
         commission >= 0.04 ? 8  : 4;

    return { ...product, score: Math.max(0, s), epc, fakeDiscount: fake };
  }

  // Giữ top keepTopPercent% theo score — mặc định top 25%
  // CEO: thà đăng ít mà chất lượng, không spam sản phẩm kém EPC
  filter(products: BrandProduct[], keepTopPercent = 0.25): ScoredProduct[] {
    const scored = products.map(p => this.score(p)).filter(p => p.score >= this.MIN_SCORE);
    scored.sort((a, b) => b.score - a.score);
    const keepCount = Math.max(1, Math.ceil(scored.length * keepTopPercent));
    return scored.slice(0, keepCount);
  }

  // Summary log cho CEO dashboard
  summarize(scored: ScoredProduct[]): string {
    const totalEPC = scored.reduce((s, p) => s + p.epc, 0);
    const topBrand = scored[0]?.brand ?? 'N/A';
    const fakeCount = scored.filter(p => p.fakeDiscount).length;
    return `${scored.length} sp | EPC pool: ${Math.round(totalEPC / 1000)}k VND | top: ${topBrand}${fakeCount ? ` | ⚠️ ${fakeCount} fake discount` : ''}`;
  }
}
