# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier is fine)

## 1. Install Dependencies
```bash
npm install
```

## 2. Set up Supabase (5 minutes)

### Create a Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for it to initialize (~2 minutes)

### Run Migrations
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Push migrations:
   ```bash
   supabase db push
   ```

4. Create storage bucket (in Supabase SQL Editor):
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('generations', 'generations', true);
   ```

### Get Your Credentials
- In Supabase Dashboard → Settings → API:
  - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Create .env.local

```bash
# Copy example and fill in your values
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
# REQUIRED: Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# REQUIRED: NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# OPTIONAL: Enable mock mode to skip API setup
MOCK_MEDIA=true

# OPTIONAL: Add these later for real generation
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 4. Seed Initial Data

### Create a test user (in Supabase SQL Editor):
```sql
INSERT INTO users_profile (email, name, role, segment, geo, function, credits_remaining, is_admin)
VALUES
  ('test@miro.com', 'Test User', 'Product Manager', 'Enterprise', 'North America', 'Product', 3, false),
  ('admin@miro.com', 'Admin User', 'CRO', 'Leadership', 'Global', 'Executive', 100, true);
```

### Add a test presenter (for video generation):
```sql
INSERT INTO leader_presenters (name, title, heygen_avatar_id, heygen_voice_id, heygen_template_id, enabled)
VALUES ('Jane Smith', 'CRO', 'test-avatar', 'test-voice', 'test-template', true);
```

### Ingest sample transcript:
```bash
npm run ingest-transcript -- --file ./data/sample-transcript.txt
```

## 5. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser! 🎉

## Testing Without OAuth

If you haven't set up Google OAuth yet, you can still test the API endpoints directly:

```bash
# Test generation endpoint (after setting up Supabase)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "format": "video",
    "language": "en",
    "tone": "professional",
    "length": "medium"
  }'
```

## Mock Mode

With `MOCK_MEDIA=true`, the app will:
- ✅ Generate realistic fake URLs instead of calling real APIs
- ✅ Complete in ~2 seconds instead of 30-90 seconds
- ✅ Not cost any money (no OpenAI/HeyGen/Sieve calls)
- ✅ Let you test the full UI flow

Perfect for development and UI testing!

## Troubleshooting

### "Cannot connect to Supabase"
- Check your `.env.local` has correct Supabase URL and keys
- Verify your Supabase project is running (not paused)

### "NextAuth error"
- Generate a NEXTAUTH_SECRET: `openssl rand -base64 32`
- Make sure NEXTAUTH_URL is set to `http://localhost:3000`

### "Migrations failed"
- Make sure Supabase CLI is installed: `npm install -g supabase`
- Re-link your project: `supabase link --project-ref YOUR_REF`

### "npm command not found"
- Install Node.js 18+: https://nodejs.org/

## Next Steps

Once everything is running:
1. ✅ Test the UI with mock mode
2. 🔑 Set up Google OAuth for real authentication
3. 🤖 Add OpenAI API key for real generation
4. 🎬 Add HeyGen/Sieve/Gamma keys for media rendering
5. 🚀 Deploy to Vercel for production

Happy building! 🎉
