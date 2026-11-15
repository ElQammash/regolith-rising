/** Renders docs/PROJECT.md to a print-ready HTML file; a headless browser then prints it to PDF. */
import { readFileSync, writeFileSync } from 'node:fs';
import { marked } from 'marked';

const out = process.argv[2] ?? 'docs/PROJECT.html';
const md = readFileSync('docs/PROJECT.md', 'utf8')
  // relative repo links become absolute GitHub links in the PDF
  .replace(/\]\((\.\.\/)?(src|scripts|docs)\//g, '](https://github.com/ElQammash/regolith-rising/blob/main/$2/')
  .replace(/\]\((data-sources|balance-report|balance-results)\./g, '](https://github.com/ElQammash/regolith-rising/blob/main/docs/$1.');
const body = marked.parse(md, { async: false }) as string;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Regolith Rising: Project Documentation</title>
<style>
@page { size: A4; margin: 16mm 14mm; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1a1f33; }
h1 { font-size: 22pt; color: #0b1020; border-bottom: 3px solid #ff9a2f; padding-bottom: 6px; }
h2 { font-size: 14pt; color: #1b3a8a; margin-top: 18px; page-break-after: avoid; }
h3 { font-size: 11.5pt; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; page-break-inside: auto; }
th, td { border: 1px solid #c9cfe0; padding: 4px 6px; vertical-align: top; text-align: left; }
th { background: #eef1fa; }
tr { page-break-inside: avoid; }
code { background: #f1f3f9; padding: 0 3px; border-radius: 3px; font-size: 9pt; }
pre { background: #f1f3f9; padding: 8px; border-radius: 6px; font-size: 8.5pt; overflow: hidden; white-space: pre-wrap; }
a { color: #1b5fd6; text-decoration: none; word-break: break-word; }
hr { border: 0; border-top: 1px solid #c9cfe0; }
</style></head><body>${body}</body></html>`;
writeFileSync(out, html);
console.log('wrote', out);
