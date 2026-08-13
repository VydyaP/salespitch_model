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
"""

import json
import re
import sys
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "retrieve_v1.md"
RAW_DATA_DIR = ROOT / "raw_data"

MODEL = "claude-opus-5"
MAX_TOKENS = 8000

GEMINI_MODEL = "gemini-3.6-flash"
GROQ_MODEL = "groq/compound-mini"

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


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def load_prompt_template() -> str:
    """Pull the prompt text out of the '## Prompt template' section of the .md file."""
    text = PROMPT_PATH.read_text(encoding="utf-8")
    marker = "## Prompt template"
    idx = text.find(marker)
    if idx == -1:
        raise ValueError(f"Could not find '{marker}' section in {PROMPT_PATH}")
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


def call_groq_search_multi(base_prompt: str, company: str) -> dict:
    """Run the 3 angled searches, merging whatever succeeds. Returns None
    only if every single angle fails -- a partial result (1 or 2 of 3
    angles succeeding) is still returned rather than treated as failure."""
    from groq import Groq

    client = Groq()
    results = []

    for i, (label, focus) in enumerate(GROQ_SEARCH_ANGLES):
        angle_prompt = f"{base_prompt}\n\nFOCUS FOR THIS CALL: {focus}"
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": angle_prompt}],
                model=GROQ_MODEL,
            )
            raw_text = (response.choices[0].message.content or "").strip()
            data = json.loads(strip_markdown_fences(raw_text))
        except Exception as e:
            print(f"  [{label}] failed: {e}")
        else:
            results.append(data)
            print(f"  [{label}] found {len(data.get('facts', []))} facts")

        if i < len(GROQ_SEARCH_ANGLES) - 1:
            time.sleep(5)  # pace requests to stay under the free-tier TPM limit

    if not results:
        return None
    return merge_angle_results(company, results)


def main() -> None:
    args = sys.argv[1:]
    gemini_mode = "--gemini" in args
    groq_mode = "--groq" in args
    args = [a for a in args if a not in ("--gemini", "--groq")]

    if len(args) != 1:
        print('Usage: python retrieve.py "<company name>" [--gemini | --groq]')
        sys.exit(1)

    company = args[0]
    slug = slugify(company)
    out_path = RAW_DATA_DIR / f"{slug}.json"

    if out_path.exists():
        print("already cached")
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
            raw_text = call_gemini_search(prompt)
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
