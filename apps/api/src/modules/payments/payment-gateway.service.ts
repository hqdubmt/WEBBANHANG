import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface VnpayPaymentUrl {
  paymentUrl: string;
  txnRef: string;
}

export interface MomoPaymentResult {
  payUrl: string;
  deeplink: string;
  qrCodeUrl: string;
  orderId: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  // ─── F02: VNPay ──────────────────────────────────────────────────────────

  createVnpayUrl(params: {
    orderId: string;
    amount: number;
    orderInfo: string;
    returnUrl: string;
    ipAddr?: string;
  }): VnpayPaymentUrl {
    const tmnCode  = process.env.VNPAY_TMN_CODE ?? '';
    const hashSecret = process.env.VNPAY_HASH_SECRET ?? '';
    const vnpUrl   = process.env.VNPAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    const txnRef = `${params.orderId.replace(/-/g, '').slice(0, 12)}${Date.now().toString().slice(-6)}`;
    const createDate = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    const vnpParams: Record<string, string> = {
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    tmnCode,
      vnp_Amount:     String(Math.round(params.amount * 100)),
      vnp_CurrCode:   'VND',
      vnp_TxnRef:     txnRef,
      vnp_OrderInfo:  params.orderInfo.slice(0, 255),
      vnp_OrderType:  '190000',
      vnp_Locale:     'vn',
      vnp_ReturnUrl:  params.returnUrl,
      vnp_IpAddr:     params.ipAddr ?? '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    // Sort keys & build query string
    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys.map((k) => `${k}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`).join('&');
    const secureHash = crypto.createHmac('sha512', hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');

    const queryString = sortedKeys.map((k) => `${k}=${encodeURIComponent(vnpParams[k])}`).join('&');
    const paymentUrl = `${vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

    return { paymentUrl, txnRef };
  }

  verifyVnpayReturn(query: Record<string, string>): boolean {
    const hashSecret = process.env.VNPAY_HASH_SECRET ?? '';
    const secureHash = query['vnp_SecureHash'];

    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
      .join('&');

    const calculated = crypto.createHmac('sha512', hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');
    return calculated === secureHash;
  }

  // ─── F02: MoMo ───────────────────────────────────────────────────────────

  async createMomoPayment(params: {
    orderId: string;
    amount: number;
    orderInfo: string;
    returnUrl: string;
    notifyUrl: string;
  }): Promise<MomoPaymentResult> {
    const partnerCode = process.env.MOMO_PARTNER_CODE ?? 'MOMO';
    const accessKey   = process.env.MOMO_ACCESS_KEY ?? '';
    const secretKey   = process.env.MOMO_SECRET_KEY ?? '';
    const momoUrl     = process.env.MOMO_URL ?? 'https://test-payment.momo.vn/v2/gateway/api/create';

    const requestId   = `${params.orderId}-${Date.now()}`;
    const requestType = 'payWithMethod';
    const extraData   = '';

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${params.amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${params.notifyUrl}`,
      `orderId=${params.orderId}`,
      `orderInfo=${params.orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${params.returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount: String(params.amount),
      orderId: params.orderId,
      orderInfo: params.orderInfo,
      redirectUrl: params.returnUrl,
      ipnUrl: params.notifyUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    try {
      const axios = (await import('axios')).default;
      const { data } = await axios.post(momoUrl, body, { timeout: 10000 });
      return {
        payUrl:     data.payUrl     ?? '',
        deeplink:   data.deeplink   ?? '',
        qrCodeUrl:  data.qrCodeUrl  ?? '',
        orderId:    params.orderId,
      };
    } catch (e) {
      this.logger.error(`MoMo payment error: ${e.message}`);
      return { payUrl: '', deeplink: '', qrCodeUrl: '', orderId: params.orderId };
    }
  }

  verifyMomoIpn(body: Record<string, any>): boolean {
    const secretKey = process.env.MOMO_SECRET_KEY ?? '';
    const { signature, ...rest } = body;

    const rawSignature = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join('&');

    const calculated = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    return calculated === signature;
  }

  // ─── F02: COD (no gateway, just confirm) ─────────────────────────────────

  createCodReference(orderId: string): string {
    return `COD-${orderId.slice(-8).toUpperCase()}`;
  }
}
