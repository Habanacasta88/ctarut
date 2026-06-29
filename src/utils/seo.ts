export function resolveYear(text: string): string {
  return text.replace(/%%currentyear%%/g, new Date().getFullYear().toString());
}

export function stripEmojis(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '').trim();
}

const TITLE_BRAND = ' — Labradores.org';
const TITLE_MAX = 60;
// Conectores que no deben quedar colgando al final de un título recortado.
const TRAILING_STOPWORDS = new Set([
  'y', 'o', 'u', 'e', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'con',
  'para', 'por', 'en', 'a', 'que', 'su', 'sus', 'al', 'lo', 'les', 'como', 'tras',
  'través', 'sobre', 'hacia', 'desde', 'entre', 'hasta', 'sin', 'bajo',
]);

const trimTail = (text: string): string =>
  text.replace(/[\s\-–|:,;.]+$/u, '').trim();

// Corta un título largo en el límite de cláusula más adecuado que quepa en `max`.
function shortenTitle(title: string, max: number): string {
  const text = title.trim();
  if (text.length <= max) return text;

  // 1) Preferir un corte en separador de cláusula (? ! : | – -  ". ").
  const separators = [/\?/g, /!/g, /:/g, /\|/g, /–/g, / - /g, /\. /g];
  let best = '';
  for (const re of separators) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const inclusive = match[0] === '?' || match[0] === '!';
      const end = inclusive ? match.index + 1 : match.index;
      const candidate = trimTail(text.slice(0, end));
      if (candidate.length <= max && candidate.length >= 25 && candidate.length > best.length) {
        best = candidate;
      }
    }
  }
  if (best) return best;

  // 2) Fallback: cortar por palabra sin dejar conectores colgando al final.
  let acc = '';
  for (const word of text.split(/\s+/)) {
    if ((acc ? acc + ' ' + word : word).length > max) break;
    acc = acc ? acc + ' ' + word : word;
  }
  const words = trimTail(acc).split(/\s+/);
  while (words.length > 1 && TRAILING_STOPWORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return trimTail(words.join(' ')) || text.slice(0, max);
}

// Construye el <title> óptimo (<=60): mantiene la marca si cabe, la quita si el
// título base ya llega al límite, y recorta en cláusula si el base es largo.
export function buildPageTitle(base: string): string {
  const text = (base || '').trim();
  if (!text) return 'Labradores.org';
  const withBrand = text + TITLE_BRAND;
  if (withBrand.length <= TITLE_MAX) return withBrand;
  if (text.length <= TITLE_MAX) return text;
  return shortenTitle(text, TITLE_MAX);
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateArticleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    ...(opts.image && { image: opts.image }),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: {
      '@type': 'Organization',
      name: opts.author || 'Labradores.org',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Labradores.org',
      url: 'https://labradores.org',
    },
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Labradores.org',
    url: 'https://labradores.org',
    description: 'Guía completa en español sobre el Labrador Retriever',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://labradores.org/?s={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}
