import { Controller, Post, Get, Body, UseGuards, Logger, Optional } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    @Optional() private readonly wa?: WhatsappService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('request-otp')
  async requestOtp(@Body() dto: RequestOtpDto) {
    const { expiresInSec, devCode } = this.auth.requestOtp(dto.phone);
    // Kirim via WA bila socket terhubung; di dev/test kembalikan code langsung.
    if (devCode && this.wa?.isConnected()) {
      try {
        await this.wa.sendMessage(`${dto.phone}@s.whatsapp.net`, `🔐 Kode login FinChat: *${devCode}*\nBerlaku ${Math.floor(expiresInSec / 60)} menit. Jangan bagikan ke siapapun.`);
      } catch (e) {
        this.logger.warn(`Gagal kirim OTP via WA ke ${dto.phone}: ${(e as Error).message}`);
      }
    }
    return process.env.NODE_ENV === 'production'
      ? { message: 'Kode OTP dikirim via WhatsApp', expiresInSec }
      : { message: 'Kode OTP dibuat', expiresInSec, devCode };
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
