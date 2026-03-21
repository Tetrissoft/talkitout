import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const MIRA_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_patient_info',
    description:
      'Get patient profile info including name, assigned therapist, next appointment date, and check-in categories. Call this at the start of a conversation.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_checkin_questions',
    description:
      'Select 5 random check-in questions based on patient categories and create a new DailyCheckIn record. Call this at the start of a check-in session.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'store_checkin_response',
    description:
      'Save the patient\'s answer to a check-in question. CRITICAL: The questionId MUST be the exact UUID string returned by get_checkin_questions (e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890"). Do NOT invent or fabricate question IDs. If you do not have the UUID, call get_next_question first to get it.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        questionId: {
          type: SchemaType.STRING,
          description: 'MUST be the exact UUID from get_checkin_questions or get_next_question. Example format: "a1b2c3d4-e5f6-7890-abcd-ef1234567890". Never use made-up IDs like "mood-q1".',
        },
        answerScale: {
          type: SchemaType.NUMBER,
          description: 'Numeric answer for scale questions (1-10)',
        },
        answerChoice: {
          type: SchemaType.STRING,
          description: 'Selected option for multiple choice questions',
        },
        answerText: {
          type: SchemaType.STRING,
          description:
            'Free text answer, or raw patient message for context when inferring scale/choice answers',
        },
      },
      required: ['questionId'],
    },
  },
  {
    name: 'get_next_question',
    description:
      'Get the next unanswered check-in question. Returns null if all questions are answered.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_checkin_history',
    description:
      'Get the patient\'s past check-in scores for a specific category over recent days. Useful for providing context like "your mood has been trending up".',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description:
            'Check-in category: mood, anxiety, sleep, energy, social, stress, mindfulness, general',
        },
        days: {
          type: SchemaType.NUMBER,
          description: 'Number of days to look back (default 7)',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'mark_checkin_complete',
    description:
      'Mark today\'s check-in as completed. Call this after all questions have been answered.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'trigger_crisis_alert',
    description:
      'Flag a crisis situation. Creates an alert record and notifies the patient\'s therapist. Use when the patient expresses self-harm, suicidal ideation, or severe hopelessness.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        severity: {
          type: SchemaType.STRING,
          description: 'Crisis severity: low, medium, or high',
        },
        triggerMessage: {
          type: SchemaType.STRING,
          description: 'The patient message that triggered the alert',
        },
      },
      required: ['severity', 'triggerMessage'],
    },
  },
  {
    name: 'save_conversation_note',
    description:
      'Save a noteworthy insight from the conversation for the therapist to review. Use during free chat when the patient shares something clinically relevant.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        note: {
          type: SchemaType.STRING,
          description: 'Summary of the insight',
        },
        sentiment: {
          type: SchemaType.STRING,
          description: 'Overall sentiment: positive, neutral, or negative',
        },
      },
      required: ['note'],
    },
  },
];
