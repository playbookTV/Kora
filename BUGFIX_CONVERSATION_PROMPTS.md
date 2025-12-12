# Bug Fix #7: Conversation Prompts Template Error

**Date**: 2025-12-12  
**Status**: ✅ FIXED

---

## Issue Summary
**Error**: `Single '}' in template` in conversation AI chain  
**Location**: `kora-backend/src/services/ai/prompts/conversation.prompts.ts`  
**Impact**: Conversation AI (post-onboarding chat) completely broken

---

## Error Details

```
Conversation chain error: Error: Single '}' in template.
    at Object.parseFString [as f-string]
    at parseTemplate
    at PromptTemplate.fromTemplate
    at createIntentClassifierPrompt
```

---

## Root Cause

**Same issue as onboarding prompts** - the conversation prompts contain extensive JSON examples for output formats:

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

These unescaped curly braces `{` and `}` were being interpreted by LangChain as template variables, causing parsing errors.

The conversation prompts have **5 different intent-specific prompts**, each with JSON output examples:
1. `SPEND_DECISION` - Complex analysis object
2. `SAFE_SPEND_CHECK` - Financial state data
3. `EMOTIONAL` - Emotional acknowledgment structure
4. `POST_SPEND` - Transaction logging format
5. `GENERAL` - Clarification structure

---

## The Fix

### 1. Added Escape Function
```typescript
/**
 * Escapes curly braces in a string so LangChain doesn't interpret them as template variables.
 * In LangChain prompt templates, `{` and `}` are used for variable interpolation.
 * To include literal curly braces, they must be doubled: `{{` and `}}`.
 */
const escapeForLangChain = (str: string): string => {
  return str.replace(/\{/g, '{{').replace(/\}/g, '}}');
};
```

### 2. Applied to Conversation Prompt
```typescript
export const createConversationPrompt = (context: Record<string, unknown>) => {
  // ... build system message with context and intent-specific prompts ...
  
  const systemMessage = `${KORA_CORE_SYSTEM}
    ... (includes JSON examples from getIntentPrompt)
  `;

  // Escape before passing to LangChain
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
  // Escape the classifier prompt as well
  const escapedPrompt = escapeForLangChain(INTENT_CLASSIFIER_PROMPT);
  
  return ChatPromptTemplate.fromMessages([
    ['system', escapedPrompt],
    ['human', '{message}'],
  ]);
};
```

---

## Testing
- ✅ Backend build passes
- 🔄 Deployment to Railway
- 🔄 Needs live testing with conversation flow

---

## Impact
This fix enables:
1. **Post-onboarding conversations** - Users can now chat with Kora after onboarding
2. **Spend decisions** - "Should I buy this?" queries work
3. **Safe spend checks** - "How much can I spend?" queries work
4. **Emotional support** - Stress/anxiety conversations work
5. **Post-spend logging** - "I just spent X" tracking works

---

## Files Changed
- `kora-backend/src/services/ai/prompts/conversation.prompts.ts`
  - Added `escapeForLangChain` function (lines 220-226)
  - Modified `createConversationPrompt` to escape system message (lines 228-256)
  - Modified `createIntentClassifierPrompt` to escape prompt (lines 258-266)

---

## Related Issues
This is the **same root cause** as Bug #1 (onboarding prompts). Both files had:
- JSON examples in prompts
- No escaping of curly braces
- LangChain template parser failures

The fix is identical in both cases: escape all literal curly braces before passing to `ChatPromptTemplate.fromMessages()`.

---

## Lessons Learned
1. **Any prompt with JSON examples needs escaping** - not just onboarding
2. **Test all AI chains** - fixing one doesn't mean others work
3. **Reusable escape function** - should be in a shared utility
4. **Template syntax is strict** - LangChain requires `{{` and `}}` for literals

---

## Remaining Issue

There's also a **database function missing**:
```
Could not find the function public.get_transaction_stats(p_end_date, p_start_date, p_user_id)
```

This needs to be created in Supabase, but it's a **separate issue** from the template parsing error.
