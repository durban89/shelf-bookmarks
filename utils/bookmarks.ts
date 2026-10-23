import { browser } from 'wxt/browser';

export const BOOKMARKS_KEY = 'shelf.bookmarks';
export const DEFAULT_CATEGORY = 'Uncategorized';
export const DEFAULT_CATEGORIES = [
  'AI',
  'Development',
  'Design',
  'Productivity',
  'Learning',
  'Life',
  DEFAULT_CATEGORY,
] as const;

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkInput {
  title: string;
  url: string;
  category: string;
  tags: string[];
  note: string;
}

export interface TabInfo {
  title: string;
  url: string;
}

const categoryPalette = [
  { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 ring-violet-100' },
  { dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-100' },
  { dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-100' },
  { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 ring-orange-100' },
  { dot: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
  { dot: 'bg-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100' },
];

export function categoryStyle(category: string) {
  const fixed: Record<string, number> = {
    AI: 0,
    Development: 1,
    Design: 2,
    Productivity: 3,
    Learning: 4,
    Life: 5,
    Uncategorized: 6,
  };
  const fixedIndex = fixed[category];
  const hash = Array.from(category || DEFAULT_CATEGORY).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return (
    categoryPalette[fixedIndex ?? hash % categoryPalette.length] ?? {
      dot: 'bg-stone-400',
      chip: 'bg-stone-50 text-stone-600 ring-stone-100',
    }
  );
}

export function normalizeUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value || /\s/.test(value)) return null;

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function urlKey(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}${path}${url.search}`;
  } catch {
    return raw.toLowerCase();
  }
}

export function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}

export function faviconUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,，、;；]/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

export function createBookmark(input: BookmarkInput): Bookmark {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    url: input.url,
    category: input.category.trim() || DEFAULT_CATEGORY,
    tags: input.tags,
    note: input.note.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
}

function sanitizeStored(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? normalizeUrl(record.url) : null;
    if (!url) return [];

    const createdAt =
      typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
        ? record.createdAt
        : Date.now();
    const updatedAt =
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : createdAt;

    return [
      {
        id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
        title:
          typeof record.title === 'string' && record.title.trim()
            ? record.title.trim()
            : hostOf(url),
        url,
        category:
          typeof record.category === 'string' && record.category.trim()
            ? record.category.trim()
            : DEFAULT_CATEGORY,
        tags: Array.isArray(record.tags)
          ? record.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8)
          : [],
        note: typeof record.note === 'string' ? record.note : '',
        createdAt,
        updatedAt,
      },
    ];
  });
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const result = await browser.storage.local.get(BOOKMARKS_KEY);
  return sortBookmarks(sanitizeStored(result[BOOKMARKS_KEY]));
}

export async function setBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await browser.storage.local.set({ [BOOKMARKS_KEY]: sortBookmarks(bookmarks) });
}

export async function insertBookmark(
  input: BookmarkInput,
): Promise<{ bookmark: Bookmark; existed: boolean }> {
  const current = await getBookmarks();
  const key = urlKey(input.url);
  const existing = current.find((bookmark) => urlKey(bookmark.url) === key);

  if (existing) {
    return { bookmark: existing, existed: true };
  }

  const bookmark = createBookmark(input);
  await setBookmarks([bookmark, ...current]);
  return { bookmark, existed: false };
}

export async function updateBookmark(
  id: string,
  input: BookmarkInput,
): Promise<Bookmark | null> {
  const current = await getBookmarks();
  const key = urlKey(input.url);
  const duplicate = current.find(
    (bookmark) => bookmark.id !== id && urlKey(bookmark.url) === key,
  );
  if (duplicate) {
    throw new Error('DUPLICATE_URL');
  }

  let updated: Bookmark | null = null;
  const next = current.map((bookmark) => {
    if (bookmark.id !== id) return bookmark;
    updated = {
      ...bookmark,
      title: input.title.trim() || hostOf(input.url),
      url: input.url,
      category: input.category.trim() || DEFAULT_CATEGORY,
      tags: input.tags,
      note: input.note.trim(),
      updatedAt: Date.now(),
    };
    return updated;
  });

  if (!updated) return null;
  await setBookmarks(next);
  return updated;
}

export async function deleteBookmark(id: string): Promise<void> {
  const current = await getBookmarks();
  await setBookmarks(current.filter((bookmark) => bookmark.id !== id));
}

function importedBookmark(value: unknown): Bookmark | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const url = typeof record.url === 'string' ? normalizeUrl(record.url) : null;
  if (!url) return null;

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title:
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : hostOf(url),
    url,
    category:
      typeof record.category === 'string' && record.category.trim()
        ? record.category.trim()
        : DEFAULT_CATEGORY,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8)
      : typeof record.tags === 'string'
        ? parseTags(record.tags)
        : [],
    note: typeof record.note === 'string' ? record.note.slice(0, 1000) : '',
    createdAt:
      typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
        ? record.createdAt
        : now,
    updatedAt: now,
  };
}

export function parseImport(raw: string): Bookmark[] {
  const parsed: unknown = JSON.parse(raw);
  const source =
    Array.isArray(parsed) || !parsed || typeof parsed !== 'object'
      ? parsed
      : (parsed as Record<string, unknown>).bookmarks;

  if (!Array.isArray(source)) {
    throw new Error('INVALID_IMPORT');
  }

  const seen = new Set<string>();
  return source.flatMap((item) => {
    const bookmark = importedBookmark(item);
    if (!bookmark) return [];
    const key = urlKey(bookmark.url);
    if (seen.has(key)) return [];
    seen.add(key);
    return [bookmark];
  });
}

export function mergeBookmarks(
  current: Bookmark[],
  incoming: Bookmark[],
): { bookmarks: Bookmark[]; imported: number; skipped: number } {
  const known = new Set(current.map((bookmark) => urlKey(bookmark.url)));
  const added: Bookmark[] = [];
  let skipped = 0;

  for (const bookmark of incoming) {
    const key = urlKey(bookmark.url);
    if (known.has(key)) {
      skipped += 1;
      continue;
    }
    known.add(key);
    added.push(bookmark);
  }

  return {
    bookmarks: sortBookmarks([...added, ...current]),
    imported: added.length,
    skipped,
  };
}
