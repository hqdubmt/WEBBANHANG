import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async findAll(page?: number, limit?: number) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Number(limit) || 20);
    const [items, total] = await this.paymentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });
    return { items, total, page: p, limit: l };
  }

  findByOrder(orderId: string) {
    return this.paymentRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.paymentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Thanh toán không tồn tại');
    return item;
  }

  async createPayment(orderId: string, method: string, amount: number): Promise<Payment> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const payment = this.paymentRepo.create({
      paymentCode: `PAY${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      orderId,
      amount,
      method: method as any,
      status: PaymentStatus.PENDING,
    });
    return this.paymentRepo.save(payment);
  }

  async confirmPayment(id: string, transactionId?: string, gatewayResponse?: Record<string, any>): Promise<Payment> {
    const payment = await this.findOne(id);
    await this.paymentRepo.update(id, {
      status: PaymentStatus.PAID,
      transactionId,
      gatewayResponse,
      paidAt: new Date(),
    });

    await this.orderRepo.update(payment.orderId, { status: OrderStatus.CONFIRMED });

    return this.findOne(id);
  }

  async refund(id: string, note?: string): Promise<Payment> {
    await this.findOne(id);
    await this.paymentRepo.update(id, { status: PaymentStatus.REFUNDED, note });
    return this.findOne(id);
  }

  async getStats(): Promise<Record<string, any>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, paid, todayRevenue] = await Promise.all([
      this.paymentRepo.count(),
      this.paymentRepo.count({ where: { status: PaymentStatus.PAID } }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'sum')
        .where('p.status = :status', { status: PaymentStatus.PAID })
        .andWhere('p.paidAt >= :today', { today })
        .getRawOne(),
    ]);

    return {
      total,
      paid,
      todayRevenue: Number(todayRevenue?.sum || 0),
    };
  }
}
