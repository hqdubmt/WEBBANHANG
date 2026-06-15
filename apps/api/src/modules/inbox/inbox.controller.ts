import {
  Controller, Get, Post, Patch, Body, Param, Query,
  HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/auth.guard';
import { FacebookInboxService } from './facebook-inbox.service';
import { TelegramInboxService } from './telegram-inbox.service';
import { WebChatService } from './webchat.service';
import { UnifiedInboxService, InboxFilter } from './unified-inbox.service';
import { InboxChannel, ConversationStatus } from '../../database/entities/inbox-conversation.entity';

@ApiTags('Omnichannel Inbox')
@Controller('inbox')
export class InboxController {
  constructor(
    private readonly fb: FacebookInboxService,
    private readonly tg: TelegramInboxService,
    private readonly web: WebChatService,
    private readonly unified: UnifiedInboxService,
  ) {}

  // ─── F01: Facebook Webhook ───────────────────────────────────────────────

  @Get('facebook/webhook')
  @Public()
  @ApiOperation({ summary: 'Facebook — xác thực webhook (GET)' })
  fbVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.fb.verifyWebhook(mode, token, challenge);
    if (result) return res.status(200).send(result);
    return res.status(403).send('Forbidden');
  }

  @Post('facebook/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Facebook — nhận tin nhắn Messenger (POST)' })
  fbWebhook(@Body() body: any) {
    this.fb.handleWebhook(body).catch(() => {});
    return 'EVENT_RECEIVED';
  }

  @Post('facebook/reply/:conversationId')
  @ApiOperation({ summary: 'Facebook — gửi reply' })
  fbReply(
    @Param('conversationId') id: string,
    @Body() body: { text: string },
  ) {
    return this.fb.reply(id, body.text);
  }

  // ─── F02: Telegram Webhook ───────────────────────────────────────────────

  @Post('telegram/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram — nhận update từ Bot (POST)' })
  tgWebhook(@Body() body: any) {
    this.tg.handleUpdate(body).catch(() => {});
    return 'OK';
  }

  @Post('telegram/register-webhook')
  @ApiOperation({ summary: 'Telegram — đăng ký webhook URL với Telegram' })
  tgRegister(@Body() body: { publicUrl: string }) {
    return this.tg.registerWebhook(body.publicUrl);
  }

  @Post('telegram/reply/:conversationId')
  @ApiOperation({ summary: 'Telegram — gửi reply' })
  tgReply(
    @Param('conversationId') id: string,
    @Body() body: { text: string },
  ) {
    return this.tg.reply(id, body.text);
  }

  // ─── F03: Website Live Chat ──────────────────────────────────────────────

  @Post('webchat/session')
  @Public()
  @ApiOperation({ summary: 'Web Chat — tạo/lấy chat session' })
  webSession(@Body() body: { visitorId?: string; visitorName?: string }) {
    return this.web.startSession(body.visitorId, body.visitorName);
  }

  @Post('webchat/message')
  @Public()
  @ApiOperation({ summary: 'Web Chat — visitor gửi tin nhắn' })
  webMessage(@Body() body: { visitorId: string; text: string; meta?: any }) {
    return this.web.receiveMessage(body.visitorId, body.text, body.meta);
  }

  @Post('webchat/reply/:conversationId')
  @ApiOperation({ summary: 'Web Chat — agent gửi reply' })
  webReply(
    @Param('conversationId') id: string,
    @Body() body: { text: string; agentId?: string },
  ) {
    return this.web.sendReply(id, body.text, body.agentId);
  }

  @Get('webchat/:conversationId/messages')
  @ApiOperation({ summary: 'Web Chat — lịch sử tin nhắn của session' })
  webMessages(@Param('conversationId') id: string) {
    return this.web.getMessages(id);
  }

  // ─── F04: Unified Inbox ──────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Unified Inbox — danh sách hội thoại (tất cả kênh)' })
  @ApiQuery({ name: 'channel', enum: InboxChannel, required: false })
  @ApiQuery({ name: 'status', enum: ConversationStatus, required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(@Query() query: InboxFilter) {
    return this.unified.listConversations(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Unified Inbox — thống kê tất cả kênh' })
  stats() {
    return this.unified.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Unified Inbox — chi tiết hội thoại + lịch sử tin nhắn' })
  detail(@Param('id') id: string) {
    return this.unified.getConversation(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Unified Inbox — phân công agent' })
  assign(@Param('id') id: string, @Body() body: { agentId: string }) {
    return this.unified.assignConversation(id, body.agentId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Unified Inbox — đánh dấu đã xử lý' })
  resolve(@Param('id') id: string) {
    return this.unified.resolveConversation(id);
  }

  @Patch(':id/merge-customer')
  @ApiOperation({ summary: 'Unified Inbox — gắn hội thoại với khách hàng' })
  merge(
    @Param('id') id: string,
    @Body() body: { customerId: string; customerName?: string },
  ) {
    return this.unified.mergeCustomer(id, body.customerId, body.customerName);
  }
}
