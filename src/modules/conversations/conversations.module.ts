import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversation.service';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schemas';
import { User, UserSchema } from '../../schemas/user.schema';
import { Friend, FriendSchema } from '../../schemas/friend.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema },
      { name: Friend.name, schema: FriendSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
