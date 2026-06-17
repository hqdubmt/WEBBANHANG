import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';

@Injectable()
export class OrderAutomationService {
  private readonly logger = new Logger(OrderAutomationService.name);

  constructor(
    @InjectRepository(Order)    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Product)   private readonly productRepo: Repository<Product>,
    @InjectRepository(Payment)   private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ─── F01: Cancel Order ────────────────────────────────────────────────────

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');
    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Không thể huỷ đơn ở trạng thái ${order.status}`);
    }

    // Only restore stock if order was already confirmed (stock was previously deducted)
    const stockWasDeducted = [OrderStatus.CONFIRMED, OrderStatus.SHIPPING].includes(order.status);
    if (stockWasDeducted) {
      for (const item of order.items ?? []) {
        if (item.productId) {
          await this.productRepo.increment({ id: item.productId }, 'stock', item.quantity);
        }
      }
    }

    // Cancel any pending payments
    await this.paymentRepo.update(
      { orderId, status: PaymentStatus.PENDING },
      { status: PaymentStatus.FAILED, note: reason ?? 'Order cancelled' },
    );

    await this.orderRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
      note: reason ? `[HUỶ] ${reason}` : '[HUỶ ĐƠN]',
    });

    this.logger.log(`Order ${order.orderCode} cancelled`);
    return this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
  }

  // ─── F01: Update Order ────────────────────────────────────────────────────

  async updateOrder(orderId: string, updates: {
    shippingAddress?: string;
    note?: string;
    couponCode?: string;
    discount?: number;
    assignedTo?: string;
  }): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Không thể cập nhật đơn đã huỷ');
    }

    const patch: Partial<Order> = {};
    if (updates.shippingAddress !== undefined) patch.shippingAddress = updates.shippingAddress;
    if (updates.note !== undefined)            patch.note = updates.note;
    if (updates.couponCode !== undefined)      patch.couponCode = updates.couponCode;
    if (updates.assignedTo !== undefined)      patch.assignedTo = updates.assignedTo;

    if (updates.discount !== undefined) {
      patch.discount = updates.discount;
      patch.total = (order.subtotal - updates.discount) as any;
    }

    await this.orderRepo.update(orderId, patch);
    return this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
  }

  // ─── Bulk status update (e.g. mark all COD as delivered) ─────────────────

  async bulkUpdateStatus(orderIds: string[], status: OrderStatus): Promise<{ updated: number }> {
    if (!orderIds.length) return { updated: 0 };
    const result = await this.orderRepo
      .createQueryBuilder()
      .update()
      .set({ status })
      .whereInIds(orderIds)
      .execute();
    return { updated: result.affected ?? 0 };
  }

  // ─── Order stats ──────────────────────────────────────────────────────────

  async getOrderStats() {
    const byStatus = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total),0)', 'revenue')
      .groupBy('o.status')
      .getRawMany();

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayOrders = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total),0)', 'revenue')
      .where('o.createdAt >= :d', { d: today })
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
      .getRawOne();

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count),
        revenue: parseFloat(r.revenue),
      })),
      today: {
        orders: parseInt(todayOrders?.count ?? '0'),
        revenue: parseFloat(todayOrders?.revenue ?? '0'),
      },
    };
  }
}
