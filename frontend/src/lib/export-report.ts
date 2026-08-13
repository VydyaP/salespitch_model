import type { Company } from "@/data/companies";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function reportHtml(c: Company) {
  const sev = (s: string) => s.toUpperCase();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Prospect Scan — ${esc(c.company_name)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5}
  h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}
  .meta{font-family:ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#666}
  h2{font-size:12px;font-family:ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#666;border-top:1px solid #ddd;padding-top:10px;margin-top:32px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{border-bottom:1px solid #eee;padding:8px 6px;vertical-align:top}
  .sev{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.1em;border:1px solid #999;padding:2px 5px;white-space:nowrap}
  .cite{font-size:11px;color:#666;font-style:italic}
  a{color:#0645ad}
  blockquote{margin:6px 0 0;padding-left:10px;border-left:2px solid #ddd;font-size:12px;color:#555}
</style></head><body>
<div class="meta">Prospect Scan · GND Solutions · internal sales research</div>
<h1>${esc(c.company_name)}</h1>
<div class="meta">${esc(c.industry)} · ${esc(c.hq)} · founded ${esc(c.founded)} · ${esc(c.size)} · scanned ${esc(c.scanned_at)}</div>

<h2>Gaps (${c.gaps.length})</h2>
<table>${c.gaps
    .map(
      (g) => `<tr><td class="sev">${sev(g.severity)}</td><td><strong>${esc(g.title)}</strong><br>${esc(g.detail)}<div class="cite">Service line: ${esc(g.gnd_service)} · Based on fact: “${esc(g.based_on)}”</div></td></tr>`,
    )
    .join("")}</table>

<h2>Pitch</h2>
<p>${esc(c.pitch.angle)}</p>
<p><strong>Opener:</strong> “${esc(c.pitch.opener)}”</p>

<h2>Sourced facts (${c.facts.length})</h2>
<table>${c.facts
    .map(
      (f, i) =>
        `<tr><td class="meta">F${String(i + 1).padStart(2, "0")}</td><td><a href="${esc(f.source_url)}">${esc(f.claim)}</a><blockquote>“${esc(f.source_snippet)}”</blockquote><div class="cite">${esc(f.source_url)}</div></td></tr>`,
    )
    .join("")}</table>
</body></html>`;
}

export function downloadReport(c: Company) {
  const blob = new Blob([reportHtml(c)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prospect-scan-${c.slug}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
