// src/modules/friends/friends.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friend, FriendDocument } from '../../schemas/friend.schema';
import {
  FriendRequest,
  FriendRequestDocument,
} from '../../schemas/friend-request.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friend.name) private friendModel: Model<FriendDocument>,
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async sendFriendRequest(fromUserId: string, dto: SendFriendRequestDto) {
    const { to, message } = dto;

    if (fromUserId === to) {
      throw new BadRequestException(
        'Không thể gửi lời mời kết bạn cho chính mình',
      );
    }

    const userExist = await this.userModel.exists({ _id: to });
    if (!userExist) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    let userA = fromUserId;
    let userB = to;

    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    // Kiểm tra đã là bạn bè chưa
    const alreadyFriends = await this.friendModel.findOne({ userA, userB });
    if (alreadyFriends) {
      throw new ConflictException('Đã là bạn bè');
    }

    // Kiểm tra đã gửi request chưa
    const existingRequest = await this.friendRequestModel.findOne({
      from: fromUserId,
      to,
    });

    if (existingRequest) {
      throw new ConflictException('Đã gửi lời mời kết bạn trước đó');
    }

    // Tạo friend request mới
    const newRequest = await this.friendRequestModel.create({
      from: fromUserId,
      to,
      message,
    });

    return {
      message: 'Đã gửi lời mời kết bạn',
      request: newRequest,
    };
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.to.toString() !== userId) {
      throw new BadRequestException('Không có quyền chấp nhận lời mời này');
    }

    // Tạo friendship
    await this.friendModel.create({
      userA: request.from,
      userB: request.to,
    });

    // Xóa request
    await this.friendRequestModel.findByIdAndDelete(requestId);

    return { message: 'Đã chấp nhận lời mời kết bạn' };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.to.toString() !== userId) {
      throw new BadRequestException('Không có quyền từ chối lời mời này');
    }

    await this.friendRequestModel.findByIdAndDelete(requestId);

    return { message: 'Đã từ chối lời mời kết bạn' };
  }

  async getAllFriends(userId: string) {
    const friends = await this.friendModel
      .find({
        $or: [{ userA: userId }, { userB: userId }],
      })
      .populate('userA', '-hashedPassword')
      .populate('userB', '-hashedPassword');

    const friendList = friends.map((friend) => {
      const friendUser =
        friend.userA._id.toString() === userId ? friend.userB : friend.userA;
      return friendUser;
    });

    return { friends: friendList };
  }

  async getFriendRequests(userId: string) {
    const requests = await this.friendRequestModel
      .find({ to: userId })
      .populate('from', '-hashedPassword')
      .sort({ createdAt: -1 });

    return { requests };
  }
}
