import { browser } from 'wxt/browser';
import {
  BOOKMARKS_KEY,
  DEFAULT_CATEGORY,
  normalizeUrl,
  insertBookmark,
} from '@/utils/bookmarks';
import { updateBadge } from '@/utils/badge';

const MENU_ID = 'shelf-save-page';

async function saveTab(
  title: string | undefined,
  rawUrl: string | undefined,
): Promise<boolean> {
  const url = rawUrl ? normalizeUrl(rawUrl) : null;
  if (!url) return false;

  const result = await insertBookmark({
    title: title?.trim() || new URL(url).hostname,
    url,
    category: DEFAULT_CATEGORY,
    tags: [],
    note: '',
  });

  await updateBadge();
  if (!result.existed) {
    await browser.action.setBadgeBackgroundColor({ color: '#16a34a' });
    await browser.action.setBadgeText({ text: '✓' });
    setTimeout(() => {
      void updateBadge();
    }, 1400);
  }
  return !result.existed;
}

async function createContextMenu(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: MENU_ID,
    title: 'Save this page to Shelf',
    contexts: ['page'],
  });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void createContextMenu();
    void updateBadge();
  });

  browser.runtime.onStartup.addListener(() => {
    void updateBadge();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID) return;
    void saveTab(tab?.title, tab?.url);
  });

  browser.commands.onCommand.addListener((command) => {
    if (command !== 'save-current-tab') return;
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => saveTab(tab?.title, tab?.url));
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[BOOKMARKS_KEY]) {
      void updateBadge();
    }
  });

  void updateBadge();
});
