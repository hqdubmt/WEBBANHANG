import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('AI Social Commerce OS V3')
    .setDescription('AI Agent bán hàng tự động đa nền tảng - 16 Agents, RAG, WebSocket, JWT Auth')
    .setVersion('3.0')
    .addBearerAuth()
    .addTag('Auth', 'Đăng nhập / đăng ký')
    .addTag('Products', 'Quản lý sản phẩm')
    .addTag('Categories', 'Danh mục')
    .addTag('Brands', 'Thương hiệu')
    .addTag('Inventory', 'Tồn kho')
    .addTag('Suppliers', 'Nhà cung cấp')
    .addTag('Orders', 'Đơn hàng')
    .addTag('Payments', 'Thanh toán')
    .addTag('Customers', 'Khách hàng')
    .addTag('Leads', 'Leads')
    .addTag('Campaigns', 'Chiến dịch')
    .addTag('Workflows', 'Workflows')
    .addTag('Analytics', 'Phân tích')
    .addTag('Agents', 'AI Agents (16 agents)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3001;
  await app.listen(port);
  console.log(`\n🚀 AI Social Commerce OS V3`);
  console.log(`   API:     http://localhost:${port}/api`);
  console.log(`   Docs:    http://localhost:${port}/api/docs`);
  console.log(`   WS:      ws://localhost:${port}/ws`);
}

bootstrap();
