import { useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Heart, Home, Library, MoreHorizontal, NotebookPen, Plus, Search, Settings, Share2, Trash2, X } from 'lucide-react';
import { adjacentHymn, hymnByNumber, searchHymns } from './lib/hymns';
import { notesRepository } from './lib/notes-repository';
import { parseScriptureReference, scriptureKey } from './lib/scripture';
import { defaultSettings, readLocal, recentHymns, rememberHymn, writeLocal } from './lib/storage';
import { supabase } from './lib/supabase';
import { sendSignInLink, syncPendingNotes } from './lib/sync-service';
import type { Hymn, ReaderSettings, SermonNote } from './types';

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => crypto.randomUUID();

// Gets the best title to show for a sermon note.
function noteTitle(note: SermonNote) {
  if (note.title) {
    return note.title;
  }

  if (note.content) {
    return 'Untitled sermon note';
  }

  return 'Untitled draft';
}

// Makes the date look nice on note cards.
function dateLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00`));
}

// Highlights the matching part of a search result.
function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());

  if (index < 0 || !query) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

// Shows one hymn row and handles the favourite button.
function HymnRow({ hymn, query = '', noteCount }: { hymn: Hymn; query?: string; noteCount?: number }) {
  const [favourites, setFavourites] = useState(() => readLocal<number[]>('favourites', []));
  const saved = favourites.includes(hymn.number);

  function handleFavouriteClick(event: React.MouseEvent) {
    event.preventDefault();

    let nextFavourites = favourites;

    if (saved) {
      nextFavourites = favourites.filter((number) => number !== hymn.number);
    } else {
      nextFavourites = [...favourites, hymn.number];
    }

    setFavourites(nextFavourites);
    writeLocal('favourites', nextFavourites);
  }

  return (
    <Link className="hymn-row" to={`/hymn/${hymn.number}`}>
      <span className="hymn-number">{hymn.number}</span>
      <span className="hymn-title">
        <Highlight text={hymn.title} query={query} />
        {noteCount ? <small>Used in {noteCount} sermon note{noteCount === 1 ? '' : 's'}</small> : null}
      </span>
      <button
        className="icon-button"
        aria-label={`${saved ? 'Remove' : 'Add'} hymn ${hymn.number} ${saved ? 'from' : 'to'} favourites`}
        onClick={handleFavouriteClick}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </Link>
  );
}

// Keeps the header, main content and bottom nav together.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">N</span>
          <span>
            Nyimbo dza
            <small>Vhatendi</small>
          </span>
        </Link>
        <Link className="icon-button" to="/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </header>

      <main>{children}</main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavLink to="/">
          <Home size={19} />
          Home
        </NavLink>
        <NavLink to="/hymns">
          <Library size={19} />
          Hymns
        </NavLink>
        <NavLink to="/notes">
          <NotebookPen size={19} />
          Notes
        </NavLink>
        <NavLink to="/favorites">
          <Heart size={19} />
          Favourites
        </NavLink>
        <NavLink to="/collections">
          <MoreHorizontal size={19} />
          More
        </NavLink>
      </nav>
    </div>
  );
}

// Lets users jump straight to a hymn number.
function NumberJump({ compact = false }: { compact?: boolean }) {
  const [number, setNumber] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const hymnNumber = Number(number);

    if (hymnByNumber.has(hymnNumber)) {
      navigate(`/hymn/${hymnNumber}`);
    } else {
      setNumber('');
    }
  }

  function handleNumberChange(event: React.ChangeEvent<HTMLInputElement>) {
    setNumber(event.target.value);
  }

  return (
    <form className={compact ? 'number-jump compact' : 'number-jump'} onSubmit={handleSubmit}>
      <label htmlFor="hymn-number">{compact ? 'Jump to hymn' : 'Quick hymn number'}</label>
      <div>
        <input id="hymn-number" inputMode="numeric" value={number} onChange={handleNumberChange} placeholder="65" />
        <button type="submit">Open</button>
      </div>
    </form>
  );
}

// Builds the home page with search, recent items and quick actions.
function HomePage({ notes }: { notes: SermonNote[] }) {
  const [query, setQuery] = useState('');
  const results = searchHymns(query).slice(0, 5);
  const recentHymnList = recentHymns().map((number) => hymnByNumber.get(number)).filter(Boolean) as Hymn[];
  const favouriteHymns = readLocal<number[]>('favourites', []).map((number) => hymnByNumber.get(number)).filter(Boolean) as Hymn[];

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return (
    <Shell>
      <section className="home-intro">
        <p className="eyebrow">A personal worship companion</p>
        <h1>Hymns close at hand.</h1>
        <p>Search the Tshivenḓa hymnal, even when the signal is gone.</p>

        <div className="search-box">
          <Search size={20} />
          <input autoFocus value={query} onChange={handleSearchChange} placeholder="Search hymn number or words..." />
        </div>

        {query && (
          <div className="search-preview">
            {results.map((result) => (
              <HymnRow key={result.hymn.number} hymn={result.hymn} query={query} />
            ))}
          </div>
        )}
      </section>

      <NumberJump />

      <section className="quick-actions">
        <Link to="/hymns">
          <BookOpen />
          Find a hymn
        </Link>
        <Link to="/notes/new">
          <Plus />
          New sermon note
        </Link>
      </section>

      <Section title="Continue reading" action="Browse hymns" to="/hymns">
        {recentHymnList[0] ? <HymnRow hymn={recentHymnList[0]} /> : <Empty text="Open a hymn and it will be kept here." />}
      </Section>

      <Section title="Recent notes" action="All notes" to="/notes">
        {notes.slice(0, 3).map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
        {!notes.length && <Empty text="Keep today’s sermon close. Start a quick note." />}
      </Section>

      <Section title="Favourites" action="View all" to="/favorites">
        {favouriteHymns.slice(0, 3).map((hymn) => (
          <HymnRow key={hymn.number} hymn={hymn} />
        ))}
        {!favouriteHymns.length && <Empty text="Save hymns you return to often." />}
      </Section>
    </Shell>
  );
}

// Small reusable block for grouped homepage content.
function Section({ title, action, to, children }: { title: string; action?: string; to?: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
        {to && <Link to={to}>{action}</Link>}
      </div>
      {children}
    </section>
  );
}

// Shows a friendly empty message when a list has nothing.
function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

// Lists all hymns and filters them as the user searches.
function HymnsPage() {
  const [query, setQuery] = useState('');
  const results = searchHymns(query);

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return (
    <Shell>
      <PageTitle eyebrow="Library" title="Every hymn, ready." />
      <div className="search-box sticky-search">
        <Search size={20} />
        <input value={query} onChange={handleSearchChange} placeholder="Search words or hymn number" />
      </div>

      <div className="list">
        {results.map((result) => (
          <div key={result.hymn.number}>
            <HymnRow hymn={result.hymn} query={query} />
            {result.excerpt && (
              <p className="excerpt">
                <Highlight text={result.excerpt} query={query} />
              </p>
            )}
          </div>
        ))}
        {!results.length && <Empty text="No hymn matches that search." />}
      </div>
    </Shell>
  );
}

// Shows the full hymn reader with sharing and next/previous hymns.
function HymnPage({ notes }: { notes: SermonNote[] }) {
  const { number } = useParams();
  const hymn = hymnByNumber.get(Number(number));
  const navigate = useNavigate();
  const [settings] = useState<ReaderSettings>(() => readLocal('reader-settings', defaultSettings));

  useEffect(() => {
    if (hymn) {
      rememberHymn(hymn.number);
      document.title = `Hymn ${hymn.number} - ${hymn.title}`;
    }
  }, [hymn]);

  async function handleShare() {
    if (!hymn) {
      return;
    }

    const data = {
      title: `Hymn ${hymn.number} - ${hymn.title}`,
      text: `Hymn ${hymn.number} - ${hymn.title}`,
      url: location.href
    };

    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard?.writeText(location.href);
    }
  }

  if (!hymn) {
    return (
      <Shell>
        <div className="not-found">
          <BookOpen size={34} />
          <h1>Hymn not found</h1>
          <p>This hymn number is not in this edition.</p>
          <Link className="button" to="/hymns">Browse hymns</Link>
        </div>
      </Shell>
    );
  }

  const previous = adjacentHymn(hymn.number, -1);
  const next = adjacentHymn(hymn.number, 1);
  const relatedNotes = notes.filter((note) => note.relatedHymnNumbers.includes(hymn.number));

  return (
    <Shell>
      <article className={`reader text-${settings.textSize} spacing-${settings.spacing} ${settings.focusMode ? 'focus' : ''}`}>
        <div className="reader-toolbar">
          <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <ChevronLeft />
          </button>
          <NumberJump compact />
          <button className="icon-button" onClick={handleShare} aria-label="Share hymn">
            <Share2 size={19} />
          </button>
          <Link className="icon-button" to="/settings" aria-label="Reader settings">
            <Settings size={19} />
          </Link>
        </div>

        <p className="eyebrow">Hymn {hymn.number}</p>
        <h1>{hymn.title}</h1>

        {hymn.verses.map((verse, index) => (
          <section className="verse" key={`${verse.number}-${index}`}>
            <span>{verse.number}</span>
            <p>
              {verse.lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </section>
        ))}

        {relatedNotes.length > 0 && (
          <section className="related-notes">
            <h2>My sermon notes</h2>
            {relatedNotes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </section>
        )}

        <nav className="pager">
          {previous ? (
            <Link to={`/hymn/${previous.number}`}>
              <ChevronLeft /> {previous.number}
            </Link>
          ) : <span />}

          {next ? (
            <Link to={`/hymn/${next.number}`}>
              {next.number} <ChevronRight />
            </Link>
          ) : <span />}
        </nav>
      </article>
    </Shell>
  );
}

// Shows a short sermon note preview.
function NoteRow({ note }: { note: SermonNote }) {
  return (
    <Link className="note-row" to={`/notes/${note.id}`}>
      <span>{dateLabel(note.date)}</span>
      <strong>{noteTitle(note)}</strong>
      <small>
        {note.scriptureReferences.map((reference) => reference.display).join(' · ') || 'Draft'}
        {note.pastor ? ` · ${note.pastor}` : ''}
      </small>
    </Link>
  );
}

// Shows sermon notes and lets the user search or filter by pastor.
function NotesPage({ notes }: { notes: SermonNote[] }) {
  const [query, setQuery] = useState('');
  const [pastor, setPastor] = useState('');

  const pastors = [...new Set(notes.map((note) => note.pastor).filter(Boolean))] as string[];
  const matches = notes.filter((note) => {
    const searchableText = [
      noteTitle(note),
      note.pastor,
      note.church,
      note.content,
      note.personalReflection,
      ...note.topics,
      ...note.scriptureReferences.map((reference) => reference.display)
    ].join(' ');

    const matchesSearch = searchableText.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    const matchesPastor = !pastor || note.pastor === pastor;

    return matchesSearch && matchesPastor;
  });

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handlePastorChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPastor(event.target.value);
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="Personal worship archive"
        title="Sermon notes"
        action={<Link className="button" to="/notes/new"><Plus size={17} /> New note</Link>}
      />

      <div className="search-box">
        <Search size={20} />
        <input value={query} onChange={handleSearchChange} placeholder="Search notes, scripture, pastor..." />
      </div>

      <div className="filter-row">
        <select value={pastor} onChange={handlePastorChange}>
          <option value="">All pastors</option>
          {pastors.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <Link to="/scripture">Scripture index</Link>
      </div>

      <div className="list">
        {matches.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
        {!matches.length && <Empty text="No sermon notes here yet. New notes save straight to this device." />}
      </div>
    </Shell>
  );
}

// Handles the sermon note form and autosaves changes locally.
function NoteEditor({ notes, save }: { notes: SermonNote[]; save: (note: SermonNote) => Promise<void> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = notes.find((note) => note.id === id);
  const [scripture, setScripture] = useState('');
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState<SermonNote>(() => {
    if (existing) {
      return existing;
    }

    return {
      id: newId(),
      date: today(),
      scriptureReferences: [],
      topics: [],
      relatedHymnNumbers: [],
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pendingSync: true
    };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (note.content || note.title || note.pastor || note.scriptureReferences.length) {
        void save(note);
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [note, save]);

  function updateNote(field: keyof SermonNote, value: unknown) {
    setNote((current) => ({
      ...current,
      [field]: value,
      updatedAt: new Date().toISOString(),
      pendingSync: true
    }));
  }

  function handleAddScripture() {
    const parsed = parseScriptureReference(scripture);

    if (parsed) {
      updateNote('scriptureReferences', [...note.scriptureReferences, { ...parsed, id: newId() }]);
      setScripture('');
    }
  }

  function handleAddTopic() {
    if (topic.trim()) {
      updateNote('topics', [...note.topics, topic.trim()]);
      setTopic('');
    }
  }

  async function handleDone() {
    await save(note);
    navigate(`/notes/${note.id}`);
  }

  return (
    <Shell>
      <div className="editor">
        <div className="editor-head">
          <Link className="icon-button" to="/notes" aria-label="Close editor">
            <X />
          </Link>
          <span>Saved locally</span>
        </div>

        <input
          className="title-input"
          value={note.title ?? ''}
          onChange={(event) => updateNote('title', event.target.value)}
          placeholder="Sermon title"
          aria-label="Sermon title"
        />

        <div className="form-grid">
          <label>
            Date
            <input type="date" value={note.date} onChange={(event) => updateNote('date', event.target.value)} />
          </label>

          <label>
            Pastor / speaker
            <input list="pastors" value={note.pastor ?? ''} onChange={(event) => updateNote('pastor', event.target.value)} />
          </label>

          <datalist id="pastors">
            {[...new Set(notes.map((item) => item.pastor).filter(Boolean))].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <label>
            Church
            <input value={note.church ?? ''} onChange={(event) => updateNote('church', event.target.value)} />
          </label>

          <label>
            Service
            <input value={note.service ?? ''} onChange={(event) => updateNote('service', event.target.value)} placeholder="Sunday Morning" />
          </label>
        </div>

        <TagInput
          label="Scripture"
          value={scripture}
          setValue={setScripture}
          add={handleAddScripture}
          tags={note.scriptureReferences.map((reference) => reference.display)}
          remove={(index) => updateNote('scriptureReferences', note.scriptureReferences.filter((_, item) => item !== index))}
        />

        <TagInput
          label="Topics"
          value={topic}
          setValue={setTopic}
          add={handleAddTopic}
          tags={note.topics}
          remove={(index) => updateNote('topics', note.topics.filter((_, item) => item !== index))}
        />

        <label className="writing">
          Sermon notes
          <textarea
            value={note.content}
            onChange={(event) => updateNote('content', event.target.value)}
            placeholder="Begin writing. This draft is saved automatically."
            autoFocus
          />
        </label>

        <label className="writing reflection">
          Personal reflection
          <textarea
            value={note.personalReflection ?? ''}
            onChange={(event) => updateNote('personalReflection', event.target.value)}
            placeholder="What are you carrying with you?"
          />
        </label>

        <HymnPicker selected={note.relatedHymnNumbers} update={(numbers) => updateNote('relatedHymnNumbers', numbers)} />

        <div className="editor-actions">
          <button className="button" onClick={handleDone}>Done</button>
        </div>
      </div>
    </Shell>
  );
}

// Adds and removes scripture or topic chips.
function TagInput({ label, value, setValue, add, tags, remove }: { label: string; value: string; setValue: (value: string) => void; add: () => void; tags: string[]; remove: (index: number) => void }) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="tag-input">
      <label>{label}</label>
      <div>
        {tags.map((tag, index) => (
          <button type="button" className="tag" key={`${tag}-${index}`} onClick={() => remove(index)}>
            {tag} <X size={13} />
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={label === 'Scripture' ? 'Psalm 27:1-6' : 'Add a topic'}
      />
    </div>
  );
}

// Searches hymns so a sermon note can link to them.
function HymnPicker({ selected, update }: { selected: number[]; update: (numbers: number[]) => void }) {
  const [query, setQuery] = useState('');
  const results = searchHymns(query).slice(0, 4);

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleHymnClick(hymnNumber: number) {
    if (selected.includes(hymnNumber)) {
      update(selected.filter((number) => number !== hymnNumber));
    } else {
      update([...selected, hymnNumber]);
    }
  }

  return (
    <div className="hymn-picker">
      <label>Related hymns</label>
      <input value={query} onChange={handleSearchChange} placeholder="Find hymn 65 or words" />

      {query && results.map(({ hymn }) => (
        <button type="button" key={hymn.number} onClick={() => handleHymnClick(hymn.number)}>
          {selected.includes(hymn.number) ? 'Remove' : 'Add'} {hymn.number} - {hymn.title}
        </button>
      ))}

      {selected.map((number) => (
        <Link key={number} to={`/hymn/${number}`}>Hymn {number}</Link>
      ))}
    </div>
  );
}

// Displays a saved sermon note with edit and delete actions.
function NotePage({ notes, remove }: { notes: SermonNote[]; remove: (id: string) => Promise<void> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const note = notes.find((item) => item.id === id);

  async function handleDelete() {
    if (note && confirm('Delete this sermon note from this device?')) {
      await remove(note.id);
      navigate('/notes');
    }
  }

  if (!note) {
    return (
      <Shell>
        <div className="not-found">
          <NotebookPen size={34} />
          <h1>Note not found</h1>
          <Link className="button" to="/notes">Back to notes</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <article className="note-page">
        <div className="note-actions">
          <Link to="/notes">
            <ChevronLeft /> Notes
          </Link>
          <Link className="button" to={`/notes/${id}/edit`}>Edit</Link>
          <button className="icon-button" aria-label="Delete note" onClick={handleDelete}>
            <Trash2 size={18} />
          </button>
        </div>

        <p className="eyebrow">{dateLabel(note.date)}</p>
        <h1>{noteTitle(note)}</h1>
        <p className="metadata">{[note.pastor, note.church, note.service].filter(Boolean).join(' · ')}</p>

        <div className="reference-list">
          {note.scriptureReferences.map((reference) => (
            <Link key={reference.id} to={`/scripture/${encodeURIComponent(reference.book)}/${reference.chapter}`}>
              {reference.display}
            </Link>
          ))}
        </div>

        {note.topics.length > 0 && <p className="topic-list">{note.topics.join(' · ')}</p>}

        <section>
          <h2>Sermon notes</h2>
          <p className="note-content">{note.content || 'This is still a blank draft.'}</p>
        </section>

        {note.personalReflection && (
          <section>
            <h2>Personal reflection</h2>
            <p className="note-content">{note.personalReflection}</p>
          </section>
        )}

        {note.relatedHymnNumbers.length > 0 && (
          <section>
            <h2>Hymns from this service</h2>
            {note.relatedHymnNumbers.map((number) => (
              <HymnRow key={number} hymn={hymnByNumber.get(number)!} />
            ))}
          </section>
        )}
      </article>
    </Shell>
  );
}

// Groups notes by Bible chapter and opens a chapter page.
function ScripturePage({ notes }: { notes: SermonNote[] }) {
  const { book, chapter } = useParams();

  if (book && chapter) {
    const decodedBook = decodeURIComponent(book);
    const matches = notes.filter((note) =>
      note.scriptureReferences.some((reference) => reference.book === decodedBook && reference.chapter === Number(chapter))
    );

    return (
      <Shell>
        <PageTitle eyebrow="Scripture" title={`${decodedBook} ${chapter}`} />
        <div className="list">
          {matches.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
          {!matches.length && <Empty text="No sermon notes are linked to this chapter." />}
        </div>
      </Shell>
    );
  }

  const groups = new Map<string, { book: string; chapter: number; count: number }>();

  notes.flatMap((note) => note.scriptureReferences).forEach((reference) => {
    const key = scriptureKey(reference);
    const existing = groups.get(key);

    if (existing) {
      groups.set(key, { ...existing, count: existing.count + 1 });
    } else {
      groups.set(key, { book: reference.book, chapter: reference.chapter, count: 1 });
    }
  });

  return (
    <Shell>
      <PageTitle eyebrow="Discovery" title="Scripture index" />
      <div className="list">
        {[...groups.values()].sort((a, b) => a.book.localeCompare(b.book) || a.chapter - b.chapter).map((item) => (
          <Link className="index-row" key={`${item.book}${item.chapter}`} to={`/scripture/${encodeURIComponent(item.book)}/${item.chapter}`}>
            <strong>{item.book} {item.chapter}</strong>
            <span>{item.count} sermon{item.count === 1 ? '' : 's'}</span>
          </Link>
        ))}
        {!groups.size && <Empty text="Scripture chapters will appear here as you add them to sermon notes." />}
      </div>
    </Shell>
  );
}

// Lists the hymns saved as favourites.
function FavoritesPage() {
  const hymns = readLocal<number[]>('favourites', []).map((number) => hymnByNumber.get(number)).filter(Boolean) as Hymn[];

  return (
    <Shell>
      <PageTitle eyebrow="Saved hymns" title="Favourites" />
      <div className="list">
        {hymns.map((hymn) => (
          <HymnRow key={hymn.number} hymn={hymn} />
        ))}
        {!hymns.length && <Empty text="No favourites yet. Save a hymn with the heart button." />}
      </div>
    </Shell>
  );
}

// Placeholder page for personal hymn collections.
function CollectionsPage() {
  return (
    <Shell>
      <PageTitle eyebrow="Personal lists" title="Collections" />
      <Empty text="Collections are stored on this device. Create your first service list from a future hymn selection." />
    </Shell>
  );
}

// Stores reader settings and exports the user's local notes.
function SettingsPage() {
  const [settings, setSettings] = useState<ReaderSettings>(() => readLocal('reader-settings', defaultSettings));
  const [email, setEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const client = supabase;

  useEffect(() => {
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      setAccountEmail(data.session?.user.email ?? '');
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user.email ?? '');
    });

    return () => listener.subscription.unsubscribe();
  }, [client]);

  function updateSettings(nextSettings: ReaderSettings) {
    setSettings(nextSettings);
    writeLocal('reader-settings', nextSettings);
    document.documentElement.dataset.theme = nextSettings.theme;
  }

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();

    const result = await sendSignInLink(email);

    if (result.available && !result.error) {
      setSyncMessage('Check your email for the sign-in link.');
    } else {
      setSyncMessage(result.error ?? 'Supabase is not configured yet.');
    }
  }

  async function handleSyncNow() {
    if (!client) {
      setSyncMessage('Supabase is not configured yet.');
      return;
    }

    const { data } = await client.auth.getUser();

    if (!data.user) {
      setSyncMessage('Sign in first, then we can sync your notes.');
      return;
    }

    const result = await syncPendingNotes(data.user.id);

    if (result.error) {
      setSyncMessage(`Sync failed, but your local notes are safe: ${result.error}`);
    } else if (!result.available) {
      setSyncMessage('Sync is unavailable while offline or before Supabase is configured.');
    } else {
      setSyncMessage(`Synced ${result.synced} local note${result.synced === 1 ? '' : 's'}.`);
    }
  }

  async function handleSignOut() {
    if (client) {
      await client.auth.signOut();
      setAccountEmail('');
      setSyncMessage('Signed out. Your local notes are still on this device.');
    }
  }

  async function exportNotes() {
    const notes = await notesRepository.all();
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'nyimbo-dza-vhatendi-sermon-notes.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <PageTitle eyebrow="Reader and account" title="Settings" />

      <section className="settings-card">
        <h2>Reading</h2>
        <label>
          Text size
          <select value={settings.textSize} onChange={(event) => updateSettings({ ...settings, textSize: event.target.value as ReaderSettings['textSize'] })}>
            {['small', 'medium', 'large', 'xlarge'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Line spacing
          <select value={settings.spacing} onChange={(event) => updateSettings({ ...settings, spacing: event.target.value as ReaderSettings['spacing'] })}>
            {['compact', 'comfortable', 'spacious'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Theme
          <select value={settings.theme} onChange={(event) => updateSettings({ ...settings, theme: event.target.value as ReaderSettings['theme'] })}>
            {['system', 'light', 'dark'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-card">
        <h2>Account & sync</h2>
        {client && accountEmail ? (
          <div className="stack">
            <p>Synced mode: signed in as {accountEmail}.</p>
            <button className="button" type="button" onClick={handleSyncNow}>Sync now</button>
            <button className="button secondary" type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        ) : client ? (
          <form onSubmit={handleSignIn}>
            <p>Sign in to back up your notes across devices.</p>
            <input type="email" required value={email} onChange={handleEmailChange} placeholder="you@example.com" />
            <button className="button">Email me a sign-in link</button>
          </form>
        ) : (
          <p>Local mode: your notes live only on this device. Add Supabase environment variables to enable private backup and sync.</p>
        )}
        {syncMessage && <p className="muted">{syncMessage}</p>}
      </section>

      <section className="settings-card">
        <h2>Your data</h2>
        <p>Notes are private, kept locally first, and never sent to third-party AI services.</p>
        <button className="button secondary" onClick={exportNotes}>Export notes as JSON</button>
      </section>
    </Shell>
  );
}

// Gives a short explanation of the app and its privacy.
function AboutPage() {
  return (
    <Shell>
      <PageTitle eyebrow="About" title="A digital book for worship" />
      <div className="prose">
        <p>Nyimbo dza Vhatendi is an offline-first digital Tshivenḓa hymnal and private personal sermon archive. It makes hymns quick to find during worship while preserving the sermons, scriptures and reflections that matter over time.</p>
        <p>The hymnal is bundled into the app. Favourites, reader settings and sermon notes stay on your device unless you deliberately enable Supabase sync.</p>
      </div>
    </Shell>
  );
}

// Makes the heading area look the same on each page.
function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

// Loads notes and maps browser paths to the right screens.
function AppRoutes() {
  const [notes, setNotes] = useState<SermonNote[]>([]);

  useEffect(() => {
    async function loadNotes() {
      await notesRepository.ensureSeedNotes();

      const items = await notesRepository.all();
      const visibleNotes = items
        .filter((note) => !note.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      setNotes(visibleNotes);
    }

    void loadNotes();
  }, []);

  async function saveNote(note: SermonNote) {
    await notesRepository.save(note);

    setNotes((items) => [note, ...items.filter((item) => item.id !== note.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async function removeNote(id: string) {
    await notesRepository.remove(id);

    if (supabase && navigator.onLine) {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        await supabase.from('sermon_notes').delete().eq('id', id).eq('user_id', data.user.id);
      }
    }

    setNotes((items) => items.filter((note) => note.id !== id));
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage notes={notes} />} />
      <Route path="/hymns" element={<HymnsPage />} />
      <Route path="/hymn/:number" element={<HymnPage notes={notes} />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/notes" element={<NotesPage notes={notes} />} />
      <Route path="/notes/new" element={<NoteEditor notes={notes} save={saveNote} />} />
      <Route path="/notes/:id" element={<NotePage notes={notes} remove={removeNote} />} />
      <Route path="/notes/:id/edit" element={<NoteEditor notes={notes} save={saveNote} />} />
      <Route path="/scripture" element={<ScripturePage notes={notes} />} />
      <Route path="/scripture/:book/:chapter" element={<ScripturePage notes={notes} />} />
      <Route path="*" element={<HymnsPage />} />
    </Routes>
  );
}

// Starts the app router.
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
