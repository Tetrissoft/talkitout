# Feature: Mira — AI Wellness Companion (Gemini + Function Calling)

**Status:** In Progress
**Branch:** `feature/telegram-checkin-bot`
**Created:** 2026-03-20

## Problem Statement

Template-based check-in messages feel robotic after a few days, leading to patient disengagement. Patients need a warm, consistent companion who acknowledges their emotional state with empathy, remembers their history, and makes daily check-ins feel like chatting with someone who cares.

Additionally, patients sometimes need someone to talk to outside check-in hours. Mira provides a safe, bounded free-chat experience that logs insights for the therapist.

## Mira's Persona

```
Name: Mira
Role: Wellness companion (NOT a therapist)
Tone: Warm, gentle, encouraging — like a caring friend
Boundaries: Never diagnoses, never prescribes, never interprets symptoms
            Always redirects deeper clinical topics to the patient's therapist
```

## User Stories

- As a **patient**, I want my check-in companion to remember how I felt yesterday
- As a **patient**, I want to chat with Mira outside check-in time when I need support
- As a **therapist**, I want to be notified if Mira detects a patient in crisis
- As a **therapist**, I want to see conversation summaries so I have context for sessions
- As an **admin**, I want to see and resolve crisis alerts on the dashboard

## How It Works — Gemini Function Calling

Mira uses Gemini's native function calling. We define tools (functions) that Gemini can invoke during conversation. Gemini decides WHEN to call them based on context. Our code executes the actual database operations.

### Available Tools for Gemini

| Tool | Purpose | When Gemini calls it |
|------|---------|---------------------|
| `get_patient_info` | Get patient name, therapist, next appointment, categories | Start of conversation |
| `get_checkin_questions` | Select 5 questions, create DailyCheckIn record | Start of check-in |
| `store_checkin_response` | Save patient's answer (scale/choice/text) | After patient answers a question |
| `get_next_question` | Get the next unanswered question | After storing a response |
| `get_checkin_history` | Get past scores for a category | To provide context ("your mood is up from last week") |
| `mark_checkin_complete` | Set completedAt, generate summary | After all questions answered |
| `trigger_crisis_alert` | Create alert, notify therapist | When crisis keywords/sentiment detected |
| `save_conversation_note` | Save a free-chat insight for the therapist | During free chat, noteworthy moments |

### Flow Example (Check-in Mode)

```
Patient message: (cron trigger)
  → Gemini calls get_patient_info() → gets name, therapist, categories
  → Gemini calls get_checkin_questions() → gets 5 questions
  → Gemini calls get_checkin_history("mood", 3) → gets [5, 6, 7]
  → Gemini generates: "Hey Abhinav! 🌟 Your mood's been climbing — let's check in!"
  → Sends first question with context

Patient says: "honestly pretty anxious, work deadline"
  → Gemini calls store_checkin_response(q2, scale: 7, text: "work deadline")
  → Gemini calls get_next_question() → returns q3
  → Gemini generates: "Work deadlines are tough 😮‍💨 Dr. Sharma is Monday — worth mentioning."
  → Sends next question

Patient says: "I don't want to be here anymore"
  → Gemini calls trigger_crisis_alert(severity: "high", message: "...")
  → Gemini generates helpline numbers + empathetic response
  → Pauses check-in

All questions done:
  → Gemini calls mark_checkin_complete()
  → Generates summary with trends and encouragement
```

### Handling Unexpected Input During Check-in

| Patient does... | Mira does... |
|-----------------|--------------|
| Types text instead of tapping button | Extracts answer from natural language, confirms if unsure |
| Goes off-topic | Acknowledges briefly (1 sentence), steers back to current question |
| Vents emotionally | Validates feeling, extracts usable answer, stores context text |
| Asks Mira a question | Answers if possible (from context), then continues check-in |
| Crisis trigger | Stops check-in, activates crisis protocol, offers to resume later |

## Technical Design

### Database Models

```prisma
model MiraConversation {
  id          String          @id @default(uuid())
  customerId  String          @map("customer_id")
  mode        MiraMode        // checkin, free_chat
  summary     String?         // Gemini-generated summary
  startedAt   DateTime        @default(now())
  endedAt     DateTime?       @map("ended_at")
  customer    Customer        @relation(fields: [customerId], references: [id], onDelete: Cascade)
  messages    MiraMessage[]
  @@map("mira_conversations")
}

model MiraMessage {
  id              String            @id @default(uuid())
  conversationId  String            @map("conversation_id")
  role            MiraMessageRole   // user, assistant, system
  content         String
  metadata        Json?             // crisis_detected, sentiment, extracted_answer, etc.
  createdAt       DateTime          @default(now())
  conversation    MiraConversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@map("mira_messages")
}

model CrisisAlert {
  id              String          @id @default(uuid())
  customerId      String          @map("customer_id")
  conversationId  String?         @map("conversation_id")
  triggerMessage  String          @map("trigger_message")
  severity        CrisisSeverity  // low, medium, high
  notifiedAt      DateTime        @default(now())
  resolvedAt      DateTime?       @map("resolved_at")
  resolvedBy      String?         @map("resolved_by")
  customer        Customer        @relation(fields: [customerId], references: [id])
  @@map("crisis_alerts")
}

enum MiraMode { checkin  free_chat }
enum MiraMessageRole { user  assistant  system }
enum CrisisSeverity { low  medium  high }
```

### Backend Module Structure

```
backend/src/mira/
├── mira.module.ts              # Module registration
├── mira.service.ts             # Core service — Gemini calls + function execution
├── mira.controller.ts          # API endpoints
├── mira-prompt.service.ts      # Dynamic system prompt builder
├── mira-safety.service.ts      # Crisis detection + escalation
├── mira-memory.service.ts      # Conversation history + check-in trends
├── mira-tools.ts               # Tool/function definitions for Gemini
├── mira.types.ts               # TypeScript types
└── dto/
    └── mira-message.dto.ts     # Input validation
```

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/mira/message` | POST | API Key | Send message to Mira, get response |
| `/mira/conversations/:customerId` | GET | JWT | Conversation history (therapist view) |
| `/mira/conversations/:id/summary` | GET | JWT | AI summary of a conversation |
| `/mira/crisis-alerts` | GET | JWT | List active crisis alerts |
| `/mira/crisis-alerts/:id/resolve` | PATCH | JWT | Mark alert as resolved |

### Gemini Configuration

- SDK: `@google/generative-ai`
- Model: `gemini-2.0-flash` (check-in) / `gemini-2.0-pro` (free chat)
- Token budget: ~500 tokens per response
- Conversation history: last 20 messages for context window
- Environment variable: `GEMINI_API_KEY`

### Safety Architecture

```
Patient message
  → Keyword scan (immediate: "suicide", "kill myself", "end it")
  → If keyword match → force crisis_detected in Gemini context
  → Gemini also classifies nuanced messages ("nothing matters anymore")
  → HIGH severity: CrisisAlert + therapist notification + helpline numbers
  → MEDIUM severity: CrisisAlert + gentle therapist suggestion
  → LOW severity: Note for therapist, continue conversation
```

Indian helpline numbers:
- iCall: 9152987821
- Vandrevala Foundation: 1860-2662-345

## Tasks

- [ ] Task 1: Add Prisma models (MiraConversation, MiraMessage, CrisisAlert + enums)
- [ ] Task 2: Install @google/generative-ai SDK
- [ ] Task 3: Create mira module structure
- [ ] Task 4: Implement MiraPromptService (system prompt with patient context)
- [ ] Task 5: Implement MiraMemoryService (conversation history + trends)
- [ ] Task 6: Implement MiraSafetyService (crisis detection + alerts)
- [ ] Task 7: Implement MiraService (Gemini function calling + tool execution)
- [ ] Task 8: Create Mira controller with API endpoints
- [ ] Task 9: Add Mira conversation viewer to CustomerProfile
- [ ] Task 10: Add Crisis Alerts panel to admin dashboard
- [ ] Task 11: Update n8n workflows to use /mira/message
- [ ] Task 12: Test crisis detection with various phrasings

## Design Decisions

1. **Gemini function calling over hardcoded logic** — Gemini decides when to read/write data based on conversation context, enabling natural free-form input handling
2. **All state in our DB** — Conversation history, check-in state, crisis alerts all in Prisma. Gemini is stateless per request.
3. **Keyword + LLM dual safety** — Keywords catch obvious crisis phrases immediately; Gemini catches nuanced ones. Belt and suspenders.
4. **Conversation summaries** — Auto-generated after 30min inactivity. Therapists see summaries, not raw messages (unless they drill in).
5. **Rate limit free chat** — 20 messages/day to prevent over-reliance on AI companion.
