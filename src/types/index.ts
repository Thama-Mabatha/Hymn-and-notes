export type Hymn = {
  number: number;
  title: string;
  searchTitle: string;
  verses: { number: number; lines: string[] }[];
  refrain?: string[];
  tags?: string[];
  translations?: Record<string, { verses: { number: number; lines: string[] }[] }>;
  audio?: { instrumental?: string; vocal?: string };
};

export type ScriptureReference = {
  id: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  display: string;
};

export type SermonNote = {
  id: string;
  date: string;
  title?: string;
  pastor?: string;
  church?: string;
  service?: string;
  scriptureReferences: ScriptureReference[];
  topics: string[];
  relatedHymnNumbers: number[];
  content: string;
  personalReflection?: string;
  keyTakeaways?: string[];
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
  deletedAt?: string;
};

export type ReaderSettings = { textSize: 'small' | 'medium' | 'large' | 'xlarge'; spacing: 'compact' | 'comfortable' | 'spacious'; theme: 'system' | 'light' | 'dark'; focusMode: boolean };
