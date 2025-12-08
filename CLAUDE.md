# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Kora is a voice-first personal finance app. This monorepo contains:

- **kora-app/** - Expo/React Native mobile app
- **kora-backend/** - Fastify API server

## Build and Development Commands

### Root Commands (npm workspaces)
```bash
npm install              # Install all workspace dependencies
npm run lint             # Lint all workspaces
```

### Mobile App (kora-app/)
```bash
npm run app:start        # Start Expo dev server
npm run app:ios          # Start iOS simulator
npm run app:android      # Start Android emulator
npm run app:web          # Start web version
npm run app:lint         # Run ESLint
```

### Backend (kora-backend/)
```bash
npm run backend:dev      # Start dev server with hot reload
npm run backend:build    # Build for production
npm run backend:start    # Start production server
npm run backend:lint     # Type-check
```

## Architecture Overview

### Mobile App (kora-app/)

Built with Expo (SDK 54) and React Native. Uses Expo Router for file-based routing.

**Routing:**
- `app/index.tsx` - Home: Safe Spend display, transactions, voice button
- `app/onboarding/` - Conversational onboarding flow
- `app/voice-session.tsx` - Voice interaction modal
- `app/add-transaction.tsx` - Manual transaction entry
- `app/settings/` - User settings

**State Management:** Zustand with MMKV persistence
- `store/user-store.ts` - User profile, income, payday, fixed expenses
- `store/transaction-store.ts` - Transactions and Safe Spend calculations

**Design System:** react-native-ui-lib (initialized in `constants/design-system.ts`)

**Path Aliases:** `@/` maps to kora-app root

### Backend (kora-backend/)

Built with Fastify and TypeScript.

**Structure:**
- `src/routes/` - API endpoints (auth, users, transactions, AI)
- `src/services/` - Business logic
- `src/services/ai/` - LangChain AI orchestration
- `src/middleware/` - Auth & error handling
- `src/schemas/` - Zod validation
- `supabase/migrations/` - Database migrations

**Key Services:**
- Supabase (PostgreSQL + Auth)
- OpenAI Whisper (speech-to-text)
- Mistral AI (LLM responses)
- ElevenLabs (text-to-speech)

**Deployment:** Railway (uses Dockerfile)

## Environment Variables

### kora-app/.env
```
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_MISTRAL_API_KEY=
EXPO_PUBLIC_ELEVENLABS_API_KEY=
```

### kora-backend/.env
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
MISTRAL_API_KEY=
ELEVENLABS_API_KEY=
```

## Git Hooks

Pre-commit hooks run automatically via Husky + lint-staged:
- **kora-app/** files: ESLint with auto-fix
- **kora-backend/** files: TypeScript type-check

## Codacy Integration

When using Codacy's MCP Server tools:
- provider: `gh`
- organization: `playbookTV`
- repository: `kora`

Run `codacy_cli_analyze` after file edits and dependency changes (with `tool: "trivy"` for security scanning).

## Database Setup

Run SQL migrations in Supabase SQL editor in order:
1. `kora-backend/supabase/migrations/001_profiles.sql`
2. `kora-backend/supabase/migrations/002_fixed_expenses.sql`
3. `kora-backend/supabase/migrations/003_transactions.sql`
4. `kora-backend/supabase/migrations/004_conversation_history.sql`
