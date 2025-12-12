# Bug Fix: LangChain Template Parsing Error

## Issue Summary
**Error**: `Single '}' in template` when processing onboarding AI requests  
**Location**: `kora-backend/src/services/ai/prompts/onboarding.prompts.ts`  
**Impact**: Onboarding flow completely broken - users couldn't proceed past income step

## Root Cause Analysis

### The Problem
The error occurred in the `createOnboardingPrompt` function when creating LangChain prompt templates. The system message contained JSON examples with curly braces `{` and `}`, which LangChain's template parser interprets as variable placeholders.

### Example of Problematic Content
```typescript
OUTPUT FORMAT:
{
  "response": "your spoken response",
  "nextStep": "INCOME",
  "shouldAdvance": false,
  "waitingFor": "user_confirmation"
}
```

When LangChain's `ChatPromptTemplate.fromMessages()` parsed this, it saw the braces and tried to interpret them as template variables like `{variableName}`. This caused parsing errors because the braces weren't properly escaped.

### Why It Failed
1. **Escape function was broken**: The `escapeForLangChain` function was defined but didn't actually escape anything:
   ```typescript
   // BEFORE (broken):
   const escapeForLangChain = (str: string): string => {
     return str.replace(/\{/g, '{').replace(/\}/g, '}');
   };
   ```
   This replaced `{` with `{` and `}` with `}` - doing nothing!

2. **Escape function wasn't used**: Even though the function existed, it was never called on the `systemMessage` before passing it to `ChatPromptTemplate.fromMessages()`.

## The Fix

### 1. Fixed the Escape Function
```typescript
// AFTER (fixed):
const escapeForLangChain = (str: string): string => {
  return str.replace(/\{/g, '{{').replace(/\}/g, '}}');
};
```
Now it properly doubles the braces, which is how LangChain expects literal braces to be escaped.

### 2. Applied the Escape Function
```typescript
// Escape the system message to prevent LangChain from interpreting JSON examples as template variables
const escapedSystemMessage = escapeForLangChain(systemMessage);

return ChatPromptTemplate.fromMessages([
  ['system', escapedSystemMessage],
  ['human', '{userMessage}'],
]);
```

## How LangChain Template Escaping Works

In LangChain prompt templates:
- `{variableName}` = template variable (will be replaced with actual value)
- `{{` = literal `{` character
- `}}` = literal `}` character

So our JSON examples now look like this to LangChain:
```
{{
  "response": "your spoken response",
  "nextStep": "INCOME"
}}
```

Which LangChain renders as:
```
{
  "response": "your spoken response",
  "nextStep": "INCOME"
}
```

## Testing
- ✅ TypeScript build passes
- ✅ No compilation errors
- 🔄 Deployment in progress (Railway)

## Impact
This fix resolves the onboarding flow error that was preventing users from:
1. Entering their income information
2. Progressing through the onboarding steps
3. Receiving AI responses during onboarding

## Files Changed
- `kora-backend/src/services/ai/prompts/onboarding.prompts.ts`
  - Fixed `escapeForLangChain` function (line 243)
  - Applied escaping to `systemMessage` before template creation (line 291-296)

## Lessons Learned
1. Always test utility functions - the escape function was defined but never tested
2. LangChain template syntax requires careful attention to curly braces
3. When including JSON examples in prompts, they must be properly escaped
4. Helper functions should be used where they're defined

---

# Bug Fix #2: Expense Duplication Loop

## Issue Summary
**Error**: Expenses array growing exponentially with duplicates on every AI turn  
**Location**: `kora-app/app/onboarding/chat.tsx` (line 196-202)  
**Impact**: Massive data bloat causing performance issues and incorrect financial calculations

## Root Cause Analysis

### The Problem
The frontend was **appending** AI-returned expenses to the existing expenses array, but the AI was **already including all previous expenses** in its response (as instructed by the prompt to "preserve all collected data").

This created a multiplication effect:
- Turn 1: User adds 5 expenses → Array has 5 items
- Turn 2: AI returns all 5 expenses → Frontend appends → Array has 10 items (5 duplicates)
- Turn 3: AI returns all 10 expenses → Frontend appends → Array has 20 items (15 duplicates)
- Turn 4: AI returns all 20 expenses → Frontend appends → Array has 40 items (35 duplicates)

### Example from Logs
```javascript
"expenses": [
  { "name": "rent", "amount": 1400 },
  { "name": "groceries", "amount": 240 },
  { "name": "utilities", "amount": 120 },
  { "name": "subscriptions", "amount": 150 },
  { "name": "transport", "amount": 50 },
  { "name": "PayPal debt", "amount": 40 },
  // Then ALL of these repeat 5+ times!
  { "name": "rent", "amount": 1400 },
  { "name": "groceries", "amount": 240 },
  // ... and again and again
]
```

### Why It Failed
The frontend code was:
```typescript
// BEFORE (broken):
if (data.expenses && Array.isArray(data.expenses)) {
  data.expenses.forEach((ex: any) => addFixedExpense(ex.name, ex.amount, ex.due_day));
  setCollectedData(prev => ({
    ...prev,
    expenses: [...(prev.expenses || []), ...data.expenses], // ❌ APPENDING
  }));
}
```

This assumed the AI would only return **new** expenses, but the AI was returning **all** expenses (old + new) because the prompt instructs it to preserve all collected data.

## The Fix

### 1. Replace Instead of Append
```typescript
// AFTER (fixed):
if (data.expenses && Array.isArray(data.expenses)) {
  // The AI already preserves all previous expenses in its response,
  // so we REPLACE the array instead of appending to avoid duplicates
  setCollectedData(prev => ({
    ...prev,
    expenses: data.expenses, // ✅ REPLACING
  }));
  
  // Only add NEW expenses to the store (deduplicate by name)
  const existingExpenseNames = new Set((collectedData.expenses || []).map(e => e.name.toLowerCase()));
  const newExpenses = data.expenses.filter((ex: any) => 
    !existingExpenseNames.has(ex.name.toLowerCase())
  );
  newExpenses.forEach((ex: any) => addFixedExpense(ex.name, ex.amount, ex.due_day));
}
```

### Key Changes
1. **Replace the entire expenses array** instead of appending
2. **Deduplicate before adding to store** by checking existing expense names
3. **Case-insensitive comparison** to catch duplicates like "Rent" vs "rent"

## Testing
- ✅ Frontend code updated
- 🔄 Testing needed with live onboarding flow

## Impact
This fix resolves:
1. **Exponential data growth** in the expenses array
2. **Performance degradation** from processing hundreds of duplicate items
3. **Incorrect financial calculations** from counting the same expense multiple times
4. **Memory bloat** in the frontend state

## Files Changed
- `kora-app/app/onboarding/chat.tsx`
  - Fixed expense array handling (lines 196-210)
  - Added deduplication logic before adding to store

## Lessons Learned
1. When AI is instructed to "preserve all data", it returns the **complete** dataset, not just deltas
2. Frontend state management must account for AI behavior - don't assume incremental updates
3. Always deduplicate when merging arrays from external sources
4. Use case-insensitive comparisons for user-generated text (expense names)
5. Log the actual data structure to catch exponential growth early

---

# Bug Fix #3: BALANCE_PAYDAY Loop

## Issue Summary
**Error**: AI stuck in infinite loop in BALANCE_PAYDAY step, re-asking for balance and savings repeatedly  
**Location**: `kora-backend/src/services/ai/prompts/onboarding.prompts.ts` (BALANCE_PAYDAY step)  
**Impact**: Users unable to complete onboarding, stuck answering the same questions repeatedly

## Root Cause Analysis

### The Problem
The AI was **losing previously collected data** in the BALANCE_PAYDAY step and re-asking questions it had already asked:

**Loop Example:**
1. User: "250 pounds" → AI: "Do you have upcoming bills?"
2. User: "No" → AI: **"What's in your account?"** ❌ (already answered!)
3. User: "£250" → AI: "Do you have upcoming bills?"
4. User: "No" → AI: "Do you want to save?"
5. User: "Yes, £50" → AI: **"Do you have upcoming bills?"** ❌ (already answered!)
6. User: "No" → AI: **"Do you want to save?"** ❌ (already answered!)
7. **INFINITE LOOP** 🔄

### Example from Logs
At **17:41:53**, even though `collectedData.balance = 250`:
```json
{
  "response": "What's in your account right now?",
  "extracted": {
    "balance": null,  // ❌ LOST THE BALANCE!
    "savingsGoal": null,
    "upcomingBills": null
  },
  "nextStep": "BALANCE_PAYDAY",
  "shouldAdvance": false,
  "waitingFor": "balance"
}
```

### Why It Failed
The **BALANCE_PAYDAY prompt was missing data preservation instructions**. 

While the INCOME step had:
```
CRITICAL DATA PRESERVATION RULE:
- If collectedData.income already has values, you MUST include them
- Only update fields that are NEW or CHANGED
```

The BALANCE_PAYDAY step only had:
```
YOUR TASK:
1. If no balance mentioned: Ask what's in their account
2. If balance given: Ask about upcoming bills
3. Ask if they want to save
4. If they want to save: Ask how much
```

**No preservation instructions!** The AI didn't know to keep the balance when asking about bills, or keep both when asking about savings.

Additionally, there was **no clear advancement logic** - the AI didn't know when it had collected ALL required data (balance + upcomingBills + savingsGoal) to move to ANALYSIS.

## The Fix

### 1. Added Data Preservation Instructions
```typescript
CRITICAL DATA PRESERVATION RULE:
- If collectedData.balance already has a value, you MUST include it in your "extracted" output
- If collectedData.savingsGoal already has a value, you MUST include it in your "extracted" output
- If collectedData.upcomingBills already has a value, you MUST include it in your "extracted" output
- Only update fields that are NEW or CHANGED in the current user message
- NEVER return null for a field that already has a value in collectedData
```

### 2. Clarified Step-by-Step Logic
```typescript
YOUR TASK (in order):
1. Check what's already in collectedData (balance, savingsGoal, upcomingBills)
2. If balance is missing: Ask "What's in your account right now?"
3. If balance exists but upcomingBills is missing: Ask "Do you have any upcoming bills?"
4. If upcomingBills exists but savingsGoal is missing: Ask "Do you want to save?"
5. If they want to save but savingsGoal is missing: Ask "How much per month?"
6. If ALL THREE exist: Set shouldAdvance=true, nextStep="ANALYSIS"
```

### 3. Added Comprehensive Examples
Provided 5 detailed examples showing:
- How to preserve balance when asking about bills
- How to preserve balance + bills when asking about savings
- How to preserve all data when advancing to ANALYSIS
- When to set `savingsGoal: 0` (user doesn't want to save)
- When to set `shouldAdvance: true`

## Testing
- ✅ Backend build passes
- 🔄 Deployment to Railway
- 🔄 Needs live testing with complete onboarding flow

## Impact
This fix resolves:
1. **Infinite loop** in BALANCE_PAYDAY step
2. **Data loss** between questions in the same step
3. **Unclear advancement logic** - AI now knows when to move to ANALYSIS
4. **User frustration** from answering the same questions repeatedly

## Files Changed
- `kora-backend/src/services/ai/prompts/onboarding.prompts.ts`
  - Enhanced BALANCE_PAYDAY prompt (lines 154-261)
  - Added data preservation rules
  - Added step-by-step logic
  - Added 5 comprehensive examples

## Lessons Learned
1. **Every step needs data preservation instructions** - not just the first one
2. **Clear advancement logic is critical** - AI needs to know when it has ALL required data
3. **Examples are powerful** - showing the AI exactly what to do prevents ambiguity
4. **State management in multi-turn conversations is hard** - each turn must preserve previous state
5. **Test the entire flow** - bugs often appear in later steps, not just the first one


---

# Bug Fix #7: Conversation Prompts Template Error

## Issue Summary
**Error**: `Single '}' in template` in conversation AI chain  
**Location**: `kora-backend/src/services/ai/prompts/conversation.prompts.ts`  
**Impact**: Conversation AI (post-onboarding chat) completely broken

## Root Cause Analysis

### The Problem
**Same issue as Bug #1** - the conversation prompts contain extensive JSON examples that weren't escaped:

```typescript
OUTPUT FORMAT:
{
  "response": "your spoken response",
  "analysis": {
    "amount": number,
    "riskLevel": "low" | "medium" | "high"
  }
}
```

The conversation prompts have **5 different intent-specific prompts**, each with JSON output examples:
1. `SPEND_DECISION` - Complex analysis object
2. `SAFE_SPEND_CHECK` - Financial state data
3. `EMOTIONAL` - Emotional acknowledgment structure
4. `POST_SPEND` - Transaction logging format
5. `GENERAL` - Clarification structure

All of these contained unescaped curly braces that LangChain interpreted as template variables.

### Why It Failed
- Conversation prompts are used **after** onboarding completes
- They contain even more JSON examples than onboarding prompts
- No escaping was applied to any of the prompt templates
- Both `createConversationPrompt` and `createIntentClassifierPrompt` were affected

## The Fix

### 1. Added Escape Function (Same as Onboarding)
```typescript
const escapeForLangChain = (str: string): string => {
  return str.replace(/\{/g, '{{').replace(/\}/g, '}}');
};
```

### 2. Applied to Conversation Prompt
```typescript
export const createConversationPrompt = (context: Record<string, unknown>) => {
  const systemMessage = `${KORA_CORE_SYSTEM}
    ... (includes JSON examples from getIntentPrompt)
  `;

  const escapedSystemMessage = escapeForLangChain(systemMessage);

  return ChatPromptTemplate.fromMessages([
    ['system', escapedSystemMessage],
    ['human', '{userMessage}'],
  ]);
};
```

### 3. Applied to Intent Classifier
```typescript
export const createIntentClassifierPrompt = () => {
  const escapedPrompt = escapeForLangChain(INTENT_CLASSIFIER_PROMPT);
  
  return ChatPromptTemplate.fromMessages([
    ['system', escapedPrompt],
    ['human', '{message}'],
  ]);
};
```

## Testing
- ✅ Backend build passes
- 🔄 Deployment to Railway
- 🔄 Needs live testing with conversation flow

## Impact
This fix enables the entire post-onboarding conversation system:
1. **Spend decisions** - "Should I buy this?" queries
2. **Safe spend checks** - "How much can I spend?" queries
3. **Emotional support** - Stress/anxiety conversations
4. **Post-spend logging** - "I just spent X" tracking
5. **General chat** - Greetings and questions about Kora

## Files Changed
- `kora-backend/src/services/ai/prompts/conversation.prompts.ts`
  - Added `escapeForLangChain` function
  - Modified `createConversationPrompt` to escape system message
  - Modified `createIntentClassifierPrompt` to escape prompt

## Lessons Learned
1. **Any prompt with JSON examples needs escaping** - not just onboarding
2. **Test all AI chains** - fixing one doesn't mean others work
3. **Reusable escape function** - should be extracted to shared utility
4. **Template syntax is strict** - LangChain requires `{{` and `}}` for literals
5. **Systematic approach needed** - search entire codebase for similar patterns

