import { Controller, Post, Body } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('assessments')
export class AssessmentsController {
    constructor(private readonly assessmentsService: AssessmentsService) { }

    @Public()
    @Post('submit')
    async submitAssessment(
        @Body() submitDto: {
            participant: { name: string; email: string; age?: number };
            testType: string;
            answers: Record<string, any>;
        }
    ) {
        return this.assessmentsService.submitAssessment(submitDto);
    }
}
