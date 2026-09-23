import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoiceParseDto {
  @IsString()
  @IsNotEmpty({ message: 'Teks hasil suara tidak boleh kosong' })
  @MaxLength(500, { message: 'Teks suara maksimal 500 karakter' })
  text!: string;
}
