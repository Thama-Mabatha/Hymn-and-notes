import type { ScriptureReference } from '../types';

const aliases: Record<string, string> = {
  ps: 'Psalms', psalm: 'Psalms', psalms: 'Psalms', jn: 'John', john: 'John',
  rom: 'Romans', romans: 'Romans', '1 cor': '1 Corinthians', '1 corinthians': '1 Corinthians',
  '2 cor': '2 Corinthians', '2 corinthians': '2 Corinthians',
  exo: 'Exodus', exodus: 'Exodus', amos: 'Amos', mishumo: 'Acts', acts: 'Acts',
  mufunzi: 'Ecclesiastes', ecclesiastes: 'Ecclesiastes', jonah: 'Jonah',
  '1 peter': '1 Peter', '1 pitirosi': '1 Peter', pitirosi: 'Peter',
  '1 chronicles': '1 Chronicles', chronicles: 'Chronicles'
};
export function parseScriptureReference(input: string): Omit<ScriptureReference, 'id'> | null {
  const value = input.trim().replace(/\s+/g, ' ').replace(/\s+chapter\s+/i, ' ');
  const match = value.match(/^((?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/i);
  if (!match) return null;
  const rawBook = match[1].toLocaleLowerCase();
  const book = aliases[rawBook] ?? match[1].replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { book, chapter: Number(match[2]), verseStart: match[3] ? Number(match[3]) : undefined, verseEnd: match[4] ? Number(match[4]) : undefined, display: value };
}
export const scriptureKey = (reference: Pick<ScriptureReference, 'book' | 'chapter'>) => `${reference.book}:${reference.chapter}`;
