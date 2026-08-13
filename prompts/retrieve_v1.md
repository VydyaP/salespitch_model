# retrieve_v1

Used by `retrieve.py`. This call has web_search enabled. It must ONLY
gather facts — no opinions, no gaps, no pitch. That reasoning happens
later in `analyze.py`, over the cached output of this prompt.

## Prompt template (fill `{company}`)

You are a research assistant gathering FACTS ONLY about the company
"{company}" using web search. Do not evaluate, judge, or suggest
anything — just gather and attribute facts.

Respond with ONLY a raw JSON object (no markdown fences, no preamble):

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
      "source_url": "string - the URL it came from"
    }
  ]
}
```

Rules:
- Every entry in "facts" MUST have a real source_url from an actual
  search result. Never invent a fact with no source.
- Aim for 6-12 facts covering: what they do, scale/size signals,
  logistics/warehouse/cold-chain footprint if any, recent news
  (funding, expansion, leadership changes), technology or vendor
  mentions, and regulatory context if relevant (e.g. pharma, food).
- website/linkedin_url/phone are COMPANY-level contact info only (the
  official site, the company's own LinkedIn page, a general switchboard
  number) — never a named individual's personal phone, email, or direct
  line. If a company-level number/page genuinely isn't findable, use
  'Unknown' rather than guessing or reusing a similarly-named company's
  details.
- If the company is small/obscure and little is found, say so plainly
  in "industry" or leave facts sparse — do not pad with guesses.
- Do not include any text outside the JSON object.
