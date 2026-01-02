import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Friend, FriendDocument } from '../../schemas/friend.schema';
import {
  FriendRequest,
  FriendRequestDocument,
} from '../../schemas/friend-request.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { GetFriendsQueryDto } from './dto/get-friends-query.dto';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friend.name) private friendModel: Model<FriendDocument>,
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async sendFriendRequest(fromUserId: string, dto: SendFriendRequestDto) {
    const { to, message } = dto;

    // Validate: không gửi cho chính mình
    if (fromUserId === to) {
      throw new BadRequestException({
        code: 'CANNOT_FRIEND_YOURSELF',
        message: 'Không thể gửi lời mời kết bạn cho chính mình',
      });
    }

    // Check user tồn tại
    const userExist = await this.userModel.exists({ _id: to });
    if (!userExist) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    // Chuẩn hóa userA < userB
    let userA = fromUserId;
    let userB = to;
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    // Check đã là bạn bè chưa
    const alreadyFriends = await this.friendModel.findOne({ userA, userB });
    if (alreadyFriends) {
      throw new ConflictException({
        code: 'ALREADY_FRIENDS',
        message: 'Đã là bạn bè',
      });
    }

    // Check người kia đã gửi request cho mình chưa
    const reverseRequest = await this.friendRequestModel.findOne({
      from: to,
      to: fromUserId,
    });
    if (reverseRequest) {
      throw new ConflictException({
        code: 'REVERSE_REQUEST_EXISTS',
        message:
          'Người này đã gửi lời mời cho bạn, hãy chấp nhận thay vì gửi lại',
      });
    }

    // Tạo friend request - Let MongoDB handle duplicate key error
    try {
      const newRequest = await this.friendRequestModel.create({
        from: fromUserId,
        to,
        message: message || '',
      });

      return {
        message: 'Đã gửi lời mời kết bạn',
        request: {
          id: newRequest._id.toString(),
          from: newRequest.from.toString(),
          to: newRequest.to.toString(),
          message: newRequest.message,
          createdAt: (newRequest as any).createdAt,
        },
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException({
          code: 'REQUEST_ALREADY_SENT',
          message: 'Đã gửi lời mời kết bạn trước đó',
        });
      }
      throw error;
    }
  }
  async acceptFriendRequest(userId: string, requestId: string) {
    // 1. Tìm request
    const request = await this.friendRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Không tìm thấy lời mời kết bạn',
      });
    }

    // 2. Check quyền
    if (request.to.toString() !== userId) {
      throw new BadRequestException({
        code: 'FORBIDDEN_ACCEPT',
        message: 'Không có quyền chấp nhận lời mời này',
      });
    }

    // 3. Tạo friendship
    try {
      await this.friendModel.create({
        userA: request.from,
        userB: request.to,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException({
          code: 'ALREADY_FRIENDS',
          message: 'Hai người đã là bạn bè',
        });
      }
      throw error;
    }

    // 4. Xóa request
    await this.friendRequestModel.findByIdAndDelete(requestId);

    return {
      message: 'Đã chấp nhận lời mời kết bạn',
    };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Không tìm thấy lời mời kết bạn',
      });
    }

    if (request.to.toString() !== userId) {
      throw new BadRequestException({
        code: 'FORBIDDEN_DECLINE',
        message: 'Không có quyền từ chối lời mời này',
      });
    }

    await this.friendRequestModel.findByIdAndDelete(requestId);

    return {
      message: 'Đã từ chối lời mời kết bạn',
    };
  }

  async getAllFriends(userId: string, query: GetFriendsQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Query với pagination
    const [friends, total] = await Promise.all([
      this.friendModel
        .find({
          $or: [{ userA: userId }, { userB: userId }],
        })
        .populate('userA', 'username displayName avatarUrl')
        .populate('userB', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.friendModel.countDocuments({
        $or: [{ userA: userId }, { userB: userId }],
      }),
    ]);

    // Map to response format
    const friendList = friends.map((friend: any) => {
      const friendUser =
        friend.userA._id.toString() === userId ? friend.userB : friend.userA;
      return {
        id: friendUser._id.toString(),
        username: friendUser.username,
        displayName: friendUser.displayName,
        avatarUrl: friendUser.avatarUrl,
      };
    });

    return {
      friends: friendList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFriendRequests(userId: string) {
    const [requests, total] = await Promise.all([
      this.friendRequestModel
        .find({ to: userId })
        .populate('from', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .lean(),
      this.friendRequestModel.countDocuments({ to: userId }),
    ]);

    const requestList = requests.map((req: any) => ({
      id: req._id.toString(),
      from: {
        id: req.from._id.toString(),
        username: req.from.username,
        displayName: req.from.displayName,
        avatarUrl: req.from.avatarUrl,
      },
      message: req.message,
      createdAt: req.createdAt,
    }));

    return {
      requests: requestList,
      total,
    };
  }
}
