"""eval/run_eval.py — runs verify.py then report.py over every company in
eval/companies.csv that already has cached research + analysis, saves each
rendered report to eval/reports/, and writes eval/scorecard_template.csv
with an automated fact-check column plus blank columns for a salesperson
to fill in by hand: gap_accurate (Y/N), pitch_usable (Y/N), notes.

Does NOT call retrieve.py or analyze.py — the API isn't part of the current
plan. raw_data/<slug>.json and analysis/<slug>.json must already exist for a
company (produced by manual research, e.g. via Claude Code) before this
script can report on it. Companies missing either file are listed in the
scorecard with a note instead of a score, so it's obvious what still needs
research.

verify.py (Stage 2.5) is deterministic and free -- it checks that every
gap's "based_on" citation actually shares vocabulary with a real fact,
catching fabricated or misattributed citations before a human sees them.
Its per-company result is folded into the scorecard's auto_factcheck
column so the salesperson sees it before they start reviewing.
"""

import csv
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL_DIR = Path(__file__).resolve().parent
COMPANIES_CSV = EVAL_DIR / "companies.csv"
SCORECARD_CSV = EVAL_DIR / "scorecard_template.csv"
REPORTS_DIR = EVAL_DIR / "reports"

RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
VERIFICATION_DIR = ROOT / "verification"

SCORECARD_FIELDS = ["company", "auto_factcheck", "gap_accurate", "pitch_usable", "notes"]


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def run_stage(script: str, company: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(ROOT / script), company],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def read_companies() -> list[str]:
    if not COMPANIES_CSV.exists():
        print(f"{COMPANIES_CSV} not found.")
        sys.exit(1)

    with COMPANIES_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None or "company_name" not in reader.fieldnames:
            print(f"{COMPANIES_CSV} must have a 'company_name' column.")
            sys.exit(1)
        return [row["company_name"].strip() for row in reader if row["company_name"].strip()]


def scorecard_row(company: str, auto_factcheck: str = "", notes: str = "") -> dict:
    return {
        "company": company,
        "auto_factcheck": auto_factcheck,
        "gap_accurate": "",
        "pitch_usable": "",
        "notes": notes,
    }


def run_factcheck(company: str, slug: str) -> str:
    """Runs verify.py and returns a short summary string for the scorecard.
    Non-fatal if verify.py itself fails -- factcheck is a bonus signal, not
    a gate; a failure here shouldn't block the report from being generated.
    """
    result = run_stage("verify.py", company)
    verification_path = VERIFICATION_DIR / f"{slug}.json"
    if not verification_path.exists():
        return "factcheck did not run"

    verification = json.loads(verification_path.read_text(encoding="utf-8"))
    counts = verification["summary"]
    total = verification["gaps_checked"]
    summary = f"{counts['VERIFIED']}/{total} verified"
    if counts["WEAK"]:
        summary += f", {counts['WEAK']} weak"
    if counts["UNVERIFIED"]:
        summary += f", {counts['UNVERIFIED']} UNVERIFIED"
    print(f"Fact-check: {summary}")
    return summary


def process_company(company: str) -> dict:
    slug = slugify(company)
    print(f"\n=== {company} ===")

    if not (RAW_DATA_DIR / f"{slug}.json").exists():
        print("No cached research -- needs manual retrieval first.")
        return scorecard_row(company, notes="NOT YET RESEARCHED -- no raw_data JSON")

    if not (ANALYSIS_DIR / f"{slug}.json").exists():
        print("No cached analysis -- needs manual gap analysis first.")
        return scorecard_row(company, notes="NOT YET ANALYZED -- no analysis JSON")

    factcheck_summary = run_factcheck(company, slug)

    report_result = run_stage("report.py", company)
    if report_result.returncode != 0:
        if report_result.stderr.strip():
            print(report_result.stderr.strip(), file=sys.stderr)
        return scorecard_row(company, factcheck_summary, "FAILED at report.py")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"{slug}.md"
    report_path.write_text(report_result.stdout, encoding="utf-8")
    print(f"Report saved to {report_path}")

    return scorecard_row(company, factcheck_summary)


def main() -> None:
    companies = read_companies()
    if not companies:
        print(f"No companies listed in {COMPANIES_CSV}.")
        sys.exit(1)

    rows = [process_company(company) for company in companies]

    with SCORECARD_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SCORECARD_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nScorecard written to {SCORECARD_CSV} ({len(rows)} companies).")


if __name__ == "__main__":
    main()
