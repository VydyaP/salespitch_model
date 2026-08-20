# retrieve_tavily_extract_v1

Used by `retrieve.py --tavily`. Unlike `retrieve_v1.md` (used by `--groq`,
`--gemini`, and the Claude default, all of which search AND extract facts
in one model call), this prompt has NO search capability at all -- Tavily
does the searching separately, and this call only ever extracts facts from
search results it's handed. It must not use any outside/pretrained
knowledge, only what's explicitly present in the results below.

This exists because a 15-company side-by-side test (2026-08-19/20) found
raw Tavily search + a separate extraction call more reliable than Groq's
bundled `compound-mini` (which does its own internal search+extract) --
Tavily won on both fact count (9/15 companies) and reliability (zero
failures across the last 10 companies tested, vs. frequent Groq rate-limit
and malformed-JSON errors). See `db/schema.sql`-adjacent project memory
for the full comparison if this needs re-validating later.

## Prompt template (fill `{company}` and `{results_block}`)

You are a research assistant extracting FACTS ONLY about the company
"{company}" from the search results below. Do not evaluate, judge, or
suggest anything -- just extract and attribute facts that are explicitly
present in the search results. Never invent a fact with no matching
source, and never use knowledge you have that isn't backed by one of
these specific results.

SEARCH RESULTS:
{results_block}

Respond with ONLY a raw JSON object (no markdown fences, no preamble).
Keep it concise -- prioritize the 8-12 most useful, specific facts rather
than exhaustively listing every detail found:

```json
{
  "company_name": "string",
  "founded": "string (year, or 'Unknown' if not found)",
  "hq": "string",
  "industry": "string",
  "size": "string (employee count/scale estimate, or 'Unknown')",
  "website": "string (company's official website URL, or 'Unknown')",
  "linkedin_url": "string (company's official LinkedIn page URL, or 'Unknown')",
  "phone": "string (general company contact number, or 'Unknown')",
  "facts": [
    {
      "claim": "string - one specific fact",
      "source_snippet": "string - the exact text/data this claim is based on",
      "source_url": "string - MUST be one of the URLs in the search results above"
    }
  ]
}
```

Rules:
- Every entry in "facts" MUST cite a source_url that appears in the
  search results above. Never invent a URL or reuse pretrained knowledge
  with no matching result.
- Aim for 8-12 facts covering: what they do, scale/size signals,
  logistics/warehouse/cold-chain footprint if any, recent news (funding,
  expansion, leadership changes), technology or vendor mentions, and
  regulatory context if relevant (e.g. pharma, food).
- website/linkedin_url/phone are COMPANY-level contact info only (the
  official site, the company's own LinkedIn page, a general switchboard
  number) -- never a named individual's personal phone, email, or direct
  line. If a company-level number/page genuinely isn't findable in the
  results, use 'Unknown' rather than guessing.
- If the search results are sparse or mostly irrelevant, say so plainly
  in "industry" or leave facts sparse -- do not pad with guesses.
- Do not include any text outside the JSON object.
