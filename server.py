"""Local web server for live company search.

Serves the static site/ directory and adds two live endpoints the
static-only build (build_site.py) can't provide:

  GET /api/suggest?q=<query>
      Autocomplete: matches from the existing corpus (instant) plus
      global suggestions from Clearbit's free, no-key autocomplete API.

  GET /api/scan/research?company=<name>
      Server-Sent Events stream. If the company is already in the
      corpus, reports "done" immediately (already published). Otherwise
      runs Stage 1 (retrieve.py --tavily) and checks the researched
      industry against GND's cold-chain/logistics/pharma scope. In
      scope: continues through Stage 2 + fact-check and reports
      "ready_for_review". Out of scope: stops and reports "confirm"
      with the researched industry instead -- the caller decides
      whether to continue.

  GET /api/scan/continue?company=<name>
      Resumes a paused scan whose Stage 1 facts are already on disk --
      runs analyze.py --groq -> verify.py -> reports "ready_for_review".

  GET /api/scan/cancel?company=<name>
      Deletes the Stage 1 raw_data a paused (out-of-scope) scan left
      behind, so declining a "confirm" leaves nothing on disk.

  GET /preview/<slug>
      Renders the researched-but-not-yet-published report on the fly
      from raw_data/analysis on disk, with Save/Discard actions. Never
      written to site/reports/ -- this is a preview, not a publish.

  POST /api/save?slug=<slug>
      Publishes: runs build_site.py, which picks up this company (and
      any other ready pairs) and adds it to the real site index.

  POST /api/discard?slug=<slug>
      Deletes raw_data/analysis/verification for a reviewed-but-rejected
      company. Nothing about it persists.

  GET /api/companies
      JSON list of every company with both raw_data and analysis on
      disk (published or not -- includes an in-review draft too, since
      this reads straight from disk rather than the published site
      index). Used by the React frontend (frontend/) instead of the
      static site/ pages. Each entry matches frontend/src/data/companies.ts's
      Company shape.

  GET /api/companies/<slug>
      Same shape, single company. 404 if raw_data/analysis aren't both
      on disk yet for that slug.

Nothing is published to the site/corpus index until a human clicks Save
on the preview page -- research alone never auto-publishes. The 22
companies already in the corpus are untouched by any of this.

Run: python server.py   (reads GROQ_API_KEY from .env -- see .env.example)
Then open http://localhost:5000
Needs: pip install flask python-dotenv
"""

import datetime as dt
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, request, send_from_directory, stream_with_context

from html_report import render_report_html

load_dotenv()

ROOT = Path(__file__).resolve().parent
SITE_DIR = ROOT / "site"
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
VERIFICATION_DIR = ROOT / "verification"

CLEARBIT_URL = "https://autocomplete.clearbit.com/v1/companies/suggest"

# Deterministic scope check -- no LLM judging itself, same philosophy as
# verify.py: a blunt, explainable keyword floor, not semantic understanding.
# GND's Phase 1 scope is cold-chain/logistics/pharma; this only ever flags
# a *warning* for confirmation, it never hard-blocks (see /api/scan/research).
SCOPE_KEYWORDS = [
    "cold chain", "cold storage", "warehous", "logistic", "supply chain",
    "transport", "freight", "trucking", "distribution", "courier",
    "delivery", "fleet", "reefer", "3pl", "fulfillment", "dark store",
    "quick commerce", "pharma", "vaccine", "drug", "medicine", "clinical",
    "refrigerat", "frozen", "perishable", "food", "seafood", "agri",
    "dairy", "grocery", "fmcg",
]

app = Flask(__name__, static_folder=str(SITE_DIR), static_url_path="")


def in_scope(raw_data: dict) -> bool:
    haystack = f"{raw_data.get('industry', '')} {raw_data.get('company_name', '')}".lower()
    return any(kw in haystack for kw in SCOPE_KEYWORDS)


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def corpus_matches(query: str, limit: int = 5) -> list:
    q = query.lower()
    matches = []
    for path in sorted(RAW_DATA_DIR.glob("*.json")):
        # A raw_data file alone is an incomplete/abandoned draft (Stage 1
        # ran, Stage 2 never finished or was never reviewed) -- it isn't
        # visible via /api/companies and clicking it 404s. Require the
        # matching analysis file too, so suggestions only ever point at
        # something that's actually a real, viewable company.
        if not (ANALYSIS_DIR / path.name).exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        name = data.get("company_name", "")
        if q in name.lower():
            matches.append({"name": name, "slug": path.stem, "source": "corpus"})
        if len(matches) >= limit:
            break
    return matches


def clearbit_matches(query: str, exclude_names: set, limit: int = 5) -> list:
    url = CLEARBIT_URL + "?" + urllib.parse.urlencode({"query": query})
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "prospect-scan/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            items = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return []

    matches = []
    for item in items:
        name = item.get("name", "")
        if not name or name.lower() in exclude_names:
            continue
        matches.append({"name": name, "domain": item.get("domain"), "source": "new"})
        if len(matches) >= limit:
            break
    return matches


@app.route("/")
def index():
    return send_from_directory(SITE_DIR, "index.html")


@app.route("/api/suggest")
def suggest():
    query = request.args.get("q", "").strip()
    if not query:
        return {"items": []}

    corpus = corpus_matches(query)
    seen = {m["name"].lower() for m in corpus}
    web = clearbit_matches(query, seen)
    return {"items": corpus + web}


def run_stage(args: list) -> tuple:
    """Run a project script as a subprocess, returning (success, output)."""
    result = subprocess.run(
        [sys.executable] + args,
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode == 0, output


def sse(stage: str, **fields) -> str:
    payload = {"stage": stage, **fields}
    return f"data: {json.dumps(payload)}\n\n"


def finish_scan(company: str, slug: str, force: bool = False):
    """Stage 2 onward: analyze -> verify -> stop for review. Shared by the
    in-scope auto-continue path and /api/scan/continue after a confirmed
    warning. Does NOT publish to the site or corpus index -- that only
    happens if the user clicks Save on the /preview/<slug> page."""
    analysis_path = ANALYSIS_DIR / f"{slug}.json"

    # Same reasoning as retrieve.py's --force above: analyze.py has its own
    # "already cached" guard, and on a re-research the old analysis.json
    # still exists on disk (only raw_data.json is guaranteed fresh at this
    # point), so without --force it would silently skip and leave the old
    # gaps/pitch in place.
    analyze_args = ["analyze.py", company, "--groq"]
    if force:
        analyze_args.append("--force")

    yield sse("analyzing")
    ok, output = run_stage(analyze_args)
    if not ok or not analysis_path.exists():
        yield sse("error", message=f"Analysis failed: {output[-400:]}")
        return

    yield sse("verifying")
    run_stage(["verify.py", company])  # informational only; never blocks review

    yield sse("ready_for_review", slug=slug)


@app.route("/api/scan/research")
def scan_research():
    company = request.args.get("company", "").strip()
    if not company:
        return Response(sse("error", message="No company name given."), mimetype="text/event-stream")

    # force=1 skips the already-researched short-circuit -- used by a
    # company page's explicit "Re-research" action. Plain search-bar
    # lookups of an existing company should still short-circuit straight
    # to the existing report instead of silently re-running research.
    force = request.args.get("force") == "1"

    slug = slugify(company)
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"

    def generate():
        if not force and raw_path.exists() and analysis_path.exists():
            yield sse("done", slug=slug, already_existed=True)
            return

        # retrieve.py has its own independent "already cached, skip" guard
        # (checks whether its own output file exists) -- entirely unaware
        # of this endpoint's force flag on its own. --force tells it to
        # skip that check. It's safe to pass unconditionally: the flag is
        # only consulted when out_path already exists, and retrieve.py
        # only overwrites that file *after* a successful fetch -- a failed
        # search returns early and never touches the old file, so force
        # can never destroy data on failure the way a pre-emptive delete
        # would (that was tried and immediately took out cold_chain_3pl's
        # data on a Groq rate-limit failure -- do not go back to that).
        # --tavily (real search via Tavily + one separate extraction call)
        # replaced --groq as the default here 2026-08-20, after a
        # 15-company side-by-side found it both a bit richer on facts
        # (won 9/15) and, more importantly, far more reliable -- zero
        # failures across the last 10 companies tested, vs. groq/
        # compound-mini's frequent rate-limit and malformed-JSON errors.
        retrieve_args = ["retrieve.py", company, "--tavily"]
        if force:
            retrieve_args.append("--force")

        yield sse("searching")
        ok, output = run_stage(retrieve_args)
        if not ok or not raw_path.exists():
            yield sse("error", message=f"Search failed: {output[-400:]}")
            return

        raw_data = json.loads(raw_path.read_text(encoding="utf-8"))
        if not in_scope(raw_data):
            yield sse(
                "confirm",
                industry=raw_data.get("industry", "Unknown"),
                company_name=raw_data.get("company_name", company),
            )
            return  # paused -- caller hits /continue or /cancel

        yield from finish_scan(company, slug, force=force)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


@app.route("/api/scan/continue")
def scan_continue():
    company = request.args.get("company", "").strip()
    force = request.args.get("force") == "1"
    slug = slugify(company)
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    if not company or not raw_path.exists():
        return Response(
            sse("error", message="No paused research found for that company."),
            mimetype="text/event-stream",
        )
    return Response(
        stream_with_context(finish_scan(company, slug, force=force)), mimetype="text/event-stream"
    )


@app.route("/api/scan/cancel", methods=["POST"])
def scan_cancel():
    company = request.args.get("company", "").strip()
    slug = slugify(company)
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    if raw_path.exists():
        raw_path.unlink()
    return {"ok": True}


@app.route("/preview/<slug>")
def preview(slug):
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"
    if not raw_path.exists() or not analysis_path.exists():
        return f"No researched-but-unsaved data found for '{slug}'.", 404

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    html = render_report_html(slug, raw, analysis, index_href="/", preview=True)
    return Response(html, mimetype="text/html")


@app.route("/api/save", methods=["POST"])
def api_save():
    slug = request.args.get("slug", "").strip()
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"
    if not slug or not raw_path.exists() or not analysis_path.exists():
        return {"ok": False, "error": "Nothing to save for that slug."}, 404
    run_stage(["build_site.py"])
    return {"ok": True, "slug": slug}


@app.route("/api/discard", methods=["POST"])
def api_discard():
    slug = request.args.get("slug", "").strip()
    if not slug:
        return {"ok": False, "error": "No slug given."}, 400
    for directory in (RAW_DATA_DIR, ANALYSIS_DIR, ROOT / "verification"):
        path = directory / f"{slug}.json"
        if path.exists():
            path.unlink()
    return {"ok": True}


def load_company_json(slug: str) -> dict | None:
    """Read raw_data + analysis for one slug and shape it to match
    frontend/src/data/companies.ts's Company type. Returns None if either
    file is missing. `country` and `scanned_at` don't exist in our real
    schema -- derived here rather than faked in the frontend."""
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"
    if not raw_path.exists() or not analysis_path.exists():
        return None

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    hq = raw.get("hq", "")
    country = hq.split(",")[-1].strip() if hq else "Unknown"
    # Full timestamp (not just date) so the frontend can show exactly when a
    # research or re-research last completed -- raw_path's mtime updates
    # automatically whenever retrieve.py rewrites it.
    scanned_at = dt.datetime.fromtimestamp(raw_path.stat().st_mtime).isoformat()

    # verify.py's per-gap VERIFIED/WEAK/UNVERIFIED result was previously
    # computed and written to disk but never read by anything -- surfaced
    # here by matching gap title, same string-match approach the frontend
    # already uses to link a gap back to its source fact.
    verify_by_title: dict[str, dict] = {}
    verification_path = VERIFICATION_DIR / f"{slug}.json"
    if verification_path.exists():
        verification = json.loads(verification_path.read_text(encoding="utf-8"))
        for result in verification.get("results", []):
            verify_by_title[result.get("title", "")] = result

    gaps = [
        {**gap, "verification_status": verify_by_title.get(gap.get("title", ""), {}).get("status")}
        for gap in analysis.get("gaps", [])
    ]

    return {
        "slug": slug,
        "company_name": raw.get("company_name", "Unknown"),
        "founded": raw.get("founded", "Unknown"),
        "hq": hq or "Unknown",
        "country": country,
        "industry": raw.get("industry", "Unknown"),
        "size": raw.get("size", "Unknown"),
        "scanned_at": scanned_at,
        # Only present for companies researched after this schema addition
        # -- most of the corpus predates it and won't have these. Default
        # to "Unknown" rather than omitting the keys, so the frontend
        # doesn't need to special-case a missing field.
        "website": raw.get("website", "Unknown"),
        "linkedin_url": raw.get("linkedin_url", "Unknown"),
        "phone": raw.get("phone", "Unknown"),
        "facts": raw.get("facts", []),
        "gaps": gaps,
        "pitch": analysis.get("pitch", {"angle": "", "opener": ""}),
    }


@app.route("/api/companies")
def api_companies():
    companies = []
    for raw_path in sorted(RAW_DATA_DIR.glob("*.json")):
        company = load_company_json(raw_path.stem)
        if company is not None:
            companies.append(company)
    return {"companies": companies}


@app.route("/api/companies/<slug>")
def api_company(slug):
    company = load_company_json(slug)
    if company is None:
        return {"error": "Not found"}, 404
    return company


@app.after_request
def add_cors_headers(response):
    # The React frontend (frontend/, Vite dev server on :8080) is a
    # different origin than this Flask app (:5000) -- without this, the
    # browser blocks its fetch() calls entirely. Local dev tool, wildcard
    # is fine here.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


if __name__ == "__main__":
    print("Prospect Scan server running at http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
