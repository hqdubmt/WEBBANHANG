import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Customer } from '../../database/entities/customer.entity';

@Injectable()
export class OrderNotifyService {
  private readonly logger = new Logger(OrderNotifyService.name);
  private lastCheckedAt: Date = new Date();

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  // Kiểm tra đơn mới mỗi 3 phút
  @Cron('*/3 * * * *')
  async checkNewOrders() {
    const since = this.lastCheckedAt;
    this.lastCheckedAt = new Date();

    const newOrders = await this.orderRepo.find({
      where: { createdAt: MoreThan(since), status: OrderStatus.PENDING },
      relations: ['items', 'customer'],
      order: { createdAt: 'ASC' },
    });

    if (newOrders.length === 0) return;

    this.logger.log(`Có ${newOrders.length} đơn mới`);
    for (const order of newOrders) {
      await this.notifyTelegram(order);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  private async notifyTelegram(order: Order): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chatId) return;

    const customer = order.customer;
    const pf = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

    const itemLines = (order.items || [])
      .map(i => `  • ${i.productName} x${i.quantity} — ${pf(i.price * i.quantity)}`)
      .join('\n');

    const statusMap: Record<string, string> = {
      pending: '🟡 Chờ xác nhận',
      confirmed: '🟢 Đã xác nhận',
      shipping: '🚚 Đang giao',
      delivered: '✅ Đã giao',
      cancelled: '❌ Đã huỷ',
    };

    const text = [
      `🛒 *ĐƠN HÀNG MỚI* — \`${order.orderCode}\``,
      ``,
      `👤 *${customer?.name || 'Khách'}*${customer?.phone ? ` — ${customer.phone}` : ''}`,
      `📦 Sản phẩm:`,
      itemLines || '  (không có)',
      ``,
      `💰 Tổng: *${pf(order.total)}*`,
      order.shippingAddress ? `📍 ${order.shippingAddress}` : '',
      order.note ? `📝 ${order.note}` : '',
      ``,
      `${statusMap[order.status] || order.status}`,
    ].filter(l => l !== undefined && l !== null).join('\n');

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }, { timeout: 10000 });
    } catch (e: any) {
      this.logger.error(`Không gửi được thông báo đơn ${order.orderCode}: ${e.message}`);
    }
  }

  // Gọi thủ công để kiểm tra ngay
  async checkNow(): Promise<{ found: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h gần nhất
    const orders = await this.orderRepo.find({
      where: { createdAt: MoreThan(since), status: OrderStatus.PENDING },
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`checkNow: ${orders.length} đơn pending trong 24h`);
    for (const order of orders) {
      await this.notifyTelegram(order);
      await new Promise(r => setTimeout(r, 500));
    }
    return { found: orders.length };
  }
}
