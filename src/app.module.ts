import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FriendsModule } from './modules/friends/friends.module';
import { PostsModule } from './modules/posts/posts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CommentsModule } from './modules/comments/comments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatGatewayModule } from './gateways/chat-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    FriendsModule,
    PostsModule,
    ConversationsModule,
    MessagesModule,
    CommentsModule,
    NotificationsModule,
    ChatGatewayModule,
  ],
})
export class AppModule {}
