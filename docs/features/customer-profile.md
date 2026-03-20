# Feature: Customer Profile Page with Session Notes & Check-ins

**Status:** Completed
**Branch:** `feature/customer-profile-session-notes` (merged to main)
**Created:** 2026-03-20

## Problem Statement

Therapists and admins needed a unified view of a patient's history — session notes tied to appointments, daily check-in trends, and profile information — all in one place. Previously, these were scattered across separate pages, requiring multiple clicks and context-switching.

## User Stories

- As a **therapist**, I want to see all my session notes for a patient alongside their appointments so I can prepare for our next session
- As an **admin**, I want to view and create session notes for any patient (even without a doctor profile)
- As a **therapist/intern**, I want to fill a daily check-in on behalf of a patient who prefers verbal responses
- As an **admin**, I want to assign check-in categories to a patient so their questions are personalized

## User Flow

### Accessing the Profile
1. Navigate to Admin → Customers
2. Click on a patient's name (clickable link) → opens `/admin/customers/:customerId`
3. Profile page shows 3 tabs: Appointments & Notes, Daily Check-ins, Info

### Appointments & Notes Tab
- **All Session Notes** summary card always visible at the top (even with no appointments)
- Per-appointment cards showing date, doctor, status
- Inline session note creation: "Add Note" button opens text area within the appointment card
- Inline session note editing: click existing note to edit

### Daily Check-ins Tab
- **Fill Check-in for Patient** button (admin/therapist/intern only)
- Dialog presents 5 randomly-selected questions from patient's assigned categories
- Question types: scale (range slider), multiple_choice (pill buttons), free_text (textarea)
- Check-in history list with:
  - Date, completion status, number of responses
  - "On behalf" badge when filled by staff
  - "Filled by [name]" attribution
  - Expandable responses

### Info Tab
- Editable fields: phone, Telegram Chat ID, address, emergency contact, notes
- Check-in category assignment via toggleable category pills
- Save button to persist changes

## Technical Design

### Database Changes
- `checkinCategories` (Json?) on Customer — array of category strings
- `filledById` (String?) on DailyCheckIn — FK to User who filled on behalf
- `filledBy` relation on DailyCheckIn → User
- `telegramChatId` (String?, unique) on Customer

### Backend
- **Session Notes Service**: Admin bypass for create/edit (uses appointment's doctorId), consistent `{ success, data }` response format
- **Checkins Service**: `startCheckInForPatient()` creates check-in with filledById, selects questions by patient's categories; `submitResponsesForPatient()` validates ownership and stores responses
- **Checkins Controller**: `POST /checkins/customer/:id/fill` and `POST /checkins/customer/:id/:checkInId/responses` (admin/therapist/intern roles)
- **Customers Service**: includes `telegramId` in all user select queries

### Frontend
- `CustomerProfile.tsx` — Main page with tabbed layout (Tabs from Radix UI)
- API client: `startCheckInForPatient(customerId)`, `submitResponsesForPatient(customerId, checkInId, answers)`
- Types: `filledById`, `filledBy`, `checkinCategories` added to interfaces

## Design Decisions

1. **Session notes per-appointment, not standalone** — Notes are clinically tied to sessions. Viewing them in context of the appointment they belong to is more natural for therapists.
2. **All Session Notes summary always visible** — Even patients with no appointments may have notes from initial consultations. The summary card ensures no data is hidden.
3. **Admin bypasses doctor profile check** — Admins don't have a doctor profile but need full access. Session notes use the appointment's doctorId when admin creates them.
4. **Category-based question selection** — Therapists assign relevant categories (mood, anxiety, sleep, etc.) per patient. System randomly picks 5 questions from those categories for variety.
5. **filledById tracking** — Clinical accuracy requires knowing who provided the check-in data. The "On behalf" badge makes this visible in the UI.
