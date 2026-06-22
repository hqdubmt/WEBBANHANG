import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Tắt CSP để không chặn Swagger UI
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — luôn dùng explicit allowlist, không bao giờ dùng origin: true
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:3005',
       'http://14.236.113.160', 'http://14.236.113.160:8080'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,       // strip unknown properties
    forbidNonWhitelisted: false, // không throw lỗi (nhiều body dùng Partial<Entity>)
  }));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

  // Swagger — chỉ bật khi không phải production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Social Commerce OS V3')
      .setDescription('AI Agent ban hang tu dong da nen tang - 26 Agents, RAG, WebSocket, JWT Auth')
      .setVersion('3.0')
      .addBearerAuth()
      .addTag('Auth', 'Dang nhap / dang ky')
      .addTag('Products', 'Quan ly san pham')
      .addTag('Categories', 'Danh muc')
      .addTag('Brands', 'Thuong hieu')
      .addTag('Inventory', 'Ton kho')
      .addTag('Suppliers', 'Nha cung cap')
      .addTag('Orders', 'Don hang')
      .addTag('Payments', 'Thanh toan')
      .addTag('Customers', 'Khach hang')
      .addTag('Leads', 'Leads')
      .addTag('Campaigns', 'Chien dich')
      .addTag('Workflows', 'Workflows')
      .addTag('Analytics', 'Phan tich')
      .addTag('Agents', 'AI Agents (26 agents)')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.APP_PORT || 3001;
  await app.listen(port);
  console.log(`AI Social Commerce OS V3 running on port ${port}`);
}

bootstrap();
