import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SessionNotesService } from './session-notes.service';
import { CreateSessionNoteDto } from './dto/create-session-note.dto';
import { UpdateSessionNoteDto } from './dto/update-session-note.dto';

@ApiTags('Session Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('session-notes')
export class SessionNotesController {
  constructor(private readonly sessionNotesService: SessionNotesService) {}

  @Post()
  @Roles('admin', 'therapist', 'intern')
  create(@Body() dto: CreateSessionNoteDto, @Request() req) {
    return this.sessionNotesService.create(dto, req.user.id);
  }

  @Get()
  @Roles('admin', 'therapist', 'intern')
  findAll(@Request() req) {
    return this.sessionNotesService.findAll(req.user.id, req.user.role);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'therapist', 'intern')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.sessionNotesService.findByCustomer(customerId);
  }

  @Get(':id')
  @Roles('admin', 'therapist', 'intern')
  findOne(@Param('id') id: string) {
    return this.sessionNotesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'therapist', 'intern')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionNoteDto,
    @Request() req,
  ) {
    return this.sessionNotesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles('admin', 'therapist')
  remove(@Param('id') id: string) {
    return this.sessionNotesService.remove(id);
  }
}
