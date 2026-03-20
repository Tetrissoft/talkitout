export interface PatientContext {
  customerId: string;
  name: string;
  therapistName: string | null;
  nextAppointment: string | null;
  categories: string[];
  telegramChatId: string;
}

export interface CheckInQuestion {
  id: string;
  text: string;
  type: string;
  category: string;
  options: string[] | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
}

export interface MiraToolResult {
  name: string;
  result: Record<string, unknown>;
}

export interface MiraResponse {
  reply: string;
  metadata: {
    crisis_detected: boolean;
    sentiment: string | null;
    mode: string;
    conversationId: string;
  };
  checkInData: {
    checkInId: string | null;
    questionNumber: number | null;
    totalQuestions: number | null;
    completed: boolean;
  } | null;
}

export const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'don\'t want to live',
  'end it all',
  'self harm',
  'self-harm',
  'cut myself',
  'hurt myself',
];

export const HELPLINE_NUMBERS = `🆘 If you need to talk to someone right now:
📞 iCall: 9152987821
📞 Vandrevala Foundation: 1860-2662-345`;
