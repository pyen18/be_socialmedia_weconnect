import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserDocument } from '../../schemas/user.schema';
import { Session, SessionDocument } from '../../schemas/session.schema';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ================= SIGN UP =================
  async signUp(signUpDto: SignUpDto) {
    const { username, password, email, firstName, lastName } = signUpDto;

    const duplicate = await this.userModel.findOne({ username });
    if (duplicate) {
      throw new ConflictException('username đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`,
    });

    await newUser.save();

    return {
      message: 'Tạo tài khoản thành công',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
      },
    };
  }

  // ================= SIGN IN =================
  async signIn(signInDto: SignInDto) {
    const { username, password } = signInDto;

    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new UnauthorizedException('username hoặc password không chính xác');
    }

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      throw new UnauthorizedException('username hoặc password không chính xác');
    }
    const jwtOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'ACCESS_TOKEN_TTL',
      ) as any,
    };
    // Access Token
    const accessToken = this.jwtService.sign(
      { userId: user._id.toString() },
      jwtOptions,
    );

    // Refresh Token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTtl = Number(
      this.configService.getOrThrow('REFRESH_TOKEN_TTL'),
    );

    if (Number.isNaN(refreshTtl)) {
      throw new Error('REFRESH_TOKEN_TTL must be a number');
    }

    await this.sessionModel.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshTtl),
    });

    return {
      message: `User ${user.displayName} đã đăng nhập`,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      },
    };
  }

  // ================= SIGN OUT =================
  async signOut(refreshToken: string) {
    if (refreshToken) {
      await this.sessionModel.deleteOne({ refreshToken });
    }

    return { message: 'Đăng xuất thành công' };
  }

  // ================= REFRESH TOKEN =================
  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy refresh token');
    }

    const session = await this.sessionModel.findOne({ refreshToken });
    if (!session) {
      throw new ForbiddenException('Refresh token không hợp lệ');
    }

    if (session.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token đã hết hạn');
    }

    const jwtOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow('ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow('ACCESS_TOKEN_TTL'),
    };

    const accessToken = this.jwtService.sign(
      { userId: session.userId.toString() },
      jwtOptions,
    );

    return { accessToken };
  }
}
