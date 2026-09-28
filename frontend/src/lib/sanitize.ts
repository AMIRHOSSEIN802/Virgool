import DOMPurify from 'isomorphic-dompurify';

/**
 * R-03 — the stored-HTML sanitization boundary for blog content.
 *
 * Persisted blog HTML (Tiptap output, stored verbatim by the API) is
 * untrusted input: publishing (R-02) makes it reachable by every reader.
 * Everything that is rendered as HTML must pass through `sanitizeBlogHtml`
 * immediately before it reaches the DOM.
 *
 * The allowlist mirrors what the editor can actually produce (StarterKit +
 * Link + Image + TextAlign) so legitimate formatting survives, while scripts,
 * event-handler attributes, dangerous elements and non-http(s) URLs are
 * removed by DOMPurify.
 *
 * `isomorphic-dompurify` wraps DOMPurify with a jsdom window on the server and
 * the native window in the browser, so the same rule set applies whether the
 * render happens during SSR or in the client.
 */

const ALLOWED_TAGS = [
  // block structure
  'p',
  'div',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  // inline formatting
  'strong',
  'b',
  'em',
  'i',
  's',
  'strike',
  'del',
  'u',
  'mark',
  'sub',
  'sup',
  'span',
  // editor extensions
  'a',
  'img',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'style'];

// TextAlign emits `style="text-align: …"` — only that declaration survives.
const SAFE_TEXT_ALIGN = /^(?:left|right|center|justify|start|end)$/i;

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const style = node.getAttribute('style');
    if (style === null) return;
    const kept = style
      .split(';')
      .map((decl) => decl.trim())
      .filter((decl) => {
        const separator = decl.indexOf(':');
        if (separator === -1) return false;
        const property = decl.slice(0, separator).trim().toLowerCase();
        const value = decl.slice(separator + 1).trim();
        return property === 'text-align' && SAFE_TEXT_ALIGN.test(value);
      });
    if (kept.length > 0) {
      node.setAttribute('style', kept.join('; '));
    } else {
      node.removeAttribute('style');
    }
  });
}

/**
 * Returns HTML that is safe to inject with `dangerouslySetInnerHTML`.
 * Executable payloads (`<script>`, `on*` handlers, `javascript:` URLs,
 * `<iframe>`/`<svg>`/…, arbitrary CSS) never survive; the editor's legitimate
 * rich text (headings, lists, links, images, text-align, …) is preserved.
 */
export function sanitizeBlogHtml(html: string): string {
  if (!html) return '';
  installHooks();
  // Defaults already restrict URLs to http(s)/mailto/tel/relative (+ data:
  // images on <img>, which cannot execute); javascript:/vbscript:/data:text
  // — html are rejected on href/src.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
