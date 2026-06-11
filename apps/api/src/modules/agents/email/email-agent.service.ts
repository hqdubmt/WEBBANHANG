import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { EmailCampaign, CampaignType, CampaignStatus } from '../../../database/entities/email-campaign.entity';
import { Customer } from '../../../database/entities/customer.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

@Injectable()
export class EmailAgentService {
  private readonly logger = new Logger(EmailAgentService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(EmailCampaign)
    private readonly campaignRepo: Repository<EmailCampaign>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {
    this.initTransporter();
  }

  private initTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }

  @Cron('0 8 * * *')
  async runDailyEmailCampaigns() {
    this.logger.log('Email Agent: tạo và gửi chiến dịch email...');
    await this.runWelcomeCampaign();
    await this.runUpsellCampaign();
  }

  async runWelcomeCampaign(): Promise<EmailCampaign | null> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newCustomers = await this.customerRepo.find({
      where: {},
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const recentNew = newCustomers.filter(
      (c) => c.createdAt >= sevenDaysAgo && c.email,
    );
    if (!recentNew.length) return null;

    const products = await this.productsService.getHotProducts(3);
    return this.createAndSendCampaign(
      CampaignType.WELCOME,
      recentNew.map((c) => c.email).filter(Boolean),
      { customers: recentNew.map((c) => c.name), products },
    );
  }

  async runUpsellCampaign(): Promise<EmailCampaign | null> {
    const products = await this.productsService.getHotProducts(5);
    const customers = await this.customerRepo.find({
      where: {},
      order: { totalSpent: 'DESC' },
      take: 50,
    });

    const eligible = customers.filter((c) => c.email && Number(c.totalSpent) > 0);
    if (!eligible.length) return null;

    return this.createAndSendCampaign(
      CampaignType.UPSELL,
      eligible.map((c) => c.email).filter(Boolean),
      { products },
    );
  }

  private async createAndSendCampaign(
    type: CampaignType,
    emails: string[],
    context: Record<string, any>,
  ): Promise<EmailCampaign | null> {
    const log = this.logRepo.create({ agent: AgentName.EMAIL, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const content = await this.generateEmailContent(type, context);
      const campaign = this.campaignRepo.create({
        subject: content.subject,
        body: content.body,
        type,
        recipientEmails: emails,
        status: CampaignStatus.SCHEDULED,
      });
      await this.campaignRepo.save(campaign);

      await this.sendCampaign(campaign);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { campaignId: campaign.id, sent: campaign.sentCount } as any,
        durationMs: Date.now() - startMs,
      });

      return campaign;
    } catch (e) {
      this.logger.error('Email Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return null;
    }
  }

  private async generateEmailContent(
    type: CampaignType,
    context: Record<string, any>,
  ): Promise<{ subject: string; body: string }> {
    const typeGuide = {
      [CampaignType.WELCOME]: 'chào mừng khách mới, giới thiệu sản phẩm hot',
      [CampaignType.UPSELL]: 'gợi ý sản phẩm cao cấp hơn cho khách đã mua',
      [CampaignType.CROSS_SELL]: 'gợi ý sản phẩm liên quan',
      [CampaignType.REMARKETING]: 'nhắc nhở khách chưa mua hoàn thành đơn',
    };

    const systemPrompt = `Bạn là email marketing expert Việt Nam.
Tạo email ${typeGuide[type]}. Ngôn ngữ thân thiện, không spam.
Trả về JSON: {"subject":"...","body":"..."}`;

    const productList = context.products
      ?.map((p: any) => `- ${p.name}: ${p.price?.toLocaleString('vi-VN')}đ`)
      .join('\n') || '';

    try {
      return await this.aiService.parseJson<{ subject: string; body: string }>(
        `Sản phẩm:\n${productList}\n\nTạo email JSON:`,
        systemPrompt,
      );
    } catch {
      const subjects = {
        [CampaignType.WELCOME]: 'Chào mừng bạn đến với AI Commerce! 🎉',
        [CampaignType.UPSELL]: 'Sản phẩm hot dành riêng cho bạn',
        [CampaignType.CROSS_SELL]: 'Gợi ý sản phẩm phù hợp với bạn',
        [CampaignType.REMARKETING]: 'Bạn còn quên món đồ này!',
      };
      return {
        subject: subjects[type],
        body: `Xin chào,\n\nChúng tôi có những sản phẩm hot dành cho bạn:\n\n${productList}\n\nMua ngay hôm nay!\n\nAI Commerce Team`,
      };
    }
  }

  private async sendCampaign(campaign: EmailCampaign): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP chưa cấu hình, bỏ qua gửi email');
      await this.campaignRepo.update(campaign.id, {
        status: CampaignStatus.SENT,
        sentCount: 0,
        sentAt: new Date(),
      });
      return;
    }

    let sent = 0;
    for (const email of campaign.recipientEmails || []) {
      try {
        await this.transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'AI Commerce'}" <${process.env.SMTP_USER}>`,
          to: email,
          subject: campaign.subject,
          text: campaign.body,
        });
        sent++;
      } catch (e) {
        this.logger.warn(`Không gửi được tới ${email}: ${e.message}`);
      }
    }

    await this.campaignRepo.update(campaign.id, {
      status: CampaignStatus.SENT,
      sentCount: sent,
      sentAt: new Date(),
    });
    this.logger.log(`Email Agent: gửi ${sent}/${campaign.recipientEmails?.length} email`);
  }
}
