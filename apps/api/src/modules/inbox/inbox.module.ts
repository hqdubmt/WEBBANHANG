import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxConversation } from '../../database/entities/inbox-conversation.entity';
import { InboxMessage } from '../../database/entities/inbox-message.entity';
import { FacebookInboxService } from './facebook-inbox.service';
import { TelegramInboxService } from './telegram-inbox.service';
import { WebChatService } from './webchat.service';
import { UnifiedInboxService } from './unified-inbox.service';
import { InboxController } from './inbox.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InboxConversation, InboxMessage]),
  ],
  providers: [FacebookInboxService, TelegramInboxService, WebChatService, UnifiedInboxService],
  controllers: [InboxController],
  exports: [UnifiedInboxService, WebChatService],
})
export class InboxModule {}
