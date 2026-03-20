import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MiraService } from './mira.service';
import { MiraController } from './mira.controller';
import { MiraMemoryService } from './mira-memory.service';
import { MiraPromptService } from './mira-prompt.service';
import { MiraSafetyService } from './mira-safety.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MiraController],
  providers: [
    MiraService,
    MiraMemoryService,
    MiraPromptService,
    MiraSafetyService,
  ],
  exports: [MiraService],
})
export class MiraModule {}
