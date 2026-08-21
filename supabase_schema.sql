-- Supabase Schema & Row Level Security (RLS) for Lyra Companion
-- Complete database definitions mirroring IndexedDB stores with real-time cloud sync

-- ============================================================================
-- 1. Profiles Table (Auth & 18+ Verification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  birthdate DATE,
  is_adult_confirmed BOOLEAN DEFAULT false NOT NULL,
  ai_disclosure_accepted BOOLEAN DEFAULT false NOT NULL,
  migrated BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id AND 
    is_adult_confirmed = true AND 
    (birthdate IS NULL OR birthdate <= (CURRENT_DATE - INTERVAL '18 years'))
  );

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    is_adult_confirmed = true
  );

CREATE POLICY "Users can delete their own profile" 
  ON public.profiles 
  FOR DELETE 
  USING (auth.uid() = id);

-- ============================================================================
-- 2. Companions Table (Avatar, Voice, Wardrobe, Seed Context)
-- NOTE: Strictly NO age field on companions! (Permanent rule)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Lyra',
  user_name TEXT,
  vibe TEXT DEFAULT 'Warm & Gentle',
  interests JSONB DEFAULT '[]'::jsonb,
  voice_uri TEXT,
  pitch NUMERIC DEFAULT 1.05,
  rate NUMERIC DEFAULT 0.98,
  language TEXT DEFAULT 'en-US',
  scenery TEXT DEFAULT 'neutral',
  outfit TEXT DEFAULT '/models/lyra.vrm',
  initialized BOOLEAN DEFAULT true,
  daily_check_in_enabled BOOLEAN DEFAULT false,
  daily_check_in_time TEXT DEFAULT '09:00',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own companion" 
  ON public.companions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companion" 
  ON public.companions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companion" 
  ON public.companions 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companion" 
  ON public.companions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Messages Table (Conversation History & Viseme/Emotion metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  emotion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_user_timestamp ON public.messages(user_id, timestamp ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" 
  ON public.messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" 
  ON public.messages 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
  ON public.messages 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Memories Table (Extracted Facts & Seed Information)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_user_timestamp ON public.memories(user_id, timestamp DESC);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" 
  ON public.memories 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" 
  ON public.memories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
  ON public.memories 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
  ON public.memories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Rapport Table (Connection Points, Tiers & Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rapport (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score INTEGER DEFAULT 0 NOT NULL,
  tier TEXT DEFAULT 'Tier 1: Acquaintance' NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.rapport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rapport" 
  ON public.rapport 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rapport" 
  ON public.rapport 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rapport" 
  ON public.rapport 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rapport" 
  ON public.rapport 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Notification Preferences Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false NOT NULL,
  morning_checkin BOOLEAN DEFAULT true NOT NULL,
  evening_checkin BOOLEAN DEFAULT true NOT NULL,
  morning_time TEXT DEFAULT '09:00' NOT NULL,
  evening_time TEXT DEFAULT '21:00' NOT NULL,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences" 
  ON public.notification_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
  ON public.notification_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
  ON public.notification_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" 
  ON public.notification_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_companion_updated
  BEFORE UPDATE ON public.companions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_rapport_updated
  BEFORE UPDATE ON public.rapport
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_notification_preferences_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
