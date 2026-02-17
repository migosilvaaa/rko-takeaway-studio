-- Enable Row Level Security on all tables
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leader_presenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS_PROFILE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON users_profile
    FOR SELECT
    USING (id::text = auth.uid()::text);

-- Users can update their own profile (but cannot modify credits or admin flag)
CREATE POLICY users_update_own ON users_profile
    FOR UPDATE
    USING (id::text = auth.uid()::text)
    WITH CHECK (
        id::text = auth.uid()::text
        AND credits_remaining = (SELECT credits_remaining FROM users_profile WHERE id::text = auth.uid()::text)
        AND credits_used = (SELECT credits_used FROM users_profile WHERE id::text = auth.uid()::text)
        AND is_admin = (SELECT is_admin FROM users_profile WHERE id::text = auth.uid()::text)
    );

-- Admins can see all users
CREATE POLICY users_select_admin ON users_profile
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- Admins can update any user
CREATE POLICY users_update_admin ON users_profile
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- Allow service role to insert new users (for first sign-in)
CREATE POLICY users_insert_service ON users_profile
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- TRANSCRIPT POLICIES (public resource)
-- =====================================================

-- Everyone can read transcript
CREATE POLICY transcript_select_all ON transcript
    FOR SELECT
    USING (TRUE);

-- =====================================================
-- TRANSCRIPT_CHUNKS POLICIES (public resource)
-- =====================================================

-- Everyone can read transcript chunks
CREATE POLICY transcript_chunks_select_all ON transcript_chunks
    FOR SELECT
    USING (TRUE);

-- =====================================================
-- LEADER_PRESENTERS POLICIES
-- =====================================================

-- Everyone can read enabled presenters
CREATE POLICY presenters_select_enabled ON leader_presenters
    FOR SELECT
    USING (enabled = TRUE);

-- Admins can see all presenters
CREATE POLICY presenters_select_admin ON leader_presenters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- Admins can modify presenters
CREATE POLICY presenters_modify_admin ON leader_presenters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- =====================================================
-- GENERATIONS POLICIES
-- =====================================================

-- Users can read their own generations
CREATE POLICY generations_select_own ON generations
    FOR SELECT
    USING (user_id::text = auth.uid()::text);

-- Users can read public generations (for social board)
CREATE POLICY generations_select_public ON generations
    FOR SELECT
    USING (is_public = TRUE AND is_deleted = FALSE);

-- Admins can see all generations
CREATE POLICY generations_select_admin ON generations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- Users can create their own generations
CREATE POLICY generations_insert_own ON generations
    FOR INSERT
    WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own generations (for soft delete)
CREATE POLICY generations_update_own ON generations
    FOR UPDATE
    USING (user_id::text = auth.uid()::text);

-- Admins can update any generation
CREATE POLICY generations_update_admin ON generations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );

-- =====================================================
-- UPVOTES POLICIES
-- =====================================================

-- Users can read their own upvotes
CREATE POLICY upvotes_select_own ON upvotes
    FOR SELECT
    USING (user_id::text = auth.uid()::text);

-- Users can create upvotes
CREATE POLICY upvotes_insert_own ON upvotes
    FOR INSERT
    WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete their own upvotes
CREATE POLICY upvotes_delete_own ON upvotes
    FOR DELETE
    USING (user_id::text = auth.uid()::text);

-- =====================================================
-- APP_CONFIG POLICIES
-- =====================================================

-- Everyone can read app_config
CREATE POLICY app_config_select_all ON app_config
    FOR SELECT
    USING (TRUE);

-- Only admins can modify app_config
CREATE POLICY app_config_modify_admin ON app_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id::text = auth.uid()::text AND is_admin = TRUE
        )
    );
