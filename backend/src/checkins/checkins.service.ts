import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckInQuestionDto } from './dto/create-checkin-question.dto';
import { UpdateCheckInQuestionDto } from './dto/update-checkin-question.dto';
import { SubmitCheckInResponseDto } from './dto/submit-checkin-response.dto';
import { CheckInQuestionCategory } from '@prisma/client';

@Injectable()
export class CheckinsService {
  constructor(private prisma: PrismaService) {}

  // ─── Question Library ───

  async getQuestions(category?: string, tag?: string) {
    const where: any = { isActive: true };

    if (category) {
      where.category = category as CheckInQuestionCategory;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    return this.prisma.checkInQuestion.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getAllQuestions() {
    return this.prisma.checkInQuestion.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createQuestion(dto: CreateCheckInQuestionDto) {
    return this.prisma.checkInQuestion.create({
      data: {
        text: dto.text,
        type: dto.type,
        category: dto.category,
        tags: dto.tags,
        options: dto.options ?? undefined,
        scaleMin: dto.scaleMin,
        scaleMax: dto.scaleMax,
        scaleMinLabel: dto.scaleMinLabel,
        scaleMaxLabel: dto.scaleMaxLabel,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateQuestion(id: string, dto: UpdateCheckInQuestionDto) {
    const question = await this.prisma.checkInQuestion.findUnique({
      where: { id },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.checkInQuestion.update({
      where: { id },
      data: dto,
    });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.checkInQuestion.findUnique({
      where: { id },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.checkInQuestion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Daily Check-ins ───

  async startCheckIn(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      throw new BadRequestException('Customer profile not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyCheckIn.findUnique({
      where: {
        customerId_date: {
          customerId: customer.id,
          date: today,
        },
      },
      include: {
        responses: { include: { question: true } },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.dailyCheckIn.create({
      data: {
        customerId: customer.id,
        date: today,
      },
      include: {
        responses: { include: { question: true } },
      },
    });
  }

  async submitResponses(checkInId: string, dto: SubmitCheckInResponseDto, userId: string) {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id: checkInId },
      include: { customer: true },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer || checkIn.customerId !== customer.id) {
      throw new BadRequestException('This check-in does not belong to you');
    }

    if (checkIn.completedAt) {
      throw new BadRequestException('This check-in has already been completed');
    }

    // Validate all questions exist and are active
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.checkInQuestion.findMany({
      where: { id: { in: questionIds }, isActive: true },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('Some questions are invalid or inactive');
    }

    // Create responses and mark as completed
    await this.prisma.$transaction(async (tx) => {
      for (const answer of dto.answers) {
        await tx.checkInResponse.upsert({
          where: {
            checkInId_questionId: {
              checkInId,
              questionId: answer.questionId,
            },
          },
          create: {
            checkInId,
            questionId: answer.questionId,
            answerText: answer.answerText,
            answerScale: answer.answerScale,
            answerChoice: answer.answerChoice,
          },
          update: {
            answerText: answer.answerText,
            answerScale: answer.answerScale,
            answerChoice: answer.answerChoice,
          },
        });
      }

      await tx.dailyCheckIn.update({
        where: { id: checkInId },
        data: { completedAt: new Date() },
      });
    });

    return this.prisma.dailyCheckIn.findUnique({
      where: { id: checkInId },
      include: {
        responses: { include: { question: true } },
      },
    });
  }

  async getMyCheckIns(userId: string, dateFrom?: string, dateTo?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      throw new BadRequestException('Customer profile not found');
    }

    return this.getCustomerCheckIns(customer.id, dateFrom, dateTo);
  }

  async getCustomerCheckIns(customerId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { customerId };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    return this.prisma.dailyCheckIn.findMany({
      where,
      include: {
        responses: {
          include: { question: true },
          orderBy: { question: { sortOrder: 'asc' } },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getCheckIn(id: string) {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id },
      include: {
        responses: {
          include: { question: true },
          orderBy: { question: { sortOrder: 'asc' } },
        },
        customer: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }

    return checkIn;
  }

  async getCustomerSummary(customerId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { customerId };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const checkIns = await this.prisma.dailyCheckIn.findMany({
      where: { ...where, completedAt: { not: null } },
      include: {
        responses: {
          where: { answerScale: { not: null } },
          include: { question: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate scale responses by category
    const categoryAverages: Record<string, { date: string; average: number }[]> = {};

    for (const checkIn of checkIns) {
      const categoryScores: Record<string, number[]> = {};

      for (const response of checkIn.responses) {
        if (response.answerScale !== null) {
          const cat = response.question.category;
          if (!categoryScores[cat]) categoryScores[cat] = [];
          categoryScores[cat].push(response.answerScale);
        }
      }

      for (const [cat, scores] of Object.entries(categoryScores)) {
        if (!categoryAverages[cat]) categoryAverages[cat] = [];
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        categoryAverages[cat].push({
          date: checkIn.date.toISOString().split('T')[0],
          average: Math.round(avg * 10) / 10,
        });
      }
    }

    return {
      customerId,
      totalCheckIns: checkIns.length,
      categoryTrends: categoryAverages,
    };
  }
}
