import { IsString, IsOptional, IsIn } from 'class-validator';

export class MiraMessageDto {
  @IsString()
  telegramChatId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsIn(['checkin', 'free_chat'])
  mode?: 'checkin' | 'free_chat';
}
