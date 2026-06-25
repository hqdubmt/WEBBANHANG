import { Injectable, Logger } from '@nestjs/common';

interface Policy {
  name: string;
  rule: string;
  priority: number;
  active: boolean;
}

interface GovernanceDecision {
  policy: string;
  decision: boolean;
  timestamp: Date;
}

@Injectable()
export class CivilizationGovernanceAiService {
  private readonly logger = new Logger(CivilizationGovernanceAiService.name);

  policies: Map<string, Policy> = new Map();
  decisions: GovernanceDecision[] = [];

  setPolicy(name: string, rule: string, priority: number): void {
    this.policies.set(name, { name, rule, priority, active: true });
    this.logger.log(`Policy set: ${name} (priority=${priority}): ${rule}`);
  }

  enforcePolicy(name: string, context: Record<string, any>): boolean {
    const policy = this.policies.get(name);
    if (!policy || !policy.active) {
      this.logger.warn(`Policy ${name} not found or inactive`);
      return false;
    }

    // Rule evaluation: simple keyword-based logic
    let decision = false;
    const rule = policy.rule.toLowerCase();
    if (rule.includes('revenue >')) {
      const threshold = parseFloat(rule.split('revenue >')[1]?.trim() ?? '0');
      decision = (context['revenue'] ?? 0) > threshold;
    } else if (rule.includes('risk <')) {
      const threshold = parseFloat(rule.split('risk <')[1]?.trim() ?? '100');
      decision = (context['risk'] ?? 0) < threshold;
    } else if (rule.includes('growth')) {
      decision = (context['growthRate'] ?? 0) > 0;
    } else {
      decision = true;
    }

    this.decisions.push({ policy: name, decision, timestamp: new Date() });
    this.logger.debug(`Policy ${name} → ${decision} (context keys: ${Object.keys(context).join(',')})`);
    return decision;
  }

  getActivePolicies(): Policy[] {
    return Array.from(this.policies.values()).filter(p => p.active);
  }

  getStats() {
    const active = this.getActivePolicies();
    return {
      totalPolicies: this.policies.size,
      activePolicies: active.length,
      totalDecisions: this.decisions.length,
      approvalRate:
        this.decisions.length
          ? this.decisions.filter(d => d.decision).length / this.decisions.length
          : 0,
    };
  }
}
