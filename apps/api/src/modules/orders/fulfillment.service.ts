import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Notification, NotificationChannel, NotificationStatus } from '../../database/entities/notification.entity';

const STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]:   OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.SHIPPING,
  [OrderStatus.SHIPPING]:  OrderStatus.DELIVERED,
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]:   'Đơn hàng của bạn đang chờ xác nhận.',
  [OrderStatus.CONFIRMED]: 'Đơn hàng đã được xác nhận và đang chuẩn bị hàng.',
  [OrderStatus.SHIPPING]:  'Đơn hàng đang trên đường giao đến bạn.',
  [OrderStatus.DELIVERED]: 'Đơn hàng đã giao thành công. Cảm ơn bạn!',
  [OrderStatus.CANCELLED]: 'Đơn hàng đã bị huỷ.',
};

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    @InjectRepository(Order)        private readonly orderRepo: Repository<Order>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  // ─── F03: Status Tracking — advance to next stage ───────────────────────

  async advanceStatus(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');

    const next = STATUS_FLOW[order.status];
    if (!next) {
      throw new BadRequestException(
        `Đơn hàng ở trạng thái "${order.status}" không thể tiến thêm`,
      );
    }

    await this.orderRepo.update(orderId, { status: next });
    await this.sendStatusNotification(order.customerId, order.orderCode, next);

    return this.orderRepo.findOneBy({ id: orderId });
  }

  async setStatus(orderId: string, status: OrderStatus, trackingNumber?: string): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');

    const patch: Partial<Order> = { status };
    if (trackingNumber) patch.trackingNumber = trackingNumber;

    await this.orderRepo.update(orderId, patch);
    await this.sendStatusNotification(order.customerId, order.orderCode, status);

    return this.orderRepo.findOneBy({ id: orderId });
  }

  // ─── F03: Notifications ──────────────────────────────────────────────────

  async sendStatusNotification(
    customerId: string,
    orderCode: string,
    status: OrderStatus,
  ): Promise<void> {
    const body = STATUS_MESSAGES[status] ?? `Đơn hàng ${orderCode} cập nhật trạng thái: ${status}`;

    await this.notifRepo.save(
      this.notifRepo.create({
        recipientId:   customerId,
        recipientType: 'customer',
        channel:       NotificationChannel.IN_APP,
        title:         `Đơn hàng ${orderCode}`,
        body,
        status:        NotificationStatus.SENT,
        sentAt:        new Date(),
        meta:          { orderCode, orderStatus: status },
      }),
    );

    this.logger.log(`Notification sent to customer ${customerId}: ${status}`);
  }

  // ─── Bulk fulfillment: mark all shipped orders as delivered ───────────────

  async autoMarkDelivered(daysAgo = 7): Promise<{ updated: number }> {
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const stale = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :s', { s: OrderStatus.SHIPPING })
      .andWhere('o.updatedAt < :d', { d: cutoff })
      .getMany();

    let updated = 0;
    for (const order of stale) {
      try {
        await this.setStatus(order.id, OrderStatus.DELIVERED);
        updated++;
      } catch { /* skip individual errors */ }
    }

    this.logger.log(`autoMarkDelivered: ${updated} orders marked DELIVERED`);
    return { updated };
  }

  // ─── Fulfillment dashboard ────────────────────────────────────────────────

  async getFulfillmentStatus() {
    const counts = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.status IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED],
      })
      .groupBy('o.status')
      .getRawMany();

    const shippingDue = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :s', { s: OrderStatus.SHIPPING })
      .andWhere('o.updatedAt < :d', { d: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) })
      .getCount();

    return {
      byStatus: counts.map((r) => ({ status: r.status, count: parseInt(r.count) })),
      overdueSipping: shippingDue,
    };
  }
}
