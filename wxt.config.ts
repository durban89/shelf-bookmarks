import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Shelf — Save Good Websites',
    description: 'Save good websites with categories, tags, notes, search, and backups.',
    version: '1.0.0',
    permissions: ['storage', 'activeTab', 'contextMenus'],
    action: {
      default_title: 'Shelf — Save Good Websites',
    },
    commands: {
      'save-current-tab': {
        suggested_key: {
          default: 'Alt+Shift+S',
          mac: 'Alt+Shift+S',
        },
        description: 'Save the current page',
      },
    },
  },
});
