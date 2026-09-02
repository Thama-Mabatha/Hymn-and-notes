import { afterEach, describe, expect, it } from 'vitest';
import { notesRepository } from '../lib/notes-repository';
import type { SermonNote } from '../types';
const makeNote = (id: string): SermonNote => ({ id, date: '2026-09-01', title: 'Psalm 27', pastor: 'Pastor Example', scriptureReferences: [{ id: 'ref', book: 'Psalms', chapter: 27, display: 'Psalm 27' }], topics: ['Faith'], relatedHymnNumbers: [6], content: 'The Lord is my light.', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', pendingSync: true });
afterEach(async () => { for (const note of await notesRepository.all()) await notesRepository.remove(note.id); });
describe('local sermon notes', () => {
  it('creates, updates and deletes notes in IndexedDB', async () => { const note = makeNote('note-1'); await notesRepository.save(note); expect((await notesRepository.all())[0].relatedHymnNumbers).toEqual([6]); await notesRepository.save({ ...note, title: 'Updated Psalm 27' }); expect((await notesRepository.all())[0].title).toBe('Updated Psalm 27'); await notesRepository.remove(note.id); expect(await notesRepository.all()).toEqual([]); });
  it('imports bundled old notes once', async () => { expect(await notesRepository.ensureSeedNotes()).toBeGreaterThan(0); const once = await notesRepository.all(); expect(once.some((note) => note.id === 'seed-2025-10-12-amos-8')).toBe(true); expect(await notesRepository.ensureSeedNotes()).toBe(0); expect(await notesRepository.all()).toHaveLength(once.length); });
});
