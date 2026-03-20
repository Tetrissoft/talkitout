import { IsString, IsOptional, IsNumber } from 'class-validator';

export class TelegramStartDto {
  @IsString()
  telegramChatId: string;
}

export class TelegramRespondDto {
  @IsString()
  checkInId: string;

  @IsString()
  questionId: string;

  @IsString()
  telegramChatId: string;

  @IsOptional()
  @IsNumber()
  answerScale?: number;

  @IsOptional()
  @IsString()
  answerChoice?: string;

  @IsOptional()
  @IsString()
  answerText?: string;
}
