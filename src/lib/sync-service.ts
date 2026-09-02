import type { SermonNote } from '../types';
import { notesRepository } from './notes-repository';
import { supabase } from './supabase';

export async function syncPendingNotes(userId: string) {
  if (!supabase || !navigator.onLine) return { synced: 0, available: false };
  const pending = (await notesRepository.all()).filter((note) => note.pendingSync && !note.deletedAt);
  let synced = 0;
  for (const note of pending) {
    const { error } = await supabase.from('sermon_notes').upsert({
      id: note.id, user_id: userId, sermon_date: note.date, title: note.title ?? null, pastor: note.pastor ?? null,
      church: note.church ?? null, service: note.service ?? null, content: note.content,
      personal_reflection: note.personalReflection ?? null, created_at: note.createdAt, updated_at: note.updatedAt
    });
    if (!error) { await notesRepository.save({ ...note, pendingSync: false }); synced++; }
  }
  return { synced, available: true };
}
