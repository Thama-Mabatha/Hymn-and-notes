# Nyimbo dza Vhatendi

Nyimbo dza Vhatendi is an offline-first digital Tshivenḓa hymnal and personal sermon archive designed for mobile worship. It combines fast hymn retrieval with private, structured church notes that can be rediscovered by scripture, pastor, topic, date and related hymn.

## Features

- Bundled, searchable hymn library imported from the provided Word document.
- Direct hymn links, real next/previous available-hymn navigation, favourites and recent hymns.
- Comfortable reader settings, themes, focus mode, sharing and installable PWA support.
- Local-first sermon notes with autosave to IndexedDB, scripture parsing, topics, pastors and hymn relationships.
- Scripture chapter index: `Psalm 27` and `Psalm 27:1-6` resolve to the same chapter.
- Optional Supabase email authentication and queued sync foundation. Hymns and local notes never require a login.
- JSON data export, Netlify SPA routing and no advertising or analytics.

## Screenshots

Add mobile and desktop screenshots here after deployment. Recommended captures: Home, hymn reader, sermon editor, scripture index and settings.

## Tech Stack

- React and TypeScript for the main app UI.
- Vite for local development and production builds.
- Custom CSS for the hymnal reading design.
- React Router for pages such as `/hymns`, `/hymn/:number`, `/notes` and `/scripture/:book/:chapter`.
- Lucide React for interface icons.
- IndexedDB through `idb` for sermon notes and old-note imports.
- localStorage for smaller things like favourites, recent hymns and reader settings.
- Supabase JavaScript client for optional auth and future note sync.
- vite-plugin-pwa for the installable app, manifest and service worker.
- Vitest, jsdom and fake-indexeddb for automated tests.
- Netlify for static hosting and SPA redirects.

## Architecture

`scripts/import-hymns.ts` extracts the DOCX into `src/data/hymns.json` at build time. The UI reads this static data entirely offline. Hymn preferences use localStorage; sermon notes use IndexedDB through `src/lib/notes-repository.ts`.

When configured, the sync path is: React UI -> IndexedDB -> `sync-service.ts` -> Supabase. Local storage is written first, so a failed request never destroys a note. The first conflict policy is documented last-write-wins via `updated_at`; production sync should also upsert scripture, topics and hymn join records in the same transactional adapter.

## Hymn Data Import

The DOCX is authoritative. The importer preserves raw words, punctuation and verse markers, splitting the source's tabbed two-column layout into ordered verses. It prints the number range, duplicates and warnings instead of silently discarding uncertain content.

```bash
npm run import:hymns
```

The current source imports 92 distinct hymns (numbers 2-234). The importer reports seven lines that appear before an explicit verse marker; they are retained as verse 1 and should be reviewed against the original Word layout before public release.

## Run Locally

```bash
npm install
npm run import:hymns
npm run dev
```

Run tests with `npm test`, and create a production bundle with `npm run build`.

## Supabase Setup

1. Create a Supabase project and enable email authentication.
2. Copy `.env.example` to `.env` and add only `VITE_SUPABASE_URL` and the public anon/publishable key.
3. Apply `supabase/migrations/20260901000000_sermon_archive.sql` through the Supabase CLI or SQL editor.
4. Start the app. Signed-out users remain in local mode; signing in enables the sync layer.

Row Level Security policies scope every note, reference, topic and hymn link to the authenticated owner. Never add a service-role key to a Vite environment variable.

## Netlify Deployment

Push the repository to a Git provider, create a Netlify site, then use build command `npm run build` and publish directory `dist`. `netlify.toml` includes the SPA redirect required for direct URLs such as `/hymn/65`.

## Privacy and Data Ownership

Sermon notes are private by default, are not indexed or included in social metadata, and are never sent to AI services. Export JSON in Settings to retain a portable backup.

## Roadmap

- Complete transactional syncing of note references, topics and hymn relationships.
- JSON restore flow and Markdown export.
- English translations when supplied by a licensed source.
- Optional licensed audio, cloud conflict UI, multiple hymn books and service set lists.

## Project Motivation

Physical and PDF hymn books are difficult to search during worship. This project modernises access to a traditional hymnal while creating a respectful private archive of the sermons and scripture that shape a person's worship life.
