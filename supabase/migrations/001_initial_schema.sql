-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App-wide configuration table
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO app_config (key, value) VALUES
    ('feature_flags', '{"generation_enabled": true, "video_enabled": true, "podcast_enabled": true, "slides_enabled": true}'::jsonb),
    ('generation_limits', '{"max_extra_instruction_length": 200, "max_retries": 3, "timeout_seconds": 90}'::jsonb),
    ('credit_settings', '{"default_credits": 3, "cost_per_generation": 1}'::jsonb);

-- User profiles (extends NextAuth users)
CREATE TABLE users_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,

    -- Profile attributes for personalization
    role TEXT,
    segment TEXT,
    geo TEXT,
    function TEXT,

    -- Credits system
    credits_remaining INTEGER DEFAULT 3 NOT NULL,
    credits_used INTEGER DEFAULT 0 NOT NULL,

    -- Admin flag
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keynote transcript (single source of truth)
CREATE TABLE transcript (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    event_name TEXT,
    speaker_name TEXT,
    raw_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript chunks with embeddings for RAG
CREATE TABLE transcript_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES transcript(id) ON DELETE CASCADE,

    -- Content
    theme TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Embedding for semantic search (text-embedding-3-large = 3072 dimensions)
    embedding vector(3072),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per chunk
    CONSTRAINT unique_chunk UNIQUE (transcript_id, chunk_index)
);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX transcript_chunks_embedding_idx ON transcript_chunks
    USING hnsw (embedding vector_cosine_ops);

-- Create index on transcript_id for faster joins
CREATE INDEX transcript_chunks_transcript_id_idx ON transcript_chunks(transcript_id);

-- Leader presenters (pre-configured HeyGen avatars)
CREATE TABLE leader_presenters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title TEXT,

    -- HeyGen integration
    heygen_avatar_id TEXT NOT NULL,
    heygen_voice_id TEXT NOT NULL,
    heygen_template_id TEXT,

    -- Display
    thumbnail_url TEXT,
    description TEXT,

    -- Controls
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generations (user-created outputs)
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,

    -- Format
    format TEXT NOT NULL CHECK (format IN ('video', 'podcast', 'slides')),

    -- Input parameters
    presenter_id UUID REFERENCES leader_presenters(id) ON DELETE SET NULL,
    language TEXT DEFAULT 'en' NOT NULL,
    tone TEXT DEFAULT 'professional',
    length TEXT DEFAULT 'medium',
    extra_instruction TEXT,

    -- RAG context used
    rag_query TEXT,
    rag_chunks_used UUID[] DEFAULT '{}',

    -- Generated content
    takeaway_plan JSONB,
    script TEXT,

    -- Output URLs
    output_urls JSONB DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,

    -- Status tracking
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'rendering', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Engagement
    upvotes_count INTEGER DEFAULT 0 NOT NULL,
    views_count INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Constraint on extra_instruction length
    CONSTRAINT valid_extra_instruction_length CHECK (LENGTH(extra_instruction) <= 200)
);

-- Indexes for generations
CREATE INDEX generations_user_id_idx ON generations(user_id);
CREATE INDEX generations_status_idx ON generations(status);
CREATE INDEX generations_public_upvotes_idx ON generations(is_public, upvotes_count DESC) WHERE is_deleted = FALSE;
CREATE INDEX generations_created_at_idx ON generations(created_at DESC);
CREATE INDEX generations_format_idx ON generations(format);

-- Upvotes (user-generation join table)
CREATE TABLE upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate upvotes
    CONSTRAINT unique_upvote UNIQUE (user_id, generation_id)
);

-- Indexes for upvotes
CREATE INDEX upvotes_generation_id_idx ON upvotes(generation_id);
CREATE INDEX upvotes_user_id_idx ON upvotes(user_id);

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generations_updated_at BEFORE UPDATE ON generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leader_presenters_updated_at BEFORE UPDATE ON leader_presenters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE app_config IS 'Global application configuration and feature flags';
COMMENT ON TABLE users_profile IS 'User profiles with SSO info, credits, and personalization fields';
COMMENT ON TABLE transcript IS 'CRO keynote transcripts (source content)';
COMMENT ON TABLE transcript_chunks IS 'Chunked transcript segments with theme classification and embeddings';
COMMENT ON TABLE leader_presenters IS 'Pre-configured HeyGen avatars for video presentations';
COMMENT ON TABLE generations IS 'User-generated takeaways (video/podcast/slides)';
COMMENT ON TABLE upvotes IS 'User upvotes for generations (social engagement)';
