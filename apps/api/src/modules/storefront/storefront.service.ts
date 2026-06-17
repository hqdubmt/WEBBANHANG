import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product, ProductStatus } from '../../database/entities/product.entity';
import { Order, OrderSource, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Lead, LeadStatus, LeadPlatform } from '../../database/entities/lead.entity';
import { Category } from '../../database/entities/category.entity';
import { Notification, NotificationChannel, NotificationStatus } from '../../database/entities/notification.entity';

export interface CheckoutDto {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  note?: string;
  paymentMethod: 'cod' | 'bank_transfer';
  items: Array<{ productId: string; quantity: number }>;
}

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  async listProducts(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(48, Number(query.limit) || 16);
    const where: any = { status: ProductStatus.ACTIVE };
    if (query.search) where.name = ILike(`%${query.search}%`);
    if (query.category) where.category = query.category;

    const [items, total] = await this.productRepo.findAndCount({
      where,
      order: { trendScore: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProduct(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, status: ProductStatus.ACTIVE },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const related = await this.productRepo.find({
      where: { category: product.category, status: ProductStatus.ACTIVE },
      order: { trendScore: 'DESC' },
      take: 4,
    });

    return { product, related: related.filter(p => p.id !== id).slice(0, 3) };
  }

  async listCategories() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async checkout(dto: CheckoutDto) {
    // Validate sản phẩm và tính tổng tiền
    const productIds = dto.items.map(i => i.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    const validItems: Array<{ product: Product; quantity: number }> = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException(`Sản phẩm ${item.productId} không tồn tại`);
      if (product.stock < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ hàng (còn ${product.stock})`);
      }
      subtotal += Number(product.price) * item.quantity;
      validItems.push({ product, quantity: item.quantity });
    }

    // Tìm hoặc tạo customer
    const fullAddress = [dto.address, dto.city].filter(Boolean).join(', ');
    let customer = await this.customerRepo.findOne({ where: { phone: dto.phone } });
    if (!customer) {
      customer = this.customerRepo.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: fullAddress,
      });
      customer = await this.customerRepo.save(customer);
    } else {
      await this.customerRepo.update(customer.id, {
        name: dto.name,
        email: dto.email || customer.email,
        address: fullAddress || customer.address,
      });
    }

    // Tạo đơn hàng
    const orderCode = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const shippingAddress = `${dto.address}, ${dto.city}`;

    const orderEntity = this.orderRepo.create({
      orderCode,
      customerId: customer.id,
      subtotal,
      discount: 0,
      total: subtotal,
      source: OrderSource.WEBSITE,
      note: dto.note,
      shippingAddress,
    } as any);
    const savedOrder = (await this.orderRepo.save(orderEntity as any)) as Order;

    // Lưu order items
    const itemEntities = validItems.map(({ product, quantity }) =>
      this.itemRepo.create({
        orderId: savedOrder.id,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        price: Number(product.price),
        quantity,
        total: Number(product.price) * quantity,
      } as any),
    );
    await this.itemRepo.save(itemEntities as any);

    // Thông báo admin — đơn hàng mới
    const itemSummary = validItems
      .map(({ product, quantity }) => `${product.name} x${quantity}`)
      .join(', ');
    await this.notifRepo.save(
      this.notifRepo.create({
        recipientType: 'admin',
        channel: NotificationChannel.IN_APP,
        title: `🛒 Đơn hàng mới: ${orderCode}`,
        body: `${dto.name} (${dto.phone}) đặt: ${itemSummary} — Tổng: ${subtotal.toLocaleString('vi-VN')}₫`,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        meta: {
          orderCode,
          orderId: savedOrder.id,
          customerId: customer.id,
          customerName: dto.name,
          phone: dto.phone,
          address: fullAddress,
          total: subtotal,
          paymentMethod: dto.paymentMethod,
        },
      }),
    );

    // Tự động tạo lead từ đơn hàng web
    await this.leadRepo.save(
      this.leadRepo.create({
        name: dto.name,
        platform: LeadPlatform.WEBSITE,
        content: `Đặt hàng online: ${orderCode} — SĐT: ${dto.phone}`,
        status: LeadStatus.CONVERTED,
        customerId: customer.id,
        meta: { phone: dto.phone, email: dto.email, orderCode, address: dto.address, city: dto.city },
      }),
    );

    return {
      success: true,
      orderCode: savedOrder.orderCode,
      orderId: savedOrder.id,
      total: subtotal,
      message: `Đặt hàng thành công! Mã đơn: ${savedOrder.orderCode}. Chúng tôi sẽ liên hệ xác nhận trong 30 phút.`,
    };
  }

  async cancelOrder(phone: string, orderCode: string) {
    const customer = await this.customerRepo.findOne({ where: { phone } });
    if (!customer) throw new Error('Không tìm thấy đơn hàng với số điện thoại này');

    const order = await this.orderRepo.findOne({
      where: { orderCode, customerId: customer.id },
      relations: ['items'],
    });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'pending') {
      throw new Error('Chỉ có thể huỷ đơn đang ở trạng thái chờ xác nhận');
    }

    await this.orderRepo.update(order.id, { status: 'cancelled' as any, note: '[KHÁCH HUỶ]' });

    // Notify admin
    await this.notifRepo.save(
      this.notifRepo.create({
        recipientType: 'admin',
        channel: NotificationChannel.IN_APP,
        title: `❌ Khách huỷ đơn: ${orderCode}`,
        body: `${customer.name} (${phone}) đã huỷ đơn ${orderCode}`,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        meta: { orderCode, orderId: order.id, customerName: customer.name, phone },
      }),
    );

    return { success: true, message: 'Đơn hàng đã được huỷ thành công' };
  }

  async trackOrder(phone: string, orderCode?: string) {
    const customer = await this.customerRepo.findOne({ where: { phone } });
    if (!customer) {
      return { found: false, message: 'Không tìm thấy đơn hàng với số điện thoại này' };
    }

    const where: any = { customerId: customer.id };
    if (orderCode) where.orderCode = orderCode;

    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['items'],
    });

    if (!orders.length) {
      return { found: false, message: 'Không tìm thấy đơn hàng' };
    }

    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã huỷ',
    };

    return {
      found: true,
      customerName: customer.name,
      orders: orders.map(o => ({
        orderCode: o.orderCode,
        status: o.status,
        statusText: statusMap[o.status] || o.status,
        total: o.total,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
        createdAt: o.createdAt,
        items: (o.items || []).map(i => ({
          name: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
      })),
    };
  }
}
