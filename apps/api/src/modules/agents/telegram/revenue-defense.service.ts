import { Injectable, Logger } from '@nestjs/common';

interface Incident {
  type: string;
  channel: string;
  detectedAt: Date;
  resolved: boolean;
}

@Injectable()
export class RevenueDefenseService {
  private readonly logger = new Logger(RevenueDefenseService.name);

  fallbacks: Map<string, string> = new Map([
    ['facebook', 'telegram'],
    ['telegram', 'youtube'],
    ['youtube', 'telegram'],
    ['instagram', 'facebook'],
  ]);

  incidents: Incident[] = [];

  registerFallback(channel: string, fallback: string): void {
    this.fallbacks.set(channel, fallback);
    this.logger.log(`Registered fallback: ${channel} → ${fallback}`);
  }

  activateDefense(channel: string): string {
    const fallback = this.fallbacks.get(channel) ?? 'telegram';
    this.logger.warn(`Defense activated for ${channel} → routing to ${fallback}`);
    this.recordIncident('channel-failure', channel);
    return fallback;
  }

  recordIncident(type: string, channel: string): void {
    const incident: Incident = { type, channel, detectedAt: new Date(), resolved: false };
    this.incidents.push(incident);
    this.logger.warn(`Incident recorded: [${type}] on ${channel}`);
  }

  resolveIncident(channel: string): void {
    for (const incident of this.incidents) {
      if (incident.channel === channel && !incident.resolved) {
        incident.resolved = true;
        this.logger.log(`Incident resolved for channel: ${channel}`);
      }
    }
  }

  getActiveIncidents(): Incident[] {
    return this.incidents.filter(i => !i.resolved);
  }

  getStats() {
    const active = this.getActiveIncidents();
    const resolved = this.incidents.filter(i => i.resolved);
    const byChannel: Record<string, number> = {};
    for (const inc of this.incidents) {
      byChannel[inc.channel] = (byChannel[inc.channel] ?? 0) + 1;
    }
    return {
      totalIncidents: this.incidents.length,
      activeIncidents: active.length,
      resolvedIncidents: resolved.length,
      registeredFallbacks: this.fallbacks.size,
      incidentsByChannel: byChannel,
    };
  }

  getStatus() {
    return { activeIncidents: this.getActiveIncidents().length, fallbacks: this.fallbacks.size };
  }
}
