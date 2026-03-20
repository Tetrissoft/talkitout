import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CheckinsService } from './checkins.service';
import { TelegramStartDto, TelegramRespondDto } from './dto/telegram-checkin.dto';

@ApiTags('Telegram Check-ins')
@Controller('checkins/telegram')
export class TelegramCheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  private validateApiKey(apiKey: string | undefined) {
    const expectedKey = process.env.TELEGRAM_API_KEY || 'talkitout-telegram-secret';
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  @Public()
  @Post('start')
  telegramStart(
    @Body() dto: TelegramStartDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.checkinsService.telegramStart(dto.telegramChatId);
  }

  @Public()
  @Post('respond')
  telegramRespond(
    @Body() dto: TelegramRespondDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.checkinsService.telegramRespond(
      dto.checkInId,
      dto.questionId,
      dto.telegramChatId,
      {
        answerScale: dto.answerScale,
        answerChoice: dto.answerChoice,
        answerText: dto.answerText,
      },
    );
  }

  @Public()
  @Get('status/:telegramChatId')
  telegramStatus(
    @Param('telegramChatId') telegramChatId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.checkinsService.telegramStatus(telegramChatId);
  }

  @Public()
  @Get('patients')
  getAllPatientsWithTelegram(
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.checkinsService.getAllPatientsWithTelegram();
  }
}
