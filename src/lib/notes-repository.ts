import { openDB } from 'idb';
import { seedSermonNotes } from '../data/seed-sermon-notes';
import type { SermonNote } from '../types';

const dbPromise = openDB('nyimbo-dza-vhatendi-notes', 1, { upgrade(db) { if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' }); } });
export const notesRepository = {
  async all() { return (await dbPromise).getAll('notes') as Promise<SermonNote[]>; },
  async save(note: SermonNote) { await (await dbPromise).put('notes', note); return note; },
  async remove(id: string) { await (await dbPromise).delete('notes', id); },
  async ensureSeedNotes() {
    const db = await dbPromise;
    const existing = await db.getAllKeys('notes');
    const missing = seedSermonNotes.filter((note) => !existing.includes(note.id));
    if (!missing.length) return 0;
    const tx = db.transaction('notes', 'readwrite');
    await Promise.all(missing.map((note) => tx.store.put(note)));
    await tx.done;
    return missing.length;
  }
};
