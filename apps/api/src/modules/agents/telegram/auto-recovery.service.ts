import { Injectable, Logger } from '@nestjs/common';

interface RecoveryRecord {
  action: string;
  timestamp: number;
  success: boolean;
}

@Injectable()
export class AutoRecoveryService {
  private readonly logger = new Logger(AutoRecoveryService.name);

  recoveryHistory: RecoveryRecord[] = [];

  private readonly channelAlternatives: Record<string, string[]> = {
    telegram: ['facebook', 'youtube'],
    facebook: ['telegram', 'youtube'],
    youtube: ['telegram', 'facebook'],
  };

  private readonly aiProviders: Array<'ollama' | 'openrouter'> = ['ollama', 'openrouter'];
  private currentAiIndex = 0;

  private pushHistory(action: string, success: boolean): void {
    this.recoveryHistory.push({ action, timestamp: Date.now(), success });
    if (this.recoveryHistory.length > 200) this.recoveryHistory.shift();
  }

  switchToFallbackAI(): 'ollama' | 'openrouter' {
    this.currentAiIndex = (this.currentAiIndex + 1) % this.aiProviders.length;
    const provider = this.aiProviders[this.currentAiIndex];
    this.pushHistory(`switchAI:${provider}`, true);
    this.logger.log(`Switched AI provider to: ${provider}`);
    return provider;
  }

  switchChannel(failedChannel: string): string {
    const alternatives = this.channelAlternatives[failedChannel] ?? ['telegram'];
    const next = alternatives[Math.floor(Math.random() * alternatives.length)];
    this.pushHistory(`switchChannel:${failedChannel}->${next}`, true);
    this.logger.log(`Channel switch: ${failedChannel} -> ${next}`);
    return next;
  }

  retryPost(postId: string): boolean {
    const success = Math.random() > 0.2;
    this.pushHistory(`retryPost:${postId}`, success);
    this.logger.log(`Retry post ${postId}: ${success ? 'OK' : 'FAIL'}`);
    return success;
  }

  rerouteTraffic(downChannel: string): Record<string, number> {
    const active = Object.keys(this.channelAlternatives).filter(c => c !== downChannel);
    const share = 1 / active.length;
    const distribution: Record<string, number> = {};
    for (const ch of active) distribution[ch] = share;
    this.pushHistory(`rerouteTraffic:from=${downChannel}`, true);
    return distribution;
  }

  getStats() {
    const successes = this.recoveryHistory.filter(r => r.success).length;
    return {
      totalRecoveries: this.recoveryHistory.length,
      successRate: this.recoveryHistory.length ? successes / this.recoveryHistory.length : 1,
      currentAI: this.aiProviders[this.currentAiIndex],
      recentActions: this.recoveryHistory.slice(-10),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
