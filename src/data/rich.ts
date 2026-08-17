// The tiny markdown subset the Hero Lab writes into copy fields.
//
//   **bold**   → <strong>
//   *italic*   → <em>
//   ~blue~     → <span class="text-blue">   (the site's cyan accent)
//
// This module renders it at build time; `hero-lab/injector.js` renders the
// exact same subset in the browser when the lab previews an unsaved edit.
// If one side gains a marker, the other has to gain it too or the preview
// stops matching the page.

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Render the copy-field markdown subset to HTML. Text is escaped first, so
 *  only the markers below can ever produce tags. */
export function richToHtml(md: string | null | undefined): string {
  if (!md) return '';
  return escapeHtml(md)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~([^~]+)~/g, '<span class="text-blue">$1</span>');
}

/** Strip the markers — for <title>, meta descriptions and char counts. */
export function richToPlain(md: string | null | undefined): string {
  if (!md) return '';
  return md.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/~([^~]+)~/g, '$1');
}
