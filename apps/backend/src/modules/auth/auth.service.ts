import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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
}
