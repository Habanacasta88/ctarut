# labradores.org

Sitio **Astro 6 (SSG estático)** de contenido + afiliación Amazon + AdSense sobre el Labrador Retriever, en español. ~485 URLs. Servido por un contenedor `nginx:alpine` detrás de Cloudflare.

## Build

- **Requiere Node ≥ 22.12** (Astro 6). En el Mac: `nvm use 22` antes de `npm run build`. Con Node 20 el build falla.
- `npm run build` ejecuta un `prebuild` (`scripts/gen-image-dims.mjs`, sharp) que genera `src/data/image-dims.json` con las dimensiones de las imágenes. Salida en `dist/`.

## Despliegue ⚠️

**NO es Coolify ni git-deploy.** Es un contenedor `nginx:alpine` **puro** que sirve un bind mount de solo lectura `/mnt/data/labradores.org` con **config nginx por defecto** (el `nginx.conf` del repo **NO se usa en prod**). Enrutado por labels Traefik en la red `coolify`.

```bash
nvm use 22 && npm run build
ssh root@162.55.129.125 'cp -a /mnt/data/labradores.org /mnt/data/labradores.org.bak-AAAAMMDD'   # backup
rsync -avz --exclude='robots.txt' --exclude='llms.txt' dist/ root@162.55.129.125:/mnt/data/labradores.org/
```

- Sin `--delete` (additivo). Excluir `robots.txt`/`llms.txt`: la política IA se gestiona aparte.
- No hay que reiniciar el contenedor; nginx sirve los ficheros nuevos al instante.
- **Redirects, HSTS y security headers van en Cloudflare**, no en este nginx (usa config por defecto).

## Estructura

- `src/pages/[slug].astro` — artículos (schema Article/FAQ/Breadcrumb inline).
- `src/pages/index.astro` — home (schema WebSite/Organization inline).
- `src/utils/seo.ts` — `buildPageTitle` (títulos ≤60). `src/utils/content.ts` — limpieza de contenido WP.
- `src/data/posts.json` / `pages.json` — contenido migrado de WordPress (fuente de verdad del contenido).
- `astro.config.mjs` — config de sitemap (`lastmod` real, exclusión de `noindex`).

## Documentación

- **Auditoría + remediación SEO + runbook completo:** [`docs/SEO-AUDIT-REMEDIATION-2026-06.md`](docs/SEO-AUDIT-REMEDIATION-2026-06.md)

## SEO — condiciones del proyecto

- Salida en **español**. Cumplir **WCAG AA** en cualquier cambio visual.
- **Principio Search Console**: no decidir por posición media; usar top-50 + clics/impresiones 28d vs 7d.
- Contenido a escala: gate anti-thin (mín. ~500 palabras únicas, dedup) antes de publicar.
