import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from '../../schemas/conversation.schemas';
import { User, UserDocument } from '../../schemas/user.schema';
import { Friend, FriendDocument } from '../../schemas/friend.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Friend.name) private friendModel: Model<FriendDocument>,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const { participantIds, groupName } = dto;

    // Validate: không tạo conversation với chính mình
    if (participantIds.includes(userId)) {
      throw new BadRequestException({
        code: 'CANNOT_MESSAGE_YOURSELF',
        message: 'Không thể tạo cuộc hội thoại với chính mình',
      });
    }

    // Check all participants exist
    const users = await this.userModel.find({
      _id: { $in: participantIds },
    });

    if (users.length !== participantIds.length) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Một hoặc nhiều người dùng không tồn tại',
      });
    }

    // Determine conversation type
    const type = participantIds.length === 1 ? 'direct' : 'group';
    const allParticipants = [userId, ...participantIds];

    // For direct messages, check if conversation already exists
    if (type === 'direct') {
      const existingConversation = await this.conversationModel.findOne({
        type: 'direct',
        'participants.userId': { $all: allParticipants },
      });

      if (existingConversation) {
        return this.mapToConversationDto(existingConversation, userId);
      }

      // Check if they are friends
      const friendUserId = participantIds[0];
      let userA = userId;
      let userB = friendUserId;
      if (userA > userB) [userA, userB] = [userB, userA];

      const areFriends = await this.friendModel.exists({ userA, userB });
      if (!areFriends) {
        throw new ForbiddenException({
          code: 'NOT_FRIENDS',
          message: 'Bạn chỉ có thể nhắn tin với bạn bè',
        });
      }
    }

    // Create new conversation
    const participants = allParticipants.map((id) => ({
      userId: new Types.ObjectId(id),
      joinedAt: new Date(),
    }));

    const newConversation = await this.conversationModel.create({
      type,
      participants,
      group:
        type === 'group' && groupName
          ? [
              {
                name: groupName,
                createdBy: new Types.ObjectId(userId),
              },
            ]
          : undefined,

      lastMessageAt: new Date(),
      seenBy: [],
      lastMessage: undefined,
      unreadCounts: {},
    });

    await (newConversation as any).populate(
      'participants.userId',
      'username displayName avatarUrl',
    );

    return this.mapToConversationDto(newConversation, userId);
  }

  async getConversations(userId: string, query: GetConversationsQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({
          'participants.userId': userId,
        })
        .populate('participants.userId', 'username displayName avatarUrl')
        .populate('lastMessage.senderId', 'username displayName avatarUrl')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments({
        'participants.userId': userId,
      }),
    ]);

    const conversationDtos = conversations.map((conv) =>
      this.mapToConversationDto(conv, userId),
    );

    return {
      conversations: conversationDtos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants.userId', 'username displayName avatarUrl')
      .populate('lastMessage.senderId', 'username displayName avatarUrl')
      .lean();

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Không tìm thấy cuộc hội thoại',
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException({
        code: 'NOT_PARTICIPANT',
        message: 'Bạn không phải thành viên của cuộc hội thoại này',
      });
    }

    return this.mapToConversationDto(conversation, userId);
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Không tìm thấy cuộc hội thoại',
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException({
        code: 'NOT_PARTICIPANT',
        message: 'Bạn không phải thành viên của cuộc hội thoại này',
      });
    }

    // Add to seenBy if not already
    if (!conversation.seenBy.some((id: any) => id.toString() === userId)) {
      conversation.seenBy.push(new Types.ObjectId(userId));
    }

    // Reset unread count
    conversation.unreadCounts.set(userId, 0);

    await conversation.save();

    return { message: 'Đã đánh dấu là đã đọc' };
  }

  // Helper method to map conversation to DTO
  private mapToConversationDto(conversation: any, currentUserId: string) {
    const participants = conversation.participants.map((p: any) => ({
      userId: p.userId._id.toString(),
      username: p.userId.username,
      displayName: p.userId.displayName,
      avatarUrl: p.userId.avatarUrl,
      joinedAt: p.joinedAt,
    }));

    const lastMessage = conversation.lastMessage
      ? {
          id: conversation.lastMessage._id,
          content: conversation.lastMessage.content,
          senderId:
            conversation.lastMessage.senderId?._id?.toString() ||
            conversation.lastMessage.senderId,
          createdAt: conversation.lastMessage.createdAt,
        }
      : undefined;

    const unreadCounts =
      conversation.unreadCounts instanceof Map
        ? conversation.unreadCounts
        : new Map(Object.entries(conversation.unreadCounts || {}));

    const unreadCount = unreadCounts.get(currentUserId) || 0;

    return {
      id: conversation._id.toString(),
      type: conversation.type,
      participants,
      groupName: conversation.group?.[0]?.name,
      lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    // Cannot message yourself
    if (userId === targetUserId) {
      throw new BadRequestException({
        code: 'CANNOT_MESSAGE_YOURSELF',
        message: 'Không thể nhắn tin với chính mình',
      });
    }

    // Check if target user exists
    const targetUser = await this.userModel.exists({ _id: targetUserId });
    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    // Check if they are friends
    let userA = userId;
    let userB = targetUserId;
    if (userA > userB) [userA, userB] = [userB, userA];

    const areFriends = await this.friendModel.exists({ userA, userB });
    if (!areFriends) {
      throw new ForbiddenException({
        code: 'NOT_FRIENDS',
        message: 'Bạn chỉ có thể nhắn tin với bạn bè',
      });
    }

    // Find existing conversation
    const existingConversation = await this.conversationModel
      .findOne({
        type: 'direct',
        'participants.userId': { $all: [userId, targetUserId] },
      })
      .populate('participants.userId', 'username displayName avatarUrl')
      .populate('lastMessage.senderId', 'username displayName avatarUrl')
      .lean();

    if (existingConversation) {
      return {
        conversation: this.mapToConversationDto(existingConversation, userId),
        isNew: false,
      };
    }

    // Create new conversation
    const newConversation = await this.conversationModel.create({
      type: 'direct',
      participants: [
        { userId: new Types.ObjectId(userId), joinedAt: new Date() },
        { userId: new Types.ObjectId(targetUserId), joinedAt: new Date() },
      ],
      lastMessageAt: new Date(),
      seenBy: [],
      unreadCounts: {},
    });

    await newConversation.populate(
      'participants.userId',
      'username displayName avatarUrl',
    );

    return {
      conversation: this.mapToConversationDto(newConversation, userId),
      isNew: true,
    };
  }
}
