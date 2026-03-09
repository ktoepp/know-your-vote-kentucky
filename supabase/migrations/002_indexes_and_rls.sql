-- 002_indexes_and_rls.sql
-- Know Your Vote Kentucky — Indexes, full-text search, and RLS policies

-- ============================================================
-- Indexes on date fields
-- ============================================================
CREATE INDEX idx_bills_introduced_date ON ky_bills (introduced_date);
CREATE INDEX idx_bills_last_action_date ON ky_bills (last_action_date);
CREATE INDEX idx_votes_date ON ky_votes (date);
CREATE INDEX idx_ordinances_introduced_date ON ky_ordinances (introduced_date);
CREATE INDEX idx_ordinances_adopted_date ON ky_ordinances (adopted_date);
CREATE INDEX idx_executive_orders_signed_date ON ky_executive_orders (signed_date);
CREATE INDEX idx_school_board_items_meeting_date ON ky_school_board_items (meeting_date);
CREATE INDEX idx_county_actions_meeting_date ON ky_county_actions (meeting_date);
CREATE INDEX idx_meetings_date ON ky_meetings (date);

-- ============================================================
-- Indexes on status, jurisdiction, chamber, bill_number
-- ============================================================
CREATE INDEX idx_bills_status ON ky_bills (status);
CREATE INDEX idx_bills_chamber ON ky_bills (chamber);
CREATE INDEX idx_bills_bill_number ON ky_bills (bill_number);
CREATE INDEX idx_bills_session ON ky_bills (session);
CREATE INDEX idx_legislators_chamber ON ky_legislators (chamber);
CREATE INDEX idx_legislators_party ON ky_legislators (party);
CREATE INDEX idx_legislators_active ON ky_legislators (active);
CREATE INDEX idx_ordinances_jurisdiction ON ky_ordinances (jurisdiction);
CREATE INDEX idx_ordinances_status ON ky_ordinances (status);
CREATE INDEX idx_school_board_items_district ON ky_school_board_items (district);
CREATE INDEX idx_county_actions_county ON ky_county_actions (county);
CREATE INDEX idx_meetings_jurisdiction ON ky_meetings (jurisdiction);
CREATE INDEX idx_meetings_status ON ky_meetings (status);
CREATE INDEX idx_sources_status ON ky_sources (status);

-- ============================================================
-- GIN indexes for array and JSONB columns
-- ============================================================
CREATE INDEX idx_bills_topics ON ky_bills USING GIN (topics);
CREATE INDEX idx_ordinances_topics ON ky_ordinances USING GIN (topics);
CREATE INDEX idx_executive_orders_topics ON ky_executive_orders USING GIN (topics);
CREATE INDEX idx_bills_sponsors ON ky_bills USING GIN (sponsors);
CREATE INDEX idx_ordinances_sponsors ON ky_ordinances USING GIN (sponsors);
CREATE INDEX idx_votes_roll_call ON ky_votes USING GIN (roll_call);

-- ============================================================
-- Full-text search indexes (title + description)
-- ============================================================
CREATE INDEX idx_bills_fts ON ky_bills
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_ordinances_fts ON ky_ordinances
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_executive_orders_fts ON ky_executive_orders
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_school_board_items_fts ON ky_school_board_items
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_county_actions_fts ON ky_county_actions
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================================
-- Row Level Security — enable on all tables, public read access
-- ============================================================
ALTER TABLE ky_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_legislators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_ordinances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_executive_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_school_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_county_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_sources ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies (read-only platform)
CREATE POLICY "Public read access" ON ky_topics FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_legislators FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_bills FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_votes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_meetings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_ordinances FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_executive_orders FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_school_board_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_county_actions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ky_sources FOR SELECT USING (true);

