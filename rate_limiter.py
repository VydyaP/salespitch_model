"""Real, measured TPM (tokens-per-minute) pacing for Groq calls -- replaces
guessing with a fixed sleep. Tracks actual token usage in a rolling 60s
window per model (compound-mini and gpt-oss-120b have separate, independent
TPM budgets on Groq's side, so they're tracked separately here too) and
waits only exactly as long as needed before a call that would otherwise
exceed the ceiling -- not a fixed delay regardless of real usage.

Persisted to disk (rate_limit_state.json, gitignored) so the window holds
across separate `python retrieve.py ...` / `python analyze.py ...`
processes, not just within one.
"""
import json
import time
from pathlib import Path

STATE_PATH = Path(__file__).resolve().parent / "rate_limit_state.json"
WINDOW_SECONDS = 60

# Discovered live 2026-08-19: groq/compound-mini's own rate-limit errors
# report against `openai/gpt-oss-120b`, not compound-mini -- compound
# appears to run its reasoning on gpt-oss-120b internally. So retrieve.py's
# Stage 1 (compound-mini) calls and analyze.py's Stage 2 (gpt-oss-120b)
# calls actually draw from the SAME small budget, not two independent
# ones -- tracked under this one shared key for both.
SHARED_GPT_OSS_KEY = "gpt-oss-120b-shared"
SHARED_GPT_OSS_TPM = 8_000

# A rough pre-call estimate (~4 chars/token for English) used only to decide
# whether to wait before making the call -- corrected immediately after with
# the real usage the API actually reports, so estimation error doesn't
# compound over time.
CHARS_PER_TOKEN_ESTIMATE = 4
OUTPUT_TOKEN_BUFFER = 1500  # neither script sets max_tokens on these calls


def _load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def _prune_window(entries: list, now: float) -> list:
    return [e for e in entries if now - e["ts"] < WINDOW_SECONDS]


def estimate_tokens(prompt: str) -> int:
    return len(prompt) // CHARS_PER_TOKEN_ESTIMATE + OUTPUT_TOKEN_BUFFER


def wait_for_tpm_budget(model_key: str, prompt: str, tpm_limit: int) -> None:
    """Blocks (sleeps) only if the rolling 60s window for `model_key` is
    already close enough to `tpm_limit` that this call would exceed it.
    Call record_actual_usage() right after the real API response comes
    back to correct the estimate this used."""
    estimated = estimate_tokens(prompt)
    state = _load_state()
    key = f"tpm:{model_key}"
    entries = _prune_window(state.get(key, []), time.time())

    used = sum(e["tokens"] for e in entries)
    if used + estimated > tpm_limit:
        # Wait until the oldest entry ages out of the window enough to
        # free up room, rather than a blind fixed delay.
        oldest_ts = min(e["ts"] for e in entries)
        wait_s = WINDOW_SECONDS - (time.time() - oldest_ts) + 1
        if wait_s > 0:
            print(f"  [rate_limiter] {model_key}: {used}/{tpm_limit} TPM used, "
                  f"waiting {wait_s:.1f}s for budget to free up before next call")
            time.sleep(wait_s)

    # Record the pre-call estimate now (as a placeholder) so a rapid burst
    # of calls within the same second doesn't all pass the check at once;
    # record_actual_usage() will correct this entry's token count after.
    entries.append({"ts": time.time(), "tokens": estimated, "estimate": True})
    state[key] = entries
    _save_state(state)


def record_actual_usage(model_key: str, actual_tokens: int) -> None:
    """Corrects the most recent estimate entry for `model_key` with the
    real token count the API reported, so the rolling window reflects
    what was actually used, not the pre-call guess."""
    state = _load_state()
    key = f"tpm:{model_key}"
    entries = state.get(key, [])
    for e in reversed(entries):
        if e.get("estimate"):
            e["tokens"] = actual_tokens
            e["estimate"] = False
            break
    state[key] = entries
    _save_state(state)
