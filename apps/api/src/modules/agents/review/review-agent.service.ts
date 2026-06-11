import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface ProductContent {
  productId: string;
  productName: string;
  faq: FaqItem[];
  usageGuide: string;
  salesSupport: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

@Injectable()
export class ReviewAgentService {
  private readonly logger = new Logger(ReviewAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 11 * * *')
  async runDailyContentGeneration() {
    this.logger.log('Review Agent: tạo FAQ và hướng dẫn sản phẩm...');
    await this.generateProductContent();
  }

  async generateProductContent(count = 10): Promise<ProductContent[]> {
    const log = this.logRepo.create({ agent: AgentName.REVIEW, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(count);
      const contents: ProductContent[] = [];

      for (const product of products) {
        const content = await this.generateForProduct(product);
        contents.push(content);
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { generated: contents.length } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Review Agent: tạo nội dung cho ${contents.length} sản phẩm`);
      return contents;
    } catch (e) {
      this.logger.error('Review Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async generateForProduct(product: any): Promise<ProductContent> {
    const systemPrompt = `Bạn là chuyên gia tư vấn sản phẩm TMĐT.
Tạo nội dung hỗ trợ bán hàng THỰC TẾ từ thông tin sản phẩm.
QUAN TRỌNG: Chỉ tổng hợp thông tin sản phẩm. Không tạo đánh giá giả mạo của khách hàng.
Trả về JSON: {
  "faq": [{"question":"...","answer":"..."}, ...5 câu],
  "usageGuide": "hướng dẫn sử dụng chi tiết",
  "salesSupport": "điểm bán hàng nổi bật, lợi ích cho khách"
}`;

    const prompt = `Sản phẩm: ${product.name}
Danh mục: ${product.category || 'Chung'}
Giá: ${product.price?.toLocaleString('vi-VN')}đ
Mô tả: ${product.description || product.name}

Tạo nội dung hỗ trợ JSON:`;

    try {
      const result = await this.aiService.parseJson<{
        faq: FaqItem[];
        usageGuide: string;
        salesSupport: string;
      }>(prompt, systemPrompt);

      return {
        productId: product.id,
        productName: product.name,
        faq: result.faq || [],
        usageGuide: result.usageGuide || '',
        salesSupport: result.salesSupport || '',
      };
    } catch {
      return {
        productId: product.id,
        productName: product.name,
        faq: [
          { question: `${product.name} có chất lượng không?`, answer: 'Sản phẩm đã qua kiểm duyệt chất lượng từ nhà sản xuất uy tín.' },
          { question: 'Giao hàng bao lâu?', answer: 'Giao trong 2-5 ngày làm việc toàn quốc.' },
          { question: 'Có bảo hành không?', answer: 'Có bảo hành theo chính sách nhà sản xuất.' },
        ],
        usageGuide: `Hướng dẫn sử dụng ${product.name}: Đọc kỹ hướng dẫn đi kèm sản phẩm trước khi dùng.`,
        salesSupport: `${product.name} - Sản phẩm chất lượng, giá ${product.price?.toLocaleString('vi-VN')}đ, giao hàng nhanh.`,
      };
    }
  }

  async generateFaqForProduct(productId: string): Promise<FaqItem[]> {
    const products = await this.productsService.getHotProducts(100);
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const content = await this.generateForProduct(product);
    return content.faq;
  }
}
