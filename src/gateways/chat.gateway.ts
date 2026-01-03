import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../modules/messages/messages.service';
import { ConversationsService } from '../modules/conversations/conversation.service';

// Simple map để track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketToUser = new Map<string, string>(); // socketId -> userId
const typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds

@WebSocketGateway({
  cors: {
    origin: '*', // Trong production nên cấu hình cụ thể
    credentials: true,
  },
  namespace: '/chat',
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
  ) {}

  // ==================== CONNECTION MANAGEMENT ====================

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const userId = payload.userId;

      // Store mapping
      socketToUser.set(client.id, userId);

      let userSockets = onlineUsers.get(userId);

      if (!userSockets) {
        userSockets = new Set<string>();
        onlineUsers.set(userId, userSockets);
      }

      userSockets.add(client.id);

      // Join personal room for targeted messages
      client.join(`user:${userId}`);

      // Notify others that user is online
      this.server.emit('user:online', { userId });

      console.log(`✅ User ${userId} connected (socket: ${client.id})`);
      console.log(`📊 Online users: ${onlineUsers.size}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = socketToUser.get(client.id);

    if (userId) {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);

        // If user has no more active connections, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          this.server.emit('user:offline', { userId });
          console.log(`❌ User ${userId} went offline`);
        }
      }

      socketToUser.delete(client.id);
    }

    console.log(`📊 Online users: ${onlineUsers.size}`);
  }

  // ==================== MESSAGING ====================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; content?: string; imgUrl?: string },
  ) {
    try {
      const userId = socketToUser.get(client.id);
      if (!userId) return;

      // Send message via service
      const message = await this.messagesService.sendMessage(userId, {
        conversationId: data.conversationId,
        content: data.content,
        imgUrl: data.imgUrl,
      });

      // Get conversation to know all participants
      const conversation = await this.conversationsService.getConversationById(
        data.conversationId,
        userId,
      );

      // Emit to all participants in the conversation
      conversation.participants.forEach((participant) => {
        this.server
          .to(`user:${participant.userId}`)
          .emit('message:new', message);
      });

      // Clear typing indicator
      this.handleStopTyping(client, { conversationId: data.conversationId });

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      const userId = socketToUser.get(client.id);
      if (!userId) return;

      await this.messagesService.deleteMessage(data.messageId, userId);

      // Get conversation participants
      const conversation = await this.conversationsService.getConversationById(
        data.conversationId,
        userId,
      );

      // Notify all participants
      conversation.participants.forEach((participant) => {
        this.server.to(`user:${participant.userId}`).emit('message:deleted', {
          messageId: data.messageId,
          conversationId: data.conversationId,
        });
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== TYPING INDICATORS ====================

  @SubscribeMessage('typing:start')
  async handleStartTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socketToUser.get(client.id);
    if (!userId) return;

    const { conversationId } = data;

    // Add user to typing set
    let typingSet = typingUsers.get(conversationId);

    if (!typingSet) {
      typingSet = new Set<string>();
      typingUsers.set(conversationId, typingSet);
    }

    typingSet.add(userId);
    // Get conversation participants
    const conversation = await this.conversationsService.getConversationById(
      conversationId,
      userId,
    );

    // Notify other participants (not sender)
    conversation.participants.forEach((participant) => {
      if (participant.userId !== userId) {
        this.server.to(`user:${participant.userId}`).emit('typing:start', {
          conversationId,
          userId,
          username: conversation.participants.find((p) => p.userId === userId)
            ?.username,
        });
      }
    });
  }

  @SubscribeMessage('typing:stop')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socketToUser.get(client.id);
    if (!userId) return;

    const { conversationId } = data;

    // Remove user from typing set
    const typingSet = typingUsers.get(conversationId);
    if (typingSet) {
      typingSet.delete(userId);
      if (typingSet.size === 0) {
        typingUsers.delete(conversationId);
      }
    }

    // Get conversation participants
    try {
      const conversation = await this.conversationsService.getConversationById(
        conversationId,
        userId,
      );

      // Notify other participants
      conversation.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          this.server.to(`user:${participant.userId}`).emit('typing:stop', {
            conversationId,
            userId,
          });
        }
      });
    } catch (error) {
      // Conversation not found or error
    }
  }

  // ==================== READ RECEIPTS ====================

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = socketToUser.get(client.id);
      if (!userId) return;

      await this.conversationsService.markAsRead(data.conversationId, userId);

      // Get conversation participants
      const conversation = await this.conversationsService.getConversationById(
        data.conversationId,
        userId,
      );

      // Notify other participants that this user read the messages
      conversation.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          this.server.to(`user:${participant.userId}`).emit('message:read', {
            conversationId: data.conversationId,
            userId,
            readAt: new Date(),
          });
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== ONLINE STATUS ====================

  @SubscribeMessage('users:online')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(onlineUsers.keys());
    return { onlineUsers: onlineUserIds };
  }

  @SubscribeMessage('user:status')
  handleCheckUserStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const isOnline = onlineUsers.has(data.userId);
    return { userId: data.userId, isOnline };
  }

  // ==================== HELPER METHODS ====================

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Get online status of user
  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(onlineUsers.keys());
  }
}
