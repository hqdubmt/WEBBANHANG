import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayInit,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly clientRooms = new Map<string, Set<string>>();

  afterInit() {
    this.logger.log('WebSocket Gateway khởi động');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client kết nối: ${client.id}`);
    this.clientRooms.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối: ${client.id}`);
    this.clientRooms.delete(client.id);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
    this.clientRooms.get(client.id)?.add(room);
    return { event: 'joined', data: room };
  }

  @SubscribeMessage('leave')
  handleLeave(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.leave(room);
    this.clientRooms.get(client.id)?.delete(room);
    return { event: 'left', data: room };
  }

  // Broadcast methods called by services

  emitNewOrder(order: Record<string, any>) {
    this.server.to('orders').emit('new_order', order);
    this.server.to('dashboard').emit('new_order', order);
  }

  emitNewLead(lead: Record<string, any>) {
    this.server.to('leads').emit('new_lead', lead);
    this.server.to('dashboard').emit('new_lead', lead);
  }

  emitAgentUpdate(agentName: string, status: string, data?: Record<string, any>) {
    this.server.to('agents').emit('agent_update', { agent: agentName, status, data, ts: new Date() });
  }

  emitKpiUpdate(kpi: Record<string, any>) {
    this.server.to('dashboard').emit('kpi_update', { ...kpi, ts: new Date() });
  }

  emitNotification(userId: string, message: string, type = 'info') {
    this.server.to(`user:${userId}`).emit('notification', { message, type, ts: new Date() });
  }

  emitChatMessage(sessionId: string, message: Record<string, any>) {
    this.server.to(`chat:${sessionId}`).emit('chat_message', message);
  }
}
