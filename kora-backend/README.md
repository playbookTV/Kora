# Kora Backend

Backend API for Kora - a voice-first personal finance app.

## Tech Stack

- **Framework**: Fastify
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Orchestration**: LangChain with Mistral AI
- **Speech-to-Text**: OpenAI Whisper
- **Text-to-Speech**: ElevenLabs
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js >= 20
- A Supabase project
- API keys for OpenAI, Mistral AI, and ElevenLabs

### Installation

```bash
cd kora-backend
npm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key (for Whisper)
- `MISTRAL_API_KEY` - Mistral AI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

### Database Setup

Run the SQL migrations in your Supabase SQL editor (in order):
1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_fixed_expenses.sql`
3. `supabase/migrations/003_transactions.sql`
4. `supabase/migrations/004_conversation_history.sql`

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - API info

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout (requires auth)
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user (requires auth)

### User Profile
- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `POST /users/complete-onboarding` - Mark onboarding complete
- `DELETE /users/account` - Delete account

### Fixed Expenses
- `GET /users/expenses` - List expenses
- `POST /users/expenses` - Add expense
- `PUT /users/expenses/:id` - Update expense
- `DELETE /users/expenses/:id` - Delete expense

### Transactions
- `GET /transactions` - List transactions (paginated)
- `POST /transactions` - Add transaction
- `GET /transactions/:id` - Get transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /transactions/stats` - Get spending stats

### AI Conversation
- `POST /ai/transcribe` - Upload audio, get transcription
- `POST /ai/chat` - Text chat with Kora
- `POST /ai/onboarding` - Onboarding conversation
- `POST /ai/voice` - Full voice pipeline (audio in/out)
- `POST /ai/tts` - Text-to-speech

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

Get tokens from `/auth/login` or `/auth/signup`.

## Deployment (Railway)

1. Create a new Railway project
2. Connect your GitHub repository
3. Add environment variables from `.env.example`
4. Deploy! Railway will use the `Dockerfile` automatically.

## Project Structure

```
kora-backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── app.ts             # Fastify setup
│   ├── config/            # Environment & Supabase config
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   │   └── ai/            # LangChain AI services
│   ├── middleware/        # Auth & error handling
│   ├── schemas/           # Zod validation schemas
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # SQL migrations
├── package.json
├── tsconfig.json
├── Dockerfile
└── railway.json
```

## License

ISC
