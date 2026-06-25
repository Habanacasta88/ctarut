// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SITE = 'https://labradores.org';

// Mapa URL -> fecha real de última modificación (modified || date) tomada de los
// datos migrados de WordPress. Evita el lastmod falso (idéntico = fecha del build),
// que hace que Google deje de confiar en el campo para todo el dominio.
const readJson = (rel) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const dataEntries = [
  ...readJson('./src/data/posts.json'),
  ...readJson('./src/data/pages.json'),
];
const lastmodByUrl = new Map();
let newest = '1970-01-01T00:00:00';
for (const entry of dataEntries) {
  const when = entry.modified || entry.date;
  if (!entry.slug || !when) continue;
  lastmodByUrl.set(`${SITE}/${entry.slug}/`, when);
  if (when > newest) newest = when;
}
const toIso = (when) => new Date(when).toISOString();

// La paginación de blog con noindex (página > 5, ver src/pages/blog/[page].astro)
// NO debe entrar al sitemap: incluir URLs noindex degrada la confianza del sitemap.
const isNoindexBlogPage = (url) => {
  const match = url.match(/\/blog\/(\d+)\/?$/);
  return match ? Number(match[1]) > 5 : false;
};

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      filter: (url) => !isNoindexBlogPage(url),
      serialize(item) {
        // lastmod real por URL; para home/listados/categorías, la fecha del
        // contenido más reciente (refleja cuándo cambió realmente el listado).
        item.lastmod = toIso(lastmodByUrl.get(item.url) ?? newest);
        // changefreq y priority eliminados a propósito: Google los ignora.
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
