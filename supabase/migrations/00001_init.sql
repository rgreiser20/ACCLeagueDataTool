-- ============================================================================
-- ACC League Data Tool — Supabase PostgreSQL Schema
-- Migration: 00001_init.sql
--
-- Creates the complete schema for managing an Assetto Corsa Competizione
-- racing league with dynamic F1-style scoring, drop weeks, team standings,
-- and a steward penalty ledger. Supports multiple seasons.
--
-- All standings and points are computed via views — raw data is NEVER mutated.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE session_type_enum AS ENUM (
  'Practice',
  'Qualifying',
  'Race',
  'Entrylist'
);

CREATE TYPE penalty_unit_enum AS ENUM (
  'seconds',
  'laps',
  'disqualification'
);

-- ============================================================================
-- 2. REFERENCE / LOOKUP TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2a. Car Models — Maps ACC internal integer IDs to display names
-- ---------------------------------------------------------------------------
CREATE TABLE car_models (
  id    INT PRIMARY KEY,
  name  TEXT NOT NULL,
  class TEXT NOT NULL DEFAULT 'GT3'
);

COMMENT ON TABLE car_models IS 'ACC internal car model integer IDs mapped to display names and class.';

INSERT INTO car_models (id, name, class) VALUES
  -- GT3 (2018–2019 generation)
  (0,  'Porsche 991 GT3 R',            'GT3'),
  (1,  'Mercedes-AMG GT3',             'GT3'),
  (2,  'Ferrari 488 GT3',              'GT3'),
  (3,  'Audi R8 LMS',                  'GT3'),
  (4,  'Lamborghini Huracán GT3',      'GT3'),
  (5,  'McLaren 650S GT3',             'GT3'),
  (6,  'Nissan GT-R Nismo GT3 2018',   'GT3'),
  (7,  'BMW M6 GT3',                   'GT3'),
  (8,  'Bentley Continental GT3 2018', 'GT3'),
  (9,  'Porsche 991 II GT3 Cup',       'GT3 Cup'),
  (10, 'Nissan GT-R Nismo GT3 2017',   'GT3'),
  (11, 'Bentley Continental GT3 2016', 'GT3'),
  (12, 'Aston Martin V12 Vantage GT3', 'GT3'),
  (13, 'Lamborghini Gallardo R-EX',    'GT3'),
  (14, 'Jaguar G3',                    'GT3'),
  (15, 'Lexus RC F GT3',               'GT3'),
  (16, 'Lamborghini Huracán GT3 Evo',  'GT3'),
  (17, 'Honda NSX GT3',                'GT3'),
  (18, 'Lamborghini Huracán ST',       'ST'),
  (19, 'Audi R8 LMS Evo',             'GT3'),
  (20, 'AMR V8 Vantage',              'GT3'),
  (21, 'Honda NSX GT3 Evo',           'GT3'),
  (22, 'McLaren 720S GT3',            'GT3'),
  (23, 'Porsche 991 II GT3 R',        'GT3'),
  (24, 'Ferrari 488 GT3 Evo',         'GT3'),
  (25, 'Mercedes-AMG GT3 2020',       'GT3'),
  -- GTC / Cup / One-Make
  (26, 'Ferrari 488 Challenge Evo',    'GTC'),
  (27, 'BMW M2 CS Racing',             'GTC'),
  (28, 'Porsche 911 GT3 Cup (992)',     'GTC'),
  (29, 'Lamborghini Huracán ST Evo2',  'GTC'),
  -- 2021+ GT3
  (30, 'BMW M4 GT3',                  'GT3'),
  (31, 'Audi R8 LMS Evo II GT3',     'GT3'),
  (32, 'Ferrari 296 GT3',             'GT3'),
  (33, 'Lamborghini Huracán GT3 Evo2','GT3'),
  (34, 'Porsche 992 GT3 R',           'GT3'),
  (35, 'McLaren 720S GT3 Evo',        'GT3'),
  (36, 'Ford Mustang GT3',            'GT3'),
  (37, 'Aston Martin V8 Vantage GT3 2024', 'GT3'),
  -- GT4
  (50, 'Alpine A110 GT4',             'GT4'),
  (51, 'Aston Martin Vantage GT4',    'GT4'),
  (52, 'Audi R8 LMS GT4',            'GT4'),
  (53, 'BMW M4 GT4',                  'GT4'),
  (55, 'Chevrolet Camaro GT4.R',      'GT4'),
  (56, 'Ginetta G55 GT4',             'GT4'),
  (57, 'KTM X-Bow GT4',              'GT4'),
  (58, 'Maserati Granturismo MC GT4', 'GT4'),
  (59, 'McLaren 570S GT4',            'GT4'),
  (60, 'Mercedes-AMG GT4',            'GT4'),
  (61, 'Porsche 718 Cayman GT4 Clubsport', 'GT4');

-- ---------------------------------------------------------------------------
-- 2b. Nationalities — Maps ACC internal integer IDs to country names
-- ---------------------------------------------------------------------------
CREATE TABLE nationalities (
  id           INT PRIMARY KEY,
  country_name TEXT NOT NULL,
  iso_alpha2   CHAR(2)
);

COMMENT ON TABLE nationalities IS 'ACC internal nationality integer IDs mapped to country names and ISO codes.';

-- NOTE: IDs 0–49 are verified against the ACC BroadcastingEnums.cs SDK source.
-- IDs 50+ are community-sourced and may have minor discrepancies; verify
-- against your ACC installation's sdk/broadcasting/Sources/.../BroadcastingEnums.cs
-- if precision is required for higher-range nationalities.
INSERT INTO nationalities (id, country_name, iso_alpha2) VALUES
  (0,  'Any',              NULL),
  (1,  'Italy',            'IT'),
  (2,  'Germany',          'DE'),
  (3,  'France',           'FR'),
  (4,  'Spain',            'ES'),
  (5,  'Great Britain',    'GB'),
  (6,  'Hungary',          'HU'),
  (7,  'Belgium',          'BE'),
  (8,  'Switzerland',      'CH'),
  (9,  'Austria',          'AT'),
  (10, 'Russia',           'RU'),
  (11, 'Thailand',         'TH'),
  (12, 'Netherlands',      'NL'),
  (13, 'Poland',           'PL'),
  (14, 'Argentina',        'AR'),
  (15, 'Monaco',           'MC'),
  (16, 'Ireland',          'IE'),
  (17, 'Brazil',           'BR'),
  (18, 'South Africa',     'ZA'),
  (19, 'Puerto Rico',      'PR'),
  (20, 'Slovakia',         'SK'),
  (21, 'Oman',             'OM'),
  (22, 'Greece',           'GR'),
  (23, 'Saudi Arabia',     'SA'),
  (24, 'Norway',           'NO'),
  (25, 'Turkey',           'TR'),
  (26, 'South Korea',      'KR'),
  (27, 'Lebanon',          'LB'),
  (28, 'Armenia',          'AM'),
  (29, 'Mexico',           'MX'),
  (30, 'Sweden',           'SE'),
  (31, 'Finland',          'FI'),
  (32, 'Denmark',          'DK'),
  (33, 'Croatia',          'HR'),
  (34, 'Canada',           'CA'),
  (35, 'China',            'CN'),
  (36, 'Portugal',         'PT'),
  (37, 'Singapore',        'SG'),
  (38, 'Indonesia',        'ID'),
  (39, 'USA',              'US'),
  (40, 'New Zealand',      'NZ'),
  (41, 'Australia',        'AU'),
  (42, 'San Marino',       'SM'),
  (43, 'UAE',              'AE'),
  (44, 'Luxembourg',       'LU'),
  (45, 'Kuwait',           'KW'),
  (46, 'Hong Kong',        'HK'),
  (47, 'Colombia',         'CO'),
  (48, 'Japan',            'JP'),
  (49, 'Andorra',          'AD'),
  (50, 'Azerbaijan',       'AZ'),
  (51, 'Bulgaria',         'BG'),
  (52, 'Cuba',             'CU'),
  (53, 'Czech Republic',   'CZ'),
  (54, 'Estonia',          'EE'),
  (55, 'Georgia',          'GE'),
  (56, 'India',            'IN'),
  (57, 'Israel',           'IL'),
  (58, 'Jamaica',          'JM'),
  (59, 'Latvia',           'LV'),
  (60, 'Lithuania',        'LT'),
  (61, 'Macau',            'MO'),
  (62, 'Malaysia',         'MY'),
  (63, 'Nepal',            'NP'),
  (64, 'New Caledonia',    'NC'),
  (65, 'Nigeria',          'NG'),
  (66, 'Northern Ireland', NULL),
  (67, 'Papua New Guinea', 'PG'),
  (68, 'Philippines',      'PH'),
  (69, 'Qatar',            'QA'),
  (70, 'Romania',          'RO'),
  (71, 'Scotland',         NULL),
  (72, 'Serbia',           'RS'),
  (73, 'Slovenia',         'SI'),
  (74, 'Taiwan',           'TW'),
  (75, 'Ukraine',          'UA'),
  (76, 'Venezuela',        'VE'),
  (77, 'Wales',            NULL);

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3a. League Settings — Singleton configuration row
-- ---------------------------------------------------------------------------
CREATE TABLE league_settings (
  id                   INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_drop_weeks    INT NOT NULL DEFAULT 0   CHECK (active_drop_weeks >= 0),
  min_lap_threshold    INT NOT NULL DEFAULT 1   CHECK (min_lap_threshold >= 0),
  points_scale         INT[] NOT NULL DEFAULT '{25,18,15,12,10,8,6,4,2,1}',
  fastest_lap_bonus    INT NOT NULL DEFAULT 1   CHECK (fastest_lap_bonus >= 0),
  team_scoring_top_n   INT NOT NULL DEFAULT 2   CHECK (team_scoring_top_n >= 1),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE league_settings IS 'Single-row configuration table. CHECK (id = 1) enforces the singleton pattern.';
COMMENT ON COLUMN league_settings.active_drop_weeks IS 'Number of lowest-scoring race results to discard per driver for championship standings.';
COMMENT ON COLUMN league_settings.min_lap_threshold IS 'Minimum laps a driver must complete to be classified and earn points. Designed to eventually scale to a percentage of leader laps.';
COMMENT ON COLUMN league_settings.points_scale IS 'Array mapping finishing position (1-indexed) to points awarded. Position P gets points_scale[P].';
COMMENT ON COLUMN league_settings.team_scoring_top_n IS 'Maximum number of declared points-drivers per team per race that count toward team championship. Acts as a safety cap on top of the is_points_driver flag.';

-- Seed the singleton row
INSERT INTO league_settings (id) VALUES (1);

-- ---------------------------------------------------------------------------
-- 3b. Seasons
-- ---------------------------------------------------------------------------
CREATE TABLE seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  year        INT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE seasons IS 'Championship seasons. Multiple seasons can coexist. is_active flags the current season.';

-- ---------------------------------------------------------------------------
-- 3c. Drivers
-- ---------------------------------------------------------------------------
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  steam_id        TEXT UNIQUE,
  nationality_id  INT REFERENCES nationalities(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE drivers IS 'Registered league drivers. steam_id links to ACC player identity.';

CREATE INDEX idx_drivers_steam_id ON drivers(steam_id);

-- ---------------------------------------------------------------------------
-- 3d. Teams
-- ---------------------------------------------------------------------------
CREATE TABLE teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  color        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE teams IS 'Racing teams/constructors in the league.';
COMMENT ON COLUMN teams.color IS 'Hex color code for UI display (e.g., #FF0000).';

-- ---------------------------------------------------------------------------
-- 3e. Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES seasons(id),
  session_type  session_type_enum NOT NULL,
  track_name    TEXT NOT NULL,
  session_date  DATE NOT NULL,
  round_number  INT,
  wet_session   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sessions IS 'Individual session instances (Practice, Qualifying, Race, Entrylist). Each session belongs to a season.';
COMMENT ON COLUMN sessions.round_number IS 'Championship round number for ordering within a season. Multiple sessions can share a round (e.g., Qualifying + Race for Round 3).';

CREATE INDEX idx_sessions_season ON sessions(season_id);
CREATE INDEX idx_sessions_type   ON sessions(session_type);
CREATE INDEX idx_sessions_round  ON sessions(round_number);

-- ---------------------------------------------------------------------------
-- 3f. Session Results — The immutable raw data table
-- ---------------------------------------------------------------------------
CREATE TABLE session_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  driver_id        UUID NOT NULL REFERENCES drivers(id),
  team_id          UUID REFERENCES teams(id),
  car_model_id     INT REFERENCES car_models(id),
  nationality_id   INT REFERENCES nationalities(id),
  position_raw     INT,
  laps_completed   INT NOT NULL DEFAULT 0 CHECK (laps_completed >= 0),
  total_time_ms    BIGINT,
  best_lap_time_ms BIGINT,
  is_fastest_lap   BOOLEAN NOT NULL DEFAULT FALSE,
  is_points_driver BOOLEAN NOT NULL DEFAULT TRUE,
  dnf              BOOLEAN NOT NULL DEFAULT FALSE,
  dns              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_session_driver UNIQUE (session_id, driver_id)
);

COMMENT ON TABLE session_results IS 'Raw, immutable results for every session type. One row per driver per session. Views compute official standings from this data — never modify these rows for scoring purposes.';
COMMENT ON COLUMN session_results.team_id IS 'Team assignment is per-session, allowing mid-season team changes.';
COMMENT ON COLUMN session_results.total_time_ms IS 'Raw total race time in milliseconds, before any penalties.';
COMMENT ON COLUMN session_results.is_fastest_lap IS 'TRUE if this driver set the fastest lap of the session.';
COMMENT ON COLUMN session_results.is_points_driver IS 'TRUE if this driver is a declared points-driver for team championship scoring. Teams with >2 drivers must declare which 2 are points-drivers before the race. Defaults to TRUE.';

CREATE INDEX idx_sr_session   ON session_results(session_id);
CREATE INDEX idx_sr_driver    ON session_results(driver_id);
CREATE INDEX idx_sr_team      ON session_results(team_id);

-- ============================================================================
-- 4. PENALTY SYSTEM
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4a. Penalty Types — Pre-populated catalog
-- ---------------------------------------------------------------------------
CREATE TABLE penalty_types (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  default_value NUMERIC NOT NULL,
  unit          penalty_unit_enum NOT NULL,
  description   TEXT
);

COMMENT ON TABLE penalty_types IS 'Catalog of available penalty categories. Stewards select from this when issuing penalties.';

INSERT INTO penalty_types (name, default_value, unit, description) VALUES
  ('Minor collision',       30, 'seconds',          '+30 seconds added to race time'),
  ('Significant collision', 45, 'seconds',          '+45 seconds added to race time'),
  ('Track limits',          30, 'seconds',          '+30 seconds added to race time'),
  ('Blue flags minor',      45, 'seconds',          '+45 seconds for minor blue flag infringement'),
  ('Blue flags major',      60, 'seconds',          '+60 seconds for major blue flag infringement'),
  ('Aggressive driving',    60, 'seconds',          '+60 seconds for aggressive driving'),
  ('Pit speed',             30, 'seconds',          '+30 seconds for pit lane speeding'),
  ('Missed pit',             1, 'laps',             '1 lap deducted from completed laps'),
  ('Malicious wrecking',    0,  'disqualification', 'Driver is disqualified from the current session AND the next race');

-- ---------------------------------------------------------------------------
-- 4b. Penalties — The steward ledger
-- ---------------------------------------------------------------------------
CREATE TABLE penalties (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_result_id     UUID NOT NULL REFERENCES session_results(id) ON DELETE CASCADE,
  penalty_type_id       INT NOT NULL REFERENCES penalty_types(id),
  applied_value         NUMERIC NOT NULL,
  unit                  penalty_unit_enum NOT NULL,
  applies_to_next_race  BOOLEAN NOT NULL DEFAULT FALSE,
  reason                TEXT,
  issued_by             TEXT,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE penalties IS 'Steward penalty ledger. Each row is an individual penalty applied to a specific session result. Multiple penalties can be applied to the same result.';
COMMENT ON COLUMN penalties.applied_value IS 'Actual penalty value applied (steward may override the default from penalty_types).';
COMMENT ON COLUMN penalties.applies_to_next_race IS 'When TRUE on a disqualification penalty, the driver is also disqualified from the next race in the season (DQ carryover). The scoring views enforce this automatically.';

CREATE INDEX idx_penalties_result ON penalties(session_result_id);

-- ============================================================================
-- 5. VIEWS — Dynamic Scoring Engine
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5a. v_race_classification
--     Official race classification with penalties, DQ handling (including
--     DQ carryover from previous round), and lap threshold enforcement.
--     This is the foundational view for all standings.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_race_classification AS
WITH
  -- Step 1: Aggregate all penalties per session result
  penalty_agg AS (
    SELECT
      p.session_result_id,
      COALESCE(SUM(p.applied_value) FILTER (WHERE p.unit = 'seconds'), 0) AS total_penalty_seconds,
      COALESCE(SUM(p.applied_value) FILTER (WHERE p.unit = 'laps'), 0)::INT AS total_penalty_laps,
      BOOL_OR(p.unit = 'disqualification') AS is_disqualified
    FROM penalties p
    GROUP BY p.session_result_id
  ),

  -- Step 2: Find drivers suspended due to a DQ carryover from the previous round.
  -- A DQ penalty with applies_to_next_race = TRUE on round N suspends the driver
  -- for round N+1 within the same season.
  suspended_drivers AS (
    SELECT DISTINCT
      sr_prev.driver_id,
      s_prev.season_id,
      s_prev.round_number + 1 AS suspended_for_round
    FROM penalties p
    JOIN session_results sr_prev ON sr_prev.id = p.session_result_id
    JOIN sessions s_prev ON s_prev.id = sr_prev.session_id AND s_prev.session_type = 'Race'
    WHERE p.unit = 'disqualification'
      AND p.applies_to_next_race = TRUE
  ),

  -- Step 3: Join race results with penalty aggregates and suspension status
  classified AS (
    SELECT
      sr.id                AS session_result_id,
      sr.session_id,
      s.season_id,
      s.round_number,
      s.track_name,
      sr.driver_id,
      sr.team_id,
      sr.car_model_id,
      sr.laps_completed,
      sr.total_time_ms,
      sr.best_lap_time_ms,
      sr.is_fastest_lap,
      sr.is_points_driver,
      sr.dnf,
      sr.dns,
      -- Effective laps after lap penalties
      GREATEST(sr.laps_completed - COALESCE(pa.total_penalty_laps, 0), 0)
        AS effective_laps,
      -- Official time after time penalties (convert penalty seconds to ms)
      sr.total_time_ms + (COALESCE(pa.total_penalty_seconds, 0) * 1000)::BIGINT
        AS official_time_ms,
      COALESCE(pa.total_penalty_seconds, 0) AS penalty_seconds,
      COALESCE(pa.total_penalty_laps, 0)    AS penalty_laps,
      -- DQ from this race's own penalties OR from a carryover suspension
      COALESCE(pa.is_disqualified, FALSE)
        OR (sd.driver_id IS NOT NULL)
        AS is_disqualified,
      -- Track whether the DQ came from carryover (for display purposes)
      (sd.driver_id IS NOT NULL AND NOT COALESCE(pa.is_disqualified, FALSE))
        AS is_suspended_carryover,
      -- Classification check: must meet minimum lap threshold
      GREATEST(sr.laps_completed - COALESCE(pa.total_penalty_laps, 0), 0)
        >= (SELECT min_lap_threshold FROM league_settings WHERE id = 1)
        AS meets_lap_threshold
    FROM session_results sr
    JOIN sessions s ON s.id = sr.session_id AND s.session_type = 'Race'
    LEFT JOIN penalty_agg pa ON pa.session_result_id = sr.id
    LEFT JOIN suspended_drivers sd
      ON sd.driver_id = sr.driver_id
      AND sd.season_id = s.season_id
      AND sd.suspended_for_round = s.round_number
  ),

  -- Step 4: Rank drivers within each race
  --   Classification order:
  --     1. Classified drivers: effective_laps DESC, official_time_ms ASC
  --     2. Drivers below lap threshold (not classified)
  --     3. DQ'd drivers (including carryover suspensions)
  --     4. DNS drivers (dead last)
  ranked AS (
    SELECT
      c.*,
      -- A driver is "classified" if they meet the lap threshold, not DQ'd, and did not DNS
      (NOT c.is_disqualified AND NOT c.dns AND c.meets_lap_threshold) AS is_classified,
      ROW_NUMBER() OVER (
        PARTITION BY c.session_id
        ORDER BY
          -- DNS always dead last
          c.dns ASC,
          -- DQ'd drivers after classified/unclassified
          c.is_disqualified ASC,
          -- Drivers below threshold after classified
          (CASE WHEN c.meets_lap_threshold THEN 0 ELSE 1 END) ASC,
          -- Standard racing sort: most laps first, then fastest time
          c.effective_laps DESC,
          c.official_time_ms ASC
      ) AS race_position
    FROM classified c
  ),

  -- Step 5: Fetch the points scale once
  settings AS (
    SELECT
      points_scale,
      fastest_lap_bonus,
      array_length(points_scale, 1) AS max_scoring_position
    FROM league_settings
    WHERE id = 1
  )

-- Step 6: Assign points
SELECT
  r.session_result_id,
  r.session_id,
  r.season_id,
  r.round_number,
  r.track_name,
  r.driver_id,
  r.team_id,
  r.car_model_id,
  r.is_points_driver,
  r.laps_completed,
  r.effective_laps,
  r.total_time_ms,
  r.official_time_ms,
  r.best_lap_time_ms,
  r.is_fastest_lap,
  r.dnf,
  r.dns,
  r.penalty_seconds,
  r.penalty_laps,
  r.is_disqualified,
  r.is_suspended_carryover,
  r.is_classified,
  r.race_position,
  -- Base position points (only for classified drivers within points-paying positions)
  CASE
    WHEN r.is_classified AND r.race_position <= st.max_scoring_position
    THEN st.points_scale[r.race_position]
    ELSE 0
  END AS position_points,
  -- Fastest lap bonus: awarded to any classified driver regardless of position
  CASE
    WHEN r.is_fastest_lap AND r.is_classified
    THEN st.fastest_lap_bonus
    ELSE 0
  END AS fastest_lap_points,
  -- Total race points
  CASE
    WHEN r.is_classified AND r.race_position <= st.max_scoring_position
    THEN st.points_scale[r.race_position]
    ELSE 0
  END
  +
  CASE
    WHEN r.is_fastest_lap AND r.is_classified
    THEN st.fastest_lap_bonus
    ELSE 0
  END AS total_points
FROM ranked r
CROSS JOIN settings st;

-- ---------------------------------------------------------------------------
-- 5b. v_driver_championship
--     Championship standings with drop-week logic via window functions.
--     Raw data is NEVER modified — drops are computed virtually.
--     Results are grouped per season.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_driver_championship AS
WITH
  -- Step 1: Get each driver's points per race from the classification view
  driver_race_points AS (
    SELECT
      rc.driver_id,
      rc.season_id,
      rc.session_id,
      rc.round_number,
      rc.total_points,
      rc.is_classified,
      -- Rank each driver's races by points ASC so the lowest scores get rank 1
      ROW_NUMBER() OVER (
        PARTITION BY rc.season_id, rc.driver_id
        ORDER BY rc.total_points ASC, rc.round_number ASC
      ) AS points_rank_asc,
      -- Total number of races this driver has participated in (within the season)
      COUNT(*) OVER (PARTITION BY rc.season_id, rc.driver_id) AS total_races
    FROM v_race_classification rc
  ),

  -- Step 2: Get drop week setting
  settings AS (
    SELECT active_drop_weeks FROM league_settings WHERE id = 1
  ),

  -- Step 3: Compute totals with drops applied
  driver_totals AS (
    SELECT
      drp.driver_id,
      drp.season_id,
      -- Gross points (all races, no drops)
      SUM(drp.total_points) AS total_points_gross,
      -- Championship points (after dropping lowest N)
      SUM(
        CASE
          WHEN drp.points_rank_asc <= st.active_drop_weeks THEN 0
          ELSE drp.total_points
        END
      ) AS championship_points,
      -- How many races counted toward the championship
      SUM(
        CASE
          WHEN drp.points_rank_asc <= st.active_drop_weeks THEN 0
          ELSE 1
        END
      )::INT AS races_counted,
      -- How many races were actually dropped
      LEAST(drp.total_races, st.active_drop_weeks)::INT AS drop_count,
      drp.total_races::INT AS total_races
    FROM driver_race_points drp
    CROSS JOIN settings st
    GROUP BY drp.driver_id, drp.season_id, drp.total_races, st.active_drop_weeks
  )

-- Step 4: Rank for championship position (within each season)
SELECT
  dt.driver_id,
  dt.season_id,
  d.first_name,
  d.last_name,
  d.steam_id,
  ROW_NUMBER() OVER (
    PARTITION BY dt.season_id
    ORDER BY dt.championship_points DESC, dt.total_points_gross DESC
  )::INT AS championship_position,
  dt.championship_points,
  dt.total_points_gross,
  dt.races_counted,
  dt.drop_count,
  dt.total_races
FROM driver_totals dt
JOIN drivers d ON d.id = dt.driver_id;

-- ---------------------------------------------------------------------------
-- 5c. v_driver_race_breakdown
--     Per-driver, per-race detail with drop indicators. Useful for UI
--     to show which races are counted vs. dropped.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_driver_race_breakdown AS
WITH
  driver_race_points AS (
    SELECT
      rc.driver_id,
      rc.season_id,
      rc.session_id,
      rc.round_number,
      rc.track_name,
      rc.race_position,
      rc.total_points,
      rc.is_classified,
      rc.is_disqualified,
      rc.is_suspended_carryover,
      rc.is_fastest_lap,
      ROW_NUMBER() OVER (
        PARTITION BY rc.season_id, rc.driver_id
        ORDER BY rc.total_points ASC, rc.round_number ASC
      ) AS points_rank_asc
    FROM v_race_classification rc
  ),
  settings AS (
    SELECT active_drop_weeks FROM league_settings WHERE id = 1
  )
SELECT
  drp.driver_id,
  drp.season_id,
  d.first_name,
  d.last_name,
  drp.session_id,
  drp.round_number,
  drp.track_name,
  drp.race_position,
  drp.total_points,
  drp.is_classified,
  drp.is_disqualified,
  drp.is_suspended_carryover,
  drp.is_fastest_lap,
  (drp.points_rank_asc <= st.active_drop_weeks) AS is_dropped
FROM driver_race_points drp
CROSS JOIN settings st
JOIN drivers d ON d.id = drp.driver_id;

-- ---------------------------------------------------------------------------
-- 5d. v_team_championship
--     Team standings: sum of declared points-drivers per team per race
--     (capped by team_scoring_top_n), with drop-week logic.
--     Results are grouped per season.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_team_championship AS
WITH
  settings AS (
    SELECT team_scoring_top_n, active_drop_weeks
    FROM league_settings
    WHERE id = 1
  ),

  -- Step 1: Filter to declared points-drivers and rank within each team per race
  team_driver_ranked AS (
    SELECT
      rc.team_id,
      rc.season_id,
      rc.session_id,
      rc.round_number,
      rc.driver_id,
      rc.total_points,
      ROW_NUMBER() OVER (
        PARTITION BY rc.team_id, rc.session_id
        ORDER BY rc.total_points DESC, rc.race_position ASC
      ) AS driver_rank_in_team
    FROM v_race_classification rc
    WHERE rc.team_id IS NOT NULL
      AND rc.is_points_driver = TRUE
  ),

  -- Step 2: Sum top N points-drivers per team per race (safety cap)
  team_race_scores AS (
    SELECT
      tdr.team_id,
      tdr.season_id,
      tdr.session_id,
      tdr.round_number,
      SUM(tdr.total_points) AS race_points
    FROM team_driver_ranked tdr
    CROSS JOIN settings st
    WHERE tdr.driver_rank_in_team <= st.team_scoring_top_n
    GROUP BY tdr.team_id, tdr.season_id, tdr.session_id, tdr.round_number
  ),

  -- Step 3: Apply drop-week logic to team race scores
  team_race_ranked AS (
    SELECT
      trs.*,
      ROW_NUMBER() OVER (
        PARTITION BY trs.season_id, trs.team_id
        ORDER BY trs.race_points ASC, trs.round_number ASC
      ) AS race_rank_asc,
      COUNT(*) OVER (PARTITION BY trs.season_id, trs.team_id) AS total_races
    FROM team_race_scores trs
  ),

  team_totals AS (
    SELECT
      trr.team_id,
      trr.season_id,
      SUM(trr.race_points) AS total_points_gross,
      SUM(
        CASE
          WHEN trr.race_rank_asc <= st.active_drop_weeks THEN 0
          ELSE trr.race_points
        END
      ) AS championship_points,
      SUM(
        CASE
          WHEN trr.race_rank_asc <= st.active_drop_weeks THEN 0
          ELSE 1
        END
      )::INT AS races_counted,
      LEAST(trr.total_races, st.active_drop_weeks)::INT AS drop_count,
      trr.total_races::INT AS total_races
    FROM team_race_ranked trr
    CROSS JOIN settings st
    GROUP BY trr.team_id, trr.season_id, trr.total_races, st.active_drop_weeks
  )

SELECT
  tt.team_id,
  tt.season_id,
  t.name         AS team_name,
  t.abbreviation AS team_abbreviation,
  t.color        AS team_color,
  ROW_NUMBER() OVER (
    PARTITION BY tt.season_id
    ORDER BY tt.championship_points DESC, tt.total_points_gross DESC
  )::INT AS championship_position,
  tt.championship_points,
  tt.total_points_gross,
  tt.races_counted,
  tt.drop_count,
  tt.total_races
FROM team_totals tt
JOIN teams t ON t.id = tt.team_id;

-- ---------------------------------------------------------------------------
-- 5e. v_race_detail
--     Convenience view: fully denormalized race results for UI consumption.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_race_detail AS
SELECT
  rc.session_result_id,
  rc.session_id,
  rc.season_id,
  sn.name             AS season_name,
  rc.round_number,
  rc.track_name,
  rc.race_position,
  rc.driver_id,
  d.first_name        AS driver_first_name,
  d.last_name         AS driver_last_name,
  d.steam_id          AS driver_steam_id,
  rc.team_id,
  t.name              AS team_name,
  t.abbreviation      AS team_abbreviation,
  t.color             AS team_color,
  rc.car_model_id,
  cm.name             AS car_model_name,
  cm.class            AS car_class,
  rc.is_points_driver,
  rc.laps_completed,
  rc.effective_laps,
  rc.total_time_ms,
  rc.official_time_ms,
  rc.best_lap_time_ms,
  rc.is_fastest_lap,
  rc.dnf,
  rc.dns,
  rc.penalty_seconds,
  rc.penalty_laps,
  rc.is_disqualified,
  rc.is_suspended_carryover,
  rc.is_classified,
  rc.position_points,
  rc.fastest_lap_points,
  rc.total_points
FROM v_race_classification rc
JOIN seasons sn ON sn.id = rc.season_id
JOIN drivers d ON d.id = rc.driver_id
LEFT JOIN teams t ON t.id = rc.team_id
LEFT JOIN car_models cm ON cm.id = rc.car_model_id;

-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE car_models       ENABLE ROW LEVEL SECURITY;
ALTER TABLE nationalities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Single admin role: only authenticated users have access (full CRUD)
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_all_car_models"      ON car_models       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_nationalities"   ON nationalities    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seasons"         ON seasons          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_drivers"         ON drivers          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_teams"           ON teams            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_sessions"        ON sessions         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_session_results" ON session_results  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_penalty_types"   ON penalty_types    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_penalties"       ON penalties        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- League settings: authenticated can SELECT and UPDATE only (singleton row protection)
CREATE POLICY "admin_read_league_settings"   ON league_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_league_settings" ON league_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. UTILITY FUNCTIONS
-- ============================================================================

-- Helper function to format milliseconds as a human-readable time string
CREATE OR REPLACE FUNCTION format_race_time(ms BIGINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN ms IS NULL THEN NULL
      ELSE
        LPAD((ms / 3600000)::TEXT, 1, '0') || ':' ||
        LPAD(((ms % 3600000) / 60000)::TEXT, 2, '0') || ':' ||
        LPAD(((ms % 60000) / 1000)::TEXT, 2, '0') || '.' ||
        LPAD((ms % 1000)::TEXT, 3, '0')
    END;
$$;

COMMENT ON FUNCTION format_race_time IS 'Converts milliseconds to H:MM:SS.mmm format for display.';

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
