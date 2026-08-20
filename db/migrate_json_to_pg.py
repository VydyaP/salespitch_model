"""One-time import of raw_data/analysis/verification JSON files into Postgres.

Read-only against the source files -- never writes or deletes them. Safe to
re-run: it wipes and reloads the `scans`/`companies`/`audit_log` tables each
time (this is a bootstrap script, not an incremental sync).

Usage:
    python db/migrate_json_to_pg.py
"""

import datetime as dt
import json
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
VERIFICATION_DIR = ROOT / "verification"

DSN = "host=localhost dbname=prospect_scan user=postgres password=postgres"


def main() -> None:
    raw_files = sorted(RAW_DATA_DIR.glob("*.json"))
    print(f"Found {len(raw_files)} raw_data files.")

    with psycopg.connect(DSN, autocommit=False) as conn:
        with conn.cursor() as cur:
            # Bootstrap script -- start from a clean slate each run.
            cur.execute("TRUNCATE audit_log, scans, companies RESTART IDENTITY CASCADE;")

            imported = 0
            skipped = []
            for raw_path in raw_files:
                slug = raw_path.stem
                analysis_path = ANALYSIS_DIR / f"{slug}.json"
                verification_path = VERIFICATION_DIR / f"{slug}.json"

                raw = json.loads(raw_path.read_text(encoding="utf-8"))
                analysis = (
                    json.loads(analysis_path.read_text(encoding="utf-8"))
                    if analysis_path.exists()
                    else None
                )
                verification = (
                    json.loads(verification_path.read_text(encoding="utf-8"))
                    if verification_path.exists()
                    else None
                )

                if analysis is None:
                    skipped.append(slug)
                    # Still import as a scan row (preserves the raw data /
                    # abandoned-draft state) but there's no "current" company
                    # yet since load_company_json() requires analysis too.

                company_name = raw.get("company_name", slug)
                scanned_at = dt.datetime.fromtimestamp(raw_path.stat().st_mtime, tz=dt.timezone.utc)

                cur.execute(
                    """
                    INSERT INTO companies (slug, company_name, created_at, updated_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (slug) DO NOTHING;
                    """,
                    (slug, company_name, scanned_at, scanned_at),
                )

                cur.execute(
                    """
                    INSERT INTO scans (company_slug, raw_data, analysis, verification, is_rescan, created_at)
                    VALUES (%s, %s, %s, %s, false, %s)
                    RETURNING id;
                    """,
                    (
                        slug,
                        json.dumps(raw),
                        json.dumps(analysis) if analysis is not None else None,
                        json.dumps(verification) if verification is not None else None,
                        scanned_at,
                    ),
                )
                scan_id = cur.fetchone()[0]

                if analysis is not None:
                    cur.execute(
                        "UPDATE companies SET current_scan_id = %s WHERE slug = %s;",
                        (scan_id, slug),
                    )

                cur.execute(
                    """
                    INSERT INTO audit_log (company_slug, action, scan_id, details, created_at)
                    VALUES (%s, 'research', %s, %s, %s);
                    """,
                    (
                        slug,
                        scan_id,
                        json.dumps({"source": "migration_from_json", "had_analysis": analysis is not None}),
                        scanned_at,
                    ),
                )

                imported += 1

        conn.commit()

    print(f"Imported {imported} scans / companies.")
    if skipped:
        print(f"{len(skipped)} had no analysis file (abandoned drafts, imported as scan-only): {skipped}")


if __name__ == "__main__":
    main()
