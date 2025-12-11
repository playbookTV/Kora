# Comprehensive Code Review - Kora

## Executive Summary
The codebase is well-structured for an MVP, adhering to modern separation of concerns (Service-Repository pattern). However, there are significant discrepancies in financial logic between client and server, potential race conditions in transaction handling, and scalability bottlenecks in data processing.

---

## 🚀 Priority 1: Critical Issues (Bugs & Race Conditions)

### 1. Inconsistent "Safe Spend" Logic (Duplicate Domain Logic)
**Severity: Critical**
- **Issue:** usage of "Safe Spend" calculation is scattered across at least three locations:
    - **Frontend Service:** `FinanceEngine.ts`
    - **Frontend UI:** `voice-session.tsx` (Calculates `flexibleRemaining` and `spentToday` manually inside the component!)
    - **Backend Route:** `ai.routes.ts`
- **Risk:** These are already drifting apart. `voice-session.tsx` logic will inevitably conflict with `FinanceEngine.ts` and the backend.
- **Fix:** ALL financial math must live in **ONE** place. ideally a shared `finance-core` package, or rigorously mirrored services. For now, the Backend `FinanceService` should be the source of truth, and the storage of this state on the client should be read-only (dumb display).

### 2. Transaction Race Condition
**Severity: High**
- **Location:** `TransactionService.createTransaction`
- **Issue:** No atomic check-for-balance.
- **Scenario:**
    1. Balance is $10.
    2. Request A (Buy $8 item) arrives.
    3. Request B (Buy $8 item) arrives.
    4. Both succeed. Balance becomes -$6.
- **Fix:** Use a database transaction or conditional update:
  ```sql
  UPDATE profiles SET current_balance = current_balance - $amount 
  WHERE user_id = $uid AND current_balance >= $amount
  ```

### 3. Infrastructure & Security Risks
- **Rate Limiting behind Proxy:** `app.ts` uses `request.ip` for rate limiting but likely sits behind a load balancer (Railway).
    - **Risk:** The rate limiter will ban the Load Balancer's IP, blocking *all* users.
    - **Fix:** Enable `trustProxy: true` in Fastify config.
- **Fragile Credential Parsing:** `google-stt.tool.ts` manually parses JSON from env vars, trying to handle base64 and double-quotes. This logic is brittle and hard to debug if it fails silently.
- **Frontend ID Generation:** `user-store.ts` uses `Math.random()` for IDs. This is statistically unsafe for anything beyond a demo.

---

## 🏗 Priority 2: Refactoring & Architecture

### 1. Architecture: Logic Leaking into UI
**Observation:** `voice-session.tsx` lines 116-149 contain complex reducing logic to calculate "Flexible Remaining".
**Refactor:** Move this strictly to `FinanceEngine.ts` or `TransactionStore` getters. The UI component should only *call* a function, never *compute* business state.

### 2. Inefficient Statistics Calculation
**Observation:** `TransactionService.getStats` fetches **all** transactions for 30 days into memory to calculate a sum.
**Impact:** O(n) memory usage.
**Refactor:** Offload math to the database using `sum()` aggregates.

### 3. AI Context Amnesia
**Observation:** `conversation.chain.ts` processes messages in isolation. Kora has no memory of the previous turn.
**Refactor:** Expand `ConversationContext` to include `history: BaseMessage[]`.

---

## 🔍 Priority 3: Code Smells & Hygiene

1.  **Polling Loop in Audio Recorder:** `voice-session.tsx` polls `audioRecorder.uri` in a `while` loop. This suggests a race condition or incorrect usage of the `expo-audio` API. Event-driven handling would be cleaner.
2.  **Hardcoded Intents:** The frontend hardcodes `Intent` types. If the backend adds a new intent (e.g. `SAVINGS_CHECK`), the frontend might crash or fail to handle it.
3.  **Display Logic Assumptions:** `TransactionList.tsx` hardcodes a negative sign `-₦`. This assumes Kora will *never* handle income or refunds, which limits future extensibility.
4.  **Logging:** Backend uses `console.log` widely. It should use the Fastify logger (Pino) to attach Request IDs to logs for debugging production issues.

---

## 📉 Plan of Attack (Revised)

1.  **Refactor Finance Logic (Backend)**: Create `FinanceService` and centralize the "Safe Spend" formula.
2.  **Refactor Frontend Logic**: Clean `voice-session.tsx` by moving math into `FinanceEngine.ts` to match the backend.
3.  **Fix Rate Limiting**: Enable `trustProxy` in `app.ts`.
4.  **Stats Optimization**: Rewrite `TransactionService.getStats` to use SQL aggregates.
5.  **Harden Sync**: Fix UUID mismatch in `SyncService`.
