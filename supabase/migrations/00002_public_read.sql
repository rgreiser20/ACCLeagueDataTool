-- Allow anonymous (unauthenticated) users to SELECT (read) from all tables
-- so the public leaderboard and data warehouse dashboards can load live data.
-- Only authenticated admin users retain INSERT, UPDATE, and DELETE privileges.

CREATE POLICY "anon_read_car_models"      ON car_models       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_nationalities"   ON nationalities    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_seasons"         ON seasons          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_drivers"         ON drivers          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_teams"           ON teams            FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_sessions"        ON sessions         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_session_results" ON session_results  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_penalty_types"   ON penalty_types    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_penalties"       ON penalties        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_league_settings" ON league_settings FOR SELECT TO anon, authenticated USING (true);
