import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SetupAdminDto } from './dto/setup-admin.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

const ALL_CHECKIN_CATEGORIES = [
  'mood', 'anxiety', 'sleep', 'energy',
  'social', 'stress', 'mindfulness', 'general',
];

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token: this.jwtService.sign(payload),
      },
    };
  }

  async signup(createUserDto: CreateUserDto) {
    // Security: Public signup only allows customer role
    if (createUserDto.role && createUserDto.role !== 'customer') {
      throw new ForbiddenException('Public signup is only available for customer accounts');
    }

    const result = await this.usersService.create({
      ...createUserDto,
      role: 'customer',
    });
    const user = result.data;

    // Auto-create Customer profile with all check-in categories
    await this.prisma.customer.create({
      data: {
        userId: user.id,
        checkinCategories: ALL_CHECKIN_CATEGORIES,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token: this.jwtService.sign(payload),
      },
    };
  }

  async getSetupStatus() {
    const count = await this.usersService.countUsers();
    return {
      success: true,
      data: {
        setupRequired: count === 0,
      },
    };
  }

  async setupAdmin(setupAdminDto: SetupAdminDto) {
    const count = await this.usersService.countUsers();

    if (count > 0) {
      throw new ForbiddenException('Setup has already been completed. An admin account already exists.');
    }

    const result = await this.usersService.create({
      name: setupAdminDto.name,
      email: setupAdminDto.email,
      password: setupAdminDto.password,
      phone: setupAdminDto.phone,
      role: 'admin' as any,
    });
    const user = result.data;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token: this.jwtService.sign(payload),
      },
    };
  }

  async validateToken(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    const { password: _, ...result } = user;
    return result;
  }
}
