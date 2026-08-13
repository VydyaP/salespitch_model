"""Shared HTML rendering for report.py --html and build_site.py.

Produces self-contained HTML (inline CSS/JS, no external requests, no
build step) so pages work offline and a single report file can be
downloaded and shared on its own.

Visual language: "Field Kit" -- grounded in the actual subject (cold-chain
logistics) rather than generic SaaS style. Warm kraft-paper neutrals,
safety-orange accent (the real hi-vis color used on cold-chain gear),
stamped/manifest-style labels in monospace, and small 2-letter service
"stamps" instead of icon-font dependencies. The report page is tabbed
(Gaps / Facts / Pitch, Gaps first) specifically to kill the long-scroll
problem of stacking all three sections on one page.
"""

import html

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
SEVERITY_COLOR = {"high": "#c23b22", "medium": "#b8860b", "low": "#3f7d5c"}
SEVERITY_COLOR_DARK = {"high": "#ff6b52", "medium": "#e0ab3d", "low": "#5fbe8d"}
SEVERITY_LABEL = {"high": "High", "medium": "Medium", "low": "Low"}
# Visual gauge fill -- NOT a model-generated score. The model only ever
# outputs High/Medium/Low; these widths just render that same categorical
# signal as a meter instead of a plain badge. Never treat as a real percentage.
SEVERITY_GAUGE_WIDTH = {"high": 100, "medium": 65, "low": 32}

# Small 2-letter "stamps" for GND service lines, matched by keyword against
# the free-text gnd_service field (which can name more than one service).
GND_SERVICE_TAGS = [
    ("cold chain", "CC", "#1f6e6b"),
    ("warehouse", "WH", "#8a5a2b"),
    ("asset tracking", "AT", "#c23b22"),
    ("product engineering", "PE", "#5b4b8a"),
    ("embedded", "PE", "#5b4b8a"),
    ("platform", "PL", "#3f7d5c"),
]


def service_tags(gnd_service: str) -> list:
    text = (gnd_service or "").lower()
    tags = []
    seen = set()
    for keyword, code, color in GND_SERVICE_TAGS:
        if keyword in text and code not in seen:
            tags.append((code, color))
            seen.add(code)
    return tags or [("GN", "#9c8f7e")]


BASE_CSS = """
:root {
  --paper: #f6f2e7;
  --paper-alt: #efe6d2;
  --ink: #2b2118;
  --ink-secondary: #6b5d4f;
  --muted: #9c8f7e;
  --border: #ddd3bf;
  --accent: #d9622b;
  --accent-hover: #c2531f;
  --frost: #1f6e6b;
  --nav-bg: rgba(246,242,231,0.85);
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #1c1712; --paper-alt: #262019; --ink: #f2e9d8; --ink-secondary: #c4b7a2;
    --muted: #8a7c68; --border: #3a3226; --accent: #ff7a3d; --accent-hover: #ff8f5c;
    --frost: #3fa39e; --nav-bg: rgba(28,23,18,0.85);
  }
}
:root[data-theme="dark"] {
  --paper: #1c1712; --paper-alt: #262019; --ink: #f2e9d8; --ink-secondary: #c4b7a2;
  --muted: #8a7c68; --border: #3a3226; --accent: #ff7a3d; --accent-hover: #ff8f5c;
  --frost: #3fa39e; --nav-bg: rgba(28,23,18,0.85);
}
:root[data-theme="light"] {
  --paper: #f6f2e7; --paper-alt: #efe6d2; --ink: #2b2118; --ink-secondary: #6b5d4f;
  --muted: #9c8f7e; --border: #ddd3bf; --accent: #d9622b; --accent-hover: #c2531f;
  --frost: #1f6e6b; --nav-bg: rgba(246,242,231,0.85);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--paper);
  color: var(--ink);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
img, svg { max-width: 100%; }

.mono {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.nav {
  position: sticky; top: 0; z-index: 100; height: 56px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  width: 100%; max-width: 1040px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.nav .brand {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px; font-weight: 600; color: var(--ink); text-decoration: none;
  letter-spacing: 0.03em; text-transform: uppercase;
}
.nav .actions { display: flex; gap: 10px; }

.btn-pill {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px; padding: 8px 16px; font-size: 12.5px; font-weight: 600;
  border: 1px solid var(--border); background: var(--paper-alt); color: var(--ink);
  cursor: pointer; font-family: inherit; transition: background 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}
.btn-pill:hover { background: var(--border); }
.btn-pill:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn-pill.filled { background: var(--accent); border-color: var(--accent); color: #fff8f0; }
.btn-pill.filled:hover { background: var(--accent-hover); }

/* ---- report hero: styled like a manifest / shipping label header ---- */
.hero {
  max-width: 900px; margin: 0 auto; padding: 48px 24px 28px;
}
.eyebrow {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; font-weight: 600; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase;
}
.hero h1 {
  font-size: clamp(30px, 5vw, 44px); font-weight: 700; letter-spacing: -0.02em;
  line-height: 1.1; text-wrap: balance; margin-top: 4px;
}
.manifest-row {
  margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;
}
.manifest-chip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; color: var(--ink-secondary); background: var(--paper-alt);
  border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px;
}
.manifest-chip strong { color: var(--ink); font-weight: 600; }

/* ---- tab bar ---- */
.tab-shell { max-width: 900px; margin: 0 auto; padding: 0 24px 80px; }
.tab-bar {
  display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 32px;
  overflow-x: auto;
}
.tab-btn {
  font-family: inherit; font-size: 14.5px; font-weight: 600; color: var(--muted);
  background: none; border: none; border-bottom: 2.5px solid transparent;
  padding: 12px 6px; margin-right: 22px; cursor: pointer; white-space: nowrap;
  display: flex; align-items: center; gap: 8px; transition: color 0.15s ease;
}
.tab-btn:hover { color: var(--ink); }
.tab-btn.active { color: var(--ink); border-bottom-color: var(--accent); }
.tab-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px; background: var(--paper-alt); border: 1px solid var(--border);
  border-radius: 999px; padding: 1px 7px; color: var(--ink-secondary);
}
.tab-btn.active .tab-count { border-color: var(--accent); color: var(--accent); }

.section-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--muted); font-weight: 600; margin-bottom: 20px;
}
.empty { color: var(--muted); font-style: italic; font-size: 15px; }

/* ---- facts ---- */
.fact-list { display: flex; flex-direction: column; gap: 22px; }
.fact-item { border-left: 3px solid var(--border); padding-left: 18px; }
.fact-claim {
  display: block; font-size: 17px; font-weight: 600; line-height: 1.4; letter-spacing: -0.005em;
  margin-bottom: 8px; color: var(--ink); text-decoration: underline;
  text-decoration-color: var(--border); text-decoration-thickness: 1.5px; text-underline-offset: 3px;
  transition: color 0.15s ease, text-decoration-color 0.15s ease, border-color 0.15s ease;
}
.fact-item:has(.fact-claim:hover) { border-left-color: var(--accent); }
.fact-claim:hover { color: var(--accent); text-decoration-color: var(--accent); }
.fact-claim::after { content: " \\2197"; font-size: 0.65em; color: var(--muted); text-decoration: none; }
.fact-quote {
  font-size: 14.5px; color: var(--ink-secondary); font-style: italic; line-height: 1.5;
}

/* ---- gaps ---- */
.gap-card { background: var(--paper-alt); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.gap-summary {
  cursor: pointer; padding: 16px 20px; display: flex; align-items: center; gap: 14px; list-style: none;
}
.gap-summary::-webkit-details-marker { display: none; }
.gap-summary::marker { content: ""; }
.gap-severity-row { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.severity-gauge { width: 40px; height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; flex-shrink: 0; }
.gauge-fill { height: 100%; border-radius: 3px; }
.severity-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
}
.gap-summary h3 { font-size: 15.5px; font-weight: 600; letter-spacing: -0.005em; line-height: 1.35; flex: 1; }
.gap-summary::after {
  content: "\\2304"; color: var(--muted); font-size: 16px; flex-shrink: 0; transition: transform 0.2s ease;
}
.gap-card[open] .gap-summary::after { transform: rotate(180deg); }
.gap-body { padding: 0 20px 20px; border-top: 1px solid var(--border); padding-top: 16px; margin: 0 20px; }
.gap-detail { font-size: 15px; color: var(--ink-secondary); line-height: 1.55; margin-bottom: 16px; }
.gap-meta { font-size: 13px; color: var(--muted); display: flex; flex-direction: column; gap: 10px; }
.gap-meta strong { color: var(--ink-secondary); font-weight: 600; }
.gap-service-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.service-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px; font-weight: 700; color: #fff8f0; border-radius: 5px; padding: 2px 6px; letter-spacing: 0.02em;
}
.gap-based-on { padding-left: 12px; border-left: 2px solid var(--border); font-style: italic; }

/* ---- pitch ---- */
.pitch-card {
  background: var(--frost); color: #f2f8f6; border-radius: 14px; padding: 36px 34px;
}
.pitch-card .section-label { color: rgba(242,248,246,0.65); }
.pitch-angle { font-size: clamp(18px, 2.6vw, 22px); font-weight: 500; line-height: 1.5; letter-spacing: -0.005em; margin-bottom: 26px; }
.pitch-opener-box { background: rgba(0,0,0,0.18); border-radius: 10px; padding: 22px 24px; }
.pitch-opener-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px; color: rgba(242,248,246,0.6); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
}
.pitch-opener-text { font-size: 17px; font-style: italic; line-height: 1.5; margin-bottom: 18px; }
.pitch-card .btn-pill { background: rgba(242,248,246,0.12); border-color: rgba(242,248,246,0.3); color: #f2f8f6; }
.pitch-card .btn-pill:hover { background: rgba(242,248,246,0.22); }

@media print {
  .nav, .tab-bar { display: none; }
  .tab-panel { display: block !important; margin-bottom: 48px; }
  .gap-body { display: block !important; }
  .gap-summary::after { display: none; }
  .pitch-card { background: #eef5f3 !important; color: #12201d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pitch-card .section-label, .pitch-opener-label { color: #4a5a56 !important; }
  .pitch-opener-box { background: #fff !important; border: 1px solid #ccd8d5; }
  body { background: #fff; }
}
"""

DOWNLOAD_JS = """
function copyOpener(btn) {
  var text = document.getElementById('pitch-opener').innerText;
  navigator.clipboard.writeText(text).then(function () {
    var original = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(function () { btn.textContent = original; }, 1500);
  });
}
function downloadReport(filename) {
  var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.style.display = 'none'; });
  document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('tab-' + name).style.display = 'block';
  document.querySelector('.tab-btn[data-tab="' + name + '"]').classList.add('active');
}
"""

PREVIEW_JS = """
function saveCompany(slug, btn) {
  btn.disabled = true;
  btn.textContent = 'Saving\\u2026';
  fetch('/api/save?slug=' + encodeURIComponent(slug), { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function () { window.location.href = '/reports/' + slug + '.html'; })
    .catch(function () { btn.disabled = false; btn.textContent = 'Save to corpus'; });
}
function discardCompany(slug, btn) {
  if (!confirm('Discard this research? Nothing will be saved.')) return;
  btn.disabled = true;
  fetch('/api/discard?slug=' + encodeURIComponent(slug), { method: 'POST' })
    .then(function () { window.location.href = '/'; });
}
"""

SEARCH_JS = """
function filterCompanies() {
  var q = document.getElementById('search').value.trim().toLowerCase();
  var cards = document.querySelectorAll('.company-card');
  var visible = 0;
  cards.forEach(function (card) {
    var haystack = card.getAttribute('data-search');
    var match = haystack.indexOf(q) !== -1;
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  document.getElementById('empty-state').style.display = visible === 0 ? 'block' : 'none';
}

var currentSuggestions = [];
var suggestTimer = null;

function onSearchInput() {
  filterCompanies();
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(fetchSuggestions, 250);
}

function fetchSuggestions() {
  var q = document.getElementById('search').value.trim();
  var box = document.getElementById('suggestions');
  if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
  fetch('/api/suggest?q=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      currentSuggestions = data.items || [];
      renderSuggestions(currentSuggestions);
    })
    .catch(function () { box.style.display = 'none'; });
}

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderSuggestions(items) {
  var box = document.getElementById('suggestions');
  if (!items.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.innerHTML = items.map(function (item, i) {
    var tag = item.source === 'corpus' ? 'In corpus' : 'Search the web';
    return '<div class="suggest-item" onclick="selectSuggestion(' + i + ')">' +
      '<span class="suggest-name">' + escapeHtml(item.name) + '</span>' +
      '<span class="suggest-tag ' + item.source + '">' + tag + '</span></div>';
  }).join('');
  box.style.display = 'block';
}

function selectSuggestion(i) {
  var item = currentSuggestions[i];
  document.getElementById('suggestions').style.display = 'none';
  if (item.source === 'corpus') {
    window.location.href = 'reports/' + item.slug + '.html';
  } else {
    startScan(item.name);
  }
}

function searchKeydown(e) {
  if (e.key === 'Enter') searchSubmit();
}

function searchSubmit() {
  var q = document.getElementById('search').value.trim();
  if (!q) return;
  var exact = null;
  for (var i = 0; i < currentSuggestions.length; i++) {
    if (currentSuggestions[i].source === 'corpus' && currentSuggestions[i].name.toLowerCase() === q.toLowerCase()) {
      exact = currentSuggestions[i];
      break;
    }
  }
  if (exact) { window.location.href = 'reports/' + exact.slug + '.html'; return; }
  startScan(q);
}

var SCAN_STAGE_TEXT = {
  searching: 'Searching the web for facts\\u2026',
  analyzing: 'Reasoning about gaps against GND\\'s services\\u2026',
  verifying: 'Fact-checking citations\\u2026',
  saving: 'Saving to the corpus\\u2026'
};

var pendingCompany = null;

function showProgressPanel() {
  document.getElementById('scan-progress').style.display = 'block';
  document.getElementById('scan-confirm').style.display = 'none';
  document.getElementById('scan-error').style.display = 'none';
  document.getElementById('scan-close-btn').style.display = '';
}

function handleScanEvent(es, data) {
  if (data.stage === 'done') {
    document.getElementById('scan-status').textContent = 'Done';
    es.close();
    setTimeout(function () { window.location.href = 'reports/' + data.slug + '.html'; }, 400);
  } else if (data.stage === 'ready_for_review') {
    document.getElementById('scan-status').textContent = 'Ready for review';
    es.close();
    setTimeout(function () { window.location.href = '/preview/' + data.slug; }, 400);
  } else if (data.stage === 'error') {
    es.close();
    var errBox = document.getElementById('scan-error');
    errBox.textContent = data.message || 'Something went wrong.';
    errBox.style.display = 'block';
    document.getElementById('scan-status').textContent = 'Failed';
  } else if (data.stage === 'confirm') {
    es.close();
    document.getElementById('scan-progress').style.display = 'none';
    document.getElementById('scan-confirm').style.display = 'block';
    document.getElementById('scan-confirm-company').textContent = data.company_name;
    document.getElementById('scan-confirm-text').innerHTML =
      'Researched industry: <strong>' + escapeHtml(data.industry) + '</strong>.<br>' +
      'This doesn\\'t look like cold-chain, logistics, or pharma \\u2014 GND\\'s Phase 1 scope. Continue anyway?';
  } else {
    document.getElementById('scan-status').textContent = SCAN_STAGE_TEXT[data.stage] || data.stage;
  }
}

function startScan(company) {
  document.getElementById('suggestions').style.display = 'none';
  pendingCompany = company;
  var overlay = document.getElementById('scan-overlay');
  showProgressPanel();
  document.getElementById('scan-company').textContent = company;
  document.getElementById('scan-status').textContent = 'Starting\\u2026';
  overlay.classList.add('active');

  var es = new EventSource('/api/scan/research?company=' + encodeURIComponent(company));
  es.onmessage = function (e) { handleScanEvent(es, JSON.parse(e.data)); };
  es.onerror = function () {
    document.getElementById('scan-status').textContent = 'Connection lost \\u2014 is server.py running?';
    es.close();
  };
}

function confirmContinue() {
  showProgressPanel();
  document.getElementById('scan-company').textContent = pendingCompany;
  document.getElementById('scan-status').textContent = 'Continuing\\u2026';

  var es = new EventSource('/api/scan/continue?company=' + encodeURIComponent(pendingCompany));
  es.onmessage = function (e) { handleScanEvent(es, JSON.parse(e.data)); };
  es.onerror = function () {
    document.getElementById('scan-status').textContent = 'Connection lost \\u2014 is server.py running?';
    es.close();
  };
}

function confirmCancel() {
  fetch('/api/scan/cancel?company=' + encodeURIComponent(pendingCompany), { method: 'POST' })
    .finally(function () { closeScanOverlay(); });
}

function closeScanOverlay() {
  document.getElementById('scan-overlay').classList.remove('active');
}
"""


def esc(value) -> str:
    return html.escape(str(value)) if value is not None else ""


def severity_sort_key(gap: dict) -> int:
    return SEVERITY_ORDER.get(gap.get("severity", "low"), 3)


def severity_counts(gaps: list) -> dict:
    counts = {"high": 0, "medium": 0, "low": 0}
    for gap in gaps:
        sev = gap.get("severity", "low")
        if sev in counts:
            counts[sev] += 1
    return counts


def render_report_html(
    slug: str, raw: dict, analysis: dict, index_href: str = "../index.html", preview: bool = False
) -> str:
    name = raw.get("company_name", "Unknown company")
    facts = raw.get("facts", [])
    gaps = sorted(analysis.get("gaps", []), key=severity_sort_key)
    pitch = analysis.get("pitch", {})
    counts = severity_counts(gaps)

    manifest_items = [
        (label, raw.get(key))
        for label, key in (("Industry", "industry"), ("HQ", "hq"), ("Founded", "founded"), ("Size", "size"))
        if raw.get(key)
    ]
    manifest_html = "".join(
        f'<span class="manifest-chip"><strong>{esc(label)}:</strong> {esc(value)}</span>'
        for label, value in manifest_items
    )

    fact_items = "".join(
        f'''<li class="fact-item">
  <a class="fact-claim" href="{esc(f.get("source_url", ""))}" target="_blank" rel="noopener">{esc(f.get("claim", ""))}</a>
  <blockquote class="fact-quote">&ldquo;{esc(f.get("source_snippet", ""))}&rdquo;</blockquote>
</li>'''
        for f in facts
    ) or '<li class="empty">No facts recorded.</li>'

    def render_gap(g: dict) -> str:
        sev = g.get("severity", "low")
        tags_html = "".join(
            f'<span class="service-tag" style="background:{color}">{code}</span>'
            for code, color in service_tags(g.get("gnd_service", ""))
        )
        return f'''<details class="gap-card"{" open" if sev == "high" else ""}>
  <summary class="gap-summary">
    <div class="gap-severity-row">
      <div class="severity-gauge"><div class="gauge-fill" style="width:{SEVERITY_GAUGE_WIDTH.get(sev, 32)}%;background:{SEVERITY_COLOR.get(sev, "#9c8f7e")}"></div></div>
      <span class="severity-label" style="color:{SEVERITY_COLOR.get(sev, "#9c8f7e")}">{SEVERITY_LABEL.get(sev, "Unknown")}</span>
    </div>
    <h3>{esc(g.get("title", ""))}</h3>
  </summary>
  <div class="gap-body">
    <p class="gap-detail">{esc(g.get("detail", ""))}</p>
    <div class="gap-meta">
      <div class="gap-service-tags">{tags_html}<span>{esc(g.get("gnd_service", ""))}</span></div>
      <div class="gap-based-on">&ldquo;{esc(g.get("based_on", ""))}&rdquo;</div>
    </div>
  </div>
</details>'''

    gap_cards = "".join(render_gap(g) for g in gaps) or '<p class="empty">No gaps identified.</p>'

    preview_banner = (
        f'''<div class="preview-banner">
  <span>Preview \\u2014 not yet saved to the corpus.</span>
  <div class="preview-actions">
    <button class="btn-pill" onclick="discardCompany('{esc(slug)}', this)">Discard</button>
    <button class="btn-pill filled" onclick="saveCompany('{esc(slug)}', this)">Save to corpus</button>
  </div>
</div>'''
        if preview
        else ""
    )
    preview_css = (
        """
.preview-banner {
  position: sticky; top: 56px; z-index: 90; display: flex; align-items: center;
  justify-content: center; gap: 20px; flex-wrap: wrap; background: #fff3cd;
  color: #7a5b00; padding: 12px 24px; font-size: 14px; font-weight: 500;
  border-bottom: 1px solid #f0d78c;
}
@media (prefers-color-scheme: dark) {
  .preview-banner { background: #3a2f00; color: #ffd968; border-bottom-color: #5c4a00; }
}
:root[data-theme="dark"] .preview-banner { background: #3a2f00; color: #ffd968; border-bottom-color: #5c4a00; }
:root[data-theme="light"] .preview-banner { background: #fff3cd; color: #7a5b00; border-bottom-color: #f0d78c; }
.preview-actions { display: flex; gap: 10px; }
"""
        if preview
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(name)} — Prospect Report</title>
<style>{BASE_CSS}{preview_css}</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a class="brand" href="{esc(index_href)}">&larr; Prospect Scan</a>
    <div class="actions">
      <button class="btn-pill" onclick="window.print()">Print / PDF</button>
      <button class="btn-pill filled" onclick="downloadReport('{esc(slug)}-report.html')">Download</button>
    </div>
  </div>
</nav>
{preview_banner}

<header class="hero">
  <p class="eyebrow">Prospect report</p>
  <h1>{esc(name)}</h1>
  <div class="manifest-row">{manifest_html}</div>
</header>

<div class="tab-shell">
  <div class="tab-bar">
    <button class="tab-btn active" data-tab="gaps" onclick="switchTab('gaps')">Gaps <span class="tab-count">{len(gaps)}</span></button>
    <button class="tab-btn" data-tab="facts" onclick="switchTab('facts')">Facts <span class="tab-count">{len(facts)}</span></button>
    <button class="tab-btn" data-tab="pitch" onclick="switchTab('pitch')">Pitch</button>
  </div>

  <div class="tab-panel" id="tab-gaps">
    <p class="section-label">{len(gaps)} gaps found &middot; {counts["high"]} high &middot; {counts["medium"]} medium &middot; {counts["low"]} low</p>
    {gap_cards}
  </div>

  <div class="tab-panel" id="tab-facts" style="display:none">
    <p class="section-label">Sourced facts</p>
    <ul class="fact-list" style="list-style:none">{fact_items}</ul>
  </div>

  <div class="tab-panel" id="tab-pitch" style="display:none">
    <p class="section-label">Pitch</p>
    <div class="pitch-card">
      <p class="pitch-angle">{esc(pitch.get("angle", ""))}</p>
      <div class="pitch-opener-box">
        <div class="pitch-opener-label">Opener</div>
        <p class="pitch-opener-text" id="pitch-opener">{esc(pitch.get("opener", ""))}</p>
        <button class="btn-pill" onclick="copyOpener(this)">Copy opener</button>
      </div>
    </div>
  </div>
</div>

<script>{DOWNLOAD_JS}{PREVIEW_JS}</script>
</body>
</html>
"""


def render_index_html(entries: list) -> str:
    """entries: list of (slug, raw, analysis) tuples."""
    cards = []
    for slug, raw, analysis in entries:
        name = raw.get("company_name", slug)
        industry = raw.get("industry", "Unknown")
        hq = raw.get("hq", "Unknown")
        gaps = analysis.get("gaps", [])
        counts = severity_counts(gaps)
        chips = "".join(
            f'<span class="severity-chip"><span class="severity-dot" style="background:{SEVERITY_COLOR[sev]}"></span>{counts[sev]} {sev}</span>'
            for sev in ("high", "medium", "low") if counts[sev]
        )
        search_key = f"{name} {industry} {hq}".lower()
        cards.append(f'''<a class="company-card" href="reports/{esc(slug)}.html" data-search="{esc(search_key)}">
  <h3>{esc(name)}</h3>
  <div class="company-meta">{esc(industry)} &middot; {esc(hq)}</div>
  <div class="severity-row">{chips}</div>
</a>''')

    cards_html = "".join(cards) if cards else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prospect Scan</title>
<style>{BASE_CSS}
.index-hero {{ text-align: center; padding: 90px 24px 0; max-width: 900px; margin: 0 auto; }}
.index-hero h1 {{ font-size: clamp(38px, 6.5vw, 58px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.05; text-wrap: balance; }}
.index-hero p {{ font-size: 18px; color: var(--ink-secondary); margin-top: 14px; }}
.suggest-wrap {{ position: relative; margin: 32px auto 0; max-width: 480px; }}
.search-pill {{
  display: flex; align-items: center; gap: 10px;
  background: var(--paper-alt); border: 1px solid var(--border); border-radius: 10px; padding: 13px 18px;
}}
.search-pill svg {{ flex-shrink: 0; color: var(--muted); }}
.search-pill input {{
  border: none; background: transparent; outline: none; font-size: 16px; width: 100%;
  color: var(--ink); font-family: inherit;
}}
.suggest-dropdown {{
  display: none; position: absolute; top: calc(100% + 8px); left: 0; right: 0;
  background: var(--paper); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 12px 32px rgba(43,33,24,0.16); overflow: hidden; z-index: 50; text-align: left;
}}
.suggest-item {{
  padding: 12px 18px; cursor: pointer; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; font-size: 14.5px; border-top: 1px solid var(--border);
}}
.suggest-item:first-child {{ border-top: none; }}
.suggest-item:hover {{ background: var(--paper-alt); }}
.suggest-name {{ font-weight: 600; }}
.suggest-tag {{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px; padding: 3px 8px; border-radius: 5px; color: var(--muted);
  border: 1px solid var(--border); flex-shrink: 0; white-space: nowrap;
}}
.suggest-tag.corpus {{ color: var(--accent); border-color: var(--accent); }}

.engine-select-wrap {{
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 16px; font-size: 12.5px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}}
.engine-select {{
  font-family: inherit; font-size: 12px; font-weight: 600; color: var(--ink);
  background: var(--paper-alt); border: 1px solid var(--border); border-radius: 6px;
  padding: 5px 10px; cursor: pointer;
}}
.engine-select option:disabled {{ color: var(--muted); }}

.scan-overlay {{
  position: fixed; inset: 0; background: rgba(43,33,24,0.45); backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center;
  z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
}}
.scan-overlay.active {{ opacity: 1; pointer-events: auto; }}
.scan-modal {{
  background: var(--paper); border: 1px solid var(--border); border-radius: 14px; padding: 40px 44px; text-align: center;
  max-width: 380px; box-shadow: 0 20px 60px rgba(43,33,24,0.3);
}}
.scan-dots {{ display: flex; gap: 8px; justify-content: center; margin-bottom: 22px; }}
.scan-dots span {{
  width: 10px; height: 10px; border-radius: 50%; background: var(--accent);
  animation: scan-pulse 1.4s ease-in-out infinite;
}}
.scan-dots span:nth-child(2) {{ animation-delay: 0.2s; }}
.scan-dots span:nth-child(3) {{ animation-delay: 0.4s; }}
@keyframes scan-pulse {{
  0%, 80%, 100% {{ opacity: 0.25; transform: scale(0.8); }}
  40% {{ opacity: 1; transform: scale(1); }}
}}
@media (prefers-reduced-motion: reduce) {{
  .scan-dots span {{ animation: none; opacity: 0.7; }}
}}
.scan-company {{ font-size: 18px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.005em; }}
.scan-status {{ font-size: 13.5px; color: var(--ink-secondary); }}
.scan-error {{ display: none; margin-top: 14px; font-size: 13px; color: #c23b22; }}
.scan-close {{ margin-top: 20px; }}
.scan-confirm-text {{ font-size: 13.5px; color: var(--ink-secondary); line-height: 1.5; margin: 10px 0 22px; }}
.scan-confirm-text strong {{ color: var(--ink); }}
.scan-confirm-actions {{ display: flex; gap: 10px; justify-content: center; }}

.company-grid {{
  max-width: 1040px; margin: 0 auto; padding: 60px 24px 100px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 16px;
}}
.company-card {{
  background: var(--paper-alt); border: 1px solid var(--border); border-radius: 12px; padding: 24px 22px;
  display: block; color: inherit; text-decoration: none; transition: transform 0.18s ease, border-color 0.18s ease;
}}
.company-card:hover {{ transform: rotate(-0.4deg) translateY(-2px); border-color: var(--accent); }}
.company-card h3 {{ font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 6px; }}
.company-meta {{ font-size: 13.5px; color: var(--ink-secondary); margin-bottom: 18px; }}
.severity-row {{ display: flex; gap: 12px; flex-wrap: wrap; }}
.severity-dot {{ width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }}
.severity-chip {{
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}}
#empty-state {{ display: none; text-align: center; color: var(--muted); padding: 60px 24px; font-size: 15px; }}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a class="brand" href="#">Prospect Scan</a>
  </div>
</nav>

<header class="index-hero">
  <h1>Prospect Scan</h1>
  <p>{len(entries)} researched compan{"y" if len(entries) == 1 else "ies"} — cold chain, logistics &amp; pharma</p>
  <div class="suggest-wrap">
    <div class="search-pill">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input id="search" type="text" placeholder="Search a company — in the corpus or new" oninput="onSearchInput()" onkeydown="searchKeydown(event)" autocomplete="off">
    </div>
    <div id="suggestions" class="suggest-dropdown"></div>
  </div>
  <div class="engine-select-wrap">
    <label for="engine-select">Search engine</label>
    <select id="engine-select" class="engine-select" title="Only Groq's search is live today; other engines are wired up but not yet enabled here.">
      <option value="groq" selected>Groq &middot; compound-mini</option>
      <option value="gemini" disabled>Gemini &middot; coming soon</option>
      <option value="claude" disabled>Claude &middot; needs API budget</option>
    </select>
  </div>
</header>

<div class="company-grid">{cards_html}</div>
<div id="empty-state">No companies match your search.</div>

<div id="scan-overlay" class="scan-overlay">
  <div class="scan-modal">
    <div id="scan-progress">
      <div class="scan-dots"><span></span><span></span><span></span></div>
      <div class="scan-company" id="scan-company"></div>
      <div class="scan-status" id="scan-status"></div>
      <div class="scan-error" id="scan-error"></div>
      <button class="btn-pill scan-close" id="scan-close-btn" onclick="closeScanOverlay()">Cancel</button>
    </div>
    <div id="scan-confirm" style="display:none">
      <div class="scan-company" id="scan-confirm-company"></div>
      <p class="scan-confirm-text" id="scan-confirm-text"></p>
      <div class="scan-confirm-actions">
        <button class="btn-pill" onclick="confirmCancel()">Cancel</button>
        <button class="btn-pill filled" onclick="confirmContinue()">Continue anyway</button>
      </div>
    </div>
  </div>
</div>

<script>{SEARCH_JS}</script>
</body>
</html>
"""
