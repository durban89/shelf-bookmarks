import { browser } from 'wxt/browser';
import { getBookmarks } from './bookmarks';

export async function updateBadge(count?: number): Promise<void> {
  const total = count ?? (await getBookmarks()).length;

  await browser.action.setBadgeBackgroundColor({ color: '#f97316' });
  await browser.action.setBadgeText({
    text: total > 0 ? (total > 99 ? '99+' : String(total)) : '',
  });
}
