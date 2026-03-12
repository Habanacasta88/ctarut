export function resolveYear(text: string): string {
  return text.replace(/%%currentyear%%/g, new Date().getFullYear().toString());
}

export function stripEmojis(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '').trim();
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
      name: opts.author || 'CuentaRUT Chile',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CuentaRUT Chile',
      url: 'https://ctarut.com',
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
    name: 'CuentaRUT Chile',
    url: 'https://ctarut.com',
    description: 'Guía completa sobre la Cuenta RUT de BancoEstado Chile',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://ctarut.com/?s={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}
