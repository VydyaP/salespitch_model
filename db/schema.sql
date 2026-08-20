-- Prospect Scan: audit trail / research history schema
-- One-time setup for the local Postgres migration. Run via:
--   psql -U postgres -h localhost -d prospect_scan -f db/schema.sql

-- One row per company slug: the "current" state the app reads.
CREATE TABLE companies (
    slug            TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL,
    current_scan_id INTEGER,  -- FK added after scans exists (circular ref)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per research run. Never overwritten -- this IS the history.
CREATE TABLE scans (
    id              SERIAL PRIMARY KEY,
    company_slug    TEXT NOT NULL REFERENCES companies(slug) ON DELETE CASCADE,
    raw_data        JSONB NOT NULL,
    analysis        JSONB,        -- null until stage 2 finishes
    verification    JSONB,        -- null until stage 3 finishes
    is_rescan       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies
    ADD CONSTRAINT companies_current_scan_fk
    FOREIGN KEY (current_scan_id) REFERENCES scans(id);

CREATE INDEX scans_company_slug_idx ON scans(company_slug);

-- Who/what/when for save/discard/delete/rescan actions.
CREATE TABLE audit_log (
    id              SERIAL PRIMARY KEY,
    company_slug    TEXT NOT NULL,
    action          TEXT NOT NULL,  -- 'research' | 'rescan' | 'save' | 'discard' | 'delete'
    scan_id         INTEGER REFERENCES scans(id),
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_company_slug_idx ON audit_log(company_slug);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);
