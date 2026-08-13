# Prospect Scan

Internal sales-research tool for GND Solutions. Type in a company name and get
back three things a salesperson can actually use: a source-traceable profile
(every fact links to where it came from), a gap analysis mapped to GND's
service lines, and a specific pitch angle.

The core rule behind every design choice here: **no claim without a source.**
Researching a company (web search) and reasoning about its gaps (judgment)
are two separate stages that never happen in one AI call — research gets
cached to disk first, and reasoning only ever runs over that cached, sourced
data. This is what stops the tool from confidently making things up.

Phase 1 is scoped to cold-chain / logistics / pharma companies only.

---

## How to run it

**The website (recommended way to use this):**

```
python server.py
```

Then open **http://localhost:5000**. Keep that terminal window open — closing
it stops the server. If you see "Connection lost" on the site, the server
stopped; just run the command again.

**If `python` isn't found** (see Known Gotchas below for the real fix), use
the full path as a workaround:

```
& "C:\Users\VydyaPandith\AppData\Local\Programs\Python\Python312\python.exe" server.py
```

**Command-line only, no website:**

```
python retrieve.py "Company Name" --groq
python analyze.py "Company Name" --groq
python verify.py "Company Name"
python report.py "Company Name"
```

---

## What's in this folder

| File | What it does |
|---|---|
| `retrieve.py` | Stage 1 — searches the web for a company, saves sourced facts to `raw_data/` |
| `analyze.py` | Stage 2 — reasons over those cached facts (no new searching) to find gaps and write a pitch, saves to `analysis/` |
| `verify.py` | Stage 2.5 — checks every gap actually traces back to a real fact. No AI, just word-matching |
| `report.py` / `html_report.py` | Turns the JSON into a readable report (terminal or webpage) |
| `build_site.py` | Builds the plain static version of the whole site (`site/`) |
| `server.py` | The live website — search, live research, save/discard review, everything interactive |
| `frontend/` | A newer React-based frontend (built via Lovable), separate tech stack, not yet wired to the real backend |
| `eval/` | The scorecard workflow for a salesperson to score reports |
| `prompts/` | The actual prompt text sent to the AI for research and reasoning — edit these, not the Python, to change what gets asked |
| `raw_data/`, `analysis/`, `verification/` | The real, cached results — one JSON file per company per stage |

## Setup

- **Python 3.12** — needed for everything except the `frontend/` folder
- **Bun** — only needed if working on `frontend/` (`bun install`, then `bun run dev`)
- **API keys** go in `.env` (copy `.env.example` and fill in), not typed into
  the terminal each time. Currently: `GROQ_API_KEY` (free, working),
  `GEMINI_API_KEY` (free, reasoning-only path works)

## The pipeline, briefly

```
Company name
   -> Search the web (Groq, free)         -> raw_data/<slug>.json
   -> Reason over those facts (Groq/Gemini, free) -> analysis/<slug>.json
   -> Fact-check every gap (no AI)         -> verification/<slug>.json
   -> Render as a report                   -> shown on the site
```

`retrieve.py`/`analyze.py` also support `--gemini` and (for reasoning only)
`--local` (Ollama). Ollama was tested and rejected for quality — kept in the
code as a dormant option, not deleted.

## Current status

- **24 companies** researched, all fact-checked clean
- **$0 spent** — the whole pipeline runs on free API tiers (Groq mainly)
- Live search on the website can research a brand-new company on demand,
  with a scope check (warns if it doesn't look like cold-chain/logistics/
  pharma) and a save/discard review step before anything gets published
- **The one open item: a real GND salesperson reviewing the reports**
  (`eval/scorecard_template.csv`) and confirming the gaps are accurate and
  the pitch is usable. Everything else has been self-validated.

## Known gotchas

- **`python` / `server.py` "not recognized"**: on this machine, `python` was
  intercepted by a Windows Store app-alias stub instead of the real
  install. Fix: Settings -> Apps -> Advanced app settings -> App execution
  aliases -> turn OFF the toggles for `python.exe` and `python3.exe`. Then
  **fully close and reopen your terminal** (or sign out/back in if it still
  doesn't take) — PATH changes don't apply to already-open terminals.
- **Typing `server.py` alone doesn't work** — it's a script, not an
  executable; it has to be `python server.py`.
- **IDE says "file is newer" when saving a prompt file**: this means the
  file was changed on disk (e.g. by editing through Claude) while it was
  open in your editor. Don't click "Overwrite" blindly — it pushes your
  editor's old buffer over the new file and can undo real changes. Close
  the tab without saving and reopen it instead.
- **The server needs its terminal to stay open** the whole time you're
  using the site — it's not a background service.
