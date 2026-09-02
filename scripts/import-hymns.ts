import AdmZip from 'adm-zip';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Verse = { number: number; lines: string[] };
type Hymn = { number: number; title: string; searchTitle: string; verses: Verse[]; tags?: string[] };

const source = process.argv[2] ?? '00000572-HYMNAL SONGS.docx';
const output = process.argv[3] ?? 'src/data/hymns.json';
const warnings: string[] = [];
const clean = (value: string) => value.replace(/\r/g, '').replace(/[ \t]+$/g, '').replace(/\u00a0/g, ' ').trim();

function xmlDecode(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function paragraphsFromDocx(path: string) {
  const xml = new AdmZip(path).readAsText('word/document.xml');
  return [...xml.matchAll(/<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g)].map((match) => {
    const body = match[1];
    // Keep these tabs for now; the Word file uses them like rough columns.
    return [...body.matchAll(/<w:tab\s*\/>|<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((part) => part[0].startsWith('<w:tab') ? '\t' : xmlDecode(part[1] ?? ''))
      .join('').replace(/\r/g, '').replace(/[ ]+$/g, '').replace(/\u00a0/g, ' ');
  });
}

function splitColumns(line: string) {
  const parts = line.split(/\t{2,}/).map(clean);
  return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [clean(line)];
}

function isHeading(value: string) {
  const match = value.match(/^(\d{1,3})\.?$/);
  return match ? Number(match[1]) : null;
}

function parseVerses(lines: string[], hymnNumber: number): Verse[] {
  const verses: Verse[] = [];
  let current: Verse | undefined;
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    const verseStart = line.match(/^(\d{1,2})\s*[.)]\s*(.*)$/);
    if (verseStart) {
      if (current) verses.push(current);
      current = { number: Number(verseStart[1]), lines: verseStart[2] ? [verseStart[2]] : [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      warnings.push(`Hymn ${hymnNumber}: text before a verse marker preserved as verse 1.`);
      current = { number: 1, lines: [line] };
    }
  }
  if (current) verses.push(current);
  const unique = new Map<number, Verse>();
  for (const verse of verses) {
    if (unique.has(verse.number)) warnings.push(`Hymn ${hymnNumber}: repeated verse ${verse.number}; preserving as a separate ordered verse.`);
  }
  return verses.sort((a, b) => a.number - b.number);
}

export function parseHymnalParagraphs(paragraphs: string[]): { hymns: Hymn[]; warnings: string[] } {
  let active: { number: number; columns: [string[], string[]] } | null = null;
  const rawHymns: Array<{ number: number; lines: string[] }> = [];
  const commit = () => {
    if (active) rawHymns.push({ number: active.number, lines: [...active.columns[0], ...active.columns[1]] });
    active = null;
  };

  for (const paragraph of paragraphs) {
    if (!clean(paragraph)) continue;
    const cells = splitColumns(paragraph);
    const headings = cells.map(isHeading).filter((value): value is number => value !== null);
    if (headings.length) {
      // The first number is often just the page number, so the last number is the hymn.
      commit();
      active = { number: headings.at(-1)!, columns: [[], []] };
      continue;
    }
    if (!active) {
      warnings.push(`Unassigned text preserved for review: ${clean(paragraph).slice(0, 70)}`);
      continue;
    }
    cells.forEach((cell, index) => {
      if (cell) active!.columns[index === 0 ? 0 : 1].push(cell);
    });
  }
  commit();

  const duplicateNumbers = new Set<number>();
  const seen = new Set<number>();
  const hymns = rawHymns.map((raw) => {
    if (seen.has(raw.number)) duplicateNumbers.add(raw.number);
    seen.add(raw.number);
    const verses = parseVerses(raw.lines, raw.number);
    const firstLine = verses.flatMap((verse) => verse.lines).find(Boolean) ?? '';
    if (!firstLine) warnings.push(`Hymn ${raw.number}: no lyric text found.`);
    if (verses.some((verse) => verse.lines.length === 0)) warnings.push(`Hymn ${raw.number}: verse with no text.`);
    return { number: raw.number, title: firstLine, searchTitle: firstLine.toLocaleLowerCase(), verses };
  }).filter((hymn) => hymn.verses.length > 0);
  if (duplicateNumbers.size) warnings.push(`Duplicate hymn numbers: ${[...duplicateNumbers].join(', ')}`);
  return { hymns: hymns.sort((a, b) => a.number - b.number), warnings };
}

async function main() {
  const { hymns, warnings: parseWarnings } = parseHymnalParagraphs(paragraphsFromDocx(resolve(source)));
  const duplicates = hymns.filter((hymn, index) => hymns.findIndex((item) => item.number === hymn.number) !== index).map((hymn) => hymn.number);
  if (!hymns.length) throw new Error('No hymns were imported. The source structure needs review.');
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(resolve(output), JSON.stringify(hymns, null, 2) + '\n', 'utf8');
  console.log(`Hymns found: ${hymns.length}`);
  console.log(`Range: ${hymns[0].number} - ${hymns.at(-1)!.number}`);
  console.log(`Duplicate numbers: ${duplicates.length ? [...new Set(duplicates)].join(', ') : 'none'}`);
  console.log(`Warnings: ${parseWarnings.length}`);
  parseWarnings.forEach((warning) => console.warn(`WARN: ${warning}`));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/import-hymns.ts')) main();
