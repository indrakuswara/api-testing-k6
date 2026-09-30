// Builds a pretty, self-contained HTML email body from Playwright's
// JSON reporter output (test-results.json).
//
// Env vars (all optional):
//   EMAIL_TITLE   - report title, defaults to "api-testing-k6"
//   EMAIL_NOTE    - callout box text shown under the stats (e.g. sandbox caveats)
//   EMAIL_BRANCH, EMAIL_SHA, EMAIL_RUN_URL - footer metadata
//
// Usage: node scripts/build-email-report.mjs [input.json] [output.html]

import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2] ?? 'test-results.json';
const output = process.argv[3] ?? 'email-report.html';
const TITLE = process.env.EMAIL_TITLE ?? 'api-testing-k6';
const NOTE = process.env.EMAIL_NOTE ?? '';
const BRANCH = process.env.EMAIL_BRANCH ?? '';
const SHA = (process.env.EMAIL_SHA ?? '').slice(0, 7);
const RUN_URL = process.env.EMAIL_RUN_URL ?? '';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const report = JSON.parse(readFileSync(input, 'utf8'));

const specs = [];
const walk = (suites) => {
  for (const s of suites ?? []) {
    for (const spec of s.specs ?? []) specs.push(spec);
    walk(s.suites);
  }
};
walk(report.suites);

const rows = specs.map((spec, i) => {
  const results = spec.tests?.flatMap((t) => t.results ?? []) ?? [];
  const final = results[results.length - 1];
  const finalStatus = final?.status ?? 'unknown';
  let status = 'failed';
  if (finalStatus === 'passed') status = results.length > 1 ? 'flaky' : 'passed';
  else if (finalStatus === 'skipped') status = 'skipped';
  const durationMs = results.reduce((a, r) => a + (r.duration ?? 0), 0);
  const duration = durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${Math.round(durationMs)}ms`;
  const errText = final?.error?.message ?? final?.errors?.[0]?.message ?? '';
  const file = String(spec.file ?? '').split('/').pop();
  return { i: i + 1, status, title: spec.title, file, duration, errText };
});

const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
const total = rows.length;
const overall = counts.failed > 0 ? 'FAILED' : 'PASSED';

const pill = (status) => {
  const map = {
    passed: ['PASSED', '#d4edda', '#155724'],
    failed: ['FAILED', '#f8d7da', '#721c24'],
    flaky: ['FLAKY', '#fff3cd', '#856404'],
    skipped: ['SKIPPED', '#e2e3e5', '#383d41'],
  };
  const [label, bg, fg] = map[status] ?? ['?', '#e2e3e5', '#383d41'];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.5px;background:${bg};color:${fg};">${label}</span>`;
};

const statCell = (label, value, color) => `
  <td style="padding:14px 8px;text-align:center;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;" width="25%">
    <div style="font-size:28px;font-weight:800;color:${color};line-height:1.2;">${value}</div>
    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${label}</div>
  </td>`;

const rowHtml = rows
  .map(
    (r) => `
  <tr>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#9ca3af;text-align:center;vertical-align:top;">${r.i}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;white-space:nowrap;">${pill(r.status)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;vertical-align:top;">
      ${esc(r.title)}
      ${r.status === 'failed' && r.errText ? `<div style="margin-top:6px;font-size:11px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 8px;font-family:monospace;word-break:break-word;">${esc(r.errText.split('\n')[0].slice(0, 220))}</div>` : ''}
    </td>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#6b7280;font-family:monospace;vertical-align:top;white-space:nowrap;">${esc(r.file)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;text-align:right;vertical-align:top;white-space:nowrap;">${r.duration}</td>
  </tr>`
  )
  .join('');

const headerBg = overall === 'PASSED' ? '#065f46' : '#991b1b';

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

<tr><td style="background:${headerBg};padding:28px 32px;">
  <div style="font-size:13px;color:rgba(255,255,255,.75);letter-spacing:1px;text-transform:uppercase;">${esc(TITLE)}</div>
  <div style="margin-top:6px;font-size:24px;font-weight:800;color:#ffffff;">API Test Results</div>
  <div style="margin-top:10px;">${pill(overall === 'PASSED' ? 'passed' : 'failed').replace(/PASSED|FAILED/, overall)}</div>
</td></tr>

<tr><td style="padding:24px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="8">
<tr>
${statCell('Passed', counts.passed, '#16a34a')}
${statCell('Failed', counts.failed, '#dc2626')}
${statCell('Flaky', counts.flaky, '#d97706')}
${statCell('Total', total, '#111827')}
</tr>
</table>
</td></tr>

${NOTE ? `<tr><td style="padding:8px 32px 0;"><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1e40af;">&#128161; ${esc(NOTE)}</div></td></tr>` : ''}

<tr><td style="padding:20px 32px 8px;">
<div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;">Test cases</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr style="background:#f9fafb;">
<th style="padding:10px 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:center;">#</th>
<th style="padding:10px 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:left;">Status</th>
<th style="padding:10px 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:left;">Test</th>
<th style="padding:10px 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:left;">File</th>
<th style="padding:10px 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:right;">Time</th>
</tr>
${rowHtml}
</table>
</td></tr>

<tr><td style="padding:20px 32px 28px;font-size:12px;color:#9ca3af;">
${BRANCH ? `Branch <b style="color:#6b7280;">${esc(BRANCH)}</b> &nbsp;&middot;&nbsp; ` : ''}${SHA ? `Commit <b style="color:#6b7280;font-family:monospace;">${esc(SHA)}</b> &nbsp;&middot;&nbsp; ` : ''}${RUN_URL ? `<a href="${esc(RUN_URL)}" style="color:#2563eb;">View CI run</a> &nbsp;&middot;&nbsp; ` : ''}Full HTML report attached as <b style="color:#6b7280;">playwright-report.zip</b>.
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

writeFileSync(output, html.endsWith('\n') ? html : html + '\n');
console.log(`Wrote ${output} (${rows.length} tests: ${counts.passed} passed, ${counts.failed} failed, ${counts.flaky} flaky)`);
