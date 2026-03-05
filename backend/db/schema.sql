-- ═══════════════════════════════════════════════════════════════
-- schema.sql — Database schema for blockchain-escrow platform
-- ═══════════════════════════════════════════════════════════════
-- Compatible with both PostgreSQL and SQLite.
-- For hackathon: use SQLite. For production: use PostgreSQL.

-- Jobs table: core job lifecycle data
CREATE TABLE IF NOT EXISTS jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    description     TEXT NOT NULL,
    client_address  TEXT NOT NULL,
    freelancer_address TEXT,
    requirements_hash TEXT NOT NULL,
    test_suite_hash TEXT,
    test_suite_json TEXT,           -- full test suite as JSON
    state           TEXT NOT NULL DEFAULT 'CREATED'
                    CHECK(state IN ('CREATED','FUNDED','WORK_SUBMITTED','VALIDATED','CLOSED')),
    outcome         TEXT DEFAULT 'NONE'
                    CHECK(outcome IN ('NONE','PAID','REFUNDED','DISPUTED')),
    amount_wei      TEXT,           -- stored as string for big numbers
    repo_url        TEXT,
    submission_hash TEXT,
    deadline        DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at    DATETIME,
    validated_at    DATETIME,
    closed_at       DATETIME,
    create_tx_hash  TEXT,           -- on-chain transaction hashes
    fund_tx_hash    TEXT,
    validate_tx_hash TEXT
);

-- Validation reports
CREATE TABLE IF NOT EXISTS validation_reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL REFERENCES jobs(id),
    overall_score   INTEGER NOT NULL,
    verdict         TEXT NOT NULL CHECK(verdict IN ('PASS','DISPUTE','FAIL')),
    execution_score INTEGER,
    tests_passed    INTEGER,
    tests_total     INTEGER,
    structure_score INTEGER,
    lint_score      INTEGER,
    semantic_score  INTEGER,
    semantic_reasoning TEXT,
    report_hash     TEXT NOT NULL,
    report_json     TEXT,           -- full report as JSON
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reputation tracking
CREATE TABLE IF NOT EXISTS reputations (
    address         TEXT PRIMARY KEY,
    total_jobs      INTEGER DEFAULT 0,
    total_score     INTEGER DEFAULT 0,
    average_score   INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    disputed_jobs   INTEGER DEFAULT 0,
    failed_jobs     INTEGER DEFAULT 0,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Badges (off-chain mirror of ReputationNFT)
CREATE TABLE IF NOT EXISTS badges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    address         TEXT NOT NULL,
    badge_name      TEXT NOT NULL,
    token_id        INTEGER,        -- on-chain NFT token ID
    awarded_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, badge_name)
);

-- Slashing records
CREATE TABLE IF NOT EXISTS slash_records (
    address                TEXT PRIMARY KEY,
    consecutive_failures   INTEGER DEFAULT 0,
    total_slashes          INTEGER DEFAULT 0,
    cooldown_until         DATETIME,
    is_blacklisted         BOOLEAN DEFAULT FALSE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_address);
CREATE INDEX IF NOT EXISTS idx_jobs_freelancer ON jobs(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_reports_job ON validation_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_badges_address ON badges(address);
