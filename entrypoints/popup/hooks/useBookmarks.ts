import { useCallback, useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { BOOKMARKS_KEY, getBookmarks, type Bookmark } from '@/utils/bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getBookmarks();
    setBookmarks(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let mounted = true;

    void getBookmarks().then((next) => {
      if (!mounted) return;
      setBookmarks(next);
      setLoading(false);
    });

    const handleChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[BOOKMARKS_KEY]) return;
      void getBookmarks().then((next) => {
        if (mounted) setBookmarks(next);
      });
    };

    browser.storage.onChanged.addListener(handleChange);
    return () => {
      mounted = false;
      browser.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  return { bookmarks, loading, refresh };
}
