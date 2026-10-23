import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookmarkPlus, Loader2, X } from 'lucide-react';
import {
  DEFAULT_CATEGORY,
  hostOf,
  normalizeUrl,
  parseTags,
  urlKey,
  type Bookmark,
  type BookmarkInput,
  type TabInfo,
} from '@/utils/bookmarks';
import { Favicon } from './Favicon';

interface BookmarkDialogProps {
  bookmark?: Bookmark;
  tab?: TabInfo | null;
  categories: string[];
  existing: Bookmark[];
  onClose: () => void;
  onSave: (input: BookmarkInput) => Promise<void>;
}

const inputClass =
  'h-9 w-full rounded-xl border border-stone-200 bg-white px-3 text-[12px] text-stone-900 outline-none transition placeholder:text-stone-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100/70';

export function BookmarkDialog({
  bookmark,
  tab,
  categories,
  existing,
  onClose,
  onSave,
}: BookmarkDialogProps) {
  const [title, setTitle] = useState((bookmark?.title ?? tab?.title ?? '').slice(0, 120));
  const [url, setUrl] = useState(bookmark?.url ?? tab?.url ?? '');
  const [category, setCategory] = useState(bookmark?.category ?? DEFAULT_CATEGORY);
  const [tags, setTags] = useState(bookmark?.tags.join(', ') ?? '');
  const [note, setNote] = useState(bookmark?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => normalizeUrl(url), [url]);
  const previewTitle = title.trim() || (previewUrl ? hostOf(previewUrl) : 'New bookmark');
  const isEditing = Boolean(bookmark);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('Enter a valid URL, like https://example.com');
      return;
    }

    const duplicate = existing.find(
      (item) =>
        item.id !== bookmark?.id && urlKey(item.url) === urlKey(normalized),
    );
    if (duplicate) {
      setError(`Already saved as “${duplicate.title}”`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim() || hostOf(normalized),
        url: normalized,
        category: category.trim() || DEFAULT_CATEGORY,
        tags: parseTags(tags),
        note,
      });
    } catch {
      setError('Couldn\'t save. Try again.');
      setSaving(false);
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-end justify-center bg-stone-900/25 p-2 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmark-dialog-title"
        className="animate-rise-in w-full rounded-[22px] border border-white/70 bg-[#fdfcf9] p-4 shadow-pop"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600 ring-1 ring-brand-200/60">
            <BookmarkPlus className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="bookmark-dialog-title"
              className="text-[14px] font-semibold tracking-tight text-stone-900"
            >
              {isEditing ? 'Edit bookmark' : 'Save a website'}
            </h2>
            <p className="mt-0.5 truncate text-[10.5px] text-stone-400">
              {previewUrl ? hostOf(previewUrl) : 'A good site, worth keeping.'}
            </p>
          </div>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white/70 p-2">
            <Favicon
              url={previewUrl ?? 'https://example.com'}
              title={previewTitle}
              className="h-8 w-8 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium text-stone-700">
                {previewTitle}
              </p>
              <p className="truncate text-[10px] text-stone-400">
                {previewUrl ? hostOf(previewUrl) : 'Enter a URL to get started'}
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10.5px] font-medium text-stone-500">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Website name"
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10.5px] font-medium text-stone-500">URL</span>
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError('');
              }}
              className={inputClass}
              placeholder="https://example.com"
              spellCheck={false}
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-stone-500">Category</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
                placeholder="Uncategorized"
                list="shelf-categories"
                maxLength={20}
              />
              <datalist id="shelf-categories">
                {categories.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-stone-500">
                Tags
              </span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className={inputClass}
                placeholder="design, inspiration"
                maxLength={120}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[10.5px] font-medium text-stone-500">
              <span>Note</span>
              <span className="font-normal text-stone-300">{note.length}/240</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 240))}
              className="h-[54px] w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-stone-900 outline-none transition placeholder:text-stone-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100/70"
              placeholder="Why is it worth saving?"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10.5px] text-rose-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              className="h-9 flex-1 rounded-xl border border-stone-200 bg-white text-[11.5px] font-medium text-stone-600 transition hover:bg-stone-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-9 flex-[1.35] items-center justify-center gap-1.5 rounded-xl bg-stone-900 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60"
              disabled={saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add to shelf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
