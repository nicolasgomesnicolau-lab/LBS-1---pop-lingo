-- LBS #1 — Supabase table setup
-- Execute this SQL in the Supabase SQL Editor (https://supabase.com/dashboard/project/.../sql/new)

CREATE TABLE IF NOT EXISTS movies_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Insert initial empty row
INSERT INTO movies_data (id, data)
VALUES (1, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable Row-Level Security (optional, but good practice)
ALTER TABLE movies_data ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for anon key (since we use the publishable key)
DROP POLICY IF EXISTS "Allow all on movies_data" ON movies_data;
CREATE POLICY "Allow all on movies_data"
  ON movies_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Vocab table (one row per user)
CREATE TABLE IF NOT EXISTS vocab_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vocab_data ENABLE ROW LEVEL SECURITY;

-- Allow users to read/update only their own row
DROP POLICY IF EXISTS "Users can manage their own vocab" ON vocab_data;
CREATE POLICY "Users can manage their own vocab"
  ON vocab_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
