import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadPlatform, LeadStatus } from '../../database/entities/lead.entity';

export interface FormLeadDto {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  productInterest?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface InboxLeadDto {
  conversationId: string;
  channel: string;
  customerName?: string;
  message: string;
  externalId?: string;
}

export interface CommentLeadDto {
  platform: LeadPlatform;
  postId: string;
  commentId: string;
  authorId: string;
  authorName?: string;
  content: string;
}

@Injectable()
export class LeadCaptureService {
  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
  ) {}

  // ─── F01.1: Form capture ─────────────────────────────────────────────────

  async captureFromForm(dto: FormLeadDto): Promise<Lead> {
    const content = [
      dto.message || '',
      dto.productInterest ? `Quan tâm: ${dto.productInterest}` : '',
    ].filter(Boolean).join('. ');

    return this.repo.save(
      this.repo.create({
        platform: LeadPlatform.WEBSITE,
        name: dto.name,
        content: content || 'Form submission',
        status: LeadStatus.NEW,
        score: this.baseFormScore(dto),
        meta: {
          phone: dto.phone,
          email: dto.email,
          source: dto.source,
          utm: {
            source: dto.utmSource,
            medium: dto.utmMedium,
            campaign: dto.utmCampaign,
          },
        },
      }),
    );
  }

  // ─── F01.2: Inbox-to-lead (from Omnichannel Inbox) ───────────────────────

  async captureFromInbox(dto: InboxLeadDto): Promise<Lead> {
    const platform = this.channelToPlatform(dto.channel);

    const existing = await this.repo.findOne({
      where: { platformUserId: dto.conversationId, platform },
    });
    if (existing) {
      await this.repo.update(existing.id, {
        content: dto.message.slice(0, 500),
        updatedAt: new Date(),
      });
      return this.repo.findOneBy({ id: existing.id });
    }

    return this.repo.save(
      this.repo.create({
        platform,
        platformUserId: dto.conversationId,
        name: dto.customerName,
        content: dto.message.slice(0, 500),
        status: LeadStatus.NEW,
        score: 40,
        meta: { conversationId: dto.conversationId, externalId: dto.externalId },
      }),
    );
  }

  // ─── F01.3: Comment capture (social) ─────────────────────────────────────

  async captureFromComment(dto: CommentLeadDto): Promise<Lead> {
    const existing = await this.repo.findOne({
      where: { platformUserId: dto.commentId, platform: dto.platform },
    });
    if (existing) return existing;

    return this.repo.save(
      this.repo.create({
        platform: dto.platform,
        platformUserId: dto.commentId,
        name: dto.authorName,
        content: dto.content.slice(0, 500),
        status: LeadStatus.NEW,
        score: this.baseCommentScore(dto.content),
        meta: { postId: dto.postId, authorId: dto.authorId },
      }),
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private baseFormScore(dto: FormLeadDto): number {
    let score = 30;
    if (dto.phone)          score += 20;
    if (dto.email)          score += 10;
    if (dto.productInterest) score += 20;
    if (dto.utmCampaign)    score += 5;
    return Math.min(score, 85);
  }

  private baseCommentScore(content: string): number {
    const lower = content.toLowerCase();
    if (/giá|mua|đặt|order|bao nhiêu|ship/.test(lower)) return 65;
    if (/sản phẩm|hàng|chất lượng/.test(lower))         return 45;
    return 25;
  }

  private channelToPlatform(channel: string): LeadPlatform {
    const map: Record<string, LeadPlatform> = {
      facebook: LeadPlatform.FACEBOOK,
      telegram: LeadPlatform.TELEGRAM,
      zalo:     LeadPlatform.ZALO,
      web_chat: LeadPlatform.WEBSITE,
    };
    return map[channel] ?? LeadPlatform.WEBSITE;
  }
}
