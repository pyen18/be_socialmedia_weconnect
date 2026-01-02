import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Friend, FriendDocument } from '../../schemas/friend.schema';
import {
  FriendRequest,
  FriendRequestDocument,
} from '../../schemas/friend-request.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { ResetPhotoDto } from './dto/reset-photo.dto';
import {
  UserProfileDto,
  UserPublicProfileDto,
  UserBasicDto,
} from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Friend.name) private friendModel: Model<FriendDocument>,
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
  ) {}

  // Get current user info (own profile)
  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.userModel
      .findById(userId)
      .select('-hashedPassword')
      .lean();

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      phone: user.phone,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Get user by ID (public profile)
  async getUserById(
    targetUserId: string,
    currentUserId: string,
  ): Promise<UserPublicProfileDto> {
    const user = await this.userModel
      .findById(targetUserId)
      .select('-hashedPassword -email -phone')
      .lean();

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    // Check friendship status
    let userA = currentUserId;
    let userB = targetUserId;
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    const [isFriend, sentRequest, receivedRequest] = await Promise.all([
      this.friendModel.exists({ userA, userB }),
      this.friendRequestModel.exists({ from: currentUserId, to: targetUserId }),
      this.friendRequestModel.exists({ from: targetUserId, to: currentUserId }),
    ]);

    return {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      isFriend: !!isFriend,
      friendRequestSent: !!sentRequest,
      friendRequestReceived: !!receivedRequest,
    };
  }

  // Update profile
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    // Update fields if provided
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.website !== undefined) user.website = dto.website;

    await user.save();

    return {
      message: 'Cập nhật profile thành công',
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
      },
    };
  }

  // Upload photo (avatar or cover)
  async uploadPhoto(userId: string, dto: UploadPhotoDto) {
    const { photoUrl, type, photoId } = dto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    if (type === 'avatar') {
      user.avatarUrl = photoUrl;
      if (photoId) user.avatarId = photoId;
    } else if (type === 'cover') {
      user.coverImageUrl = photoUrl;
      if (photoId) user.coverImageId = photoId;
    }

    await user.save();

    return {
      message: `Upload ${type} thành công`,
      user: {
        id: user._id.toString(),
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
      },
    };
  }

  // Reset photo to default
  async resetPhoto(userId: string, dto: ResetPhotoDto) {
    const { type } = dto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Người dùng không tồn tại',
      });
    }

    if (type === 'avatar') {
      user.avatarUrl = undefined;
      user.avatarId = undefined;
    } else if (type === 'cover') {
      user.coverImageUrl = undefined;
      user.coverImageId = undefined;
    }

    await user.save();

    return {
      message: `Reset ${type} thành công`,
      user: {
        id: user._id.toString(),
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
      },
    };
  }

  // Get friends of a user
  async getUserFriends(userId: string, currentUserId: string) {
    // Normalize để query
    let userA = userId;
    let userB = userId;

    const friends = await this.friendModel
      .find({
        $or: [{ userA: userId }, { userB: userId }],
      })
      .populate('userA', 'username displayName avatarUrl')
      .populate('userB', 'username displayName avatarUrl')
      .lean();

    const friendList: UserBasicDto[] = friends.map((friend: any) => {
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
      total: friendList.length,
    };
  }
}
