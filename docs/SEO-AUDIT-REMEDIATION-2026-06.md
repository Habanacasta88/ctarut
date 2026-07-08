# SEO — Auditoría y remediación (junio 2026)

> **Estado:** contenido **desplegado en producción y verificado** el 2026-06-29.
> **Rama:** `seo/fix-criticos-2026-06-24` (8 commits) · **PR:** [#2](https://github.com/Habanacasta88/labradores/pull/2)
> **Pendiente:** configuración en Cloudflare (redirects/headers), autor/redes, política IA.

---

## 1. Perfil del sitio

| | |
|---|---|
| Dominio | labradores.org |
| Tipo | Contenido + afiliación Amazon + AdSense (`ca-pub-1887931946230317`), español |
| Stack | **Astro 6 (SSG estático)** → build a `dist/` |
| Servido por | Contenedor `nginx:alpine` detrás de **Cloudflare** (no WordPress) |
| Escala | **485 URLs** (458 posts + 4 páginas + categorías/blog) |
| Repo | `github.com/Habanacasta88/labradores` |
| Build | **Node ≥ 22.12** (Astro 6). En el Mac: `nvm use 22` |

---

## 2. Auditoría (4 agentes especializados)

| Dimensión | Score | Resumen |
|---|---|---|
| Técnico | 58/100 | 3 críticos de canonicalización/redirección + headers ausentes |
| Schema | — | Logo del publisher en 404 → invalidaba rich results de Article en todo el sitio |
| Sitemap | — | `lastmod` falso (idéntico) + 10 URLs `noindex` dentro del sitemap |
| GEO / IA | 40/100 | `llms.txt` abierto pero robots bloquea TODA IA (contradicción) |
| Contenido on-page | Bueno | Profundidad correcta; **83 % de títulos >60 chars** |

---

## 3. Hallazgos y remediación

### CRÍTICOS

| ID | Hallazgo | Acción | Estado |
|---|---|---|---|
| **C1** | `Organization/publisher.logo` → `/images/labradores-favicon.png` (**404**) invalidaba los rich results de Article en todo el sitio | Logo real **512×512** (`cropped-Logotipo-Icono-Circular-Animales-y-Mascotas-Azul.png`) + `@id` + `width/height`; favicon roto → `favicon.ico`+`favicon.svg` | ✅ **en vivo** |
| **C2** | `author` = `Organization` | Reclasificado: **Google acepta `Organization`** (no bloquea rich results). El bloqueante real era C1. Subir E-E-A-T con autor `Person` real queda **pendiente de datos** | ⏳ datos |
| **C3** | `http→https` = **307/302** (temporal, no transfiere PageRank) | Fijar **301** en Cloudflare (Always Use HTTPS) | ⏳ Cloudflare |
| **C4** | `www.labradores.org` sirve **200** (no redirige) | Redirect 301 www→non-www. *(El `nginx.conf` del repo ya lo hace, pero prod usa config por defecto → se hace en Cloudflare.)* | ⏳ Cloudflare |
| **C5** | Cadena triple en `/blog` (`/blog`→301→**http**://blog/→307→https) | `absolute_redirect off` en `nginx.conf` (en código). Como prod usa nginx por defecto, se resuelve junto con C3 en Cloudflare | ⏳ Cloudflare |

### HIGH (resueltos en código y desplegados salvo nota)

- **Títulos >60 chars** (385/462): `buildPageTitle()` recorta en límite de cláusula conservando marca y `headline`. → **0/485 >60**. ✅ en vivo
- **`lastmod` falso**: ahora fecha real por URL (`modified||date`), **420 valores distintos**. ✅ en vivo
- **URLs `noindex` en el sitemap** (`/blog/6-15`): excluidas vía `filter`. ✅ en vivo
- **`Article.image` string → `ImageObject`** con dimensiones reales (sharp, prebuild; clave NFC). 444 ImageObject. ✅ en vivo
- **6 imágenes destacadas rotas** (404 en hero+og): reapuntadas al fichero real. ✅ en vivo
- **Headers de seguridad ausentes** (HSTS, X-Content-Type-Options, Referrer-Policy, CSP): → **Cloudflare**. ⏳
- **`sameAs` vacío** + **AboutPage sin Person**: pendiente de datos reales. ⏳
- **LCP**: 1ª imagen de la home con `loading="lazy"`; imágenes solo JPEG (sin WebP/AVIF). ⏳ (no abordado)
- **`dateModified` = `datePublished`** en posts viejos; **respuestas FAQ truncadas** en página de salud (YMYL). ⏳ (contenido)

### MEDIUM / LOW
- `changefreq`/`priority` eliminados del sitemap (Google los ignora). ✅
- `/blog/` vs `/categoria/blog/` duplicados; paginación indexable; `@id` en nodos; `CollectionPage` sin `ItemList`; IndexNow; índice de sitemap innecesario. ⏳ (no abordados; bajo impacto)
- Limpieza de fuga de marca **`ctarut.com`** (código muerto heredado del proyecto hermano). ✅

---

## 4. Cambios de código (8 commits)

| Commit | Resumen |
|---|---|
| `7b8c97b` | Críticos: logo Organization, `absolute_redirect`+HSTS+guard paginación nginx, limpieza ctarut |
| `e2472ca` | Sitemap: `lastmod` real, excluir `noindex`, sin `changefreq/priority` |
| `b78d8e6` | Títulos ≤60 con corte en cláusula |
| `0674dc9` | `Article.image` → `ImageObject` (sharp prebuild) |
| `cf562b9` | Normalización NFC de claves de imagen (tildes/ñ) |
| `c438d5f` | 4 `featuredImage` rotas → fichero real |
| `2c98af0` | 2 últimas imágenes (Dudley / histórica) → 0 rotas |
| `a293241` | Guardas defensivas de code-review (título vacío, `readdir` ausente) |

**Revisiones previas al deploy:** security-review y code-review → **ambos APPROVE** (0 CRITICAL, 0 HIGH).

---

## 5. Arquitectura de despliegue (descubierta por SSH)

> ⚠️ **NO es Coolify ni git-deploy.** Es un montaje manual.

- Contenedor **`labradores` = `nginx:alpine` puro** (mismo image ID que la base), en la red Docker `coolify`, enrutado por **labels Traefik** para `Host(labradores.org) || Host(www.labradores.org)`.
- Sirve un **bind mount de solo lectura**: `/mnt/data/labradores.org` → `/usr/share/nginx/html`.
- Usa la **config nginx POR DEFECTO** (el `nginx.conf` del repo **no está montado**).

**Implicación clave:** subir el `dist` actualiza el contenido al instante, pero **los fixes de `nginx.conf` (C4/C5/HSTS/headers) NO se aplican** porque ese fichero no se usa en prod. Esos fixes se hacen en **Cloudflare** (o reconfigurando el contenedor para montar la `nginx.conf`).

---

## 6. Runbook de despliegue

```bash
# 1) Build (requiere Node 22)
nvm use 22 && npm run build        # prebuild genera src/data/image-dims.json

# 2) Backup del estado actual (rollback)
ssh root@162.55.129.125 'cp -a /mnt/data/labradores.org /mnt/data/labradores.org.bak-AAAAMMDD'

# 3) Deploy: rsync SIN --delete, excluyendo robots.txt/llms.txt (política IA aparte)
rsync -avz --exclude='robots.txt' --exclude='llms.txt' \
  dist/ root@162.55.129.125:/mnt/data/labradores.org/

# Rollback si hace falta:
# ssh root@162.55.129.125 'rsync -a --delete /mnt/data/labradores.org.bak-AAAAMMDD/ /mnt/data/labradores.org/'
```

No hace falta reiniciar el contenedor: nginx sirve los ficheros estáticos del bind mount.

---

## 7. Verificación post-deploy (2026-06-29)

| Check | Resultado |
|---|---|
| Logo `cropped-…-Azul.png` (era 404) | **200** ✅ |
| `Organization.logo` en home | ImageObject 512×512 ✅ |
| `<title>` de `/collares-para-labrador/` | `Consejos para escoger el collar de tu labrador` (≤60) ✅ |
| `Article.image` | `ImageObject` con `width/height` ✅ |
| `/labrador-albino/` imagen | `Labrador-Dudley.jpg` ✅ |
| Sitemap `lastmod` distintos | **420** (era 1) ✅ |
| `robots.txt` | intacto (no tocado) ✅ |

Backup de rollback: `/mnt/data/labradores.org.bak-20260629`.

---

## 8. Pendiente

### En Cloudflare (no entra por rsync porque prod usa nginx por defecto)
1. **C3** — SSL/TLS → Edge Certificates → **"Always Use HTTPS" = On** (http→301).
2. **HSTS** — misma página → **"HTTP Strict Transport Security" → Enable** (max-age 6–12 meses, includeSubDomains).
3. **C4 www→non-www** — Rules → Redirect Rules → `Hostname equals www.labradores.org` → Dynamic redirect `concat("https://labradores.org", http.request.uri.path)`, **301**.
4. **Security headers** — Rules → Transform Rules → Modify Response Header (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`).

### De producto / contenido
- **`author` `Person` + `Organization.sameAs`**: requiere nombre/bio del autor + URLs de redes (no inventar — nicho YMYL salud canina).
- **Política IA / GEO**: hoy robots bloquea toda IA (GPTBot/ClaudeBot/Google-Extended) **y** existe `llms.txt` → "lo peor de ambos mundos". Para afiliación se recomienda **Opción A** (desbloquear IA + mejorar `llms.txt`).
- Opcionales de menor impacto: WebP/AVIF + `fetchpriority` en LCP, `@id` en todos los nodos, `CollectionPage` con `ItemList`, IndexNow, dedupe `/blog/` vs `/categoria/blog/`.

---

## 9. Notas técnicas

- **Algoritmo de títulos** (`src/utils/seo.ts` → `buildPageTitle`/`shortenTitle`): mantiene el sufijo ` — Labradores.org` si el conjunto cabe en 60; si no, usa el título base; si el base sigue >60, recorta en el primer separador de cláusula (`?`, `!`, `:`, `|`, `–`, `-`, `. `) que quepa, con fallback a corte por palabra sin conectores colgando. El `headline` del schema Article conserva el título completo.
- **Dimensiones de imagen** (`scripts/gen-image-dims.mjs`): sharp recorre `public/images`, escribe `src/data/image-dims.json` (`/images/x` → `[w,h]`) con **clave normalizada NFC** (los nombres con tildes difieren NFC↔NFD entre `posts.json` y el disco; sin NFC, ~89 imágenes con acentos perdían sus dimensiones). Corre como `prebuild` de npm. Imágenes sin dims → `Article.image` cae a string (URL válida).
- **Sitemap** (`astro.config.mjs`): `lastmod` por URL desde `posts.json`/`pages.json` (`modified||date`); home/listados usan la fecha del contenido más reciente; `filter` excluye `/blog/N/` con N>5 (paginación `noindex`).
- **6 imágenes rotas corregidas**: `mika.jpeg`, `Cuidados-para-un-labrador-senior.jpg`, `Frutas-seguras-para-nuestros-perros.jpg`, `labradores-son-agresivos.jpg` (variantes de nombre del fichero real) + `Labrador-Dudley.jpg` (albino) y `Mika-labrador-negro.jpeg` (perro de aguas de san juan) por decisión editorial.

---

## Referencias

- PR: https://github.com/Habanacasta88/labradores/pull/2
- Scripts: `scripts/gen-image-dims.mjs`
- Servidor: `root@162.55.129.125` · contenido en `/mnt/data/labradores.org` · backup `.bak-20260629`
