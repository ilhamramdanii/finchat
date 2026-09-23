import { IsArray, IsEnum, IsHexColor, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

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

export class BulkUpdateKeywordsDto {
  @IsArray()
  updates!: {
    id: string;
    keywords: string[];
  }[];
}
