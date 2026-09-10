-- Huevify Supabase Database Schema
-- Run this SQL in your Supabase Project -> SQL Editor

-- 1. Releases Table
CREATE TABLE IF NOT EXISTS public.releases (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    submission_time TIMESTAMPTZ DEFAULT NOW(),
    deletion_requested BOOLEAN DEFAULT FALSE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Album',
    genre TEXT DEFAULT 'Various',
    label TEXT DEFAULT 'Independent',
    covers JSONB DEFAULT '[]'::jsonb,
    additional_main_artists JSONB DEFAULT '[]'::jsonb,
    tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
    release_date TIMESTAMPTZ DEFAULT NOW(),
    release_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Artist Accounts Table
CREATE TABLE IF NOT EXISTS public.artist_accounts (
    id TEXT PRIMARY KEY,
    artist_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    status TEXT NOT NULL DEFAULT 'APPROVED',
    artist_pick JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    custom_cover TEXT,
    tracks JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    owner_id TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    creator_name TEXT,
    creator_avatar TEXT,
    saved_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Preferences Table (Likes, Follows, History, Settings)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id TEXT PRIMARY KEY,
    liked_album_ids JSONB DEFAULT '[]'::jsonb,
    followed_artists JSONB DEFAULT '[]'::jsonb,
    recently_played JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Track Plays & Analytics Table
CREATE TABLE IF NOT EXISTS public.track_plays (
    track_id TEXT PRIMARY KEY,
    plays BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Daily Chart Table
CREATE TABLE IF NOT EXISTS public.daily_chart (
    track_id TEXT PRIMARY KEY,
    track_data JSONB NOT NULL,
    daily_plays BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Profile Edit Requests Table
CREATE TABLE IF NOT EXISTS public.profile_edit_requests (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    new_avatar TEXT,
    new_bio TEXT,
    new_artist_pick JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Moderator Accounts Table
CREATE TABLE IF NOT EXISTS public.moderator_accounts (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for app prototype clients with anon key
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access releases" ON public.releases;
    CREATE POLICY "Public access releases" ON public.releases FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access artist_accounts" ON public.artist_accounts;
    CREATE POLICY "Public access artist_accounts" ON public.artist_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access users" ON public.users;
    CREATE POLICY "Public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access moderator_accounts" ON public.moderator_accounts;
    CREATE POLICY "Public access moderator_accounts" ON public.moderator_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access playlists" ON public.playlists;
    CREATE POLICY "Public access playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access user_preferences" ON public.user_preferences;
    CREATE POLICY "Public access user_preferences" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access track_plays" ON public.track_plays;
    CREATE POLICY "Public access track_plays" ON public.track_plays FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access daily_chart" ON public.daily_chart;
    CREATE POLICY "Public access daily_chart" ON public.daily_chart FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access profile_edit_requests" ON public.profile_edit_requests;
    CREATE POLICY "Public access profile_edit_requests" ON public.profile_edit_requests FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime publication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.releases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderator_accounts;

-- ==============================================================================
-- 9. STORAGE BUCKET CONFIGURATION ('media')
-- Holds audio files (.mp3, .wav, .flac), album/single covers, avatars, and playlist art
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow media insert" ON storage.objects;
    DROP POLICY IF EXISTS "Allow media select" ON storage.objects;
    DROP POLICY IF EXISTS "Allow media update" ON storage.objects;
    DROP POLICY IF EXISTS "Allow media delete" ON storage.objects;

    CREATE POLICY "Allow media insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
    CREATE POLICY "Allow media select" ON storage.objects FOR SELECT USING (bucket_id = 'media');
    CREATE POLICY "Allow media update" ON storage.objects FOR UPDATE USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
    CREATE POLICY "Allow media delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
END $$;
