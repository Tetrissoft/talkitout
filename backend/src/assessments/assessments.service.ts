import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AssessmentsService {
    private readonly logger = new Logger(AssessmentsService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) { }

    async submitAssessment(data: {
        participant: { name: string; email: string; age?: number };
        testType: string;
        answers: Record<string, any>;
    }) {
        this.logger.log(`Processing assessment submission for ${data.participant.email}`);

        // 1. Save or find participant
        const participant = await this.prisma.assessmentParticipant.create({
            data: {
                name: data.participant.name,
                email: data.participant.email,
                age: data.participant.age,
            },
        });

        // 2. Process answers through AI to generate report
        // In actual implementation, we'd ensure valid inputs.
        const AIReport = await this.aiService.generateAssessmentReport(data.testType, data.answers);

        // 3. Save submission and report to DB
        const submission = await this.prisma.assessmentSubmission.create({
            data: {
                participantId: participant.id,
                testType: data.testType,
                answers: data.answers,
                report: AIReport as any, // casting to any to fit Prisma Json type easily
            },
        });

        // 4. Return results to frontend
        return {
            submissionId: submission.id,
            report: AIReport,
            participant: {
                id: participant.id,
                name: participant.name,
            }
        };
    }
}
