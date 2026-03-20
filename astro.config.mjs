// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://labradores.org',
  integrations: [
    sitemap({
      serialize(item) {
        // Añadir lastmod a todas las URLs (fecha actual del build)
        // para indicar a Google que el sitio se mantiene actualizado
        item.lastmod = new Date().toISOString().split('T')[0];
        // Priorizar la home y las categorías
        if (item.url === 'https://labradores.org/') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/categoria/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
  ],
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
