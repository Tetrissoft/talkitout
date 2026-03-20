import { Module } from '@nestjs/common';
import { SessionNotesService } from './session-notes.service';
import { SessionNotesController } from './session-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SessionNotesController],
  providers: [SessionNotesService],
  exports: [SessionNotesService],
})
export class SessionNotesModule {}
