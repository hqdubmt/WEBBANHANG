import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AiMemory, MemoryType } from '../../database/entities/ai-memory.entity';
import { AiService, AiMessage } from '../ai/ai.service';
import { RagService, RagCollection } from '../rag/rag.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: string;
}

export interface ChatSession {
  sessionId: string;
  userId?: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SYSTEM_PROMPT = `Bạn là AI Assistant của AI Commerce OS.
Bạn có thể trả lời câu hỏi về sản phẩm, đơn hàng, khách hàng, doanh thu và vận hành hệ thống.
Trả lời ngắn gọn, chính xác bằng tiếng Việt. Nếu không biết, nói thẳng không có dữ liệu.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly CONTEXT_WINDOW = 20;

  constructor(
    @InjectRepository(AiMemory)
    private readonly memoryRepo: Repository<AiMemory>,
    private readonly aiService: AiService,
    private readonly ragService: RagService,
  ) {}

  // ─── Session Management ──────────────────────────────────────────────────

  async createSession(userId?: string): Promise<ChatSession> {
    const sessionId = uuidv4();
    const record = this.memoryRepo.create({
      sessionId,
      customerId: userId,
      type: MemoryType.CHAT_HISTORY,
      data: {
        messages: [],
        title: 'New Chat',
        createdAt: new Date().toISOString(),
      },
    });
    const saved = await this.memoryRepo.save(record);
    return {
      sessionId,
      userId,
      title: 'New Chat',
      messageCount: 0,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async listSessions(userId?: string): Promise<ChatSession[]> {
    const where: any = { type: MemoryType.CHAT_HISTORY };
    if (userId) where.customerId = userId;

    const records = await this.memoryRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    return records.map((r) => ({
      sessionId: r.sessionId,
      userId: r.customerId,
      title: r.data?.title || 'Chat',
      messageCount: (r.data?.messages as any[])?.length ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.memoryRepo.delete({ sessionId, type: MemoryType.CHAT_HISTORY });
  }

  // ─── Context Management ──────────────────────────────────────────────────

  async getContext(sessionId: string): Promise<ChatMessage[]> {
    const record = await this.memoryRepo.findOne({
      where: { sessionId, type: MemoryType.CHAT_HISTORY },
    });
    const messages: ChatMessage[] = (record?.data?.messages as ChatMessage[]) ?? [];
    return messages.slice(-this.CONTEXT_WINDOW);
  }

  private async appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const record = await this.memoryRepo.findOne({
      where: { sessionId, type: MemoryType.CHAT_HISTORY },
    });

    if (!record) throw new NotFoundException(`Session ${sessionId} không tồn tại`);

    const messages: ChatMessage[] = (record.data?.messages as ChatMessage[]) ?? [];
    messages.push(message);

    const title = record.data?.title === 'New Chat' && message.role === 'user'
      ? message.content.slice(0, 60)
      : record.data?.title;

    await this.memoryRepo.update(record.id, {
      data: { ...record.data, messages: messages.slice(-100), title },
    });
  }

  // ─── Chat (blocking) ─────────────────────────────────────────────────────

  async chat(sessionId: string, userMessage: string): Promise<{ reply: string; sessionId: string }> {
    const context = await this.getContext(sessionId);

    const ragContext = await this.ragService.retrieveContext(
      userMessage,
      [RagCollection.PRODUCTS, RagCollection.FAQ, RagCollection.BUSINESS],
    );

    const systemContent = ragContext
      ? `${SYSTEM_PROMPT}\n\nTri thức liên quan:\n${ragContext}`
      : SYSTEM_PROMPT;

    const messages: AiMessage[] = [
      ...context.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const now = new Date().toISOString();
    await this.appendMessage(sessionId, { role: 'user', content: userMessage, ts: now });

    const response = await this.aiService.chat(messages, systemContent);

    await this.appendMessage(sessionId, {
      role: 'assistant',
      content: response.content,
      ts: new Date().toISOString(),
    });

    return { reply: response.content, sessionId };
  }

  // ─── Stream (token-by-token via callback) ────────────────────────────────

  async streamChat(
    sessionId: string,
    userMessage: string,
    onToken: (token: string) => void,
    onDone: (full: string) => void,
  ): Promise<void> {
    const context = await this.getContext(sessionId);

    const ragContext = await this.ragService.retrieveContext(
      userMessage,
      [RagCollection.PRODUCTS, RagCollection.FAQ, RagCollection.BUSINESS],
    );

    const systemContent = ragContext
      ? `${SYSTEM_PROMPT}\n\nTri thức liên quan:\n${ragContext}`
      : SYSTEM_PROMPT;

    const messages: AiMessage[] = [
      ...context.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    await this.appendMessage(sessionId, {
      role: 'user',
      content: userMessage,
      ts: new Date().toISOString(),
    });

    const full = await this.streamOllama(messages, systemContent, onToken);

    await this.appendMessage(sessionId, {
      role: 'assistant',
      content: full,
      ts: new Date().toISOString(),
    });

    onDone(full);
  }

  private async streamOllama(
    messages: AiMessage[],
    systemPrompt: string,
    onToken: (t: string) => void,
  ): Promise<string> {
    const axios = (await import('axios')).default;
    const url = `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`;
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const allMessages: AiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    let fullText = '';

    try {
      const res = await axios.post(
        url,
        { model, messages: allMessages, stream: true },
        { responseType: 'stream', timeout: 90000 },
      );

      await new Promise<void>((resolve, reject) => {
        res.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              const token: string = json.message?.content ?? '';
              if (token) {
                fullText += token;
                onToken(token);
              }
            } catch {
              // skip malformed chunk
            }
          }
        });
        res.data.on('end', resolve);
        res.data.on('error', reject);
      });
    } catch (e) {
      this.logger.warn(`Ollama stream failed: ${e.message}. Falling back to blocking call.`);
      const fallback = await this.aiService.chat(messages, systemPrompt);
      fullText = fallback.content;
      onToken(fullText);
    }

    return fullText;
  }
}
