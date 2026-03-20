import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [AssessmentsController],
    providers: [AssessmentsService],
})
export class AssessmentsModule { }
