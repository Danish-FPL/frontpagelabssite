// sitefetch.mjs — read a prospect's own public website as plain text.
//
// This is the only thing the drafter looks at beyond the prospect's row. It is
// deliberately modest: one page, HTML only, 8 seconds, 1.5 MB, then stripped
// down to the words a human would read (title, description, headings, body)
// and capped at 6,000 characters. Nothing is stored except that text.

const MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_CHARS = 6000;
const TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&[a-z]+;/gi, ' ');

const squash = (s) => s.replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export function htmlToText(html) {
  let h = String(html || '');
  const meta = (name) => {
    const m = h.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || h.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
    return m ? decode(m[1]).trim() : '';
  };
  const title = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1];
  const description = meta('description') || meta('og:description');
  const siteName = meta('og:site_name');

  h = h.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|template|nav|footer|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, inner) => `\n## ${inner}\n`)
    .replace(/<(br|p|div|li|tr|section|article|header|h[4-6]|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const body = squash(decode(h));

  const head = [
    siteName ? `Site: ${siteName}` : '',
    title ? `Title: ${decode(title).trim()}` : '',
    description ? `Description: ${description}` : '',
  ].filter(Boolean).join('\n');

  return squash(head + '\n\n' + body).slice(0, MAX_CHARS);
}

/** Fetch and strip. Resolves to { text, status, error } and never throws. */
export async function fetchSiteText(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return { text: '', status: 0, error: 'No website on file' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal, redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'accept-language': 'en-US,en;q=0.8' },
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) return { text: '', status: res.status, error: `Site answered ${res.status}` };
    if (!/html|xml/i.test(type)) return { text: '', status: res.status, error: `Not an HTML page (${type.split(';')[0]})` };
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    try { await reader.cancel(); } catch { /* already closed */ }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(concat(chunks, size));
    const text = htmlToText(html);
    return text.length < 80
      ? { text, status: res.status, error: 'The page had almost no readable text (a JavaScript-only site, most likely)' }
      : { text, status: res.status, error: '' };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Site took longer than 8 seconds' : (e.cause?.code || e.message || 'fetch failed');
    return { text: '', status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks, size) {
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}
