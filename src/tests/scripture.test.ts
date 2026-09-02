import { describe, expect, it } from 'vitest';
import { parseScriptureReference } from '../lib/scripture';
describe('scripture parser', () => {
  it.each([['Psalm 27', 'Psalms', 27], ['Psalm 27:1', 'Psalms', 27], ['Psalm 27:1-6', 'Psalms', 27], ['Ps 27', 'Psalms', 27], ['John 3:16', 'John', 3], ['1 Corinthians 13', '1 Corinthians', 13], ['1 pitirosi chapter 2', '1 Peter', 2], ['Mufunzi 5', 'Ecclesiastes', 5], ['Mishumo 26', 'Acts', 26]])('parses %s', (input, book, chapter) => { const parsed = parseScriptureReference(input); expect(parsed?.book).toBe(book); expect(parsed?.chapter).toBe(chapter); });
  it('rejects invalid text', () => expect(parseScriptureReference('a favourite verse')).toBeNull());
});
