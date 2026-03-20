import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckInAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsInt()
  answerScale?: number;

  @IsOptional()
  @IsString()
  answerChoice?: string;
}

export class SubmitCheckInResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckInAnswerDto)
  answers: CheckInAnswerDto[];
}
