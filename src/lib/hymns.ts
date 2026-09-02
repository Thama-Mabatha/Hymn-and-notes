import hymns from '../data/hymns.json';
import type { Hymn } from '../types';

export const hymnLibrary = hymns as Hymn[];
export const hymnByNumber = new Map(hymnLibrary.map((hymn) => [hymn.number, hymn]));
const normalize = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();

export type HymnResult = { hymn: Hymn; match: 'number' | 'title' | 'lyrics'; excerpt?: string };
export function searchHymns(query: string): HymnResult[] {
  const term = normalize(query);
  if (!term) return hymnLibrary.map((hymn) => ({ hymn, match: 'title' }));
  const results: HymnResult[] = [];
  hymnLibrary.forEach((hymn) => {
    const number = String(hymn.number);
    const title = normalize(hymn.title);
    const lyricLines = hymn.verses.flatMap((verse) => verse.lines);
    const lyric = lyricLines.find((line) => normalize(line).includes(term));
    const match = number === term ? 'number' : title.includes(term) ? 'title' : lyric ? 'lyrics' : null;
    if (match) results.push({ hymn, match, ...(match === 'lyrics' && lyric ? { excerpt: lyric } : {}) });
  });
  return results.sort((a, b) => {
    const rank = { number: 0, title: 1, lyrics: 2 };
    return rank[a.match] - rank[b.match] || a.hymn.number - b.hymn.number;
  });
}
export function adjacentHymn(number: number, direction: -1 | 1) {
  const index = hymnLibrary.findIndex((hymn) => hymn.number === number);
  return index < 0 ? undefined : hymnLibrary[index + direction];
}
