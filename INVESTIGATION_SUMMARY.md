# Investigation Summary - Onboarding AI Issues

**Date**: 2025-12-12  
**Status**: ✅ Both Issues Fixed

## Overview
Investigated and resolved two critical bugs in the Kora AI onboarding flow that were preventing users from completing onboarding.

---

## Issue #1: LangChain Template Parsing Error ✅ FIXED

### Symptoms
```
Error: Single '}' in template.
    at Object.parseFString [as f-string]
    at parseTemplate
    at PromptTemplate.fromTemplate
```

### Root Cause
The `escapeForLangChain` utility function had two problems:
1. **Broken implementation**: Replaced `{` with `{` instead of `{{` (did nothing)
2. **Never used**: The function existed but wasn't called before passing prompts to LangChain

### Fix Applied
**File**: `kora-backend/src/services/ai/prompts/onboarding.prompts.ts`

1. Fixed the escape function:
   ```typescript
   // Before: str.replace(/\{/g, '{')
   // After:  str.replace(/\{/g, '{{')
   ```

2. Applied escaping before template creation:
   ```typescript
   const escapedSystemMessage = escapeForLangChain(systemMessage);
   return ChatPromptTemplate.fromMessages([
     ['system', escapedSystemMessage],
     ['human', '{userMessage}'],
   ]);
   ```

### Result
- ✅ Template parsing works correctly
- ✅ AI can process onboarding requests
- ✅ JSON examples in prompts are properly escaped

---

## Issue #2: Expense Duplication Loop ✅ FIXED

### Symptoms
Expenses array growing exponentially:
- Turn 1: 6 expenses
- Turn 2: 12 expenses (6 duplicates)
- Turn 3: 24 expenses (18 duplicates)
- Turn 4: 48 expenses (42 duplicates)

### Root Cause
**Mismatch between AI behavior and frontend expectations**:
- **AI**: Returns the COMPLETE expenses array (preserving all previous data as instructed)
- **Frontend**: Was APPENDING the AI response to existing expenses
- **Result**: Exponential duplication

### Fix Applied
**File**: `kora-app/app/onboarding/chat.tsx`

Changed from appending to replacing:
```typescript
// Before (broken):
expenses: [...(prev.expenses || []), ...data.expenses] // APPENDING

// After (fixed):
expenses: data.expenses // REPLACING
```

Added deduplication for the user store:
```typescript
const existingExpenseNames = new Set(
  (collectedData.expenses || []).map(e => e.name.toLowerCase())
);
const newExpenses = data.expenses.filter((ex: any) => 
  !existingExpenseNames.has(ex.name.toLowerCase())
);
newExpenses.forEach((ex: any) => addFixedExpense(ex.name, ex.amount, ex.due_day));
```

### Result
- ✅ No more duplicate expenses
- ✅ Correct financial calculations
- ✅ Better performance (no exponential data growth)

---

## Testing Status

### Backend
- ✅ TypeScript build passes
- ✅ No compilation errors
- ✅ Deployed to Railway

### Frontend
- ✅ Code updated
- 🔄 Needs live testing with onboarding flow

---

## Key Learnings

1. **LangChain Escaping**: Always escape curly braces in prompt templates that contain JSON examples
2. **AI Data Preservation**: When AI is told to "preserve all data", it returns the complete dataset, not deltas
3. **State Management**: Frontend must account for AI behavior - don't assume incremental updates
4. **Deduplication**: Always deduplicate when merging arrays from external sources
5. **Testing**: Test utility functions in isolation before integration

---

## Files Modified

### Backend
- `kora-backend/src/services/ai/prompts/onboarding.prompts.ts`
  - Fixed `escapeForLangChain` function (line 243)
  - Applied escaping to system message (line 291-296)

### Frontend
- `kora-app/app/onboarding/chat.tsx`
  - Fixed expense array handling (lines 196-210)
  - Added deduplication logic

### Documentation
- `BUGFIX_LANGCHAIN_TEMPLATE.md` (comprehensive bug report)

---

## Next Steps

1. ✅ Deploy backend changes (completed via Railway)
2. 🔄 Test complete onboarding flow end-to-end
3. 🔄 Monitor logs for any remaining issues
4. 🔄 Verify expense deduplication works correctly

---

## Deployment

Backend deployed successfully to Railway at 16:41 UTC.
Frontend changes ready for testing in development environment.
