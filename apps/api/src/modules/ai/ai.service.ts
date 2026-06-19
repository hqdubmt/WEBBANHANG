import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiResponse {
  content: string;
  tokensUsed: number;
  provider: 'ollama' | 'openrouter';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async chat(messages: AiMessage[], systemPrompt?: string): Promise<AiResponse> {
    const allMessages: AiMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      return await this.callOllama(allMessages);
    } catch (ollamaErr) {
      this.logger.warn(`Ollama failed: ${ollamaErr.message}`);
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        // Không có OpenRouter key → trả về response giản lược thay vì crash
        this.logger.warn('OpenRouter chưa cấu hình — trả về response mặc định');
        const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user')?.content || '';
        return {
          content: `[AI đang bận, phân tích tự động] ${lastUserMsg.slice(0, 100)}`,
          tokensUsed: 0,
          provider: 'ollama',
        };
      }
      return await this.callOpenRouter(allMessages);
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const result = await this.complete(prompt, systemPrompt);
    return result.content;
  }

  async complete(prompt: string, systemPrompt?: string): Promise<AiResponse> {
    return this.chat([{ role: 'user', content: prompt }], systemPrompt);
  }

  private async callOllama(messages: AiMessage[]): Promise<AiResponse> {
    const url = `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`;
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

    const res = await axios.post(url, { model, messages, stream: false, options: { num_predict: 512 } }, { timeout: 30000 });
    return {
      content: res.data.message?.content || '',
      tokensUsed: res.data.eval_count || 0,
      provider: 'ollama',
    };
  }

  private async callOpenRouter(messages: AiMessage[]): Promise<AiResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OpenRouter API key not configured');

    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct',
        messages,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    const choice = res.data.choices?.[0];
    return {
      content: choice?.message?.content || '',
      tokensUsed: res.data.usage?.total_tokens || 0,
      provider: 'openrouter',
    };
  }

  async parseJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const result = await this.complete(prompt, systemPrompt);
    const match = result.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error('AI did not return valid JSON');
    return JSON.parse(match[0]) as T;
  }
}
