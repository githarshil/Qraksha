-- Migration: Add voice_clips to merchant_credential and create tts_cache
-- Per Voice TTS optimization (Step 2 & Step 3)

-- 1. Add voice_clips JSONB to comparison.merchant_credential
ALTER TABLE comparison.merchant_credential
ADD COLUMN IF NOT EXISTS voice_clips JSONB DEFAULT '{}'::jsonb;

-- 2. Create comparison.tts_cache
CREATE TABLE IF NOT EXISTS comparison.tts_cache (
    hash VARCHAR(64) PRIMARY KEY,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_created_at ON comparison.tts_cache (created_at);

ALTER TABLE comparison.tts_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'comparison' AND tablename = 'tts_cache' AND policyname = 'Public read for tts_cache'
    ) THEN
        CREATE POLICY "Public read for tts_cache" ON comparison.tts_cache FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'comparison' AND tablename = 'tts_cache' AND policyname = 'Allow insert for tts_cache'
    ) THEN
        CREATE POLICY "Allow insert for tts_cache" ON comparison.tts_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'comparison' AND tablename = 'tts_cache' AND policyname = 'Service role full access on tts_cache'
    ) THEN
        CREATE POLICY "Service role full access on tts_cache" ON comparison.tts_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Create public.tts_cache mirror for public-scoped queries
CREATE TABLE IF NOT EXISTS public.tts_cache (
    hash VARCHAR(64) PRIMARY KEY,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tts_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tts_cache' AND policyname = 'Public read for public tts_cache'
    ) THEN
        CREATE POLICY "Public read for public tts_cache" ON public.tts_cache FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tts_cache' AND policyname = 'Public insert for public tts_cache'
    ) THEN
        CREATE POLICY "Public insert for public tts_cache" ON public.tts_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tts_cache' AND policyname = 'Service role full access on public tts_cache'
    ) THEN
        CREATE POLICY "Service role full access on public tts_cache" ON public.tts_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Create voice-clips storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-clips', 'voice-clips', true)
ON CONFLICT (id) DO UPDATE SET public = true;
