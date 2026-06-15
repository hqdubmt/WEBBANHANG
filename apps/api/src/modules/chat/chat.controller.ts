import {
  Controller, Get, Post, Delete, Body, Param, Query,
  Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { AdminAssistantService } from './admin-assistant.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly adminAssistant: AdminAssistantService,
  ) {}

  // ─── Session Management ──────────────────────────────────────────────────

  @Post('sessions')
  @ApiOperation({ summary: 'Tạo chat session mới' })
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() body: { userId?: string }) {
    return this.chatService.createSession(body.userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Liệt kê tất cả chat sessions' })
  @ApiQuery({ name: 'userId', required: false })
  listSessions(@Query('userId') userId?: string) {
    return this.chatService.listSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Xóa chat session' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('sessionId') sessionId: string) {
    return this.chatService.deleteSession(sessionId);
  }

  @Get('sessions/:sessionId/context')
  @ApiOperation({ summary: 'Lấy context (lịch sử) của session' })
  getContext(@Param('sessionId') sessionId: string) {
    return this.chatService.getContext(sessionId);
  }

  // ─── Chat (blocking) ─────────────────────────────────────────────────────

  @Post('sessions/:sessionId/message')
  @ApiOperation({ summary: 'Gửi tin nhắn — nhận reply đầy đủ' })
  chat(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ) {
    return this.chatService.chat(sessionId, body.message);
  }

  // ─── Streaming (SSE) ─────────────────────────────────────────────────────

  @Get('sessions/:sessionId/stream')
  @ApiOperation({ summary: 'Stream chat response (SSE) — nhận từng token' })
  @ApiQuery({ name: 'message', required: true })
  async streamChat(
    @Param('sessionId') sessionId: string,
    @Query('message') message: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await this.chatService.streamChat(
        sessionId,
        message,
        (token) => send('token', { token }),
        (full) => {
          send('done', { full });
          res.end();
        },
      );
    } catch (e) {
      send('error', { message: e.message });
      res.end();
    }
  }

  // ─── Admin Assistant ─────────────────────────────────────────────────────

  @Post('admin/query')
  @ApiOperation({ summary: 'Admin Assistant — hỏi về business/DB/KPI' })
  adminQuery(@Body() body: { question: string }) {
    return this.adminAssistant.query(body.question);
  }

  @Get('admin/kpi')
  @ApiOperation({ summary: 'Admin Assistant — KPI snapshot nhanh' })
  adminKpi() {
    return this.adminAssistant.getKpiSnapshot();
  }
}
