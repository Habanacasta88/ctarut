# Histórico de Migración: ctarut.com

> WordPress → Astro SSG | Marzo 2026

---

## Datos del proyecto

| Dato | Valor |
|------|-------|
| Dominio | ctarut.com |
| VPS IP | 168.119.125.218 |
| Coolify URL | http://168.119.125.218:8000 |
| GitHub Repo | https://github.com/Habanacasta88/ctarut |
| Páginas migradas | 29 pages + 21 posts = 50 contenidos |
| Imágenes | 77 |
| Páginas HTML generadas | 53 |
| Tiempo de build | < 30 segundos |
| SSL | Let's Encrypt (auto-renovación via Traefik) |
| DNS | Cloudflare (Solo DNS, sin proxy) |
| WordPress coexistente | aferioja.es (mismo VPS/Coolify) |

---

## Cronología de cambios

### 1. Creación del proyecto Astro

- Extraídos datos del SQL de WordPress: 29 páginas, 21 posts, 77 imágenes
- Generados `src/data/pages.json` y `src/data/posts.json` con contenido y metadata SEO
- Estructura: layouts, componentes (ArticleCard, Breadcrumbs, TableOfContents), utilidades SEO
- Estilos responsive en `global.css`
- Dockerfile multi-stage: Node 22 Alpine (build) → nginx Alpine (serve)
- `nginx.conf` con cache de assets, gzip, security headers, y fallback para SPA

### 2. Repositorio GitHub

- Repo creado: `https://github.com/Habanacasta88/ctarut`
- Branch: `main`
- `.gitignore` incluye `dist/`, `.astro/`, `node_modules/`, `.claude/`

### 3. Despliegue en Coolify

- Aplicación creada como **Public Repository** con **Build Pack: Dockerfile**
- URL de la app en Coolify: `http://168.119.125.218:8000/project/p4skcggkssokk8g0ssokw0sw/environment/is0gws0s40k0swsscs0gcoks/application/wkkg40008o4g4scswoksw8g8`
- **Ports Exposes:** 80
- **Domains:** `https://ctarut.com,https://www.ctarut.com`
- **Direction:** `Allow www & non-www.`

### 4. DNS en Cloudflare

- Registro A: `ctarut.com` → `168.119.125.218` (Solo DNS, nube gris)
- Registro A: `www` → `168.119.125.218` (Solo DNS, nube gris)
- Sin proxy de Cloudflare para permitir HTTP-01 challenge de Let's Encrypt

### 5. SSL / Let's Encrypt

- Certificado generado automáticamente por Traefik tras redeploy
- CN=ctarut.com, issuer=Let's Encrypt R13
- Válido hasta junio 2026 (auto-renovación)

---

## Problemas resueltos (en orden cronológico)

### P1: Grid de tarjetas no mostraba 3 columnas en desktop

**Causa:** `minmax(320px, 1fr)` demasiado ancho para container de 1100px.
**Fix:** Cambiar a `minmax(280px, 1fr)` en `global.css`.

### P2: Navegación desalineada verticalmente

**Causa:** Faltaba `align-items: center` en el flex container del header.
**Fix:** Agregar `align-items: center` en `.header-inner`.

### P3: Certificado SSL mostraba "TRAEFIK DEFAULT CERT"

**Causa:** Traefik no había generado el certificado. Necesita DNS propagado + redeploy.
**Fix:** Redeploy en Coolify → certificado Let's Encrypt generado en 2-3 minutos.

### P4: `www.ctarut.com` daba "503 No available server"

**Causa:** Campo Domains en Coolify solo tenía `https://ctarut.com`. Traefik no enrutaba www.
**Fix:** Actualizar Domains a `https://ctarut.com,https://www.ctarut.com` y redeploy.

### P5: "Set Direction" de Coolify no aplicaba el cambio

**Causa:** Bug en Coolify v4.0.0-beta.463. El diálogo de confirmación no aplicaba el cambio.
**Fix:** Implementar redirect www→non-www directamente en `nginx.conf`.

### P6: Redeploy creó una app duplicada

**Causa:** Botón "Redeploy" del menú Advanced creaba un recurso nuevo.
**Fix:** Usar "With rolling update if possible" para redesplegar correctamente.

### P7: Puerto 3000:3000 en Port Mappings

**Causa:** Texto placeholder (gris) en el campo, no un valor real.
**Fix:** Ignorar. Solo importa que Ports Exposes sea `80`.

### P8: Bucle de redirección 301 infinito

**Síntoma:** `https://ctarut.com/` redirigía a sí mismo en bucle. Navegador: `ERR_TOO_MANY_REDIRECTS`.

**Causa:** El bloque principal de nginx tenía `server_name _` (wildcard) sin `default_server`. Nginx capturaba todas las peticiones (incluidas www) en el bloque principal, generando un bucle con Traefik.

**Fix:** Cambiar a `server_name ctarut.com _` con `listen 80 default_server`:
```nginx
# ANTES (bucle):
server {
    listen 80;
    server_name _;
}

# DESPUÉS (correcto):
server {
    listen 80 default_server;
    server_name ctarut.com _;
}
```

---

## Commits realizados

| Commit | Mensaje | Cambios |
|--------|---------|---------|
| Initial | Astro static site for ctarut.com | Proyecto completo: layouts, componentes, datos, estilos, Dockerfile, nginx |
| `9f20194` | Redirect www.ctarut.com to ctarut.com via nginx | Añadido bloque server para www con `return 301` |
| `23ead1d` | Fix nginx redirect loop: make ctarut.com explicit server_name | Cambiado `server_name _` → `server_name ctarut.com _` con `default_server` |

---

## Configuración final de nginx.conf

```nginx
# Redirect www to non-www
server {
    listen 80;
    server_name www.ctarut.com;
    return 301 https://ctarut.com$request_uri;
}

server {
    listen 80 default_server;
    server_name ctarut.com _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets (1 año)
    location ~* \.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML pages - cache corto (1 hora)
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Fallback para rutas
    location / {
        try_files $uri $uri/index.html $uri.html /404.html =404;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # WordPress redirects (URLs antiguas con /wp-content/uploads/)
    location /wp-content/uploads/ {
        rewrite ^/wp-content/uploads/(.*)$ /images/$1 permanent;
    }
}
```

---

## Estado final verificado

```bash
# ctarut.com → 200 OK
curl -sk -o /dev/null -w "HTTP: %{http_code}\n" https://ctarut.com/
# HTTP: 200

# www.ctarut.com → 301 redirect a ctarut.com
curl -sk -D- -o /dev/null https://www.ctarut.com/ 2>&1 | grep -i location
# location: https://ctarut.com/

# SSL válido
# subject=CN = ctarut.com
# issuer=C = US, O = Let's Encrypt, CN = R13
```
