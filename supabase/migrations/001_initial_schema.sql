-- Initial Schema Migration for Ebadat App
-- Creates tables for articles, scholars, dua_requests, and analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Scholars table
CREATE TABLE IF NOT EXISTS scholars (
  id TEXT PRIMARY KEY, -- Using TEXT to support human-readable IDs from seed data
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  bio TEXT NOT NULL,
  photo_url TEXT,
  verified BOOLEAN DEFAULT false,
  role TEXT NOT NULL DEFAULT 'scholar' CHECK (role = 'scholar'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('dari', 'pashto')),
  author_id TEXT NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('iman', 'salah', 'akhlaq', 'family', 'anxiety', 'rizq', 'dua', 'tazkiyah')),
  body TEXT NOT NULL,
  audio_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reading_time_estimate INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  draft BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false
);

-- Dua requests table
CREATE TABLE IF NOT EXISTS dua_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dua', 'advice', 'personal', 'other')),
  message TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  response TEXT,
  reviewer_id TEXT REFERENCES scholars(id) ON DELETE SET NULL,
  reviewer_name TEXT
);

-- User metadata table (for device tokens and notification preferences)
CREATE TABLE IF NOT EXISTS user_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  device_token TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('reviewer', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article analytics table
CREATE TABLE IF NOT EXISTS article_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  unique_readers INTEGER DEFAULT 0,
  reading_completion NUMERIC(5, 2) DEFAULT 0 CHECK (reading_completion >= 0 AND reading_completion <= 100),
  bookmarks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dua_requests_user ON dua_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dua_requests_status ON dua_requests(status);
CREATE INDEX IF NOT EXISTS idx_dua_requests_created_at ON dua_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dua_requests_reviewer ON dua_requests(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_scholars_email ON scholars(email);
CREATE INDEX IF NOT EXISTS idx_scholars_verified ON scholars(verified);

CREATE INDEX IF NOT EXISTS idx_user_metadata_user_id ON user_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_article_analytics_article_id ON article_analytics(article_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_scholars_updated_at
  BEFORE UPDATE ON scholars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_metadata_updated_at
  BEFORE UPDATE ON user_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_analytics_updated_at
  BEFORE UPDATE ON article_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE scholars ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dua_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for public read access (articles and scholars)
-- Anyone can read published articles
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (published = true);

-- Anyone can read verified scholars
CREATE POLICY "Public can read verified scholars"
  ON scholars FOR SELECT
  USING (verified = true);

-- Policies for user-specific data (dua_requests, user_metadata)
-- Users can only see their own requests
CREATE POLICY "Users can view own dua requests"
  ON dua_requests FOR SELECT
  USING (true); -- Will be filtered by application logic based on user_id

-- Users can insert their own requests
CREATE POLICY "Users can insert own dua requests"
  ON dua_requests FOR INSERT
  WITH CHECK (true); -- Will be validated by application logic

-- Users can update their own requests (before answered)
CREATE POLICY "Users can update own pending requests"
  ON dua_requests FOR UPDATE
  USING (status = 'pending'); -- Will be validated by application logic

-- Users can manage their own metadata
CREATE POLICY "Users can manage own metadata"
  ON user_metadata FOR ALL
  USING (true); -- Will be filtered by application logic

-- Note: For production, you should implement proper authentication
-- and use Supabase Auth to enforce RLS policies based on authenticated users.
-- These policies are permissive for initial setup and should be tightened
-- based on your authentication requirements.
