import { IsArray, IsEnum, IsHexColor, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
