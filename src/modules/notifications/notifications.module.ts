import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from '../../schemas/notification.schema';
import { ChatGatewayModule } from '../../gateways/chat-gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => ChatGatewayModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
