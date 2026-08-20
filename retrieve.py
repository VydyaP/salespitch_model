"""Stage 1: company name -> raw_data/<slug>.json

Calls the Anthropic API with the web_search tool enabled, using the prompt
template in prompts/retrieve_v1.md, and caches the raw structured facts to
disk. See SPEC.md for the full pipeline this fits into.

Pass --gemini to run against the Gemini API with Google Search grounding
instead. UNTESTED on this project as of this writing -- the free tier
returns 429 RESOURCE_EXHAUSTED on any grounded (search) call, even in
isolation; the Google Cloud project behind the API key needs billing
enabled before this path can even be tried. (analyze.py's --gemini flag,
by contrast, IS tested and verified -- that's reasoning-only, no search.)
Needs: pip install google-genai, and a GEMINI_API_KEY env var (free key
from https://aistudio.google.com/apikey).

Pass --groq to run against Groq's groq/compound-mini model instead --
free tier, tested and verified across a stress test of 7 genuinely
obscure/niche companies (5 clean, 1 recovered on retry after a rate
limit, 1 hit a JSON-escaping bug). Runs THREE narrower, angled searches
per company (basics / operations & tech / recent signals) instead of one
broad one, merging the results -- this fixes the one real, reproducible
failure mode found in testing: groq/compound (full) and even a single
broad compound-mini call both 413 (Request Entity Too Large) on
well-documented companies, because one broad search pulls back more
content than the free tier's per-request size allows. Splitting into
narrower angles keeps each request small AND tends to surface MORE total
facts than a single broad call (confirmed: fixed Eurotranspharma, a
399-employee French company that 413'd on the old single-call approach).
Needs: pip install groq, and a GROQ_API_KEY env var (free key from
https://console.groq.com/keys, no credit card required).

Pass --tavily to run against real Tavily search (own the retrieval layer)
plus one separate gpt-oss-120b extraction call, instead of groq/
compound-mini's bundled search+extract -- this is the default the live
app (server.py) uses as of 2026-08-20. Chosen after a 15-company
side-by-side: Tavily won on fact count (9/15 companies) and, more
importantly, on reliability -- zero failures across the last 10 companies
tested, vs. groq/compound-mini's frequent 429/413/malformed-JSON errors
under real back-to-back usage. Runs the same 3 angled queries as --groq
(basics / operations / signals), but as plain search queries against
Tavily rather than LLM instructions -- Tavily does the searching, a
single extraction call turns the combined results into structured facts.
Needs: pip install tavily-python, and a TAVILY_API_KEY env var (free key
from https://tavily.com, 1,000 search credits/month, no card required).
"""

import datetime as dt
import json
import re
import sys
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "retrieve_v1.md"
TAVILY_EXTRACT_PROMPT_PATH = ROOT / "prompts" / "retrieve_tavily_extract_v1.md"
RAW_DATA_DIR = ROOT / "raw_data"
RATE_LIMIT_STATE_PATH = ROOT / "rate_limit_state.json"

MODEL = "claude-opus-5"
MAX_TOKENS = 8000

GEMINI_MODEL = "gemini-3.6-flash"
GROQ_MODEL = "groq/compound-mini"
TAVILY_EXTRACT_MODEL = "openai/gpt-oss-120b"  # same model analyze.py's Stage 2 uses
TAVILY_EXTRACT_MAX_TOKENS = 3000  # explicit ceiling -- an earlier test without
                                   # one got cut off mid-JSON on a content-heavy
                                   # company (Snowman Logistics, 2026-08-19)

# Hard, code-enforced daily ceiling for Gemini's grounded (Google Search)
# calls -- independent of whatever Google's own billing allows. Unlike
# Groq's free tier, which just fails closed once a limit is hit, Gemini's
# grounding only works once billing is enabled on the project, and past its
# free monthly allowance (5,000 requests/month, ~161/day average) it bills
# automatically at $14/1,000 instead of erroring. This cap exists so
# enabling that billing can never turn into a surprise charge -- it fails
# closed well before Google's own free allowance, let alone paid usage, is
# ever reached. See prompts/retrieve_v1.md and the --gemini branch below.
GEMINI_GROUNDED_DAILY_CAP = 100


def _check_and_increment_daily_cap(key: str, cap: int) -> None:
    """Raise RuntimeError if `key`'s daily cap is already hit; otherwise
    record one more call. Persisted to disk so the cap holds across
    separate process runs, not just within one -- each research request
    is its own `python retrieve.py ...` process."""
    today = dt.date.today().isoformat()
    state = {}
    if RATE_LIMIT_STATE_PATH.exists():
        try:
            state = json.loads(RATE_LIMIT_STATE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            state = {}

    entry = state.get(key, {})
    if entry.get("date") != today:
        entry = {"date": today, "count": 0}

    if entry["count"] >= cap:
        raise RuntimeError(
            f"Daily safety cap hit: '{key}' has already made {entry['count']}/{cap} "
            "calls today. Refusing to make another -- this is a hard-coded "
            "ceiling to prevent unexpected billing, not a provider error. "
            "Resets automatically at midnight."
        )

    entry["count"] += 1
    state[key] = entry
    RATE_LIMIT_STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")

# Three narrower angles instead of one broad search -- each keeps the
# request small enough to dodge the free tier's 413 size cap, and
# together they tend to surface more total facts than one broad call.
GROQ_SEARCH_ANGLES = [
    (
        "basics",
        "Focus specifically on company basics: founding year, headquarters "
        "location, what the company does, company size (employees or "
        "scale), and company-level contact info (official website, "
        "official LinkedIn page, general phone number -- never an "
        "individual's personal contact details). Aim for 2-4 facts.",
    ),
    (
        "operations",
        "Focus specifically on operations, facilities, and technology: "
        "warehouses, cold storage or fleet capacity, temperature ranges, "
        "and any named systems, software, or vendors. Aim for 3-5 facts.",
    ),
    (
        "signals",
        "Focus specifically on recent news and signals: funding rounds, "
        "expansions, leadership changes, partnerships, or awards. Aim for "
        "2-4 facts.",
    ),
]

# Same 3-angle intent as GROQ_SEARCH_ANGLES above, phrased as plain search
# queries instead of LLM instructions -- these go straight to Tavily, not
# to a model.
TAVILY_SEARCH_ANGLES = [
    ("basics", "{company} company headquarters founded employees official website"),
    ("operations", "{company} warehouse cold storage fleet technology systems"),
    ("signals", "{company} funding expansion news partnership"),
]


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def load_prompt_template(path: Path = PROMPT_PATH) -> str:
    """Pull the prompt text out of the '## Prompt template' section of the .md file."""
    text = path.read_text(encoding="utf-8")
    marker = "## Prompt template"
    idx = text.find(marker)
    if idx == -1:
        raise ValueError(f"Could not find '{marker}' section in {path}")
    # drop everything up through the heading's own line
    _, _, rest = text[idx:].partition("\n")
    return rest.strip()


def strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def call_gemini_search(prompt: str) -> str:
    _check_and_increment_daily_cap("gemini_grounded", GEMINI_GROUNDED_DAILY_CAP)

    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())]
        ),
    )
    return (response.text or "").strip()


def merge_angle_results(company: str, results: list) -> dict:
    """Combine per-angle JSON responses into one raw_data-shaped dict.
    First non-Unknown value wins for scalar fields; facts are concatenated
    and deduped by exact claim text."""
    merged = {
        "company_name": company,
        "founded": "Unknown",
        "hq": "Unknown",
        "industry": "Unknown",
        "size": "Unknown",
        "website": "Unknown",
        "linkedin_url": "Unknown",
        "phone": "Unknown",
        "facts": [],
    }
    seen_claims = set()
    for data in results:
        for field in ("founded", "hq", "industry", "size", "website", "linkedin_url", "phone"):
            candidate = str(data.get(field, "")).strip()
            if candidate and candidate.lower() != "unknown" and merged[field] == "Unknown":
                merged[field] = candidate
        for fact in data.get("facts", []):
            claim = str(fact.get("claim", "")).strip()
            if claim and claim not in seen_claims:
                seen_claims.add(claim)
                merged["facts"].append(fact)
    return merged


# Discovered live (not documented anywhere): groq/compound-mini's rate-limit
# errors report against `openai/gpt-oss-120b`, not compound-mini itself --
# compound appears to run its reasoning on gpt-oss-120b internally. That
# means Stage 1 (this file) and Stage 2 (analyze.py's direct gpt-oss-120b
# calls) are actually drawing from the SAME small 8K TPM pool, not two
# separate budgets as originally assumed -- tracked under one shared key
# for that reason. See rate_limiter.SHARED_GPT_OSS_TPM.
def call_groq_search_multi(base_prompt: str, company: str) -> dict:
    """Run the 3 angled searches, merging whatever succeeds. Returns None
    only if every single angle fails -- a partial result (1 or 2 of 3
    angles succeeding) is still returned rather than treated as failure."""
    from groq import Groq

    import rate_limiter

    client = Groq()
    results = []

    for label, focus in GROQ_SEARCH_ANGLES:
        angle_prompt = f"{base_prompt}\n\nFOCUS FOR THIS CALL: {focus}"
        # Waits only if the real, measured rolling-60s TPM usage is close
        # to compound-mini's ceiling -- not a blind fixed delay every time
        # (replaces the old time.sleep(5), which still let 413/TPM errors
        # through under real back-to-back usage).
        rate_limiter.wait_for_tpm_budget(
            rate_limiter.SHARED_GPT_OSS_KEY, angle_prompt, rate_limiter.SHARED_GPT_OSS_TPM
        )
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": angle_prompt}],
                model=GROQ_MODEL,
            )
            if response.usage:
                rate_limiter.record_actual_usage(rate_limiter.SHARED_GPT_OSS_KEY, response.usage.total_tokens)
            raw_text = (response.choices[0].message.content or "").strip()
            data = json.loads(strip_markdown_fences(raw_text))
        except Exception as e:
            print(f"  [{label}] failed: {e}")
        else:
            results.append(data)
            print(f"  [{label}] found {len(data.get('facts', []))} facts")

    if not results:
        return None
    return merge_angle_results(company, results)


def call_tavily_search_multi(company: str) -> dict | None:
    """Own the retrieval layer: 3 angled Tavily searches (no LLM involved,
    pure search), then ONE extraction call over the combined raw results.
    Chosen over groq/compound-mini as the default 2026-08-20 after a
    15-company side-by-side: Tavily won on fact count (9/15) and, more
    importantly, reliability -- zero failures across the last 10 companies
    tested, vs. frequent Groq rate-limit/malformed-JSON errors. Returns
    None if Tavily finds nothing or the extraction call fails outright --
    a JSON parse failure is caught and reported, not raised, matching
    call_groq_search_multi's contract."""
    from groq import Groq
    from tavily import TavilyClient

    import rate_limiter

    tavily = TavilyClient()  # reads TAVILY_API_KEY from env automatically
    all_results = []
    for label, query_template in TAVILY_SEARCH_ANGLES:
        query = query_template.format(company=company)
        try:
            resp = tavily.search(query=query, search_depth="basic", max_results=4)
        except Exception as e:
            print(f"  [tavily:{label}] search failed: {e}")
            continue
        angle_results = resp.get("results", [])
        for r in angle_results:
            all_results.append({
                "angle": label,
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:500],
            })
        print(f"  [tavily:{label}] {len(angle_results)} results")

    if not all_results:
        return None

    results_block = "\n\n".join(
        f"[{r['angle']}] {r['title']}\nURL: {r['url']}\n{r['content']}" for r in all_results
    )
    template = load_prompt_template(TAVILY_EXTRACT_PROMPT_PATH)
    extraction_prompt = template.replace("{company}", company).replace("{results_block}", results_block)

    # Shared with analyze.py's Stage 2 calls and groq/compound-mini's
    # internal usage -- see rate_limiter.SHARED_GPT_OSS_TPM for why.
    rate_limiter.wait_for_tpm_budget(
        rate_limiter.SHARED_GPT_OSS_KEY, extraction_prompt, rate_limiter.SHARED_GPT_OSS_TPM
    )
    client = Groq()
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": extraction_prompt}],
            model=TAVILY_EXTRACT_MODEL,
            max_tokens=TAVILY_EXTRACT_MAX_TOKENS,
        )
    except Exception as e:
        print(f"  [extraction] call failed: {e}")
        return None
    if response.usage:
        rate_limiter.record_actual_usage(rate_limiter.SHARED_GPT_OSS_KEY, response.usage.total_tokens)

    raw_text = (response.choices[0].message.content or "").strip()
    cleaned = strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  [extraction] failed to parse JSON: {e}")
        return None


def main() -> None:
    args = sys.argv[1:]
    tavily_mode = "--tavily" in args
    gemini_mode = "--gemini" in args
    groq_mode = "--groq" in args
    force = "--force" in args
    args = [a for a in args if a not in ("--gemini", "--groq", "--tavily", "--force")]

    if len(args) != 1:
        print('Usage: python retrieve.py "<company name>" [--gemini | --groq | --tavily] [--force]')
        sys.exit(1)

    company = args[0]
    slug = slugify(company)
    out_path = RAW_DATA_DIR / f"{slug}.json"

    if out_path.exists() and not force:
        print("already cached")
        return

    if tavily_mode:
        # Own the retrieval layer: real search via Tavily, one separate
        # extraction call -- no combined LLM prompt template needed here,
        # call_tavily_search_multi builds its own extraction prompt.
        data = call_tavily_search_multi(company)
        if data is None:
            print("Tavily search + extraction failed -- nothing saved.")
            return
        RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(f"Saved {out_path}")
        return

    template = load_prompt_template()
    prompt = template.replace("{company}", company)

    if groq_mode:
        # Multi-angle: 3 narrower searches merged, not one broad call/parse.
        data = call_groq_search_multi(prompt, company)
        if data is None:
            print("All 3 angled searches failed against Groq -- nothing saved.")
            return
    else:
        if gemini_mode:
            try:
                raw_text = call_gemini_search(prompt)
            except RuntimeError as e:
                print(str(e))
                return
            if not raw_text:
                print("No text in response from Gemini.")
                return
        else:
            client = anthropic.Anthropic()

            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                tools=[{"type": "web_search_20260209", "name": "web_search"}],
                messages=[{"role": "user", "content": prompt}],
            )

            text_blocks = [block.text for block in response.content if block.type == "text"]

            if not text_blocks:
                print(f"No text in response (stop_reason={response.stop_reason!r}).")
                print("--- raw response ---")
                print(response)
                return

            # The final answer is the last text block; earlier ones may be
            # preamble/commentary emitted before or between web_search tool calls.
            raw_text = text_blocks[-1].strip()

        cleaned = strip_markdown_fences(raw_text)

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"Failed to parse model response as JSON: {e}")
            print("--- raw response ---")
            print(raw_text)
            return

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Saved {out_path}")


if __name__ == "__main__":
    main()
