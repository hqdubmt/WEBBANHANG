import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Customer } from '../../database/entities/customer.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import {
  Notification, NotificationChannel, NotificationStatus,
} from '../../database/entities/notification.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(Customer)     private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)        private readonly orderRepo: Repository<Order>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly aiService: AiService,
  ) {}

  // ─── F02: Follow-up — customers inactive for X days ─────────────────────

  async getInactiveCustomers(daysInactive = 30, limit = 50): Promise<Customer[]> {
    const cutoff = new Date(Date.now() - daysInactive * 86400000);

    const activeIds = await this.orderRepo
      .createQueryBuilder('o')
      .select('DISTINCT o.customerId', 'customerId')
      .where('o.createdAt >= :d', { d: cutoff })
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
      .getRawMany()
      .then((rows) => rows.map((r) => r.customerId).filter(Boolean));

    const qb = this.customerRepo.createQueryBuilder('c')
      .where('c.totalOrders > 0')
      .orderBy('c.totalSpent', 'DESC')
      .take(limit);

    if (activeIds.length) {
      qb.andWhere('c.id NOT IN (:...ids)', { ids: activeIds });
    }

    return qb.getMany();
  }

  async scheduleFollowUps(daysInactive = 30): Promise<{ queued: number }> {
    const inactive = await this.getInactiveCustomers(daysInactive, 50);

    let queued = 0;
    for (const customer of inactive) {
      const alreadyQueued = await this.notifRepo.findOne({
        where: {
          recipientId: customer.id,
          status: NotificationStatus.PENDING,
          channel: NotificationChannel.IN_APP,
        },
      });
      if (alreadyQueued) continue;

      const message = await this.generateFollowUpMessage(customer);

      await this.notifRepo.save(
        this.notifRepo.create({
          recipientId:   customer.id,
          recipientType: 'customer',
          channel:       NotificationChannel.IN_APP,
          title:         'Chúng tôi nhớ bạn!',
          body:          message,
          status:        NotificationStatus.PENDING,
          meta:          { type: 'follow_up', daysInactive },
        }),
      );
      queued++;
    }

    this.logger.log(`Follow-up: queued ${queued} notifications`);
    return { queued };
  }

  private async generateFollowUpMessage(customer: Customer): Promise<string> {
    try {
      return await this.aiService.generate(
        `Tạo tin nhắn follow-up ngắn (2 câu) cho khách hàng tên "${customer.name}" đã không mua hàng lâu. Thân thiện, không spam.`,
        'Bạn là nhân viên chăm sóc khách hàng. Chỉ trả lời bằng nội dung tin nhắn, không giải thích.',
      );
    } catch {
      return `Xin chào ${customer.name}! Chúng tôi có nhiều sản phẩm mới và ưu đãi hấp dẫn dành cho bạn.`;
    }
  }

  // ─── F02: Reminder — birthday, re-engagement ────────────────────────────

  async sendBirthdayReminders(): Promise<{ sent: number }> {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Match customers whose birthday ends with the current MM-DD
    const customers = await this.customerRepo
      .createQueryBuilder('c')
      .where("c.birthday LIKE :bd", { bd: `%-${mmdd}` })
      .getMany();

    let sent = 0;
    for (const c of customers) {
      await this.notifRepo.save(
        this.notifRepo.create({
          recipientId:   c.id,
          recipientType: 'customer',
          channel:       NotificationChannel.IN_APP,
          title:         '🎂 Chúc mừng sinh nhật!',
          body:          `Chúc mừng sinh nhật ${c.name}! Tặng bạn ưu đãi đặc biệt hôm nay.`,
          status:        NotificationStatus.SENT,
          sentAt:        new Date(),
          meta:          { type: 'birthday' },
        }),
      );
      sent++;
    }

    return { sent };
  }

  async sendReEngagementReminders(daysInactive = 60): Promise<{ sent: number }> {
    const inactive = await this.getInactiveCustomers(daysInactive, 30);
    let sent = 0;

    for (const c of inactive) {
      await this.notifRepo.save(
        this.notifRepo.create({
          recipientId:   c.id,
          recipientType: 'customer',
          channel:       NotificationChannel.IN_APP,
          title:         'Ưu đãi quay lại dành riêng cho bạn',
          body:          `${c.name} ơi, chúng tôi có ưu đãi đặc biệt dành riêng cho bạn. Xem ngay!`,
          status:        NotificationStatus.SENT,
          sentAt:        new Date(),
          meta:          { type: 're_engagement', daysInactive },
        }),
      );
      sent++;
    }

    return { sent };
  }

  // ─── Scheduled: daily follow-up check ────────────────────────────────────

  @Cron('0 9 * * *')
  async dailyRetentionRun(): Promise<void> {
    this.logger.log('Retention: running daily checks...');
    await Promise.all([
      this.sendBirthdayReminders(),
      this.scheduleFollowUps(30),
    ]);
  }

  async getRetentionStats() {
    const [pending, sent, total] = await Promise.all([
      this.notifRepo.count({ where: { status: NotificationStatus.PENDING, recipientType: 'customer' } }),
      this.notifRepo.count({ where: { status: NotificationStatus.SENT, recipientType: 'customer' } }),
      this.notifRepo.count({ where: { recipientType: 'customer' } }),
    ]);
    return { pending, sent, total };
  }
}
