import type { SermonNote } from '../types';
import { notesRepository } from './notes-repository';
import { supabase } from './supabase';

type SyncResult = { synced: number; available: boolean; error?: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Makes older readable local ids safe for Supabase uuid columns.
function toSupabaseId(id: string) {
  if (uuidPattern.test(id)) {
    return id;
  }

  const hex = Array.from(id).reduce((hash, char) => {
    return Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }, 2166136261).toString(16).padStart(8, '0');
  const repeated = `${hex}${hex}${hex}${hex}`.slice(0, 32);

  return `${repeated.slice(0, 8)}-${repeated.slice(8, 12)}-4${repeated.slice(13, 16)}-a${repeated.slice(17, 20)}-${repeated.slice(20, 32)}`;
}

// Turns the local note shape into the main Supabase row.
function noteToRow(note: SermonNote, userId: string) {
  return {
    id: toSupabaseId(note.id),
    user_id: userId,
    sermon_date: note.date,
    title: note.title ?? null,
    pastor: note.pastor ?? null,
    church: note.church ?? null,
    service: note.service ?? null,
    content: note.content,
    personal_reflection: note.personalReflection ?? null,
    key_takeaways: note.keyTakeaways ?? [],
    created_at: note.createdAt,
    updated_at: note.updatedAt
  };
}

// Keeps scripture, topics and hymn links matching the local note.
async function syncNoteRelations(note: SermonNote, userId: string) {
  if (!supabase) return;
  const noteId = toSupabaseId(note.id);

  await supabase.from('scripture_references').delete().eq('sermon_note_id', noteId);
  await supabase.from('sermon_note_topics').delete().eq('sermon_note_id', noteId);
  await supabase.from('sermon_hymns').delete().eq('sermon_note_id', noteId);

  if (note.scriptureReferences.length) {
    const { error } = await supabase.from('scripture_references').insert(
      note.scriptureReferences.map((reference) => ({
        id: toSupabaseId(reference.id),
        sermon_note_id: noteId,
        book: reference.book,
        chapter: reference.chapter,
        verse_start: reference.verseStart ?? null,
        verse_end: reference.verseEnd ?? null,
        display_reference: reference.display
      }))
    );

    if (error) throw error;
  }

  if (note.relatedHymnNumbers.length) {
    const { error } = await supabase.from('sermon_hymns').insert(
      note.relatedHymnNumbers.map((number) => ({ sermon_note_id: noteId, hymn_number: number }))
    );

    if (error) throw error;
  }

  for (const topic of note.topics) {
    const cleanTopic = topic.trim();

    if (cleanTopic) {
      const { data, error } = await supabase
        .from('topics')
        .upsert({ user_id: userId, name: cleanTopic }, { onConflict: 'user_id,name' })
        .select('id')
        .single();

      if (error) throw error;

      const { error: linkError } = await supabase
        .from('sermon_note_topics')
        .upsert({ sermon_note_id: noteId, topic_id: data.id });

      if (linkError) throw linkError;
    }
  }
}

// Uploads notes that were saved locally while offline or unsigned out.
export async function syncPendingNotes(userId: string) {
  if (!supabase || !navigator.onLine) return { synced: 0, available: false };

  const pending = (await notesRepository.all()).filter((note) => note.pendingSync && !note.deletedAt);
  let synced = 0;

  for (const note of pending) {
    const { error } = await supabase.from('sermon_notes').upsert(noteToRow(note, userId));

    if (error) {
      return { synced, available: true, error: error.message };
    }

    try {
      await syncNoteRelations(note, userId);
      await notesRepository.save({ ...note, pendingSync: false });
      synced++;
    } catch (error) {
      return { synced, available: true, error: error instanceof Error ? error.message : 'Sync failed' };
    }
  }

  return { synced, available: true };
}

// Signs in with Supabase email magic links when backend env vars are configured.
export async function sendSignInLink(email: string): Promise<SyncResult> {
  if (!supabase) return { synced: 0, available: false };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });

  return { synced: 0, available: true, error: error?.message };
}
