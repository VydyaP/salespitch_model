"""Stage 2: raw_data/<slug>.json -> analysis/<slug>.json

A plain reasoning call (no web search) over the cached facts from
retrieve.py, judged against GND's service reference embedded in
prompts/analyze_v1.md — not hardcoded here.

Pass --local to run against a local Ollama model instead of the Anthropic
API — free, no key, no cost, but requires Ollama running locally
(https://ollama.com) with a model pulled (see OLLAMA_MODEL below). Tested
and rejected for quality (hallucinated gap, weak grounding, 200s/call).

Pass --gemini to run against the Gemini API instead — free tier, tested
and verified (2/2 companies passed verify.py's fact-check at full 1.0
overlap). Needs: pip install google-genai, and a GEMINI_API_KEY env var
(free key from https://aistudio.google.com/apikey).

Pass --groq to run against Groq's free tier instead — tested and verified
(2/2 companies passed verify.py's fact-check, 0.67-1.0 overlap). Faster
than Gemini, but pitches lean more generic/complimentary than Claude's or
Gemini's sharper diagnostic-question style — worth a second look from
whoever validates gap_accurate/pitch_usable. Needs: pip install groq, and
a GROQ_API_KEY env var (free key from https://console.groq.com/keys, no
credit card required).
"""

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "analyze_v1.md"
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"

MODEL = "claude-opus-5"
MAX_TOKENS = 4000

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2"

GEMINI_MODEL = "gemini-3.6-flash"
GROQ_MODEL = "openai/gpt-oss-120b"

SERVICE_REFERENCE_PLACEHOLDER = "(insert the service reference block above)"


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def extract_section(text: str, heading: str) -> str:
    """Pull the text under a '## Heading' line, up to the next '## ' heading (or EOF)."""
    idx = text.find(heading)
    if idx == -1:
        raise ValueError(f"Could not find '{heading}' section in {PROMPT_PATH}")
    _, _, rest = text[idx:].partition("\n")
    next_heading = rest.find("\n## ")
    if next_heading != -1:
        rest = rest[:next_heading]
    return rest.strip()


def build_prompt(raw_data: dict) -> str:
    text = PROMPT_PATH.read_text(encoding="utf-8")
    service_reference = extract_section(text, "## GND Solutions")
    template = extract_section(text, "## Prompt template")
    prompt = template.replace(SERVICE_REFERENCE_PLACEHOLDER, service_reference)
    prompt = prompt.replace("{raw_data_json}", json.dumps(raw_data, indent=2))
    return prompt


def strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def call_claude(prompt: str) -> str:
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    text_blocks = [block.text for block in response.content if block.type == "text"]
    if not text_blocks:
        print(f"No text in response (stop_reason={response.stop_reason!r}).")
        print("--- raw response ---")
        print(response)
        sys.exit(1)
    return text_blocks[-1].strip()


def call_ollama(prompt: str) -> str:
    payload = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": "json",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"Could not reach Ollama at {OLLAMA_URL}: {e}")
        print(f"Is Ollama running? Try: ollama serve   (and: ollama pull {OLLAMA_MODEL})")
        sys.exit(1)

    return body["message"]["content"].strip()


def call_gemini(prompt: str) -> str:
    from google import genai

    client = genai.Client()
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    text = (response.text or "").strip()
    if not text:
        print("No text in response.")
        print("--- raw response ---")
        print(response)
        sys.exit(1)
    return text


def call_groq(prompt: str) -> str:
    from groq import Groq

    client = Groq()
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=GROQ_MODEL,
    )
    text = (response.choices[0].message.content or "").strip()
    if not text:
        print("No text in response.")
        print("--- raw response ---")
        print(response)
        sys.exit(1)
    return text


def main() -> None:
    args = sys.argv[1:]
    local_mode = "--local" in args
    gemini_mode = "--gemini" in args
    groq_mode = "--groq" in args
    args = [a for a in args if a not in ("--local", "--gemini", "--groq")]

    if len(args) != 1:
        print('Usage: python analyze.py "<company name>" [--local | --gemini | --groq]')
        sys.exit(1)

    company = args[0]
    slug = slugify(company)
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    out_path = ANALYSIS_DIR / f"{slug}.json"

    if not raw_path.exists():
        print(f"No cached research for '{company}' at {raw_path}.")
        print(f'Run this first: python retrieve.py "{company}"')
        sys.exit(1)

    if out_path.exists():
        print("already cached")
        return

    raw_data = json.loads(raw_path.read_text(encoding="utf-8"))
    prompt = build_prompt(raw_data)

    if local_mode:
        raw_text = call_ollama(prompt)
    elif gemini_mode:
        raw_text = call_gemini(prompt)
    elif groq_mode:
        raw_text = call_groq(prompt)
    else:
        raw_text = call_claude(prompt)
    cleaned = strip_markdown_fences(raw_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"Failed to parse model response as JSON: {e}")
        print("--- raw response ---")
        print(raw_text)
        return

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Saved {out_path}")


if __name__ == "__main__":
    main()
