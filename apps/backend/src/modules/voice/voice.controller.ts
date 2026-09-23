import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceParseDto } from './dto/voice-parse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Post('parse')
  parse(@Body() dto: VoiceParseDto) {
    return this.voice.parse(dto.text);
  }
}
