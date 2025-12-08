# Kora Implementation Plan

> **Status:** Phase 1-4 Complete
> **Created:** December 2024
> **Last Updated:** December 8, 2024

---

## Executive Summary

This document outlines the gap analysis between the Kora Final Product Specification and the current implementation, along with a prioritized plan to complete the MVP.

**Recent Updates (Dec 8, 2024):**
- ✅ Phase 1: Backend API connection implemented
- ✅ Phase 2: Phone authentication flow implemented
- ✅ Phase 3: Voice spend logging implemented
- ✅ Phase 4: Quiet mode text input implemented

---

## 1. Current State Assessment

### Hackathon Features Status (Target: 13 User Stories)

| ID | Feature | Status | Completion |
|----|---------|--------|------------|
| US-H01 | First Launch / Welcome Screen | ✅ Done | 100% |
| US-H02 | Voice Onboarding - Income | ✅ Done | 100% |
| US-H03 | Voice Onboarding - Expenses | ✅ Done | 100% |
| US-H04 | Voice Onboarding - Current State | ✅ Done | 100% |
| US-H05 | First Analysis (Safe Spend) | ✅ Done | 100% |
| US-H06 | Savings Goal Capture | ✅ Done | 100% |
| US-H07 | "Should I Buy?" - Voice Input | ✅ Done | 100% |
| US-H08 | "Should I Buy?" - AI Analysis | ✅ Done | 100% |
| US-H09 | "Should I Buy?" - Voice Response | ✅ Done | 100% |
| US-H10 | Decision Logging | ✅ Done | 100% |
| US-H11 | Home Screen - Safe Spend Display | ✅ Done | 100% |
| US-H12 | Home Screen - Quick Action (Mic) | ✅ Done | 100% |
| US-H13 | Text Fallback (Quiet Mode) | ✅ Done | 100% |

**Overall Hackathon Completion: 100%**

### Full MVP Features Status (Target: 20 User Stories)

| ID | Feature | Status | Priority |
|----|---------|--------|----------|
| US-M01 | Phone Registration (OTP) | ✅ Done | P0 |
| US-M02 | Returning User Login | ✅ Done | P0 |
| US-M03 | Bank Connection Prompt | ⚠️ UI Only | P0 |
| US-M04 | Mono Integration (Nigeria) | ❌ Not Started | P0 |
| US-M05 | GoCardless Integration (UK) | ❌ Not Started | P0 |
| US-M06 | Geo-Aware Provider Selection | ❌ Not Started | P1 |
| US-M07 | Transaction Sync | ❌ Not Started | P0 |
| US-M08 | Transaction Categorization | ⚠️ Basic | P0 |
| US-M09 | Voice Spend Logging | ✅ Done | P0 |
| US-M10 | Spend Logging Recalibration | ✅ Done | P0 |
| US-M11 | Spending Pattern Analysis | ❌ Not Started | P0 |
| US-M12 | Risk Period Detection | ❌ Not Started | P1 |
| US-M13 | Weekend Check-in | ❌ Not Started | P1 |
| US-M14 | Payday Check-in | ❌ Not Started | P1 |
| US-M15 | Limit Follow-up | ❌ Not Started | P1 |
| US-M16 | Monthly Spending Breakdown | ❌ Not Started | P1 |
| US-M17 | AI-Generated Insights | ❌ Not Started | P1 |
| US-M18 | Edit Financial Profile | ⚠️ Basic | P1 |
| US-M19 | Disconnect Bank | ❌ Not Started | P2 |
| US-M20 | Currency & Region Settings | ⚠️ Partial | P2 |

**Overall MVP Completion: ~35%**

---

## 2. Critical Architecture Issues

### Issue 1: API Keys Exposed in Mobile App

**Previous State:**
- Mobile app called OpenAI, Mistral, and ElevenLabs APIs directly
- API keys stored in `.env` with `EXPO_PUBLIC_` prefix (client-exposed)

**Status:** ✅ RESOLVED
- API client created to route calls through backend
- Backend URL: `https://melodious-education-production.up.railway.app`

### Issue 2: No Authentication

**Previous State:**
- No user authentication in mobile app
- Backend auth endpoints exist but not connected
- User data stored locally only (lost on reinstall)

**Status:** ✅ RESOLVED
- Phone OTP authentication flow implemented
- Auth store with Zustand + MMKV persistence
- Protected routes in app layout

### Issue 3: No Backend Sync

**Current State:**
- All data stored locally in MMKV
- Backend has full CRUD endpoints unused
- No offline/online sync strategy

**Risk:** MEDIUM - Data loss, no cross-device support

**Status:** ⚠️ PENDING - Next priority after bank integration

---

## 3. Implementation Phases

### Phase 1: Backend Connection (Priority: CRITICAL)

**Goal:** Secure API calls by routing through backend

**Files to Create/Modify:**
```
kora-app/
├── services/
│   ├── api-client.ts          # NEW: Axios instance with auth
│   ├── api/
│   │   ├── auth.ts            # NEW: Auth API calls
│   │   ├── users.ts           # NEW: User API calls
│   │   ├── transactions.ts    # NEW: Transaction API calls
│   │   └── ai.ts              # NEW: AI API calls (replaces direct calls)
│   └── ai-service.ts          # MODIFY: Use backend instead of direct APIs
├── store/
│   ├── auth-store.ts          # NEW: Auth state management
│   └── sync-store.ts          # NEW: Sync status management
└── hooks/
    └── useAuth.ts             # NEW: Auth hook
```

**Implementation Steps:**
1. Create API client with interceptors for auth tokens
2. Create auth store for token management
3. Migrate AI service to use backend endpoints
4. Remove exposed API keys from mobile app

### Phase 2: Phone Authentication (Priority: HIGH)

**Goal:** Implement OTP-based phone authentication

**Files to Create/Modify:**
```
kora-app/
├── app/
│   ├── auth/
│   │   ├── _layout.tsx        # NEW: Auth layout
│   │   ├── index.tsx          # NEW: Phone input screen
│   │   └── verify.tsx         # NEW: OTP verification screen
│   └── _layout.tsx            # MODIFY: Add auth check
├── components/
│   └── OTPInput.tsx           # NEW: OTP input component
└── services/
    └── api/
        └── auth.ts            # Auth API implementation
```

**Implementation Steps:**
1. Create auth screens (phone input, OTP verify)
2. Implement Supabase phone auth
3. Add protected route wrapper
4. Handle auth state persistence

### Phase 3: Voice Spend Logging (Priority: HIGH)

**Goal:** Complete POST_SPEND intent to create transactions

**Files to Modify:**
```
kora-app/
├── app/
│   └── voice-session.tsx      # MODIFY: Handle POST_SPEND outcome
├── services/
│   └── kora-conversation-prompt.ts  # MODIFY: Structured POST_SPEND response
└── store/
    └── transaction-store.ts   # Already has addTransaction
```

**Implementation Steps:**
1. Enhance POST_SPEND prompt to extract amount/category
2. Parse AI response for transaction data
3. Create transaction and update balance
4. Confirm with voice response

### Phase 4: Quiet Mode (Priority: MEDIUM)

**Goal:** Full text input fallback for voice

**Files to Create/Modify:**
```
kora-app/
├── app/
│   └── index.tsx              # MODIFY: Add text input option
├── components/
│   └── QuietModeInput.tsx     # NEW: Text input with send button
└── services/
    └── ai-service.ts          # Already supports text input
```

**Implementation Steps:**
1. Create text input component
2. Add toggle to home screen
3. Process text through same AI pipeline
4. Show text response with optional TTS

### Phase 5: Data Sync (Priority: MEDIUM)

**Goal:** Sync local data with backend

**Files to Create/Modify:**
```
kora-app/
├── services/
│   └── sync-service.ts        # NEW: Sync orchestration
├── store/
│   ├── user-store.ts          # MODIFY: Add sync methods
│   └── transaction-store.ts   # MODIFY: Add sync methods
└── hooks/
    └── useSync.ts             # NEW: Sync hook with status
```

**Implementation Steps:**
1. Implement pull/push sync for user profile
2. Implement transaction sync with conflict resolution
3. Add sync status indicators
4. Handle offline mode gracefully

### Phase 6: Bank Integration (Priority: HIGH for MVP)

**Goal:** Connect Mono (Nigeria) and GoCardless (UK)

**Files to Create/Modify:**
```
kora-app/
├── app/
│   └── bank/
│       ├── _layout.tsx        # NEW: Bank flow layout
│       ├── index.tsx          # NEW: Bank connection prompt
│       └── callback.tsx       # NEW: OAuth callback handler
├── services/
│   └── api/
│       └── bank.ts            # NEW: Bank API calls
└── components/
    └── BankConnectionCard.tsx # NEW: Connection status card

kora-backend/
├── src/
│   ├── routes/
│   │   └── bank.ts            # NEW: Bank routes
│   └── services/
│       ├── mono.ts            # NEW: Mono integration
│       └── gocardless.ts      # NEW: GoCardless integration
```

**Implementation Steps:**
1. Implement Mono Connect widget integration
2. Implement GoCardless Open Banking flow
3. Create transaction sync from bank
4. Auto-categorize transactions

---

## 4. File-by-File Implementation Guide

### 4.1 API Client (`services/api-client.ts`)

```typescript
// Core axios instance with:
// - Base URL configuration
// - Auth token interceptor
// - Error handling interceptor
// - Retry logic for network failures
```

### 4.2 Auth Store (`store/auth-store.ts`)

```typescript
// Zustand store with:
// - token: string | null
// - user: User | null
// - isAuthenticated: boolean
// - login(phone): Promise<void>
// - verifyOTP(code): Promise<void>
// - logout(): void
// - refreshToken(): Promise<void>
```

### 4.3 Auth Screens

**Phone Input (`app/auth/index.tsx`):**
- Phone number input with country code
- Validation for Nigerian (+234) and UK (+44) numbers
- "Send OTP" button
- Link to terms/privacy

**OTP Verify (`app/auth/verify.tsx`):**
- 6-digit OTP input
- Auto-submit on complete
- Resend timer (60 seconds)
- Error handling for invalid OTP

### 4.4 Voice Spend Logging Enhancement

**Current Flow:**
```
User: "I just spent 5k on food"
Kora: "Okay, logged..." (but doesn't actually log)
```

**Required Flow:**
```
User: "I just spent 5k on food"
AI Response: {
  "response": "Got it. ₦5,000 on food logged...",
  "action": {
    "type": "CREATE_TRANSACTION",
    "data": {
      "amount": 5000,
      "category": "Food",
      "description": "Voice logged expense"
    }
  }
}
App: Creates transaction, updates balance
Kora: Speaks response
```

### 4.5 Quiet Mode Component

```typescript
// QuietModeInput.tsx
// - Text input field
// - Send button
// - Loading state while AI processes
// - Response display with optional TTS button
```

---

## 5. Testing Checklist

### Phase 1: Backend Connection
- [ ] API client successfully calls backend
- [ ] Auth token attached to requests
- [ ] Errors handled gracefully
- [ ] Network failures show appropriate message

### Phase 2: Phone Authentication
- [ ] Phone number validation works
- [ ] OTP sent successfully
- [ ] OTP verification works
- [ ] Token stored securely
- [ ] Auto-login on app restart
- [ ] Logout clears all data

### Phase 3: Voice Spend Logging
- [ ] "I spent X on Y" creates transaction
- [ ] Amount extracted correctly
- [ ] Category detected or defaults
- [ ] Balance updated
- [ ] Safe Spend recalculated
- [ ] Confirmation spoken

### Phase 4: Quiet Mode
- [ ] Text input visible when toggled
- [ ] Text processed same as voice
- [ ] Response shown as text
- [ ] Optional TTS works
- [ ] Can switch back to voice

### Phase 5: Data Sync
- [ ] Profile syncs on login
- [ ] Transactions sync bidirectionally
- [ ] Offline changes queued
- [ ] Conflicts resolved correctly
- [ ] Sync status visible

---

## 6. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | AI responses fail | Implement caching, queue requests |
| Bank API downtime | Can't sync transactions | Graceful degradation to manual entry |
| OTP delivery failure | Users can't login | Retry mechanism, alternative auth |
| Data sync conflicts | Data loss | Last-write-wins with audit log |
| Voice recognition errors | Poor UX | Text fallback always available |

---

## 7. Success Criteria

### Hackathon Completion (100%)
- [x] Voice onboarding works end-to-end
- [x] "Should I buy this?" flow complete
- [x] Safe Spend displayed correctly
- [ ] Decision logging persists
- [ ] Quiet mode fully functional

### MVP Readiness
- [ ] Users can sign up with phone
- [ ] Data persists across sessions
- [ ] Bank connection available (at least Mono)
- [ ] Voice spend logging works
- [ ] Basic pattern detection active
- [ ] At least one proactive check-in type

---

## 8. Next Steps

1. **Immediate:** Implement API client and backend connection
2. **This Week:** Phone authentication flow
3. **Next Week:** Voice spend logging + quiet mode
4. **Following Week:** Bank integration (Mono)

---

*Document maintained by the Kora Development Team*
