import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^62\d{9,13}$/, {
    message: 'phone harus format internasional tanpa + (contoh: 6281234567890)',
  })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'code harus 6 digit' })
  code!: string;

  @IsString()
  name?: string;
}
