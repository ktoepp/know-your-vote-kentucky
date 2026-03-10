-- 001_kentucky_schema.sql
-- Know Your Vote Kentucky — Core schema for Kentucky civic data

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ky_topics — topic taxonomy
-- ============================================================
CREATE TABLE ky_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT
);

-- ============================================================
-- ky_legislators — KY General Assembly members
-- ============================================================
CREATE TABLE ky_legislators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legiscan_id INTEGER UNIQUE,
  openstates_id TEXT UNIQUE,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  chamber TEXT CHECK (chamber IN ('house', 'senate')),
  district TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_bills — state legislature bills
-- ============================================================
CREATE TABLE ky_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legiscan_id INTEGER UNIQUE,
  openstates_id TEXT UNIQUE,
  bill_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  session TEXT,
  chamber TEXT CHECK (chamber IN ('house', 'senate')),
  status TEXT,
  introduced_date DATE,
  last_action_date DATE,
  last_action TEXT,
  bill_text_url TEXT,
  topics TEXT[],
  sponsors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);

-- ============================================================
-- ky_votes — roll call votes on state bills
-- ============================================================
CREATE TABLE ky_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES ky_bills(id) ON DELETE CASCADE,
  date DATE,
  chamber TEXT CHECK (chamber IN ('house', 'senate')),
  description TEXT,
  yea_count INTEGER DEFAULT 0,
  nay_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  passed BOOLEAN,
  roll_call JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_meetings — scheduled meetings across all levels
-- ============================================================
CREATE TABLE ky_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  body TEXT NOT NULL,
  title TEXT,
  date DATE,
  time TIME,
  location TEXT,
  agenda_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_ordinances — municipal ordinances (Louisville, Lexington)
-- ============================================================
CREATE TABLE ky_ordinances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legistar_id INTEGER UNIQUE,
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('louisville', 'lexington')),
  ordinance_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  status TEXT,
  introduced_date DATE,
  adopted_date DATE,
  sponsors JSONB,
  topics TEXT[],
  meeting_id UUID REFERENCES ky_meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_executive_orders — governor executive orders
-- ============================================================
CREATE TABLE ky_executive_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eo_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  signed_date DATE,
  governor TEXT,
  status TEXT,
  full_text_url TEXT,
  topics TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_school_board_items — school board decisions
-- ============================================================
CREATE TABLE ky_school_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL CHECK (district IN ('jcps', 'fcps')),
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  meeting_date DATE,
  category TEXT,
  vote_result TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_county_actions — county fiscal court decisions
-- ============================================================
CREATE TABLE ky_county_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  meeting_date DATE,
  action_type TEXT,
  vote_result TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ky_sources — data source sync tracking
-- ============================================================
CREATE TABLE ky_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('success', 'error', 'running')),
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_legislators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_ordinances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_executive_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_school_board_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ky_county_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
