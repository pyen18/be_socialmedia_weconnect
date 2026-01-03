import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../../schemas/notification.schema';
import { ChatGateway } from '../../gateways/chat.gateway';

export interface CreateNotificationDto {
  recipientId: string;
  senderId: string;
  type: string;
  entityId?: string;
  entityModel?: string;
  content?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private chatGateway: ChatGateway,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.notificationModel.create({
      recipientId: new Types.ObjectId(dto.recipientId),
      senderId: new Types.ObjectId(dto.senderId),
      type: dto.type,
      entityId: dto.entityId ? new Types.ObjectId(dto.entityId) : undefined,
      entityModel: dto.entityModel,
      content: dto.content,
      actionUrl: dto.actionUrl,
      isRead: false,
    });

    await notification.populate('senderId', 'username displayName avatarUrl');

    // Send real-time notification via WebSocket
    const notificationData = this.mapToNotificationDto(notification);
    this.chatGateway.sendNotificationToUser(dto.recipientId, notificationData);

    return notificationData;
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ recipientId: userId })
        .populate('senderId', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments({ recipientId: userId }),
      this.notificationModel.countDocuments({
        recipientId: userId,
        isRead: false,
      }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToNotificationDto(n)),
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      recipientId: userId,
    });

    if (!notification) {
      return null;
    }

    notification.isRead = true;
    await notification.save();

    return { message: 'Đã đánh dấu là đã đọc' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } },
    );

    return { message: 'Đã đánh dấu tất cả là đã đọc' };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await this.notificationModel.deleteOne({
      _id: notificationId,
      recipientId: userId,
    });

    return { message: 'Đã xóa thông báo' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return { unreadCount: count };
  }

  // Helper method
  private mapToNotificationDto(notification: any) {
    return {
      id: notification._id.toString(),
      sender: {
        id: notification.senderId._id.toString(),
        username: notification.senderId.username,
        displayName: notification.senderId.displayName,
        avatarUrl: notification.senderId.avatarUrl,
      },
      type: notification.type,
      entityId: notification.entityId?.toString(),
      entityModel: notification.entityModel,
      content: notification.content,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
