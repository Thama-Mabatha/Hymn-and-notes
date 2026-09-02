import { describe, expect, it } from 'vitest';
import { adjacentHymn, searchHymns } from '../lib/hymns';
describe('hymn search', () => {
  it('ranks exact numbers first', () => expect(searchHymns('6')[0].hymn.number).toBe(6));
  it('finds titles without case sensitivity', () => expect(searchHymns('ndi do u tenda').some((result) => result.hymn.number === 6)).toBe(true));
  it('finds later lyric text', () => expect(searchHymns('Yerusalema').some((result) => result.hymn.number === 6)).toBe(true));
  it('uses actual available neighbours', () => { expect(adjacentHymn(6, 1)?.number).toBe(7); expect(adjacentHymn(7, -1)?.number).toBe(6); });
});
