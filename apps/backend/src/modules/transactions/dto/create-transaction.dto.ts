import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsDateString } from 'class-validator';
import { TransactionType, PaymentMethod, TransactionSource } from '@prisma/client';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;

  @IsOptional()
  @IsString()
  rawMessage?: string;
}
