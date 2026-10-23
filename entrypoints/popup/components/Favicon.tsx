import { useEffect, useState } from 'react';
import { faviconUrl, hostOf } from '@/utils/bookmarks';

interface FaviconProps {
  url: string;
  title: string;
  className?: string;
}

export function Favicon({ url, title, className = 'h-9 w-9 rounded-xl' }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(url);
  const letter = title.trim().charAt(0).toUpperCase() || hostOf(url).charAt(0).toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!src || failed) {
    return (
      <span
        className={`${className} grid shrink-0 place-items-center bg-gradient-to-br from-brand-100 to-amber-50 text-[13px] font-bold text-brand-600 ring-1 ring-brand-200/60`}
      >
        {letter}
      </span>
    );
  }

  return (
    <span
      className={`${className} grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-stone-200/80`}
    >
      <img
        src={src}
        alt=""
        className="h-5 w-5 object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
