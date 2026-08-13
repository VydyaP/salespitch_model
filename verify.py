"""Stage 2.5: raw_data/<slug>.json + analysis/<slug>.json -> verification/<slug>.json

A deterministic fact-checker -- no API calls, no LLM judging itself. For
every gap in analysis, checks whether its "based_on" citation actually
shares vocabulary with real facts in raw_data, catching fabricated or
misattributed citations before a human ever sees them.

Method: word-overlap against the combined text of every fact's claim +
source_snippet. This isn't semantic understanding -- it's a blunt, honest,
explainable check: do the significant words in this citation actually
appear somewhere in the sourced research? A well-grounded citation shares
most of its vocabulary with a real fact; a fabricated one won't.

Limitation, stated plainly: this cannot verify that a citation is
*truthful* to the source, only that it isn't inventing words wholesale.
Paraphrase-with-real-content passes; a plausible-sounding fabrication that
happens to reuse close vocabulary could still slip through. It's a floor,
not a ceiling -- a human still makes the real call.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW_DATA_DIR = ROOT / "raw_data"
ANALYSIS_DIR = ROOT / "analysis"
VERIFICATION_DIR = ROOT / "verification"

VERIFIED_THRESHOLD = 0.5
WEAK_THRESHOLD = 0.3

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for",
    "with", "by", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its", "as", "from", "into",
    "than", "then", "so", "but", "not", "no", "per", "via", "also",
    "has", "have", "had", "will", "would", "could", "should", "can",
    "across", "over", "under", "about", "up", "down", "out", "off",
}


def slugify(company: str) -> str:
    return company.strip().lower().replace(" ", "_")


def significant_words(text: str) -> set:
    tokens = re.findall(r"[a-zA-Z0-9°%$₹.+-]+", text.lower())
    return {t for t in tokens if len(t) > 2 and t not in STOPWORDS}


def overlap_score(based_on: str, facts_corpus_words: set) -> tuple:
    words = significant_words(based_on)
    if not words:
        return 0.0, set()
    matched = words & facts_corpus_words
    return len(matched) / len(words), words - matched


def closest_fact(based_on: str, facts: list) -> tuple:
    based_words = significant_words(based_on)
    best_fact = None
    best_score = 0.0
    for fact in facts:
        fact_text = f"{fact.get('claim', '')} {fact.get('source_snippet', '')}"
        fact_words = significant_words(fact_text)
        if not based_words or not fact_words:
            continue
        score = len(based_words & fact_words) / len(based_words)
        if score > best_score:
            best_score = score
            best_fact = fact
    return best_fact, best_score


def verify_gap(gap: dict, facts: list, facts_corpus_words: set) -> dict:
    based_on = gap.get("based_on", "")
    score, unmatched = overlap_score(based_on, facts_corpus_words)
    fact, fact_score = closest_fact(based_on, facts)

    if score >= VERIFIED_THRESHOLD:
        status = "VERIFIED"
    elif score >= WEAK_THRESHOLD:
        status = "WEAK"
    else:
        status = "UNVERIFIED"

    return {
        "title": gap.get("title", "Untitled gap"),
        "status": status,
        "overlap_score": round(score, 2),
        "unmatched_words": sorted(unmatched),
        "closest_fact_claim": fact.get("claim") if fact else None,
        "closest_fact_score": round(fact_score, 2) if fact else 0.0,
    }


def verify_company(raw: dict, analysis: dict) -> dict:
    facts = raw.get("facts", [])
    corpus_text = " ".join(f"{f.get('claim', '')} {f.get('source_snippet', '')}" for f in facts)
    corpus_words = significant_words(corpus_text)

    gaps = analysis.get("gaps", [])
    results = [verify_gap(gap, facts, corpus_words) for gap in gaps]

    counts = {"VERIFIED": 0, "WEAK": 0, "UNVERIFIED": 0}
    for r in results:
        counts[r["status"]] += 1

    return {
        "company_name": raw.get("company_name", "Unknown"),
        "gaps_checked": len(results),
        "summary": counts,
        "results": results,
    }


def print_report(verification: dict) -> None:
    name = verification["company_name"]
    counts = verification["summary"]
    print(f"\n=== Fact-check: {name} ===")
    print(
        f"{verification['gaps_checked']} gaps checked -- "
        f"{counts['VERIFIED']} verified, {counts['WEAK']} weak, {counts['UNVERIFIED']} unverified"
    )
    for r in verification["results"]:
        icon = {"VERIFIED": "OK", "WEAK": "?!", "UNVERIFIED": "XX"}[r["status"]]
        print(f"\n[{icon}] [{r['status']}] {r['title']} (overlap: {r['overlap_score']})")
        if r["status"] != "VERIFIED":
            print(f"    Closest fact (match {r['closest_fact_score']}): {r['closest_fact_claim']}")
            if r["unmatched_words"]:
                print(f"    Words not found in any sourced fact: {', '.join(r['unmatched_words'][:12])}")


def main() -> None:
    if len(sys.argv) != 2:
        print('Usage: python verify.py "<company name>"')
        sys.exit(1)

    company = sys.argv[1]
    slug = slugify(company)
    raw_path = RAW_DATA_DIR / f"{slug}.json"
    analysis_path = ANALYSIS_DIR / f"{slug}.json"

    missing = []
    if not raw_path.exists():
        missing.append(f"  {raw_path}")
    if not analysis_path.exists():
        missing.append(f"  {analysis_path}")
    if missing:
        print(f"Missing cached data for '{company}':")
        for line in missing:
            print(line)
        sys.exit(1)

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))

    verification = verify_company(raw, analysis)
    print_report(verification)

    VERIFICATION_DIR.mkdir(parents=True, exist_ok=True)
    out_path = VERIFICATION_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(verification, indent=2), encoding="utf-8")

    if verification["summary"]["UNVERIFIED"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
