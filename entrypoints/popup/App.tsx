import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { browser } from 'wxt/browser';
import {
  Bookmark,
  Check,
  ChevronRight,
  Download,
  Globe,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SearchX,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  categoryStyle,
  deleteBookmark,
  getBookmarks,
  hostOf,
  insertBookmark,
  mergeBookmarks,
  normalizeUrl,
  parseImport,
  setBookmarks,
  updateBookmark,
  urlKey,
  type Bookmark as BookmarkType,
  type BookmarkInput,
  type TabInfo,
} from '@/utils/bookmarks';
import { useBookmarks } from './hooks/useBookmarks';
import { BookmarkCard } from './components/BookmarkCard';
import { BookmarkDialog } from './components/BookmarkDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast, type ToastState } from './components/Toast';

type DialogState =
  | { type: 'add'; tab: TabInfo | null }
  | { type: 'edit'; bookmark: BookmarkType }
  | null;

const ALL_CATEGORY = 'All';

function bookmarkCount(count: number): string {
  return `${count} ${count === 1 ? 'bookmark' : 'bookmarks'}`;
}

export default function App() {
  const { bookmarks, loading, refresh } = useBookmarks();
  const version = browser.runtime.getManifest().version;
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pendingDelete, setPendingDelete] = useState<BookmarkType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (message: string, tone: ToastState['tone'] = 'success') => {
      setToast({ id: Date.now(), message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (!mounted) return;
        const normalized = tab?.url ? normalizeUrl(tab.url) : null;
        if (normalized) {
          setActiveTab({
            title: tab?.title?.trim() || hostOf(normalized),
            url: normalized,
          });
        }
        setTabLoading(false);
      })
      .catch(() => {
        if (mounted) setTabLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bookmark of bookmarks) {
      counts.set(bookmark.category, (counts.get(bookmark.category) ?? 0) + 1);
    }

    const order = new Map<string, number>(
      DEFAULT_CATEGORIES.map((category, index) => [category, index]),
    );
    const items = Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => {
        const aOrder = order.get(a.name);
        const bOrder = order.get(b.name);
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        return b.count - a.count || a.name.localeCompare(b.name, 'zh-CN');
      },
    );

    return [{ name: ALL_CATEGORY, count: bookmarks.length }, ...items];
  }, [bookmarks]);

  useEffect(() => {
    if (!categories.some((category) => category.name === activeCategory)) {
      setActiveCategory(ALL_CATEGORY);
    }
  }, [activeCategory, categories]);

  const visibleBookmarks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return bookmarks.filter((bookmark) => {
      if (activeCategory !== ALL_CATEGORY && bookmark.category !== activeCategory) {
        return false;
      }
      if (!keyword) return true;
      return [
        bookmark.title,
        bookmark.url,
        hostOf(bookmark.url),
        bookmark.category,
        bookmark.note,
        ...bookmark.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [activeCategory, bookmarks, query]);

  const activeBookmark = useMemo(() => {
    if (!activeTab) return undefined;
    const key = urlKey(activeTab.url);
    return bookmarks.find((bookmark) => urlKey(bookmark.url) === key);
  }, [activeTab, bookmarks]);

  const suggestions = useMemo(() => {
    const extra = bookmarks.map((bookmark) => bookmark.category);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...extra]));
  }, [bookmarks]);

  const openBookmark = useCallback((bookmark: BookmarkType) => {
    void browser.tabs.create({ url: bookmark.url });
    window.close();
  }, []);

  const openAddDialog = () => {
    if (!activeTab) return;
    setDialog({ type: 'add', tab: activeTab });
  };

  const handlePrimaryAction = () => {
    if (tabLoading) return;
    if (activeBookmark) {
      setDialog({ type: 'edit', bookmark: activeBookmark });
    } else {
      openAddDialog();
    }
  };

  async function handleSave(input: BookmarkInput) {
    if (dialog?.type === 'edit') {
      await updateBookmark(dialog.bookmark.id, input);
      showToast('Bookmark updated');
    } else {
      const result = await insertBookmark(input);
      showToast(result.existed ? 'Already on your shelf' : 'Saved to your shelf');
    }
    await refresh();
    setDialog(null);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteBookmark(pendingDelete.id);
      await refresh();
      setPendingDelete(null);
      showToast('Removed from your shelf');
    } catch {
      showToast("Couldn't delete. Try again.", 'error');
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      app: 'shelf',
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shelf-bookmarks-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMenuOpen(false);
    showToast(`Exported ${bookmarkCount(bookmarks.length)}`);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMenuOpen(false);
    try {
      const incoming = parseImport(await file.text());
      if (incoming.length === 0) {
        showToast('No bookmarks found in this backup', 'error');
        return;
      }

      const current = await getBookmarks();
      const merged = mergeBookmarks(current, incoming);
      await setBookmarks(merged.bookmarks);
      await refresh();
      showToast(
        `Imported ${bookmarkCount(merged.imported)}${
          merged.skipped > 0
            ? ` · Skipped ${merged.skipped} duplicate${merged.skipped === 1 ? '' : 's'}`
            : ''
        }`,
      );
    } catch {
      showToast('Import failed. Choose a valid backup file.', 'error');
    }
  }

  const primaryDisabled = tabLoading || !activeTab;

  return (
    <div className="relative flex h-[600px] w-[400px] flex-col overflow-hidden bg-paper text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-50/90 via-brand-50/30 to-transparent" />

      <header className="relative z-30 flex shrink-0 items-center gap-3 px-5 pb-3 pt-5">
        <div className="relative">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-stone-900 text-brand-300 shadow-[0_8px_18px_-8px_rgb(28_25_23_/_0.55)] ring-1 ring-white/10">
            <Bookmark className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={1.5} />
          </span>
          <Sparkles className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-brand-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold tracking-tight text-stone-900">
              Shelf
            </h1>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9.5px] font-medium text-stone-500 ring-1 ring-stone-200/80">
              {bookmarks.length} saved
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] tracking-wide text-stone-400">
            <span className="truncate">Good sites, kept close.</span>
            <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-stone-300" />
            <span className="shrink-0 text-[9.5px] font-medium text-stone-400/80">
              v{version}
            </span>
          </p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-xl border border-stone-200/80 bg-white/75 text-stone-500 shadow-sm transition hover:border-stone-300 hover:bg-white hover:text-stone-900"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="animate-rise-in absolute right-0 top-10 z-40 w-48 rounded-2xl border border-stone-200/80 bg-white/95 p-1.5 shadow-pop backdrop-blur"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                onClick={() => {
                  setDialog({ type: 'add', tab: null });
                  setMenuOpen(false);
                }}
              >
                <Plus className="h-3.5 w-3.5 text-stone-400" />
                Add a website
              </button>
              <div className="mx-1 my-1 border-t border-stone-100" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5 text-stone-400" />
                Export bookmarks
                <span className="ml-auto text-[9.5px] font-normal text-stone-300">
                  {bookmarks.length}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                onClick={() => importRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 text-stone-400" />
                Import backup
              </button>
              <div className="mx-1 my-1 border-t border-stone-100" />
              <div className="px-2 py-1.5">
                <p className="flex items-center justify-between text-[9px] text-stone-400">
                  <span>Quick save</span>
                  <kbd className="rounded border border-stone-200 bg-stone-50 px-1 py-0.5 font-sans text-[8px] text-stone-400">
                    Alt+Shift+S
                  </kbd>
                </p>
                <p className="mt-1 text-[9px] text-stone-300">Stored on this device</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 shrink-0 px-5 pt-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-stone-200/80 bg-white/85 pl-9 pr-8 text-[12px] text-stone-800 shadow-[0_1px_2px_rgb(28_25_23_/_0.03)] outline-none transition placeholder:text-stone-300 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100/70"
            placeholder="Search bookmarks, tags, or notes"
            aria-label="Search bookmarks"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {categories.map((category) => {
            const active = category.name === activeCategory;
            const style = categoryStyle(category.name);
            return (
              <button
                key={category.name}
                type="button"
                className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-medium transition ${
                  active
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white/75 text-stone-500 ring-1 ring-inset ring-stone-200/80 hover:bg-white hover:text-stone-800'
                }`}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name !== ALL_CATEGORY && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
                      active ? 'ring-2 ring-white/20' : ''
                    }`}
                  />
                )}
                <span>{category.name}</span>
                <span
                  className={`text-[9px] ${
                    active ? 'text-white/45' : 'text-stone-300'
                  }`}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="no-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto px-5 pb-[92px] pt-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-stone-200/60 bg-white/60 p-3"
              >
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-xl bg-stone-200/70" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-2.5 w-2/3 rounded-full bg-stone-200/80" />
                    <div className="h-2 w-1/3 rounded-full bg-stone-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleBookmarks.length > 0 ? (
          <ul className="space-y-2">
            {visibleBookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onOpen={openBookmark}
                onEdit={(item) => setDialog({ type: 'edit', bookmark: item })}
                onDelete={setPendingDelete}
              />
            ))}
          </ul>
        ) : bookmarks.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm ring-1 ring-stone-200/70">
              <Bookmark className="h-6 w-6" strokeWidth={1.5} />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-4 w-4 text-brand-400" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-stone-800">
              Your shelf is empty
            </p>
            <p className="mt-1.5 max-w-[230px] text-[11px] leading-relaxed text-stone-400">
              When you find a site worth keeping, save it here and come back anytime.
            </p>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-stone-300 shadow-sm ring-1 ring-stone-200/70">
              <SearchX className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-stone-800">
              No matches found
            </p>
            <p className="mt-1.5 text-[11px] text-stone-400">
              Try a different keyword or category.
            </p>
            <button
              type="button"
              className="mt-3 rounded-full bg-white px-3 py-1.5 text-[10.5px] font-medium text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50"
              onClick={() => {
                setQuery('');
                setActiveCategory(ALL_CATEGORY);
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper/95 to-transparent px-5 pb-4 pt-8">
        <button
          type="button"
          className={`pointer-events-auto flex h-11 w-full items-center gap-2 rounded-[15px] px-3.5 text-[12px] font-semibold transition ${
            primaryDisabled
              ? 'bg-stone-200 text-stone-400 shadow-none'
              : 'bg-stone-900 text-white shadow-[0_10px_24px_-12px_rgb(28_25_23_/_0.6)] hover:bg-stone-800 active:scale-[0.995]'
          }`}
          onClick={handlePrimaryAction}
          disabled={primaryDisabled}
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-lg ${
              primaryDisabled
                ? 'bg-white/50 text-stone-400'
                : activeBookmark
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-white/10 text-brand-300'
            }`}
          >
            {tabLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : !activeTab ? (
              <Globe className="h-3.5 w-3.5" />
            ) : activeBookmark ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </span>
          <span className="truncate">
            {tabLoading
              ? 'Checking this page...'
              : !activeTab
                ? "This page can't be saved"
                : activeBookmark
                  ? 'Saved to your shelf'
                  : 'Save this page'}
          </span>
          {!primaryDisabled && (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] font-normal text-white/45">
              {activeBookmark ? 'Edit' : 'Add details'}
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </button>
      </div>

      {dialog && (
        <BookmarkDialog
          key={
            dialog.type === 'edit'
              ? dialog.bookmark.id
              : dialog.tab?.url ?? 'manual-add'
          }
          bookmark={dialog.type === 'edit' ? dialog.bookmark : undefined}
          tab={dialog.type === 'add' ? dialog.tab : null}
          categories={suggestions}
          existing={bookmarks}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete bookmark?"
          description={`“${pendingDelete.title}” will be removed from your shelf. This can't be undone.`}
          busy={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
          onConfirm={() => void handleDelete()}
        />
      )}

      {toast && <Toast toast={toast} />}

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />
    </div>
  );
}
