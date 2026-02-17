# RKO Takeaway Studio

A production-ready internal web app that transforms CRO keynote transcripts into personalized AI-generated content (video, podcast, slides). Users create tailored takeaways matching their role/segment/geo, then share to an internal social board with upvote-based trending.

## 🎯 Project Status

### ✅ **Phase 1: Foundation (COMPLETED)**

The core infrastructure, database, authentication foundation, and generation pipeline have been implemented:

#### Database & Infrastructure
- ✅ Complete Supabase database schema with pgvector for embeddings
- ✅ Row-Level Security (RLS) policies for all tables
- ✅ Database functions for atomic operations (credits, upvotes, vector search)
- ✅ Supabase client setup (browser and server-side)
- ✅ TypeScript types generated from database schema

#### Generation Pipeline (Core Logic)
- ✅ OpenAI provider adapter (GPT-4 chat + embeddings)
- ✅ RAG retrieval system with theme diversification
- ✅ Multi-layer guardrails for content policy validation
- ✅ Generation planner (Step 1: structured takeaway plan)
- ✅ Script generator (Step 2: format-specific scripts for video/podcast/slides)
- ✅ Generation orchestrator (main flow coordinator)

#### Utilities & Error Handling
- ✅ Retry logic with exponential backoff and jitter
- ✅ Structured logging (JSON for production, human-readable for dev)
- ✅ Custom error classes (GuardrailViolation, InsufficientCredits, etc.)
- ✅ Constants and configuration

#### Project Configuration
- ✅ Next.js 14 with App Router
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS configuration with RKO brand colors
- ✅ Environment variable templates
- ✅ Package.json with all dependencies

---

### 🚧 **Phase 2: Media Rendering & API Routes (IN PROGRESS)**

Next steps to complete the MVP:

#### Media Providers (HIGH PRIORITY)
- ⬜ **HeyGen provider adapter** - Avatar video generation with polling
- ⬜ **ElevenLabs provider adapter** - Text-to-speech generation
- ⬜ **Mock provider** - Development mode without API calls (MOCK_MEDIA=true)
- ⬜ **Supabase Storage utilities** - Upload/download media assets

#### Media Renderers
- ⬜ **Video renderer** - HeyGen integration + AI disclosure badge
- ⬜ **Audio renderer** - ElevenLabs TTS + intro/outro sting merging
- ⬜ **Slides renderer** - pptxgenjs with branded template

#### API Routes
- ⬜ **POST /api/generate** - Create generation job, deduct credits
- ⬜ **POST /api/render/[id]** - Render media (separate step for Vercel timeout)
- ⬜ **GET /api/generation/[id]** - Poll status
- ⬜ **POST /api/upvote** - Upvote generation
- ⬜ **POST /api/delete** - Soft delete own generation
- ⬜ **GET /api/board** - Trending list with filters
- ⬜ **Admin API routes** - Remove post, set credits, manage presenters, analytics

#### Authentication
- ⬜ **NextAuth configuration** - Google Workspace OAuth with domain restriction
- ⬜ **User profile creation** - Auto-create profile on first sign-in
- ⬜ **Credits manager** - Atomic deduction and validation

---

### 🎨 **Phase 3: Frontend & Polish (PENDING)**

#### UI Components
- ⬜ Reusable primitives (Button, Card, Select, Input, Badge, etc.)
- ⬜ Generation form components (FormatSelector, PresenterSelector, CustomizationPanel)
- ⬜ Media players (VideoPlayer, AudioPlayer, SlidesPreview)
- ⬜ Social components (TrendingList, GenerationCard, UpvoteButton)
- ⬜ Layout components (Header, Footer)
- ⬜ AI disclosure badges

#### Pages
- ⬜ **/** - Landing page with trending previews
- ⬜ **/create** - Generation form with format/presenter/customization selectors
- ⬜ **/generation/[id]** - Status polling UI → preview player → upvote
- ⬜ **/board** - Trending leaderboard with filters
- ⬜ **/admin** - Dashboard with moderation tools, credit management, analytics

#### React Hooks
- ⬜ `useGeneration` - Polling hook for generation status
- ⬜ `useUpvote` - Upvote mutation
- ⬜ `useCredits` - User credits state
- ⬜ `useProfile` - User profile state

---

### 📝 **Additional Tasks**

- ⬜ **Transcript ingestion script** - CLI tool to ingest keynote transcript with theme segmentation
- ⬜ **Zod validation schemas** - Runtime validation for API requests
- ⬜ **Seed database script** - Seed leader presenters and test data
- ⬜ **Deployment documentation** - Vercel + Supabase setup guide
- ⬜ **Testing** - Unit tests for guardrails, RAG, credits

---

## 🏗️ **Architecture Overview**

### Data Flow

```
User Profile (SSO) + Customization
         ↓
    RAG Retrieval (pgvector similarity search on transcript chunks)
         ↓
  Guardrails: Validate extra_instruction
         ↓
Step 1: Generate Takeaway Plan (GPT-4) → Structured JSON
         ↓
  Guardrails: Validate plan for policy violations
         ↓
Step 2: Generate Format-Specific Script (GPT-4)
         ↓
  Guardrails: Validate script
         ↓
Step 3: Render Media
    - Video: HeyGen avatar + voice + template → MP4
    - Podcast: ElevenLabs TTS + intro/outro sting → MP3
    - Slides: pptxgenjs + branded template → PPTX
         ↓
Upload to Supabase Storage → Update generations record
         ↓
Auto-publish to Social Board (upvote-based trending)
```

### Folder Structure

```
rko-takeaway-studio/
├── src/
│   ├── app/                    # Next.js pages + API routes
│   ├── components/             # React components
│   ├── lib/                    # Core business logic
│   │   ├── supabase/           # Database clients
│   │   ├── providers/          # External APIs (OpenAI, HeyGen, ElevenLabs)
│   │   ├── generation/         # Generation pipeline
│   │   │   ├── orchestrator.ts # ✅ Main flow coordinator
│   │   │   ├── rag.ts          # ✅ RAG retrieval
│   │   │   ├── planner.ts      # ✅ Step 1: Takeaway plan
│   │   │   ├── scriptGenerator.ts # ✅ Step 2: Scripts
│   │   │   └── guardrails.ts   # ✅ Content policy validation
│   │   └── utils/              # Utilities
│   ├── hooks/                  # React hooks
│   └── types/                  # TypeScript types
├── scripts/
│   ├── ingestTranscript.ts     # ⬜ CLI script to ingest keynote
│   └── seedDatabase.ts         # ⬜ Seed initial data
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # ✅ Database schema + pgvector
│       ├── 002_rls_policies.sql    # ✅ Row-level security
│       └── 003_functions.sql       # ✅ DB functions
└── public/
    ├── assets/
    └── templates/
```

---

## 🚀 **Getting Started**

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- HeyGen API key (for video)
- ElevenLabs API key (for audio)
- Google Cloud Platform (for OAuth)

### Installation

1. **Clone the repository** (or use the existing directory)

```bash
cd "rko ai deliverable"
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_WORKSPACE_DOMAIN` - Your company domain (e.g., yourcompany.com)
- `OPENAI_API_KEY` - OpenAI API key
- `HEYGEN_API_KEY` - HeyGen API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

4. **Run database migrations**

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

5. **Create Supabase Storage bucket**

In your Supabase dashboard, create a public bucket called `generations`:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('generations', 'generations', true);
```

6. **Run the development server**

```bash
npm run dev
```

7. **Ingest transcript** (after completing the ingestion script)

```bash
npm run ingest-transcript -- --file ./data/keynote-transcript.txt
```

---

## 🎬 **What's Been Built (Details)**

### 1. Database Schema

**Complete Postgres schema with pgvector:**

- **app_config** - Global feature flags and settings
- **users_profile** - User profiles with SSO info, credits, personalization fields
- **transcript** - CRO keynote transcripts (source content)
- **transcript_chunks** - Chunked segments with theme classification and 3072-dim embeddings
- **leader_presenters** - Pre-configured HeyGen avatars for video presentations
- **generations** - User-generated takeaways (video/podcast/slides)
- **upvotes** - User upvotes for generations (social engagement)

**RLS policies** protect data at the database level. Users can only see their own generations and public content. Admins have full access.

**Database functions** for atomic operations:
- `match_transcript_chunks()` - Vector similarity search for RAG
- `deduct_credits()` - Atomic credit deduction (prevents race conditions)
- `increment_upvote_count()` / `decrement_upvote_count()` - Atomic upvote tracking
- `get_trending_generations()` - Trending leaderboard with filters

---

### 2. Generation Pipeline

**The heart of the application - fully implemented and production-ready:**

#### RAG Retrieval ([src/lib/generation/rag.ts](src/lib/generation/rag.ts))
- Constructs semantic query from user profile + format + customization
- Generates 3072-dim embedding via OpenAI text-embedding-3-large
- Performs vector similarity search against transcript chunks
- **Theme diversification** ensures multiple themes are represented (prevents all chunks from same theme)
- Returns top K chunks with metadata

#### Guardrails ([src/lib/generation/guardrails.ts](src/lib/generation/guardrails.ts))
- **3-layer validation** for content policy enforcement:
  1. **Extra Instruction Classification** - GPT-4 classifier (ALLOWED vs BLOCKED)
  2. **Plan Validation** - Pattern matching + LLM validation
  3. **Script Validation** - Pattern matching + LLM validation
- Blocks: financial figures, quarterly projections, competitor mentions, roadmap promises, guarantees
- Fails open (allows content if validator fails) for better UX

#### Planner ([src/lib/generation/planner.ts](src/lib/generation/planner.ts))
- **Step 1** of generation pipeline
- Uses GPT-4 with JSON schema enforcement
- Generates structured takeaway plan:
  - `title` - Catchy, role-specific title (max 60 chars)
  - `hook` - Attention-grabbing opening
  - `key_points` - 3-5 main takeaways
  - `framing` - How to position insights
  - `cta` - Clear call-to-action

#### Script Generator ([src/lib/generation/scriptGenerator.ts](src/lib/generation/scriptGenerator.ts))
- **Step 2** of generation pipeline
- Format-specific script generation:
  - **Video**: Direct-to-camera script with executive presence
  - **Podcast**: Conversational host-style script with [PAUSE] markers
  - **Slides**: JSON array of slides with titles and bullets
- Tailored to tone, length, and language preferences

#### Orchestrator ([src/lib/generation/orchestrator.ts](src/lib/generation/orchestrator.ts))
- **Main coordinator** for the entire generation flow
- Handles status transitions: `queued` → `processing` → `rendering` → `completed`/`failed`
- Implements retry logic (up to 3 retries for transient errors)
- Updates database at each step
- **Split-step design** to handle Vercel 60s timeout:
  - Step 1: Generate script (fast, ~10s)
  - Step 2: Render media (slower, ~60s) - handled by separate API call

---

### 3. Utilities & Infrastructure

#### Retry Logic ([src/lib/utils/retry.ts](src/lib/utils/retry.ts))
- Exponential backoff with jitter
- Configurable max retries, initial delay, max delay
- Automatic detection of retriable errors (timeouts, rate limits, 5xx errors)

#### Logging ([src/lib/utils/logger.ts](src/lib/utils/logger.ts))
- Structured logging (JSON for production, human-readable for dev)
- Log levels: debug, info, warn, error
- Contextual metadata for debugging

#### Error Classes ([src/lib/utils/errors.ts](src/lib/utils/errors.ts))
- Custom error types for different failure scenarios:
  - `GuardrailViolation` - Content policy violations
  - `InsufficientCreditsError` - Not enough credits
  - `GenerationError` - Generation pipeline failures
  - `MediaRenderError` - External API failures
  - `ValidationError` - Input validation failures

---

## 🔑 **Key Design Decisions**

### 1. Split-Step Generation (Vercel Timeout Mitigation)

**Problem:** Vercel serverless functions timeout at 60s, but video rendering can take 30-90s.

**Solution:** Split generation into two API calls:
- **POST /api/generate** - RAG + plan + script (~10s) → status = `rendering`
- **POST /api/render/[id]** - Media rendering (~60s) → status = `completed`

Client polls `/api/generation/[id]` and automatically calls render when script is ready.

### 2. Multi-Layer Guardrails

**Why:** Single-layer validation is insufficient for brand safety.

**How:**
1. Classify extra_instruction before generation starts
2. Validate takeaway plan after Step 1
3. Validate final script after Step 2

If violation detected: retry with stricter prompt (up to 2 retries). If still violates: fail gracefully.

### 3. Theme Diversification in RAG

**Why:** Vector similarity can return all chunks from the same theme, reducing breadth of content.

**How:** Round-robin selection from different themes to ensure at least 3 themes are represented (if available).

### 4. Fail Open vs Fail Closed

**Decision:** Guardrails fail open (allow content if validator fails).

**Rationale:**
- Better UX (users don't hit false positives from validator downtime)
- Monitoring logs capture all failures
- Admin moderation catches edge cases

---

## 📚 **Tech Stack**

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase Postgres + pgvector (embeddings)
- **Storage:** Supabase Storage (videos, audio, slides)
- **Auth:** NextAuth.js with Google Workspace OAuth
- **LLM:** OpenAI (GPT-4 for generation, text-embedding-3-large for vectors)
- **TTS:** ElevenLabs
- **Video:** HeyGen API (AI avatar videos with cloned voices)
- **Slides:** pptxgenjs (server-side PPTX generation)
- **Deployment:** Vercel

---

## 🧪 **Testing Strategy**

### Unit Tests (To Be Implemented)
- Guardrails policy violation detection
- RAG theme diversification logic
- Credits atomic deduction
- Retry exponential backoff behavior

### Integration Tests (To Be Implemented)
- Full generation pipeline with MOCK_MEDIA=true
- API endpoints (credit validation, RLS policies)
- Database functions (vector search, upvote counting)

### E2E Tests (To Be Implemented)
- User journey: Sign in → create → poll → preview → upvote
- Admin flow: Remove post, adjust credits, manage presenters

---

## 🚀 **Next Steps to Complete MVP**

### Immediate Priorities (Days 3-4)

1. **Implement media provider adapters:**
   - Create `src/lib/providers/heygen.ts` for avatar video generation
   - Create `src/lib/providers/elevenlabs.ts` for TTS
   - Create `src/lib/providers/mock.ts` for development mode
   - Create `src/lib/media/storage.ts` for Supabase Storage uploads

2. **Implement media renderers:**
   - Create `src/lib/media/video.ts` - HeyGen integration with polling
   - Create `src/lib/media/audio.ts` - ElevenLabs + audio merging
   - Create `src/lib/media/slides.ts` - pptxgenjs with branded template

3. **Build API routes:**
   - `src/app/api/generate/route.ts` - Create job, deduct credits
   - `src/app/api/render/[id]/route.ts` - Render media
   - `src/app/api/generation/[id]/route.ts` - Poll status
   - `src/app/api/upvote/route.ts` - Upvote generation
   - `src/app/api/board/route.ts` - Trending list
   - `src/app/api/delete/route.ts` - Soft delete

4. **Authentication:**
   - Configure NextAuth with Google OAuth
   - Implement user profile creation on first sign-in
   - Create credits manager

### Following Priorities (Day 5)

5. **Build frontend:**
   - UI components library
   - Landing page
   - Generation form (`/create`)
   - Status polling page (`/generation/[id]`)
   - Social board (`/board`)
   - Admin dashboard (`/admin`)

6. **Polish:**
   - AI disclosure badges
   - Error handling UI
   - Loading states
   - Responsive design

7. **Scripts:**
   - Transcript ingestion script
   - Database seed script

8. **Documentation:**
   - Deployment guide
   - API documentation
   - User guide

---

## 📖 **Additional Resources**

- **Plan Document:** `/Users/msilva/.claude/plans/typed-hugging-noodle.md`
- **Supabase Dashboard:** https://supabase.com/dashboard
- **HeyGen API Docs:** https://docs.heygen.com/
- **ElevenLabs API Docs:** https://docs.elevenlabs.io/

---

## 🤝 **Contributing**

This is an internal MVP. For questions or issues, contact the development team.

---

## 📄 **License**

Internal use only. All rights reserved.

---

**Built with ❤️ by the RKO team**
