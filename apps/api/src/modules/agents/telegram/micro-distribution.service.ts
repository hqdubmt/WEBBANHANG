import { Injectable } from '@nestjs/common';
import { ContentTestEngineService } from './content-test-engine.service';

// Giả lập TikTok Ads 3-layer scaling
const LAYER_TRAFFIC: Record<1 | 2 | 3, number> = {
  1: 0.10,  // 10% — giai đoạn test ban đầu
  2: 0.50,  // 50% — mở rộng khi CTR tốt
  3: 1.00,  // 100% — full scale khi có conversion
};

const LAYER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'TEST (10%)',
  2: 'EXPANDING (50%)',
  3: 'FULL (100%)',
};

@Injectable()
export class MicroDistributionService {
  constructor(private readonly testEngine: ContentTestEngineService) {}

  // Quyết định có phân phối content này không (giả lập xác suất traffic)
  shouldDistribute(productId: string): boolean {
    const entry = this.testEngine.getEntry(productId);
    if (!entry) return true;          // Chưa đăng ký → phân phối bình thường
    if (entry.state === 'LOSE') return false;  // LOSE → ngừng phân phối
    return Math.random() < LAYER_TRAFFIC[entry.trafficLayer];
  }

  getTrafficRatio(productId: string): number {
    const entry = this.testEngine.getEntry(productId);
    if (!entry || entry.state === 'LOSE') return 0;
    return LAYER_TRAFFIC[entry.trafficLayer];
  }

  getLayerLabel(productId: string): string {
    const entry = this.testEngine.getEntry(productId);
    if (!entry) return 'UNREGISTERED';
    if (entry.state === 'LOSE') return 'KILLED';
    return LAYER_LABEL[entry.trafficLayer];
  }

  getDistributionSummary(): Array<{
    productId: string;
    productName: string;
    state: string;
    layer: number;
    trafficRatio: number;
    label: string;
  }> {
    return this.testEngine.getAllEntries().map(e => ({
      productId: e.productId,
      productName: e.productName.slice(0, 50),
      state: e.state,
      layer: e.trafficLayer,
      trafficRatio: LAYER_TRAFFIC[e.trafficLayer],
      label: e.state === 'LOSE' ? 'KILLED' : LAYER_LABEL[e.trafficLayer],
    }));
  }
}
