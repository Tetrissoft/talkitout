import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionCall,
} from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { MiraMemoryService } from './mira-memory.service';
import { MiraPromptService } from './mira-prompt.service';
import { MiraSafetyService } from './mira-safety.service';
import { MIRA_TOOL_DECLARATIONS } from './mira-tools';
import { MiraResponse, PatientContext } from './mira.types';

const MAX_FUNCTION_CALL_ROUNDS = 5;

@Injectable()
export class MiraService {
  private readonly logger = new Logger(MiraService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly memory: MiraMemoryService,
    private readonly prompt: MiraPromptService,
    private readonly safety: MiraSafetyService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — Mira will use mock responses');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'mock-key');
    this.modelName = this.config.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );
  }

  async handleMessage(
    telegramChatId: string,
    userMessage: string,
    mode: 'checkin' | 'free_chat' = 'checkin',
  ): Promise<MiraResponse> {
    // 1. Get patient context
    const patient =
      await this.memory.getPatientByTelegramChatId(telegramChatId);
    if (!patient) {
      throw new BadRequestException(
        `No patient found with Telegram Chat ID: ${telegramChatId}`,
      );
    }

    // 2. Get or create conversation
    const conversationId = await this.memory.getOrCreateConversation(
      patient.customerId,
      mode,
    );

    // 3. Pre-check for crisis keywords (fast path)
    const crisisCheck = this.safety.checkForCrisisKeywords(userMessage);
    let crisisDetected = crisisCheck.isCrisis;

    // 4. Save user message
    const isSystemTrigger = userMessage === '__SYSTEM_START_CHECKIN__';
    if (!isSystemTrigger) {
      await this.memory.saveMessage(conversationId, 'user', userMessage, {
        crisis_keyword_detected: crisisCheck.isCrisis,
        matched_keyword: crisisCheck.matchedKeyword,
      });
    }

    // 5. Build conversation history for Gemini
    const history = await this.memory.getConversationHistory(conversationId);
    const systemPrompt = await this.prompt.buildSystemPrompt(patient, mode);

    // If crisis detected by keyword, prepend a system instruction
    let augmentedPrompt = systemPrompt;
    if (crisisCheck.isCrisis) {
      augmentedPrompt += `\n\n⚠️ CRITICAL: The patient's message contains a crisis keyword ("${crisisCheck.matchedKeyword}"). You MUST call trigger_crisis_alert with severity "high" and respond with empathy, helpline numbers, and therapist notification.`;
    }

    // 6. Call Gemini with function calling
    const reply = await this.callGeminiWithTools(
      augmentedPrompt,
      history,
      isSystemTrigger
        ? 'Start a new daily check-in for this patient. Greet them warmly and begin with the first question.'
        : userMessage,
      patient,
      conversationId,
    );

    // 7. Check if crisis was detected during Gemini's function calls
    if (!crisisDetected) {
      crisisDetected = reply.crisisDetected;
    }

    // 8. Save assistant message
    await this.memory.saveMessage(conversationId, 'assistant', reply.text, {
      crisis_detected: crisisDetected,
      function_calls: reply.functionCallsMade,
    });

    // 9. Get check-in progress
    const progress = await this.memory.getCheckinProgress(patient.customerId);

    return {
      reply: reply.text,
      metadata: {
        crisis_detected: crisisDetected,
        sentiment: null,
        mode,
        conversationId,
      },
      checkInData:
        mode === 'checkin'
          ? {
              checkInId: progress.checkInId,
              questionNumber: progress.answered,
              totalQuestions: progress.total,
              completed: progress.answered >= progress.total && progress.total > 0,
            }
          : null,
    };
  }

  private async callGeminiWithTools(
    systemPrompt: string,
    history: { role: string; content: string }[],
    currentMessage: string,
    patient: PatientContext,
    conversationId: string,
  ): Promise<{
    text: string;
    crisisDetected: boolean;
    functionCallsMade: string[];
  }> {
    // Check if API key is available
    if (!this.config.get<string>('GEMINI_API_KEY')) {
      return this.getMockResponse(currentMessage, patient);
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: MIRA_TOOL_DECLARATIONS }],
    });

    // Build Gemini conversation contents
    const contents: Content[] = history
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }] as Part[],
      }));

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: currentMessage }],
    });

    let crisisDetected = false;
    const functionCallsMade: string[] = [];

    // Function calling loop
    let result = await model.generateContent({ contents });
    let response = result.response;

    for (let round = 0; round < MAX_FUNCTION_CALL_ROUNDS; round++) {
      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const functionCalls: FunctionCall[] = [];
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }

      if (functionCalls.length === 0) break;

      // Execute each function call
      const functionResponses: Content[] = [];

      for (const fc of functionCalls) {
        functionCallsMade.push(fc.name);
        const fnResult = await this.executeFunctionCall(
          fc,
          patient,
          conversationId,
        );

        if (fc.name === 'trigger_crisis_alert') {
          crisisDetected = true;
        }

        functionResponses.push({
          role: 'function' as never,
          parts: [
            {
              functionResponse: {
                name: fc.name,
                response: fnResult,
              },
            },
          ] as Part[],
        });
      }

      // Add function call and response to contents
      contents.push(candidate.content);
      contents.push(...functionResponses);

      // Call Gemini again with function results
      result = await model.generateContent({ contents });
      response = result.response;
    }

    const textParts = response.candidates?.[0]?.content?.parts
      ?.filter((p) => p.text)
      ?.map((p) => p.text)
      ?.join('');

    return {
      text: textParts || "I'm here for you. How are you feeling?",
      crisisDetected,
      functionCallsMade,
    };
  }

  private async executeFunctionCall(
    fc: FunctionCall,
    patient: PatientContext,
    conversationId: string,
  ): Promise<Record<string, unknown>> {
    const args = fc.args as Record<string, unknown>;
    this.logger.debug(`Executing function: ${fc.name}(${JSON.stringify(args)})`);

    switch (fc.name) {
      case 'get_patient_info':
        return {
          name: patient.name,
          therapistName: patient.therapistName,
          nextAppointment: patient.nextAppointment,
          categories: patient.categories,
        };

      case 'get_checkin_questions': {
        const result = await this.memory.getCheckinQuestions(
          patient.customerId,
        );
        return {
          checkInId: result.checkInId,
          questions: result.questions,
          totalQuestions: result.questions.length,
          important: 'Use the exact question id (UUID) from this list when calling store_checkin_response. Do NOT fabricate question IDs.',
        };
      }

      case 'store_checkin_response': {
        try {
          const storeResult = await this.memory.storeCheckinResponse(
            patient.customerId,
            args.questionId as string,
            args.answerScale as number | undefined,
            args.answerChoice as string | undefined,
            args.answerText as string | undefined,
          );
          return storeResult;
        } catch (error) {
          this.logger.warn(`store_checkin_response failed for questionId=${args.questionId}: ${error}`);
          return { success: false, error: `Invalid questionId "${args.questionId}". This is NOT a valid UUID. Call get_next_question to get the correct question UUID, then retry store_checkin_response with that UUID.` };
        }
      }

      case 'get_next_question': {
        const nextQ = await this.memory.getNextQuestion(patient.customerId);
        const progress = await this.memory.getCheckinProgress(
          patient.customerId,
        );
        return {
          question: nextQ,
          answeredCount: progress.answered,
          totalQuestions: progress.total,
          allAnswered: nextQ === null,
        };
      }

      case 'get_checkin_history': {
        const historyResult = await this.memory.getCheckinHistory(
          patient.customerId,
          args.category as string,
          (args.days as number) || 7,
        );
        return { scores: historyResult };
      }

      case 'mark_checkin_complete': {
        const completeResult = await this.memory.markCheckinComplete(
          patient.customerId,
        );
        return completeResult;
      }

      case 'trigger_crisis_alert': {
        await this.safety.createCrisisAlert(
          patient.customerId,
          conversationId,
          args.triggerMessage as string,
          args.severity as 'low' | 'medium' | 'high',
        );
        return {
          alertCreated: true,
          helplineNumbers: this.safety.getHelplineNumbers(),
        };
      }

      case 'save_conversation_note': {
        await this.memory.saveMessage(
          conversationId,
          'system',
          `[Therapist Note] ${args.note}`,
          { type: 'conversation_note', sentiment: args.sentiment || 'neutral' },
        );
        return { saved: true };
      }

      default:
        this.logger.warn(`Unknown function call: ${fc.name}`);
        return { error: `Unknown function: ${fc.name}` };
    }
  }

  /**
   * Mock response when Gemini API key is not configured.
   * Allows testing the flow without an actual API key.
   */
  private getMockResponse(
    message: string,
    patient: PatientContext,
  ): {
    text: string;
    crisisDetected: boolean;
    functionCallsMade: string[];
  } {
    const crisisCheck = this.safety.checkForCrisisKeywords(message);

    if (crisisCheck.isCrisis) {
      return {
        text: `I hear you, ${patient.name}. What you're feeling matters, and you're not alone. 💙\n\n${this.safety.getHelplineNumbers()}\n\nI've notified ${patient.therapistName || 'your therapist'} — they'll reach out to you soon. I'm here if you want to keep talking.`,
        crisisDetected: true,
        functionCallsMade: ['trigger_crisis_alert'],
      };
    }

    return {
      text: `[Mock Mira] Hi ${patient.name}! I received your message: "${message}". In production, Gemini would generate a natural response here with function calls. Set GEMINI_API_KEY in your .env to enable real responses.`,
      crisisDetected: false,
      functionCallsMade: [],
    };
  }

  /**
   * Get conversation history for therapist view.
   */
  async getConversations(customerId: string) {
    return this.prisma.miraConversation.findMany({
      where: { customerId },
      orderBy: { startedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Get a single conversation with summary.
   */
  async getConversationSummary(conversationId: string) {
    return this.prisma.miraConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            createdAt: true,
          },
        },
        customer: {
          include: { user: { select: { name: true } } },
        },
      },
    });
  }
}
