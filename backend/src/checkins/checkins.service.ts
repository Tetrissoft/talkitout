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

  // ─── Fill Check-in on Behalf of Patient ───

  async startCheckInForPatient(customerId: string, filledByUserId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Patient not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyCheckIn.findUnique({
      where: {
        customerId_date: {
          customerId,
          date: today,
        },
      },
      include: {
        responses: { include: { question: true } },
        filledBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (existing) {
      // Return existing check-in with questions to answer
      const questions = await this.getQuestionsForPatient(customerId);
      return { success: true, data: { checkIn: existing, questions } };
    }

    const checkIn = await this.prisma.dailyCheckIn.create({
      data: {
        customerId,
        date: today,
        filledById: filledByUserId,
      },
      include: {
        responses: { include: { question: true } },
        filledBy: { select: { id: true, name: true, role: true } },
      },
    });

    const questions = await this.getQuestionsForPatient(customerId);
    return { success: true, data: { checkIn, questions } };
  }

  async submitResponsesForPatient(
    checkInId: string,
    customerId: string,
    dto: SubmitCheckInResponseDto,
    filledByUserId: string,
  ) {
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }

    if (checkIn.customerId !== customerId) {
      throw new BadRequestException('Check-in does not belong to this patient');
    }

    if (checkIn.completedAt) {
      throw new BadRequestException('This check-in has already been completed');
    }

    // Validate questions
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.checkInQuestion.findMany({
      where: { id: { in: questionIds }, isActive: true },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('Some questions are invalid or inactive');
    }

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
        data: {
          completedAt: new Date(),
          filledById: filledByUserId,
        },
      });
    });

    const result = await this.prisma.dailyCheckIn.findUnique({
      where: { id: checkInId },
      include: {
        responses: { include: { question: true } },
        filledBy: { select: { id: true, name: true, role: true } },
      },
    });

    return { success: true, data: result };
  }

  private async getQuestionsForPatient(customerId: string) {
    // Get patient's assigned categories
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    const categories = (customer?.checkinCategories as string[]) || [];

    const where: any = { isActive: true };
    if (categories.length > 0) {
      where.category = { in: categories };
    }

    // Get all matching questions and randomly pick 5
    const allQuestions = await this.prisma.checkInQuestion.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Shuffle and take up to 5
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
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
        filledBy: { select: { id: true, name: true, role: true } },
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
        filledBy: { select: { id: true, name: true, role: true } },
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

  // ─── Telegram Check-in Flow ───

  private readonly acknowledgments: Record<string, string[]> = {
    mood: ['Thanks for sharing how you feel! 💛', 'Got it, appreciate you being open! 💙'],
    anxiety: ['Thanks for letting me know 🙏', 'Noted, thanks for being honest about that 💛'],
    sleep: ['Sleep matters so much — thanks for tracking it! 🌙', 'Got it! 😴'],
    energy: ['Thanks for sharing your energy level! ⚡', 'Noted! 💪'],
    social: ['Social connections matter — thanks for sharing! 💛', 'Got it, thanks! 🤝'],
    stress: ['Thanks for being open about your stress 🙏', 'Noted, take care of yourself 💛'],
    mindfulness: ['Love that you are thinking about mindfulness! 🧘', 'Great awareness! ✨'],
    general: ['Thanks for sharing! 💛', 'Got it! 😊'],
  };

  private getAcknowledgment(category: string): string {
    const msgs = this.acknowledgments[category] || this.acknowledgments.general;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  private getGreeting(name: string): string {
    const greetings = [
      `Hey ${name}, how are you doing today? Let's do a quick check-in 😊`,
      `Hi ${name}! Time for your daily check-in 💙`,
      `Hey ${name}! Ready for a quick check-in? It only takes a minute 😊`,
      `Hi ${name}, let's see how you are doing today 🌟`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private getCompletionMessage(name: string): string {
    const messages = [
      `All done! Thanks for checking in today, ${name}. Take care 💙`,
      `That's it for today! Thanks for sharing, ${name} 🌟`,
      `Check-in complete! Have a wonderful rest of your day, ${name} 💛`,
      `Done! Remember, ${name}, every check-in helps your journey. Take care 💙`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  async telegramStart(telegramChatId: string) {
    // Find customer by telegram chat ID
    const customer = await this.prisma.customer.findUnique({
      where: { telegramChatId },
      include: { user: { select: { name: true } } },
    });

    if (!customer) {
      throw new NotFoundException('No patient found with this Telegram Chat ID');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing check-in today
    let checkIn = await this.prisma.dailyCheckIn.findUnique({
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

    let selectedQuestionIds: string[];

    if (checkIn) {
      // Resume existing check-in
      if (checkIn.completedAt) {
        return {
          success: true,
          data: {
            checkInId: checkIn.id,
            completed: true,
            greeting: `Hey ${customer.user.name}, you have already completed your check-in for today! 😊`,
            question: null,
            questionNumber: null,
            totalQuestions: 0,
          },
        };
      }

      // Get stored selected questions
      selectedQuestionIds = (checkIn.selectedQuestions as string[]) || [];

      if (selectedQuestionIds.length === 0) {
        // Legacy check-in without stored questions — select new ones
        const questions = await this.getQuestionsForPatient(customer.id);
        selectedQuestionIds = questions.map((q) => q.id);
        await this.prisma.dailyCheckIn.update({
          where: { id: checkIn.id },
          data: { selectedQuestions: selectedQuestionIds },
        });
      }
    } else {
      // Create new check-in
      const questions = await this.getQuestionsForPatient(customer.id);
      selectedQuestionIds = questions.map((q) => q.id);

      checkIn = await this.prisma.dailyCheckIn.create({
        data: {
          customerId: customer.id,
          date: today,
          source: 'telegram',
          selectedQuestions: selectedQuestionIds,
        },
        include: {
          responses: { include: { question: true } },
        },
      });
    }

    // Find the first unanswered question
    const answeredQuestionIds = checkIn.responses.map((r) => r.questionId);
    const unansweredIds = selectedQuestionIds.filter(
      (id) => !answeredQuestionIds.includes(id),
    );

    if (unansweredIds.length === 0) {
      // All answered but not marked complete — mark it now
      await this.prisma.dailyCheckIn.update({
        where: { id: checkIn.id },
        data: { completedAt: new Date() },
      });

      return {
        success: true,
        data: {
          checkInId: checkIn.id,
          completed: true,
          greeting: this.getCompletionMessage(customer.user.name),
          question: null,
          questionNumber: selectedQuestionIds.length,
          totalQuestions: selectedQuestionIds.length,
        },
      };
    }

    // Get the next question
    const nextQuestion = await this.prisma.checkInQuestion.findUnique({
      where: { id: unansweredIds[0] },
    });

    const questionNumber = answeredQuestionIds.length + 1;
    const isResuming = answeredQuestionIds.length > 0;

    return {
      success: true,
      data: {
        checkInId: checkIn.id,
        completed: false,
        greeting: isResuming
          ? `Welcome back, ${customer.user.name}! Let's continue where you left off 😊`
          : this.getGreeting(customer.user.name),
        question: nextQuestion
          ? {
              id: nextQuestion.id,
              text: nextQuestion.text,
              type: nextQuestion.type,
              category: nextQuestion.category,
              options: nextQuestion.options,
              scaleMin: nextQuestion.scaleMin,
              scaleMax: nextQuestion.scaleMax,
              scaleMinLabel: nextQuestion.scaleMinLabel,
              scaleMaxLabel: nextQuestion.scaleMaxLabel,
            }
          : null,
        questionNumber,
        totalQuestions: selectedQuestionIds.length,
      },
    };
  }

  async telegramRespond(
    checkInId: string,
    questionId: string,
    telegramChatId: string,
    answer: { answerScale?: number; answerChoice?: string; answerText?: string },
  ) {
    // Verify customer owns this check-in
    const customer = await this.prisma.customer.findUnique({
      where: { telegramChatId },
      include: { user: { select: { name: true } } },
    });

    if (!customer) {
      throw new NotFoundException('No patient found with this Telegram Chat ID');
    }

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { id: checkInId },
      include: { responses: true },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }

    if (checkIn.customerId !== customer.id) {
      throw new BadRequestException('This check-in does not belong to you');
    }

    if (checkIn.completedAt) {
      throw new BadRequestException('This check-in is already completed');
    }

    // Get the question for acknowledgment category
    const question = await this.prisma.checkInQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Upsert the response
    await this.prisma.checkInResponse.upsert({
      where: {
        checkInId_questionId: {
          checkInId,
          questionId,
        },
      },
      create: {
        checkInId,
        questionId,
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

    // Find next unanswered question
    const selectedQuestionIds = (checkIn.selectedQuestions as string[]) || [];
    const updatedResponses = await this.prisma.checkInResponse.findMany({
      where: { checkInId },
    });
    const answeredQuestionIds = updatedResponses.map((r) => r.questionId);
    const unansweredIds = selectedQuestionIds.filter(
      (id) => !answeredQuestionIds.includes(id),
    );

    const acknowledgment = this.getAcknowledgment(question.category);

    if (unansweredIds.length === 0) {
      // All questions answered — mark complete
      await this.prisma.dailyCheckIn.update({
        where: { id: checkInId },
        data: { completedAt: new Date() },
      });

      return {
        success: true,
        data: {
          acknowledged: acknowledgment,
          nextQuestion: null,
          questionNumber: selectedQuestionIds.length,
          totalQuestions: selectedQuestionIds.length,
          completed: true,
          completionMessage: this.getCompletionMessage(customer.user.name),
        },
      };
    }

    // Get next question
    const nextQuestion = await this.prisma.checkInQuestion.findUnique({
      where: { id: unansweredIds[0] },
    });

    return {
      success: true,
      data: {
        acknowledged: acknowledgment,
        nextQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              text: nextQuestion.text,
              type: nextQuestion.type,
              category: nextQuestion.category,
              options: nextQuestion.options,
              scaleMin: nextQuestion.scaleMin,
              scaleMax: nextQuestion.scaleMax,
              scaleMinLabel: nextQuestion.scaleMinLabel,
              scaleMaxLabel: nextQuestion.scaleMaxLabel,
            }
          : null,
        questionNumber: answeredQuestionIds.length + 1,
        totalQuestions: selectedQuestionIds.length,
        completed: false,
        completionMessage: null,
      },
    };
  }

  async telegramStatus(telegramChatId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramChatId },
    });

    if (!customer) {
      throw new NotFoundException('No patient found with this Telegram Chat ID');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: {
        customerId_date: {
          customerId: customer.id,
          date: today,
        },
      },
      include: { responses: true },
    });

    if (!checkIn) {
      return { success: true, data: { hasPendingCheckIn: false, completed: false } };
    }

    const selectedQuestionIds = (checkIn.selectedQuestions as string[]) || [];

    return {
      success: true,
      data: {
        hasPendingCheckIn: !checkIn.completedAt,
        completed: !!checkIn.completedAt,
        checkInId: checkIn.id,
        answeredCount: checkIn.responses.length,
        totalQuestions: selectedQuestionIds.length,
      },
    };
  }

  async getAllPatientsWithTelegram() {
    const customers = await this.prisma.customer.findMany({
      where: {
        telegramChatId: { not: null },
        user: { isActive: true },
      },
      include: {
        user: { select: { name: true, isActive: true } },
      },
    });

    return {
      success: true,
      data: customers.map((c) => ({
        customerId: c.id,
        telegramChatId: c.telegramChatId,
        name: c.user.name,
      })),
    };
  }
}
