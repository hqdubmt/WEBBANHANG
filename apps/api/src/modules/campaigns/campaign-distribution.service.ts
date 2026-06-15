import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Campaign, CampaignStatus, CampaignType } from '../../database/entities/campaign.entity';
import { Notification, NotificationChannel, NotificationStatus } from '../../database/entities/notification.entity';

export interface DistributionResult {
  channel: CampaignType;
  success: boolean;
  sent: number;
  error?: string;
}

@Injectable()
export class CampaignDistributionService {
  private readonly logger = new Logger(CampaignDistributionService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  // ─── F02: Publishing — distribute to the campaign's target channel ────────

  async distribute(campaignId: string): Promise<DistributionResult> {
    const campaign = await this.campaignRepo.findOneByOrFail({ id: campaignId });

    let result: DistributionResult;

    switch (campaign.type) {
      case CampaignType.FACEBOOK:
        result = await this.publishToFacebook(campaign);
        break;
      case CampaignType.TELEGRAM:
        result = await this.publishToTelegram(campaign);
        break;
      case CampaignType.PUSH:
        result = await this.publishPushNotification(campaign);
        break;
      case CampaignType.SMS:
        result = await this.publishSms(campaign);
        break;
      default:
        result = { channel: campaign.type, success: true, sent: 0 };
        this.logger.log(`Campaign ${campaign.name}: channel ${campaign.type} — manual distribution`);
    }

    // Update sent count
    if (result.success) {
      await this.campaignRepo.update(campaignId, {
        sentCount: (campaign.sentCount || 0) + result.sent,
        status: CampaignStatus.RUNNING,
      });
    }

    return result;
  }

  // ─── F02: Facebook Page post ──────────────────────────────────────────────

  private async publishToFacebook(campaign: Campaign): Promise<DistributionResult> {
    const token = process.env.FB_PAGE_TOKEN;
    const pageId = process.env.FB_PAGE_ID;

    if (!token || !pageId) {
      this.logger.warn('FB_PAGE_TOKEN / FB_PAGE_ID not set — skipping Facebook publish');
      return { channel: CampaignType.FACEBOOK, success: true, sent: 0 };
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        { message: campaign.content, access_token: token },
        { timeout: 15000 },
      );
      return { channel: CampaignType.FACEBOOK, success: true, sent: 1 };
    } catch (e) {
      this.logger.error(`Facebook publish failed: ${e.message}`);
      return { channel: CampaignType.FACEBOOK, success: false, sent: 0, error: e.message };
    }
  }

  // ─── F02: Telegram Channel broadcast ─────────────────────────────────────

  private async publishToTelegram(campaign: Campaign): Promise<DistributionResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;

    if (!token || !chatId) {
      this.logger.warn('TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not set — skipping Telegram publish');
      return { channel: CampaignType.TELEGRAM, success: true, sent: 0 };
    }

    try {
      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id: chatId, text: campaign.content, parse_mode: 'HTML' },
        { timeout: 15000 },
      );
      return { channel: CampaignType.TELEGRAM, success: true, sent: 1 };
    } catch (e) {
      this.logger.error(`Telegram publish failed: ${e.message}`);
      return { channel: CampaignType.TELEGRAM, success: false, sent: 0, error: e.message };
    }
  }

  // ─── F02: Push Notification (in-app) ─────────────────────────────────────

  private async publishPushNotification(campaign: Campaign): Promise<DistributionResult> {
    await this.notifRepo.save(
      this.notifRepo.create({
        recipientId:   campaign.segment || 'all',
        recipientType: 'segment',
        channel:       NotificationChannel.IN_APP,
        title:         campaign.subject || campaign.name,
        body:          campaign.content || '',
        status:        NotificationStatus.SENT,
        sentAt:        new Date(),
        meta:          { campaignId: campaign.id, type: 'push' },
      }),
    );
    return { channel: CampaignType.PUSH, success: true, sent: campaign.targetCount || 1 };
  }

  // ─── F02: SMS broadcast stub ──────────────────────────────────────────────

  private async publishSms(campaign: Campaign): Promise<DistributionResult> {
    const smsUrl = process.env.SMS_API_URL;
    if (!smsUrl) {
      this.logger.warn('SMS_API_URL not set — skipping SMS distribution');
      return { channel: CampaignType.SMS, success: true, sent: 0 };
    }

    try {
      const res = await axios.post(
        `${smsUrl}/send-bulk`,
        { message: campaign.content, segment: campaign.segment },
        { timeout: 30000 },
      );
      return { channel: CampaignType.SMS, success: true, sent: res.data?.sent || 0 };
    } catch (e) {
      return { channel: CampaignType.SMS, success: false, sent: 0, error: e.message };
    }
  }
}
