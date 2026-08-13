"""Stage 3: raw_data/<slug>.json + analysis/<slug>.json -> printed markdown report

Pure formatting — no API calls. Reads both cached JSON files for a company
and prints a clean, readable report to the terminal. Pass --html to instead
write a polished, self-contained HTML report to site/reports/<slug>.html
(same location build_site.py uses, so single-company and full-site output
stay consistent).
"""

import json
import sys
from pathlib import Path

from html_report import render_report_html

ROOT = Path(__file__).resolve().parent
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
SITE_REPORTS_DIR = ROOT / "site" / "reports"

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
SEVERITY_MARK = {"high": "🔴", "medium": "🟠", "low": "🟢"}


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def render(raw: dict, analysis: dict) -> str:
    lines = []

    name = raw.get("company_name", "Unknown company")
    lines.append(f"# {name}")
    lines.append("")

    lines.append("| | |")
    lines.append("|---|---|")
    lines.append(f"| **Industry** | {raw.get('industry', 'Unknown')} |")
    lines.append(f"| **HQ** | {raw.get('hq', 'Unknown')} |")
    lines.append(f"| **Founded** | {raw.get('founded', 'Unknown')} |")
    lines.append(f"| **Size** | {raw.get('size', 'Unknown')} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    lines.append("## Facts")
    lines.append("")
    facts = raw.get("facts", [])
    if not facts:
        lines.append("_No facts recorded._")
    for fact in facts:
        claim = fact.get("claim", "")
        url = fact.get("source_url", "")
        lines.append(f"- {claim} ([source]({url}))")
    lines.append("")
    lines.append("---")
    lines.append("")

    gaps = analysis.get("gaps", [])
    gaps = sorted(gaps, key=lambda g: SEVERITY_ORDER.get(g.get("severity", "low"), 3))
    counts = {"high": 0, "medium": 0, "low": 0}
    for gap in gaps:
        sev = gap.get("severity", "low")
        if sev in counts:
            counts[sev] += 1
    summary = ", ".join(f"{counts[sev]} {sev}" for sev in ("high", "medium", "low") if counts[sev])
    header_suffix = f" — {summary}" if summary else ""

    lines.append(f"## Gaps ({len(gaps)} found{header_suffix})")
    lines.append("")
    if not gaps:
        lines.append("_No gaps identified._")
    else:
        for gap in gaps:
            severity_key = gap.get("severity", "unknown")
            severity = severity_key.upper()
            mark = SEVERITY_MARK.get(severity_key, "⚪")
            title = gap.get("title", "Untitled gap")
            lines.append(f"### {mark} [{severity}] {title}")
            lines.append("")
            lines.append(gap.get("detail", ""))
            lines.append("")
            lines.append(f"**GND service:** {gap.get('gnd_service', 'Unknown')}")
            lines.append("")
            lines.append(f"> Based on: {gap.get('based_on', 'Unknown')}")
            lines.append("")
    lines.append("---")
    lines.append("")

    pitch = analysis.get("pitch", {})
    lines.append("## Pitch")
    lines.append("")
    lines.append(f"**Angle:** {pitch.get('angle', '')}")
    lines.append("")
    lines.append(f"**Opener:** {pitch.get('opener', '')}")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    args = sys.argv[1:]
    html_mode = "--html" in args
    args = [a for a in args if a != "--html"]

    if len(args) != 1:
        print('Usage: python report.py "<company name>" [--html]')
        sys.exit(1)

    company = args[0]
    slug = slugify(company)

    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"

    missing = []
    if not raw_path.exists():
        missing.append(f"  {raw_path} — run: python retrieve.py \"{company}\"")
    if not analysis_path.exists():
        missing.append(f"  {analysis_path} — run: python analyze.py \"{company}\"")

    if missing:
        print(f"Missing cached data for '{company}':")
        for line in missing:
            print(line)
        sys.exit(1)

    raw = load_json(raw_path)
    analysis = load_json(analysis_path)

    if html_mode:
        SITE_REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        out_path = SITE_REPORTS_DIR / f"{slug}.html"
        out_path.write_text(render_report_html(slug, raw, analysis), encoding="utf-8")
        print(f"Saved {out_path}")
    else:
        print(render(raw, analysis))


if __name__ == "__main__":
    main()
