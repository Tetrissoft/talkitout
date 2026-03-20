# Feature: Telegram Conversational Check-ins

**Status:** In Progress
**Branch:** `feature/telegram-checkin-bot`
**Created:** 2026-03-20

## Problem Statement

Patients need to complete daily check-ins, but logging into a web portal feels clinical and creates friction. By delivering check-ins as a natural Telegram chat conversation, patients are more likely to engage consistently, improving therapeutic outcomes and data quality.

## User Stories

- As a **patient**, I want to receive my daily check-in as a Telegram chat so I can respond quickly from my phone
- As a **patient**, I want to resume an incomplete check-in later so I don't lose my progress if interrupted
- As a **therapist**, I want to see Telegram check-in responses in the same dashboard as web check-ins so I have a unified view
- As an **admin**, I want to configure the daily check-in time for all patients

## Proposed Solution

Build a Telegram check-in API that n8n orchestrates. n8n triggers the flow daily at a fixed time, our API manages conversation state and question delivery, and responses flow back through the existing DailyCheckIn system.

## User Flow

### Happy Path
1. Every day at configured time, n8n triggers for each patient with a Telegram Chat ID
2. n8n calls `POST /api/checkins/telegram/start` with patient's telegramChatId
3. API creates/resumes a DailyCheckIn, returns first unanswered question with formatted options
4. n8n sends the question to Telegram with inline keyboard buttons
5. Patient taps a button → Telegram callback hits n8n webhook
6. n8n calls `POST /api/checkins/telegram/respond` with the answer
7. API stores response, returns next question (or completion message if done)
8. n8n sends next question or completion message
9. Repeat until all 5 questions answered

### Resume Flow
- Patient answers 2 questions, stops responding
- Next interaction (patient sends any message, or next day's cron retriggers)
- API detects incomplete check-in for today, returns next unanswered question instead of restarting

### Conversation Example
```
🤖 "Hi Abhinav Agarwal, let's see how you are doing today 🌟"

🤖 Q1/5: "Did you practice any mindfulness or relaxation today?"
   [Yes, meditation] [Yes, breathing] [Yes, yoga] [Yes, journaling] [No]
👤 taps: Yes, meditation
🤖 "Great awareness! ✨"

🤖 Q2/5: "How anxious have you felt today?" (1-10 scale)
   [1][2][3][4][5] / [6][7][8][9][10]
👤 taps: 3
🤖 "Thanks for letting me know 🙏"

   ⏸️ Patient stops responding... time passes...

🤖 "Welcome back, Abhinav Agarwal! Let's continue where you left off 😊"

🤖 Q3/5: "Which best describes your emotional state?"
   [Happy] [Calm] [Neutral] [Sad] [Anxious] [Angry]
👤 taps: Calm
🤖 "Got it, appreciate you being open! 💙"

... continues until all 5 answered ...

🤖 "All done! Thanks for checking in today, Abhinav Agarwal. Take care 💙"
```

## UX Considerations

- **One question at a time** — conversational, not overwhelming
- **Warm, friendly tone with emojis** — not clinical
- **Empathetic acknowledgments** between questions — vary by category
- **No nagging** — if patient doesn't respond, try again tomorrow
- **Inline keyboard buttons** — faster than typing, prevents errors
- **Resume support** — respects patient's time and attention

## Technical Design

### Database Changes
- Added `telegramChatId` field to Customer model (stores Telegram numeric chat ID for messaging)
- Added `telegramCheckInQuestions` (Json) to DailyCheckIn — stores the selected question IDs for this check-in session, enabling resume

### Backend — New Endpoints

All under `/api/checkins/telegram/`, protected by API key (`x-api-key` header).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/telegram/patients` | GET | List all patients with a telegramChatId (for n8n cron) |
| `/telegram/start` | POST | Start or resume check-in for a patient by telegramChatId |
| `/telegram/respond` | POST | Submit one answer, get next question or completion |
| `/telegram/status/:telegramChatId` | GET | Check if patient has pending incomplete check-in |

### API Contracts

#### GET /api/checkins/telegram/patients
```json
Response: {
  "success": true,
  "data": [
    {
      "customerId": "uuid",
      "telegramChatId": "123456789",
      "name": "Abhinav Agarwal"
    }
  ]
}
```

#### POST /api/checkins/telegram/start
```json
Request: { "telegramChatId": "123456789" }
Response: {
  "success": true,
  "data": {
    "checkInId": "uuid",
    "completed": false,
    "greeting": "Hi Abhinav Agarwal, let's see how you are doing today 🌟",
    "question": {
      "id": "uuid",
      "text": "How would you rate your overall mood today?",
      "type": "scale",
      "category": "mood",
      "options": null,
      "scaleMin": 1,
      "scaleMax": 10,
      "scaleMinLabel": "Very low",
      "scaleMaxLabel": "Excellent"
    },
    "questionNumber": 1,
    "totalQuestions": 5
  }
}
```

#### POST /api/checkins/telegram/respond
```json
Request: {
  "checkInId": "uuid",
  "questionId": "uuid",
  "telegramChatId": "123456789",
  "answerScale": 7,        // for scale questions
  "answerChoice": "Calm",  // for multiple_choice
  "answerText": "..."      // for free_text
}
Response: {
  "success": true,
  "data": {
    "acknowledged": "Got it, appreciate you being open! 💙",
    "nextQuestion": { ... },  // null if complete
    "questionNumber": 3,
    "totalQuestions": 5,
    "completed": false,
    "completionMessage": null  // set when completed
  }
}
```

#### GET /api/checkins/telegram/status/:telegramChatId
```json
Response: {
  "success": true,
  "data": {
    "hasPendingCheckIn": true,
    "completed": false,
    "checkInId": "uuid",
    "answeredCount": 2,
    "totalQuestions": 5
  }
}
```

### Question Selection Logic
- Same as web check-ins: reads patient's `checkinCategories` from Customer record
- Filters available CheckInQuestion records by matching categories
- Shuffles and selects up to 5 questions
- Selected question IDs stored in `telegramCheckInQuestions` on the DailyCheckIn for resume support

### Question Rendering (for n8n → Telegram)
- **Scale (1-10)**: Two rows of inline keyboard buttons: `[1][2][3][4][5]` / `[6][7][8][9][10]`
- **Multiple choice**: One button per option, wrapped into rows of 2-3
- **Free text**: No keyboard — send message and wait for typed response

### Authentication
- Telegram endpoints use API key auth (`x-api-key` header) instead of JWT
- Configured via `TELEGRAM_API_KEY` environment variable
- Separate from user JWT flow — these endpoints are called by n8n, not by users

### n8n Workflow Design
Two workflows needed:

1. **Cron Workflow** (daily at fixed time):
   - Trigger: Cron node at configured time
   - HTTP Request: `GET /api/checkins/telegram/patients`
   - Loop: For each patient → `POST /api/checkins/telegram/start`
   - Telegram: Send greeting + first question with inline keyboard

2. **Webhook Workflow** (handles patient responses):
   - Trigger: Telegram callback_query (button tap) or message (free text)
   - Extract: checkInId + questionId from callback data, answer from button/text
   - HTTP Request: `POST /api/checkins/telegram/respond`
   - Telegram: Send acknowledgment + next question, or completion message

## Tasks

- [x] Task 1 (backend): Add `telegramChatId` to Customer schema
- [x] Task 2 (backend): Create Telegram check-in controller with API key guard
- [x] Task 3 (backend): Implement `/start` — create/resume check-in, select questions, return first unanswered
- [x] Task 4 (backend): Implement `/respond` — store answer, return next question with empathetic acknowledgment
- [x] Task 5 (backend): Implement `/status` — check pending check-in state
- [x] Task 6 (backend): Implement `/patients` — list patients with telegramChatId for n8n cron
- [x] Task 7 (frontend): Add `telegramChatId` field to CustomerProfile Info tab
- [x] Task 8 (frontend): Add "Telegram" source badge on check-ins filled via Telegram
- [ ] Task 9 (n8n): Create cron workflow to trigger daily check-ins
- [ ] Task 10 (n8n): Create webhook workflow to handle Telegram responses

## Design Decisions

1. **API-managed state over n8n state**: n8n is for orchestration, not stateful conversations. All state lives in our DB so resume works reliably.
2. **API key auth instead of JWT**: n8n is a service, not a user. Simple API key is appropriate for server-to-server calls.
3. **Idempotent `/start`**: Calling it multiple times on the same day returns the same check-in and current question — prevents duplicates.
4. **No reminders in v1**: Avoid nagging. If patient doesn't respond, try again tomorrow. Mental health context requires sensitivity.
5. **Same question selection logic as web**: Consistency across channels — therapist assigns categories, system selects questions.
