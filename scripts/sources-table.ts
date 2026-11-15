/** Prints the data-sources table (Markdown) straight from src/data/nasa.ts. */
import { NASA, type DataEntry } from '../src/data/nasa';

const rows = Object.entries(NASA as Record<string, DataEntry>).map(([key, e]) => {
  const flags = [e.simplified ? 'simplified' : '', e.verification, e.nasa ? '' : '**not NASA**'].filter(Boolean).join(', ');
  const note = (e.note ?? '').replace(/\|/g, '/');
  return `| \`${key}\` | ${e.value} ${e.unit} | [${e.sourceName.replace(/\|/g, '/')}](${e.sourceUrl}) | ${flags} | ${note} |`;
});
console.log('| Key | Value | Source | Flags | Notes |');
console.log('|---|---|---|---|---|');
console.log(rows.join('\n'));
