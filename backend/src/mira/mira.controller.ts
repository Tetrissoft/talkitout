import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  Query,
  UnauthorizedException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MiraService } from './mira.service';
import { MiraSafetyService } from './mira-safety.service';
import { MiraMessageDto } from './dto/mira-message.dto';

@ApiTags('Mira AI Companion')
@Controller('mira')
export class MiraController {
  constructor(
    private readonly miraService: MiraService,
    private readonly safetyService: MiraSafetyService,
  ) {}

  private validateApiKey(apiKey: string | undefined) {
    const expectedKey =
      process.env.TELEGRAM_API_KEY || 'talkitout-telegram-secret';
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * Main endpoint for Mira — called by n8n/Telegram webhook.
   * Sends a message to Mira and gets a response.
   */
  @Public()
  @Post('message')
  async sendMessage(
    @Body() dto: MiraMessageDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);

    const response = await this.miraService.handleMessage(
      dto.telegramChatId,
      dto.message,
      dto.mode || 'checkin',
    );

    return { success: true, data: response };
  }

  /**
   * Get conversation history for a patient — for therapist/admin dashboard.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'therapist', 'intern')
  @Get('conversations/:customerId')
  async getConversations(@Param('customerId') customerId: string) {
    const conversations =
      await this.miraService.getConversations(customerId);
    return { success: true, data: conversations };
  }

  /**
   * Get a specific conversation with summary.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'therapist', 'intern')
  @Get('conversations/:id/summary')
  async getConversationSummary(@Param('id') id: string) {
    const conversation = await this.miraService.getConversationSummary(id);
    return { success: true, data: conversation };
  }

  /**
   * Get active crisis alerts — for admin/therapist dashboard.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'therapist')
  @Get('crisis-alerts')
  async getCrisisAlerts(@Query('customerId') customerId?: string) {
    const alerts = await this.safetyService.getActiveAlerts(customerId);
    return { success: true, data: alerts };
  }

  /**
   * Resolve a crisis alert.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'therapist')
  @Patch('crisis-alerts/:id/resolve')
  async resolveAlert(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    const alert = await this.safetyService.resolveAlert(id, req.user.sub);
    return { success: true, data: alert };
  }
}
