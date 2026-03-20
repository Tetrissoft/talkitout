import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CRISIS_KEYWORDS, HELPLINE_NUMBERS } from './mira.types';

export interface CrisisCheckResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high' | null;
  matchedKeyword: string | null;
}

@Injectable()
export class MiraSafetyService {
  private readonly logger = new Logger(MiraSafetyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quick keyword scan for immediate crisis detection.
   * This runs BEFORE sending to Gemini for faster response.
   */
  checkForCrisisKeywords(message: string): CrisisCheckResult {
    const lower = message.toLowerCase();

    for (const keyword of CRISIS_KEYWORDS) {
      if (lower.includes(keyword)) {
        return {
          isCrisis: true,
          severity: 'high',
          matchedKeyword: keyword,
        };
      }
    }

    return { isCrisis: false, severity: null, matchedKeyword: null };
  }

  /**
   * Create a crisis alert record and log the event.
   * In production, this would also send notifications (email, Telegram, push).
   */
  async createCrisisAlert(
    customerId: string,
    conversationId: string | null,
    triggerMessage: string,
    severity: 'low' | 'medium' | 'high',
  ): Promise<void> {
    const alert = await this.prisma.crisisAlert.create({
      data: {
        customerId,
        conversationId,
        triggerMessage,
        severity,
      },
    });

    // Fetch patient and therapist info for notification
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: { select: { name: true } },
        assignedIntern: {
          include: {
            assignedTo: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    const patientName = customer?.user?.name || 'Unknown patient';
    const therapistName =
      customer?.assignedIntern?.assignedTo?.user?.name || 'Unassigned';

    this.logger.warn(
      `🚨 CRISIS ALERT [${severity.toUpperCase()}] for ${patientName} (Alert ID: ${alert.id})`,
    );
    this.logger.warn(`   Trigger: "${triggerMessage}"`);
    this.logger.warn(`   Therapist to notify: ${therapistName}`);

    // TODO: Send actual notification to therapist
    // - Email notification
    // - Telegram message to therapist
    // - Push notification to admin dashboard
  }

  /**
   * Get active (unresolved) crisis alerts, optionally filtered by customer.
   */
  async getActiveAlerts(customerId?: string) {
    const where: Record<string, unknown> = { resolvedAt: null };
    if (customerId) where.customerId = customerId;

    return this.prisma.crisisAlert.findMany({
      where,
      orderBy: { notifiedAt: 'desc' },
      include: {
        customer: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
  }

  /**
   * Resolve a crisis alert.
   */
  async resolveAlert(alertId: string, resolvedBy: string) {
    return this.prisma.crisisAlert.update({
      where: { id: alertId },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  getHelplineNumbers(): string {
    return HELPLINE_NUMBERS;
  }
}
