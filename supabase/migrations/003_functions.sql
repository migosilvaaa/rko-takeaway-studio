-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to increment upvote count atomically
CREATE OR REPLACE FUNCTION increment_upvote_count(generation_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE generations
    SET upvotes_count = upvotes_count + 1
    WHERE id = generation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement upvote count atomically
CREATE OR REPLACE FUNCTION decrement_upvote_count(generation_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE generations
    SET upvotes_count = GREATEST(upvotes_count - 1, 0)
    WHERE id = generation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits atomically (returns success boolean)
CREATE OR REPLACE FUNCTION deduct_credits(user_uuid UUID, amount INTEGER DEFAULT 1)
RETURNS boolean AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Lock the row for update
    SELECT credits_remaining INTO current_credits
    FROM users_profile
    WHERE id = user_uuid
    FOR UPDATE;

    -- Check if sufficient credits
    IF current_credits < amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct credits
    UPDATE users_profile
    SET
        credits_remaining = credits_remaining - amount,
        credits_used = credits_used + amount
    WHERE id = user_uuid;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_transcript_chunks(
    query_embedding vector(3072),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    transcript_id UUID,
    theme TEXT,
    content TEXT,
    token_count INTEGER,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        transcript_chunks.id,
        transcript_chunks.transcript_id,
        transcript_chunks.theme,
        transcript_chunks.content,
        transcript_chunks.token_count,
        1 - (transcript_chunks.embedding <=> query_embedding) AS similarity
    FROM transcript_chunks
    WHERE 1 - (transcript_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY transcript_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to increment views count
CREATE OR REPLACE FUNCTION increment_views_count(generation_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE generations
    SET views_count = views_count + 1
    WHERE id = generation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending generations (for board page)
CREATE OR REPLACE FUNCTION get_trending_generations(
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    format_filter TEXT DEFAULT NULL,
    time_filter INTERVAL DEFAULT INTERVAL '30 days'
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    format TEXT,
    language TEXT,
    tone TEXT,
    output_urls JSONB,
    thumbnail_url TEXT,
    upvotes_count INTEGER,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.user_id,
        g.format,
        g.language,
        g.tone,
        g.output_urls,
        g.thumbnail_url,
        g.upvotes_count,
        g.views_count,
        g.created_at,
        u.name AS user_name,
        u.email AS user_email
    FROM generations g
    JOIN users_profile u ON g.user_id = u.id
    WHERE
        g.is_public = TRUE
        AND g.is_deleted = FALSE
        AND g.status = 'completed'
        AND g.created_at > NOW() - time_filter
        AND (format_filter IS NULL OR g.format = format_filter)
    ORDER BY g.upvotes_count DESC, g.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has upvoted a generation
CREATE OR REPLACE FUNCTION user_has_upvoted(
    user_uuid UUID,
    generation_uuid UUID
)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM upvotes
        WHERE user_id = user_uuid AND generation_id = generation_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_upvote_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_upvote_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION match_transcript_chunks(vector(3072), float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_views_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_generations(INTEGER, INTEGER, TEXT, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_upvoted(UUID, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION increment_upvote_count IS 'Atomically increment upvote count for a generation';
COMMENT ON FUNCTION decrement_upvote_count IS 'Atomically decrement upvote count for a generation';
COMMENT ON FUNCTION deduct_credits IS 'Atomically deduct credits from user account (returns false if insufficient)';
COMMENT ON FUNCTION match_transcript_chunks IS 'Vector similarity search for RAG retrieval';
COMMENT ON FUNCTION increment_views_count IS 'Atomically increment views count for a generation';
COMMENT ON FUNCTION get_trending_generations IS 'Get trending generations with filters and pagination';
COMMENT ON FUNCTION user_has_upvoted IS 'Check if user has upvoted a specific generation';
