import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../modules/messages/messages.module';
import { ConversationsModule } from '../modules/conversations/conversations.module';

@Module({
  imports: [JwtModule.register({}), MessagesModule, ConversationsModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatGatewayModule {}
