import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientContext, CheckInQuestion } from './mira.types';

@Injectable()
export class MiraMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getPatientByTelegramChatId(
    telegramChatId: string,
  ): Promise<PatientContext | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramChatId },
      include: {
        user: { select: { name: true } },
        assignedIntern: {
          include: {
            assignedTo: {
              include: { user: { select: { name: true } } },
            },
            user: { select: { name: true } },
          },
        },
        appointments: {
          where: {
            date: { gte: new Date() },
            status: 'scheduled',
          },
          orderBy: { date: 'asc' },
          take: 1,
          include: {
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    if (!customer) return null;

    const therapistName =
      customer.appointments[0]?.doctor?.user?.name ||
      customer.assignedIntern?.assignedTo?.user?.name ||
      null;

    const nextAppointment = customer.appointments[0]
      ? customer.appointments[0].date.toLocaleDateString('en-IN', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      : null;

    return {
      customerId: customer.id,
      name: customer.user.name,
      therapistName,
      nextAppointment,
      categories: (customer.checkinCategories as string[]) || [],
      telegramChatId,
    };
  }

  async getConversationHistory(
    conversationId: string,
    limit = 20,
  ): Promise<{ role: string; content: string }[]> {
    const messages = await this.prisma.miraMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true },
    });

    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async getOrCreateConversation(
    customerId: string,
    mode: 'checkin' | 'free_chat',
  ): Promise<string> {
    // For checkin mode, look for an active conversation today
    if (mode === 'checkin') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await this.prisma.miraConversation.findFirst({
        where: {
          customerId,
          mode: 'checkin',
          startedAt: { gte: today },
          endedAt: null,
        },
      });
      if (existing) return existing.id;
    }

    // For free_chat, look for recent active conversation (within 30 min)
    if (mode === 'free_chat') {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const existing = await this.prisma.miraConversation.findFirst({
        where: {
          customerId,
          mode: 'free_chat',
          endedAt: null,
          startedAt: { gte: thirtyMinAgo },
        },
        orderBy: { startedAt: 'desc' },
      });
      if (existing) return existing.id;
    }

    const conversation = await this.prisma.miraConversation.create({
      data: { customerId, mode },
    });
    return conversation.id;
  }

  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.miraMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata
          ? (JSON.parse(JSON.stringify(metadata)) as never)
          : undefined,
      },
    });
  }

  async getCheckinHistory(
    customerId: string,
    category: string,
    days = 7,
  ): Promise<{ date: string; score: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const responses = await this.prisma.checkInResponse.findMany({
      where: {
        checkIn: {
          customerId,
          completedAt: { not: null },
          date: { gte: since },
        },
        question: { category: category as never },
        answerScale: { not: null },
      },
      orderBy: { checkIn: { date: 'asc' } },
      include: { checkIn: { select: { date: true } } },
    });

    return responses.map((r) => ({
      date: r.checkIn.date.toISOString().split('T')[0],
      score: r.answerScale!,
    }));
  }

  async getCheckinQuestions(
    customerId: string,
  ): Promise<{ checkInId: string; questions: CheckInQuestion[] }> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { checkinCategories: true },
    });

    const categories = (customer?.checkinCategories as string[]) || [];

    const whereClause: Record<string, unknown> = { isActive: true };
    if (categories.length > 0) {
      whereClause.category = { in: categories };
    }

    const allQuestions = await this.prisma.checkInQuestion.findMany({
      where: whereClause,
    });

    // Shuffle and pick up to 5
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    // Create DailyCheckIn record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: {
        customerId_date: { customerId, date: today },
      },
    });

    if (!checkIn) {
      checkIn = await this.prisma.dailyCheckIn.create({
        data: {
          customerId,
          date: today,
          source: 'telegram',
          selectedQuestions: selected.map((q) => q.id),
        },
      });
    }

    return {
      checkInId: checkIn.id,
      questions: selected.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        category: q.category,
        options: q.options as string[] | null,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
      })),
    };
  }

  async storeCheckinResponse(
    customerId: string,
    questionId: string,
    answerScale?: number,
    answerChoice?: string,
    answerText?: string,
  ): Promise<{ success: boolean }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { customerId_date: { customerId, date: today } },
    });

    if (!checkIn) return { success: false };

    // Upsert to handle re-answers
    await this.prisma.checkInResponse.upsert({
      where: {
        checkInId_questionId: { checkInId: checkIn.id, questionId },
      },
      create: {
        checkInId: checkIn.id,
        questionId,
        answerScale: answerScale || null,
        answerChoice: answerChoice || null,
        answerText: answerText || null,
      },
      update: {
        answerScale: answerScale || null,
        answerChoice: answerChoice || null,
        answerText: answerText || null,
      },
    });

    return { success: true };
  }

  async getNextQuestion(
    customerId: string,
  ): Promise<CheckInQuestion | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { customerId_date: { customerId, date: today } },
      include: { responses: { select: { questionId: true } } },
    });

    if (!checkIn || !checkIn.selectedQuestions) return null;

    const selectedIds = checkIn.selectedQuestions as string[];
    const answeredIds = checkIn.responses.map((r) => r.questionId);
    const nextId = selectedIds.find((id) => !answeredIds.includes(id));

    if (!nextId) return null;

    const question = await this.prisma.checkInQuestion.findUnique({
      where: { id: nextId },
    });

    if (!question) return null;

    return {
      id: question.id,
      text: question.text,
      type: question.type,
      category: question.category,
      options: question.options as string[] | null,
      scaleMin: question.scaleMin,
      scaleMax: question.scaleMax,
      scaleMinLabel: question.scaleMinLabel,
      scaleMaxLabel: question.scaleMaxLabel,
    };
  }

  async markCheckinComplete(customerId: string): Promise<{ success: boolean }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.dailyCheckIn.update({
      where: { customerId_date: { customerId, date: today } },
      data: { completedAt: new Date() },
    });

    return { success: true };
  }

  async getCheckinProgress(
    customerId: string,
  ): Promise<{ answered: number; total: number; checkInId: string | null }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: { customerId_date: { customerId, date: today } },
      include: { responses: true },
    });

    if (!checkIn) return { answered: 0, total: 0, checkInId: null };

    const total = (checkIn.selectedQuestions as string[])?.length || 0;
    return {
      answered: checkIn.responses.length,
      total,
      checkInId: checkIn.id,
    };
  }
}
