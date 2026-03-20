import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { CheckInQuestionType, CheckInQuestionCategory } from '@prisma/client';

export class CreateCheckInQuestionDto {
  @IsString()
  text: string;

  @IsEnum(CheckInQuestionType)
  type: CheckInQuestionType;

  @IsEnum(CheckInQuestionCategory)
  category: CheckInQuestionCategory;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsInt()
  scaleMin?: number;

  @IsOptional()
  @IsInt()
  scaleMax?: number;

  @IsOptional()
  @IsString()
  scaleMinLabel?: string;

  @IsOptional()
  @IsString()
  scaleMaxLabel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
