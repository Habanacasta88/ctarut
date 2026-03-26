/** Strip WordPress cruft and fix URLs from HTML content */
export function cleanWpContent(html: string): string {
  return html
    // 1. Eliminar comentarios de bloques WP
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')

    // 2. Imágenes: wp-content/uploads → /images/ (con y sin dominio)
    //    Primero quitar sufijo de dimensiones WP: -123x456 antes de la extensión
    .replace(
      /https?:\/\/labradores\.org\/wp-content\/uploads\/([^\s"'<>?#]*?)(?:-\d+x\d+)?\.(jpg|jpeg|png|gif|webp|svg|ico)/gi,
      '/images/$1.$2'
    )
    // También URLs relativas /wp-content/uploads/
    .replace(
      /\/wp-content\/uploads\/([^\s"'<>?#]*?)(?:-\d+x\d+)?\.(jpg|jpeg|png|gif|webp|svg|ico)/gi,
      '/images/$1.$2'
    )

    // 3. Bloques oEmbed/embed de WP → eliminar completamente
    .replace(/<figure[^>]*?wp-block-embed[^>]*?>[\s\S]*?<\/figure>/gi, '')

    // 4. Botones su-button sin href → eliminar (shortcode content-egg sin URL)
    .replace(/<a[^>]*?class="[^"]*su-button[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')

    // 5. Links internos: quitar prefijo de categoría WP de hrefs
    //    https://labradores.org/blog/slug/ → /slug/
    //    https://labradores.org/cuidados/slug/ → /slug/
    .replace(
      /https?:\/\/labradores\.org\/(blog|cuidados|alimentacion|entrenamiento|cachorros|resenas|fotos-labrador-retriever)\//gi,
      '/'
    )

    // 6. Cualquier otra referencia al dominio
    .replace(/https?:\/\/labradores\.org\//g, '/')

    // 7. Añadir loading="lazy" a imágenes del body que no lo tengan
    .replace(/<img(?![^>]*loading=)/gi, '<img loading="lazy"')

    // 8. Normalizar espacios en blanco
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract headings for TOC */
export function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const regex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    headings.push({ id, text, level: parseInt(match[1]) });
  }
  return headings;
}

/** Add IDs to headings */
export function addHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (_, level, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
  });
}

/** Inject internal links into HTML content based on a keyword → slug map.
 *  - Only modifies text nodes (skips inside <a>, headings, <code>, <pre>)
 *  - Max `maxLinks` links per post, max 1 link per target slug
 *  - Longest phrases matched first (linkmap must be pre-sorted by phrase length desc)
 */
export function injectInternalLinks(
  html: string,
  linkmap: Array<{ phrase: string; slug: string; title: string }>,
  currentSlug: string,
  maxLinks = 5
): string {
  const PROTECTED = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'script', 'style', 'strong', 'em']);
  // We allow injection inside <strong>/<em> — remove them from protected
  const BLOCK_PROTECTED = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'script', 'style']);

  const injected = new Set<string>();
  let linksAdded = 0;

  // Split HTML into [text, tag, text, tag, ...] segments
  const segments = html.split(/(<[^>]+>)/);
  const openStack: string[] = [];
  const result: string[] = [];

  for (const seg of segments) {
    if (seg.startsWith('<')) {
      const tagMatch = seg.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
      const isClose = seg.startsWith('</');
      const isSelfClose = seg.endsWith('/>');

      if (!isClose && !isSelfClose && BLOCK_PROTECTED.has(tag)) {
        openStack.push(tag);
      } else if (isClose && BLOCK_PROTECTED.has(tag)) {
        const idx = openStack.lastIndexOf(tag);
        if (idx !== -1) openStack.splice(idx, 1);
      }
      result.push(seg);
      continue;
    }

    // Text node — only modify if not inside a protected block and still under limit
    if (openStack.length > 0 || linksAdded >= maxLinks || !seg.trim()) {
      result.push(seg);
      continue;
    }

    let text = seg;
    for (const item of linkmap) {
      if (linksAdded >= maxLinks) break;
      if (item.slug === currentSlug) continue;
      if (injected.has(item.slug)) continue;

      // Escape special regex chars in phrase
      const escaped = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word-boundary-like: must be surrounded by non-alphanumeric (handles Spanish accents)
      const re = new RegExp(`(?<![\\wáéíóúüñÁÉÍÓÚÜÑ])${escaped}(?![\\wáéíóúüñÁÉÍÓÚÜÑ])`, 'i');

      if (re.test(text)) {
        text = text.replace(re, (match) => {
          injected.add(item.slug);
          linksAdded++;
          return `<a href="/${item.slug}/">${match}</a>`;
        });
      }
    }
    result.push(text);
  }

  return result.join('');
}

/** Generate excerpt from HTML */
export function generateExcerpt(html: string, maxLength = 160): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
