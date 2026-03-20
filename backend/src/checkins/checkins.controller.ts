import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CheckinsService } from './checkins.service';
import { CreateCheckInQuestionDto } from './dto/create-checkin-question.dto';
import { UpdateCheckInQuestionDto } from './dto/update-checkin-question.dto';
import { SubmitCheckInResponseDto } from './dto/submit-checkin-response.dto';

@ApiTags('Check-ins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkins')
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  // ─── Question Library ───

  @Get('questions')
  getQuestions(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.checkinsService.getQuestions(category, tag);
  }

  @Get('questions/all')
  @Roles('admin')
  getAllQuestions() {
    return this.checkinsService.getAllQuestions();
  }

  @Post('questions')
  @Roles('admin')
  createQuestion(@Body() dto: CreateCheckInQuestionDto) {
    return this.checkinsService.createQuestion(dto);
  }

  @Patch('questions/:id')
  @Roles('admin')
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateCheckInQuestionDto,
  ) {
    return this.checkinsService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @Roles('admin')
  deleteQuestion(@Param('id') id: string) {
    return this.checkinsService.deleteQuestion(id);
  }

  // ─── Daily Check-ins ───

  @Post()
  @Roles('customer')
  startCheckIn(@Request() req) {
    return this.checkinsService.startCheckIn(req.user.id);
  }

  @Post(':id/responses')
  @Roles('customer')
  submitResponses(
    @Param('id') id: string,
    @Body() dto: SubmitCheckInResponseDto,
    @Request() req,
  ) {
    return this.checkinsService.submitResponses(id, dto, req.user.id);
  }

  @Get('my')
  @Roles('customer')
  getMyCheckIns(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.checkinsService.getMyCheckIns(req.user.id, dateFrom, dateTo);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'therapist', 'intern')
  getCustomerCheckIns(
    @Param('customerId') customerId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.checkinsService.getCustomerCheckIns(customerId, dateFrom, dateTo);
  }

  @Get('customer/:customerId/summary')
  @Roles('admin', 'therapist', 'intern')
  getCustomerSummary(
    @Param('customerId') customerId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.checkinsService.getCustomerSummary(customerId, dateFrom, dateTo);
  }

  @Get(':id')
  getCheckIn(@Param('id') id: string) {
    return this.checkinsService.getCheckIn(id);
  }
}
