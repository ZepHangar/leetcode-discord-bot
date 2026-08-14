/**
 * Minimal LeetCode statement HTML → Discord markdown converter.
 *
 * LeetCode statements use a fixed subset of HTML (`p`, `pre`, `code`,
 * `strong`, `em`, `ul`/`li`, `sup`/`sub`, `a`, `img`). This handles exactly
 * that subset; anything else is stripped to its text content. It is the
 * fallback path for the daily card when AI personalization is disabled or
 * fails — the AI path produces markdown directly.
 *
 * @module utils/htmlToMarkdown
 */

const ENTITY_REPLACEMENTS: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&times;': '×',
  '&le;': '≤',
  '&ge;': '≥',
  '&ne;': '≠',
  '&rarr;': '→',
};

function decodeEntities(text: string): string {
  return text.replace(/&[a-z]+;|&#\d+;/g, (entity) => ENTITY_REPLACEMENTS[entity] ?? entity);
}

/**
 * Convert a LeetCode statement HTML fragment to Discord markdown.
 *
 * @precondition `html` is the `question` field from leetcode-api (LeetCode markup).
 * @postcondition Returns trimmed markdown with no leftover HTML tags or entities.
 */
export function htmlToMarkdown(html: string): string {
  let out = html;

  // Extract <pre> blocks first (they hold the Input/Output/Explanation
  // examples) and render them as fenced code blocks.
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_match, body: string) => {
    const code = decodeEntities(body.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n')).trim();
    return `\n\`\`\`\n${code}\n\`\`\`\n`;
  });

  // Links become masked links.
  out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_match, url: string, text: string) => {
    return `[${text}](${url})`;
  });

  // Block-level structure.
  out = out.replace(/<br\s*\/?>/g, '\n');
  out = out.replace(/<\/li>/g, '\n');
  out = out.replace(/<\/(?:p|div|h[1-6]|ul|ol|blockquote|table|tr)>/g, '\n\n');
  out = out.replace(/<(?:p|div|h[1-6]|blockquote|table|tbody|tr|td|th)[^>]*>/g, '');
  out = out.replace(/<li[^>]*>/g, '- ');

  // Inline emphasis and code.
  out = out.replace(/<(?:strong|b)>/g, '**').replace(/<\/(?:strong|b)>/g, '**');
  out = out.replace(/<(?:em|i)>/g, '*').replace(/<\/(?:em|i)>/g, '*');
  out = out.replace(/<code[^>]*>/g, '`').replace(/<\/code>/g, '`');
  out = out.replace(/<sup>/g, '^').replace(/<\/sup>/g, '');
  out = out.replace(/<sub>/g, '_').replace(/<\/sub>/g, '');

  // Images carry no useful text for a text card.
  out = out.replace(/<img[^>]*>/g, '');

  // Anything left over: strip the tag, keep the text.
  out = out.replace(/<[^>]+>/g, '');
  out = decodeEntities(out);

  // Collapse blank-line runs and trailing whitespace.
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
