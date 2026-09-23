import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
  ) {}

  /** Legacy login tanpa verifikasi — dipertahankan untuk kompatibilitas, prefer OTP flow. */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {},
      create: { phone: dto.phone, name: dto.name },
    });

    const payload: JwtPayload = { sub: user.id, phone: user.phone };
    const token = this.jwt.sign(payload);

    return { token, user };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  requestOtp(phone: string) {
    return this.otp.request(phone);
  }

  async verifyOtp(phone: string, code: string, name?: string) {
    if (!this.otp.verify(phone, code)) {
      throw new UnauthorizedException('Kode OTP salah atau kedaluwarsa');
    }
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: name ? { name } : {},
      create: { phone, name },
    });
    const payload: JwtPayload = { sub: user.id, phone: user.phone };
    return { token: this.jwt.sign(payload), user };
  }
}
