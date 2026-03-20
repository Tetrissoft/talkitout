import { Module } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { CheckinsController } from './checkins.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
