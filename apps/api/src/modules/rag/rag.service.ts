import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { AiService } from '../ai/ai.service';

export enum RagCollection {
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  FAQ = 'faq',
  ORDERS = 'orders',
  AFFILIATE = 'affiliate',
  MARKETING = 'marketing',
}

interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private readonly qdrantUrl: string;
  private readonly vectorSize = 1536;
  private ready = false;

  constructor(private readonly aiService: AiService) {
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  }

  async onModuleInit() {
    await this.initCollections();
  }

  private async initCollections() {
    try {
      for (const collection of Object.values(RagCollection)) {
        await this.ensureCollection(collection);
      }
      this.ready = true;
      this.logger.log('RAG: Qdrant collections sẵn sàng');
    } catch (e) {
      this.logger.warn(`RAG: Không kết nối được Qdrant (${e.message}). Tính năng RAG sẽ bị tắt.`);
    }
  }

  private async ensureCollection(name: string): Promise<void> {
    const headers = this.getHeaders();

    try {
      await axios.get(`${this.qdrantUrl}/collections/${name}`, { headers });
    } catch (e) {
      if (e.response?.status === 404) {
        await axios.put(
          `${this.qdrantUrl}/collections/${name}`,
          { vectors: { size: this.vectorSize, distance: 'Cosine' } },
          { headers },
        );
        this.logger.log(`RAG: Tạo collection "${name}"`);
      }
    }
  }

  async upsert(collection: RagCollection, id: string, text: string, payload: Record<string, any>): Promise<void> {
    if (!this.ready) return;

    try {
      const vector = await this.embed(text);
      const headers = this.getHeaders();

      await axios.put(
        `${this.qdrantUrl}/collections/${collection}/points`,
        { points: [{ id: this.toNumericId(id), vector, payload: { ...payload, _text: text } }] },
        { headers },
      );
    } catch (e) {
      this.logger.warn(`RAG upsert lỗi (${collection}): ${e.message}`);
    }
  }

  async search(collection: RagCollection, query: string, limit = 5): Promise<SearchResult[]> {
    if (!this.ready) return [];

    try {
      const vector = await this.embed(query);
      const headers = this.getHeaders();

      const { data } = await axios.post(
        `${this.qdrantUrl}/collections/${collection}/points/search`,
        { vector, limit, with_payload: true },
        { headers },
      );

      return (data.result || []).map((r: any) => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload,
      }));
    } catch (e) {
      this.logger.warn(`RAG search lỗi (${collection}): ${e.message}`);
      return [];
    }
  }

  async retrieveContext(query: string, collections: RagCollection[] = [RagCollection.PRODUCTS, RagCollection.FAQ]): Promise<string> {
    const results: SearchResult[] = [];

    for (const col of collections) {
      const hits = await this.search(col, query, 3);
      results.push(...hits);
    }

    if (!results.length) return '';

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((r) => r.payload._text || JSON.stringify(r.payload))
      .join('\n\n---\n\n');
  }

  async indexProduct(product: any): Promise<void> {
    const text = `Sản phẩm: ${product.name}. Danh mục: ${product.category || ''}. Giá: ${product.price?.toLocaleString('vi-VN')}đ. Mô tả: ${product.description || ''}. Link: ${product.affiliateLink || ''}`;
    await this.upsert(RagCollection.PRODUCTS, product.id, text, {
      name: product.name,
      price: product.price,
      category: product.category,
      affiliateLink: product.affiliateLink,
    });
  }

  async indexFaq(id: string, question: string, answer: string): Promise<void> {
    await this.upsert(RagCollection.FAQ, id, `Q: ${question}\nA: ${answer}`, { question, answer });
  }

  private async embed(text: string): Promise<number[]> {
    if (process.env.OPENAI_API_KEY) {
      return this.openAiEmbed(text);
    }
    return this.ollamaEmbed(text);
  }

  private async openAiEmbed(text: string): Promise<number[]> {
    const { data } = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { model: 'text-embedding-3-small', input: text },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );
    return data.data[0].embedding;
  }

  private async ollamaEmbed(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const { data } = await axios.post(`${ollamaUrl}/api/embeddings`, {
      model: 'nomic-embed-text',
      prompt: text,
    });
    const embedding: number[] = data.embedding;
    // Pad or truncate to match collection vector size
    if (embedding.length < this.vectorSize) {
      return [...embedding, ...new Array(this.vectorSize - embedding.length).fill(0)];
    }
    return embedding.slice(0, this.vectorSize);
  }

  private toNumericId(uuid: string): number {
    const hex = uuid.replace(/-/g, '').slice(0, 15);
    return parseInt(hex, 16) % Number.MAX_SAFE_INTEGER;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.QDRANT_API_KEY) headers['api-key'] = process.env.QDRANT_API_KEY;
    return headers;
  }
}
