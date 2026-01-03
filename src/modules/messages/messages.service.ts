import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../../schemas/conversation.schemas';
import {
  Conversation,
  ConversationDocument,
} from '../../schemas/conversation.schemas';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto) {
    const { conversationId, content, imgUrl } = dto;

    // Validate: phải có content hoặc image
    if (!content && !imgUrl) {
      throw new BadRequestException({
        code: 'EMPTY_MESSAGE',
        message: 'Tin nhắn phải có nội dung hoặc hình ảnh',
      });
    }

    // Check conversation exists
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

    // Create message
    const newMessage = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      content: content || '',
      imgUrl,
    });

    // Update conversation
    conversation.lastMessage = {
      _id: newMessage._id.toString(),
      content: content || '',
      senderId: new Types.ObjectId(userId),
      createdAt: newMessage.createdAt,
    } as any;

    conversation.lastMessageAt = new Date();

    // Reset seenBy (only sender has seen)
    conversation.seenBy = [new Types.ObjectId(userId)];

    // Increment unread count for other participants
    if (!conversation.unreadCounts) {
      conversation.unreadCounts = new Map();
    }
    conversation.participants.forEach((p: any) => {
      const participantId = p.userId.toString();
      if (participantId !== userId) {
        const currentCount = conversation.unreadCounts.get(participantId) || 0;
        conversation.unreadCounts.set(participantId, currentCount + 1);
      }
    });

    await conversation.save();

    // Populate sender info
    await newMessage.populate('senderId', 'username displayName avatarUrl');

    return this.mapToMessageDto(newMessage);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ) {
    const { page = 1, limit = 50, before } = query;

    // Check conversation exists and user is participant
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Không tìm thấy cuộc hội thoại',
      });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException({
        code: 'NOT_PARTICIPANT',
        message: 'Bạn không phải thành viên của cuộc hội thoại này',
      });
    }

    // Build query
    // 👇 FIX: Ép kiểu String sang ObjectId ở đây
    const queryFilter: any = {
      conversationId: new Types.ObjectId(conversationId),
    };

    if (before) {
      const beforeMessage = await this.messageModel.findById(before);
      if (beforeMessage) {
        queryFilter.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const skip = before ? 0 : (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(queryFilter)
        .populate('senderId', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments(queryFilter), // 👈 Sửa luôn chỗ này dùng queryFilter cho chuẩn
    ]);

    const messageDtos = messages.map((msg) => this.mapToMessageDto(msg));

    return {
      messages: messageDtos.reverse(), // Reverse to show oldest first
      total,
      page,
      hasMore: messages.length === limit,
    };
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Không tìm thấy tin nhắn',
      });
    }

    // Check ownership
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException({
        code: 'NOT_MESSAGE_OWNER',
        message: 'Bạn chỉ có thể xóa tin nhắn của mình',
      });
    }

    await this.messageModel.findByIdAndDelete(messageId);

    // Update conversation if this was the last message
    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );

    if (
      conversation &&
      conversation.lastMessage &&
      conversation.lastMessage._id === messageId
    ) {
      // Find the new last message
      const newLastMessage = await this.messageModel
        .findOne({ conversationId: message.conversationId })
        .sort({ createdAt: -1 })
        .lean();

      if (newLastMessage) {
        conversation.lastMessage = {
          _id: newLastMessage._id.toString(),
          content: newLastMessage.content || '',
          senderId: newLastMessage.senderId,
          createdAt: newLastMessage.createdAt,
        } as any;
        conversation.lastMessageAt = newLastMessage.createdAt;
      } else {
        conversation.lastMessage = null as any;
        conversation.lastMessageAt = undefined;
      }

      await conversation.save();
    }

    return { message: 'Đã xóa tin nhắn' };
  }

  // Helper method
  private mapToMessageDto(message: any) {
    return {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      sender: {
        id: message.senderId._id.toString(),
        username: message.senderId.username,
        displayName: message.senderId.displayName,
        avatarUrl: message.senderId.avatarUrl,
      },
      content: message.content,
      imgUrl: message.imgUrl,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
