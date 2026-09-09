import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^62\d{9,13}$/, {
    message: 'phone harus format internasional tanpa + (contoh: 6281234567890)',
  })
  phone!: string;

  @IsString()
  name?: string;
}
