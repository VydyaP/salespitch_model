"""build_site.py — generates a static, interactive HTML site over every
company that has both raw_data/<slug>.json and analysis/<slug>.json cached.

No API calls, no server required. Output goes to site/ — open
site/index.html directly in a browser (or serve the folder with any static
file server). Each report page is a single self-contained HTML file (inline
CSS/JS) so it can be downloaded and shared standalone.
"""

import json
import sys
from pathlib import Path

from html_report import render_index_html, render_report_html

ROOT = Path(__file__).resolve().parent
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
SITE_DIR = ROOT / "site"
REPORTS_OUT_DIR = SITE_DIR / "reports"


def find_ready_companies() -> list:
    """Return [(slug, raw_dict, analysis_dict), ...] for companies with both files cached."""
    ready = []
    if not RAW_DATA_DIR.exists():
        return ready
    for raw_path in sorted(RAW_DATA_DIR.glob("*.json")):
        slug = raw_path.stem
        analysis_path = ANALYSIS_DIR / f"{slug}.json"
        if not analysis_path.exists():
            continue
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
        ready.append((slug, raw, analysis))
    return ready


def main() -> None:
    companies = find_ready_companies()
    if not companies:
        print("No companies with both raw_data and analysis cached yet.")
        print("Research one first (ask Claude Code to research a company),")
        print("then re-run this script.")
        sys.exit(1)

    REPORTS_OUT_DIR.mkdir(parents=True, exist_ok=True)

    for slug, raw, analysis in companies:
        out_path = REPORTS_OUT_DIR / f"{slug}.html"
        out_path.write_text(render_report_html(slug, raw, analysis), encoding="utf-8")
        print(f"Wrote {out_path}")

    index_path = SITE_DIR / "index.html"
    index_path.write_text(render_index_html(companies), encoding="utf-8")
    print(f"Wrote {index_path}")
    print(f"\nDone. Open {index_path} in a browser to view the site.")


if __name__ == "__main__":
    main()
