# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npx expo start       # Start development server (press i for iOS, a for Android, w for web)
npm run ios          # Start iOS simulator directly
npm run android      # Start Android emulator directly
npm run web          # Start web version directly
npm run lint         # Run ESLint
```

## Architecture Overview

Kora is a voice-first personal finance app built with Expo (SDK 54) and React Native. The app helps users track spending through conversational AI interactions with a "Safe Spend" concept.

### Routing Structure

Uses Expo Router with file-based routing. Root layout (`app/_layout.tsx`) handles auth-gating based on `hasOnboarded` state:

- `app/index.tsx` - Home screen: Safe Spend display, transaction list, voice mic button
- `app/onboarding/` - Multi-step conversational onboarding flow
- `app/voice-session.tsx` - Modal for voice interactions
- `app/add-transaction.tsx` - Manual transaction entry modal
- `app/settings/` - User settings

### State Management

Uses **Zustand** with **MMKV** persistence:

- `store/user-store.ts` - User profile: income, payday, fixed expenses, onboarding status
- `store/transaction-store.ts` - Transactions and computed Safe Spend values

Key pattern: `useUserStore.getState()` can be called from transaction store to access user data for Safe Spend calculations.

### AI Services (`services/`)

- `ai-service.ts` - Orchestrates voice interactions:
  - **Whisper** (OpenAI) for speech-to-text
  - **Mistral** for LLM responses (onboarding + conversation flows)
  - **ElevenLabs** for text-to-speech (falls back to Expo Speech)
- `kora-onboarding-prompt.ts` - System prompts for onboarding extraction
- `kora-conversation-prompt.ts` - Intent classification and response prompts
- `finance-engine.ts` - Core calculations: `calculateDaysToPayday()`, `calculateSafeSpend()`

### Design System

Uses **react-native-ui-lib**. System initialized in `constants/design-system.ts`:
- Colors: primary (#1E1E1E), status colors (success/warning/error)
- Typography: h1-h3, body, small
- Spacings: page, card, s1-s10

Components use ui-lib modifiers like `<Text h1 textDefault>` and `<View padding-page>`.

### Environment Variables

Required in `.env` (prefixed with `EXPO_PUBLIC_`):
- `EXPO_PUBLIC_OPENAI_API_KEY` - Whisper transcription
- `EXPO_PUBLIC_MISTRAL_API_KEY` - LLM responses
- `EXPO_PUBLIC_ELEVENLABS_API_KEY` - Voice synthesis

### Path Aliases

The `@/` alias maps to the project root (e.g., `@/components/`, `@/store/`)

## Codacy Integration

When using Codacy's MCP Server tools:
- provider: `gh`
- organization: `playbookTV`
- repository: `kora-app`

Run `codacy_cli_analyze` after file edits and dependency changes (with `tool: "trivy"` for security scanning).
