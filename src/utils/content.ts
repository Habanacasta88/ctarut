/** Strip WordPress block comments and shortcodes from HTML */
export function cleanWpContent(html: string): string {
  return html
    // Remove WP block comments
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
    // Remove shortcodes like [su_button ...] ... [/su_button]
    .replace(/\[su_[^\]]*\][^[]*\[\/su_[^\]]*\]/g, '')
    .replace(/\[su_[^\]]*\/?\]/g, '')
    // Fix internal links to new structure
    .replace(/https?:\/\/ctarut\.com\//g, '/')
    // Clean up excess whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract headings from HTML for TOC */
export function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const regex = /<h([23])[^>]*>(?:<strong>)?(.*?)(?:<\/strong>)?<\/h[23]>/gi;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    headings.push({ id, text, level: parseInt(match[1]) });
  }

  return headings;
}

/** Add IDs to headings in HTML */
export function addHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>((?:<strong>)?)(.*?)((?:<\/strong>)?)<\/h[23]>/gi, (_, level, attrs, openTag, text, closeTag) => {
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    const id = plainText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `<h${level} id="${id}"${attrs}>${openTag}${text}${closeTag}</h${level}>`;
  });
}

/** Generate a short excerpt from HTML */
export function generateExcerpt(html: string, maxLength = 160): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
