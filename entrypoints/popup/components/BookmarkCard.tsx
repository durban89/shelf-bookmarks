import { ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { categoryStyle, hostOf, type Bookmark } from '@/utils/bookmarks';
import { Favicon } from './Favicon';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onOpen: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkCard({
  bookmark,
  onOpen,
  onEdit,
  onDelete,
}: BookmarkCardProps) {
  const style = categoryStyle(bookmark.category);
  const visibleTags = bookmark.tags.slice(0, 2);
  const extraTagCount = bookmark.tags.length - visibleTags.length;

  return (
    <li className="group relative rounded-2xl border border-stone-200/80 bg-white/90 p-3 shadow-[0_1px_2px_rgb(28_25_23_/_0.03)] transition duration-200 hover:-translate-y-px hover:border-brand-200 hover:shadow-[0_8px_20px_-12px_rgb(28_25_23_/_0.25)] focus-within:border-brand-200">
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        aria-label={`Open ${bookmark.title}`}
        onClick={() => onOpen(bookmark)}
      />

      <div className="pointer-events-none relative z-10 flex items-start gap-3">
        <Favicon url={bookmark.url} title={bookmark.title} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="line-clamp-1 text-[13px] font-semibold leading-5 text-stone-900">
                {bookmark.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-stone-400">
                <span className="truncate">{hostOf(bookmark.url)}</span>
                <ArrowUpRight className="h-2.5 w-2.5 shrink-0 opacity-0 transition group-hover:opacity-70" />
              </p>
            </div>

            <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                title="Edit"
                aria-label={`Edit ${bookmark.title}`}
                onClick={() => onEdit(bookmark)}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Delete"
                aria-label={`Delete ${bookmark.title}`}
                onClick={() => onDelete(bookmark)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${style.chip}`}
            >
              <span className={`h-1 w-1 rounded-full ${style.dot}`} />
              {bookmark.category}
            </span>
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-[88px] truncate text-[10px] text-stone-400"
              >
                #{tag}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span className="text-[10px] text-stone-400">+{extraTagCount}</span>
            )}
          </div>

          {bookmark.note && (
            <p className="mt-2 line-clamp-2 text-[11px] leading-[1.55] text-stone-500">
              {bookmark.note}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
