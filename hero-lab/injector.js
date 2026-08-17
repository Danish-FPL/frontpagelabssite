/**
 * injector.js — the ONE place that knows how to read a FrontPage Labs hero
 * out of the live DOM and write a variant back into it.
 *
 * Two callers, same code path (so they can never drift):
 *   • lab.html      — runs these functions against its same-origin iframe
 *   • /preview/<id> — the server appends this file to the real page with
 *                     window.__FPL_HERO_LAB__ set; the bootstrap at the
 *                     bottom applies the variant in place on a real phone.
 *
 * The DOM contract is the `data-fpl-*` attributes in
 * src/components/LandingHero.astro and src/pages/lp/[slug].astro.
 *
 * Plain script, no modules — exposes window.FplHeroLab.
 * All writes are textContent/createElement only (no innerHTML with copy).
 */
(function (global) {
  'use strict';

  /* Fields the lab may override. Everything else on a variant (id, name,
     slug, locked, description, title, metaDescription, indexable) is
     bookkeeping and never rendered into the hero. */
  var HERO_KEYS = [
    'headlineTop', 'headlineBottom', 'headlineAlign', 'eyebrow', 'listItems',
    'statLines', 'kicker', 'ctaText', 'ctaLabel', 'ctaHref', 'mediaMode',
    'mediaPoster', 'hlSize', 'hlLineHeight', 'hlTracking', 'statSize',
    'overlayTop', 'overlayBottom', 'minHeight',
  ];
  var OFFER_KEYS = [
    'offerEyebrow', 'offerHeading', 'offerBody', 'price', 'priceNote',
    'includes', 'showcaseEyebrow', 'showcase', 'finalCtaText',
  ];
  var EDIT_KEYS = HERO_KEYS.concat(OFFER_KEYS);
  var EDITABLE = {};
  EDIT_KEYS.forEach(function (k) { EDITABLE[k] = 1; });

  function norm(s) { return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim(); }

  /* ── The copy-field markdown subset ─────────────────────────
     **bold** / *italic* / ~blue~ — mirrored server-side in
     src/data/rich.ts. Add a marker in one place, add it in both. */
  var MD_RE = /(\*\*([^*]+)\*\*|\*([^*]+)\*|~([^~]+)~)/g;

  function mdTokens(md) {
    var tokens = [], last = 0, plain = 0, m;
    function push(text, kind) {
      if (!text) return;
      tokens.push({ text: text, kind: kind, plainStart: plain, plainEnd: plain + text.length });
      plain += text.length;
    }
    MD_RE.lastIndex = 0;
    while ((m = MD_RE.exec(md))) {
      push(md.slice(last, m.index), '');
      if (m[2] != null) push(m[2], 'strong');
      else if (m[3] != null) push(m[3], 'em');
      else push(m[4], 'blue');
      last = m.index + m[0].length;
    }
    push(md.slice(last), '');
    return tokens;
  }
  function mdPlain(md) { return mdTokens(md == null ? '' : md).map(function (t) { return t.text; }).join(''); }

  /** Append markdown as DOM nodes. Newlines become <br> so a multi-line
   *  field (the offer heading) wraps the way the built page does. */
  function mdAppend(doc, parent, md) {
    mdTokens(md == null ? '' : md).forEach(function (t) {
      var parts = t.text.split('\n');
      parts.forEach(function (part, i) {
        if (i) parent.appendChild(doc.createElement('br'));
        if (!part) return;
        if (t.kind === 'blue') {
          var span = doc.createElement('span');
          span.className = 'text-blue';
          span.textContent = part;
          parent.appendChild(span);
        } else if (t.kind) {
          var el = doc.createElement(t.kind);
          el.textContent = part;
          parent.appendChild(el);
        } else {
          parent.appendChild(doc.createTextNode(part));
        }
      });
    });
  }

  /** Serialize element childNodes back to the markdown subset. */
  function mdFromNodes(nodes) {
    var s = '';
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], name = n.nodeName;
      if (name === 'STRONG' || name === 'B') s += '**' + n.textContent + '**';
      else if (name === 'EM' || name === 'I') s += '*' + n.textContent + '*';
      else if (name === 'SPAN' && n.classList && n.classList.contains('text-blue')) s += '~' + n.textContent + '~';
      else if (name === 'BR') s += '\n';
      else s += n.textContent || '';
    }
    return s;
  }

  function readRich(el) { return el ? mdFromNodes(el.childNodes).replace(/[ \t]+/g, ' ').trim() : ''; }
  function q(doc, sel) { return doc.querySelector(sel); }
  function field(doc, key) { return doc.querySelector('[data-fpl="' + key + '"]'); }

  /* ── Capture ─────────────────────────────────────────────── */

  /** Read the hero (and offer block, when the page has one) out of a
   *  rendered FrontPage Labs page. This is the baseline a variant's nulls
   *  fall back to, re-read on every load so it can never go stale. */
  function capture(doc) {
    var hero = q(doc, '[data-fpl-hero]');
    var ctaLink = q(doc, '[data-fpl-cta] a');
    var video = q(doc, '[data-fpl-media-video]');
    var image = q(doc, '[data-fpl-media-image]');

    var base = {
      headlineTop: readRich(field(doc, 'headlineTop')),
      headlineBottom: readRich(field(doc, 'headlineBottom')),
      headlineAlign: (hero && hero.getAttribute('data-fpl-align')) || 'split',
      eyebrow: norm(field(doc, 'eyebrow') ? field(doc, 'eyebrow').textContent : ''),
      listItems: captureList(doc),
      statLines: [].slice.call(doc.querySelectorAll('[data-fpl-stats] [data-fpl-stat]')).map(readRich),
      kicker: readRich(field(doc, 'kicker')),
      ctaText: readRich(field(doc, 'ctaText')),
      ctaLabel: norm(ctaLink ? ctaLink.querySelector('.button-text-front').textContent : ''),
      ctaHref: ctaLink ? ctaLink.getAttribute('href') : '/contact',
      mediaMode: video ? 'video' : 'image',
      mediaPoster: video ? video.getAttribute('poster') : image ? image.getAttribute('src') : '',
      // Style overrides are deltas only — there is nothing to read back out
      // of the page, so the baseline is always "whatever the stylesheet says".
      hlSize: null, hlLineHeight: null, hlTracking: null, statSize: null,
      overlayTop: null, overlayBottom: null, minHeight: null,

      offerEyebrow: norm(textOf(doc, 'offerEyebrow')),
      offerHeading: readRich(field(doc, 'offerHeading')),
      offerBody: readRich(field(doc, 'offerBody')),
      price: norm(textOf(doc, 'price')),
      priceNote: norm(textOf(doc, 'priceNote')),
      includes: captureIncludes(doc),
      showcaseEyebrow: norm(textOf(doc, 'showcaseEyebrow')),
      showcase: [],   // chosen from the project list in the panel, not readable here
      finalCtaText: readRich(field(doc, 'finalCtaText')),
    };
    return base;
  }

  function textOf(doc, key) { var el = field(doc, key); return el ? el.textContent : ''; }

  function captureList(doc) {
    return [].slice.call(doc.querySelectorAll('[data-fpl-list] li:not([data-fpl-template])')).map(function (li) {
      var row = li.querySelector('.capability-row');
      var item = {
        label: norm(li.querySelector('.capability-label') ? li.querySelector('.capability-label').textContent : li.textContent),
        number: norm(li.querySelector('.capability-number') ? li.querySelector('.capability-number').textContent : ''),
      };
      var href = row && row.getAttribute('href');
      if (href) item.href = href;
      return item;
    });
  }

  function captureIncludes(doc) {
    return [].slice.call(doc.querySelectorAll('[data-fpl-includes] li:not([data-fpl-template])')).map(function (li) {
      return norm(li.querySelector('span') ? li.querySelector('span').textContent : li.textContent);
    });
  }

  /* ── Merge ───────────────────────────────────────────────── */

  /** baseline + the variant's non-null fields → the values to render. */
  function merged(variant, baseline) {
    var out = {}, k;
    for (k in baseline) out[k] = baseline[k];
    for (k in variant) {
      if (!EDITABLE[k]) continue;
      if (variant[k] !== null && variant[k] !== undefined) out[k] = variant[k];
    }
    return out;
  }

  /* ── Apply ───────────────────────────────────────────────── */

  function setRich(doc, el, value) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    mdAppend(doc, el, value == null ? '' : value);
  }

  /** The headline's flip panel carries the same words twice (front face and
   *  back face). Only the front is the labelled field; this copies it into
   *  any `[data-fpl-mirror="<key>"]` so an edit lands on both. */
  function setRichField(doc, key, value) {
    setRich(doc, field(doc, key), value);
    var mirrors = doc.querySelectorAll('[data-fpl-mirror="' + key + '"]');
    for (var i = 0; i < mirrors.length; i++) setRich(doc, mirrors[i], value);
  }
  function setText(doc, key, value) {
    var el = field(doc, key);
    if (el) el.textContent = value == null ? '' : value;
  }

  /** Write merged values into the document. `baseline` lets us leave alone
   *  the things a variant hasn't touched (notably the media element, which
   *  restarts the video every time it is rebuilt). */
  function apply(doc, m, baseline) {
    var hero = q(doc, '[data-fpl-hero]');
    if (!hero) return;

    setRichField(doc, 'headlineTop', m.headlineTop);
    setRichField(doc, 'headlineBottom', m.headlineBottom);

    var wrap2 = q(doc, '[data-fpl-headline-2]');
    if (wrap2) wrap2.classList.toggle('align-right', m.headlineAlign !== 'left');
    hero.setAttribute('data-fpl-align', m.headlineAlign || 'split');

    setText(doc, 'eyebrow', m.eyebrow);
    applyList(doc, m.listItems);
    applyStats(doc, m.statLines);
    setRich(doc, field(doc, 'kicker'), m.kicker);
    setRich(doc, field(doc, 'ctaText'), m.ctaText);
    applyCta(doc, '[data-fpl-cta] a', m);
    applyCta(doc, '[data-fpl-final-cta] a', m);
    applyMedia(doc, m, baseline);

    // Offer block — only present on /lp/* pages.
    if (q(doc, '[data-fpl-offer]')) {
      setText(doc, 'offerEyebrow', m.offerEyebrow);
      setRich(doc, field(doc, 'offerHeading'), m.offerHeading);
      setRich(doc, field(doc, 'offerBody'), m.offerBody);
      setText(doc, 'price', m.price);
      setText(doc, 'priceNote', m.priceNote);
      var block = q(doc, '[data-fpl-price-block]');
      if (block) block.hidden = !norm(m.price);
      applyIncludes(doc, m.includes);
      setText(doc, 'showcaseEyebrow', m.showcaseEyebrow);
      setRich(doc, field(doc, 'finalCtaText'), m.finalCtaText);
    }

    applyStyle(doc, m);
  }

  /** Grow/shrink a list by cloning its hidden template node. Astro scopes
   *  styles with a per-component attribute, so a hand-built element would
   *  render unstyled — cloning a real node carries the scope with it. */
  function rebuildList(doc, container, count, fill) {
    if (!container) return;
    var template = container.querySelector('[data-fpl-template]');
    if (!template) return;
    var live = [].slice.call(container.children).filter(function (el) { return el !== template; });
    while (live.length > count) container.removeChild(live.pop());
    while (live.length < count) {
      var node = template.cloneNode(true);
      node.removeAttribute('data-fpl-template');
      node.hidden = false;
      container.insertBefore(node, template);
      live.push(node);
    }
    live.forEach(fill);
  }

  function applyList(doc, items) {
    if (!Array.isArray(items)) return;
    rebuildList(doc, q(doc, '[data-fpl-list]'), items.length, function (li, i) {
      var label = li.querySelector('.capability-label');
      var number = li.querySelector('.capability-number');
      var row = li.querySelector('.capability-row');
      if (label) label.textContent = items[i].label || '';
      if (number) number.textContent = items[i].number || '';
      // No href = a plain row; the anchor styles key off its presence.
      if (row) {
        if (norm(items[i].href)) row.setAttribute('href', items[i].href);
        else row.removeAttribute('href');
      }
    });
  }

  function applyStats(doc, lines) {
    if (!Array.isArray(lines)) return;
    var box = q(doc, '[data-fpl-stats]');
    if (!box) return;
    var kicker = field(doc, 'kicker');
    var template = box.querySelector('[data-fpl-template]');
    if (!template) return;
    var live = [].slice.call(box.querySelectorAll('[data-fpl-stat]'));
    while (live.length > lines.length) box.removeChild(live.pop());
    while (live.length < lines.length) {
      var node = template.cloneNode(true);
      node.removeAttribute('data-fpl-template');
      node.setAttribute('data-fpl-stat', '');
      node.hidden = false;
      box.insertBefore(node, template);
      live.push(node);
    }
    live.forEach(function (p, i) { setRich(doc, p, lines[i]); });
    if (kicker) box.appendChild(kicker); // kicker always sits last
  }

  function applyIncludes(doc, items) {
    if (!Array.isArray(items)) return;
    rebuildList(doc, q(doc, '[data-fpl-includes]'), items.length, function (li, i) {
      var span = li.querySelector('span');
      if (span) span.textContent = items[i] || '';
    });
  }

  function applyCta(doc, selector, m) {
    var link = q(doc, selector);
    if (!link) return;
    if (norm(m.ctaLabel)) {
      var front = link.querySelector('.button-text-front');
      var back = link.querySelector('.button-text-back');
      if (front) front.textContent = m.ctaLabel;
      if (back) back.textContent = m.ctaLabel;
    }
    if (norm(m.ctaHref)) link.setAttribute('href', m.ctaHref);
  }

  /** Swapping video↔image rebuilds the element, so only do it when the mode
   *  actually changed — otherwise every keystroke restarts the clip. */
  function applyMedia(doc, m, baseline) {
    var box = q(doc, '[data-fpl-media]');
    if (!box) return;
    var video = box.querySelector('[data-fpl-media-video]');
    var image = box.querySelector('[data-fpl-media-image]');
    var current = video ? 'video' : 'image';
    var poster = norm(m.mediaPoster) || (baseline ? baseline.mediaPoster : '');

    if (m.mediaMode === current) {
      if (video && video.getAttribute('poster') !== poster) video.setAttribute('poster', poster);
      if (image && image.getAttribute('src') !== poster) image.setAttribute('src', poster);
      return;
    }
    var overlay = box.querySelector('.hero-overlay');
    var scope = null;
    var attrs = (video || image || box).attributes;
    for (var i = 0; i < attrs.length; i++) {
      if (attrs[i].name.indexOf('data-astro-cid-') === 0) scope = attrs[i].name;
    }
    if (video) box.removeChild(video);
    if (image) box.removeChild(image);
    var next;
    if (m.mediaMode === 'image') {
      next = doc.createElement('img');
      next.setAttribute('src', poster);
      next.setAttribute('alt', '');
      next.setAttribute('data-fpl-media-image', '');
    } else {
      next = doc.createElement('video');
      next.autoplay = true; next.muted = true; next.loop = true; next.playsInline = true;
      next.setAttribute('poster', poster);
      next.setAttribute('data-fpl-media-video', '');
      [['/assets/fpl-3-transcode.webm', 'video/webm'], ['/assets/fpl-3-transcode.mp4', 'video/mp4']].forEach(function (s) {
        var source = doc.createElement('source');
        source.setAttribute('src', s[0]);
        source.setAttribute('type', s[1]);
        next.appendChild(source);
      });
    }
    if (scope) next.setAttribute(scope, '');
    box.insertBefore(next, overlay || null);
  }

  /** Size/layout overrides ride one injected <style>, so a null field means
   *  "use the stylesheet". Same selectors + !important as the build-time
   *  block in LandingHero.astro, so preview and page agree. */
  function applyStyle(doc, m) {
    var css = '';
    var heading = [];
    if (m.hlSize != null) heading.push('font-size:' + m.hlSize + 'vw !important');
    if (m.hlLineHeight != null) heading.push('line-height:' + m.hlLineHeight + ' !important');
    if (m.hlTracking != null) heading.push('letter-spacing:' + m.hlTracking + 'em !important');
    if (heading.length) css += '[data-fpl-hero] .hero-heading{' + heading.join(';') + '}\n';
    if (m.statSize != null) css += '[data-fpl-hero] .hero-stat{font-size:' + m.statSize + 'px !important}\n';
    if (m.minHeight != null) css += '[data-fpl-hero]{min-height:' + m.minHeight + 'vh !important}\n';
    if (m.overlayTop != null || m.overlayBottom != null) {
      css += '[data-fpl-hero] .hero-overlay{background:linear-gradient(180deg,rgb(0 0 0 / ' +
        (m.overlayTop == null ? 0 : m.overlayTop) + '%) 0%,rgb(0 0 0 / ' +
        (m.overlayBottom == null ? 35 : m.overlayBottom) + '%) 100%) !important}\n';
    }
    var tag = doc.getElementById('fpl-hero-lab-vars');
    if (!css) { if (tag) tag.remove(); return; }
    if (!tag) {
      tag = doc.createElement('style');
      tag.id = 'fpl-hero-lab-vars';
      (doc.head || doc.documentElement).appendChild(tag);
    }
    tag.textContent = css;
  }

  global.FplHeroLab = {
    capture: capture,
    merged: merged,
    apply: apply,
    norm: norm,
    mdPlain: mdPlain,
    HERO_KEYS: HERO_KEYS,
    OFFER_KEYS: OFFER_KEYS,
    EDIT_KEYS: EDIT_KEYS,
  };

  /* ── /preview/<id> bootstrap (phone preview, no lab chrome) ─────────── */
  var cfg = global.__FPL_HERO_LAB__;
  if (cfg && cfg.variant) {
    var run = function () {
      var baseline = capture(document);
      apply(document, merged(cfg.variant, baseline), baseline);
      if (!cfg.noPills && cfg.variants && cfg.variants.length > 1) pills();
    };
    var pills = function () {
      var bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;gap:6px;' +
        'padding:6px 8px;border-radius:999px;background:rgba(1,25,75,.92);box-shadow:0 6px 24px rgba(0,0,0,.45);' +
        'backdrop-filter:blur(6px);font-family:Arial,sans-serif';
      cfg.variants.forEach(function (v) {
        var a = document.createElement('a');
        a.href = '/preview/' + v.id;
        a.textContent = v.id.toUpperCase();
        var on = v.id === cfg.variant.id;
        a.style.cssText = 'display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;' +
          'font-size:13px;font-weight:700;text-decoration:none;touch-action:manipulation;' +
          (on ? 'background:#03f6ff;color:#01194b;' : 'background:rgba(255,255,255,.14);color:#fff;');
        bar.appendChild(a);
      });
      var x = document.createElement('button');
      x.textContent = '×';
      x.setAttribute('aria-label', 'Hide variant switcher');
      x.style.cssText = 'width:34px;height:34px;border-radius:50%;border:0;background:transparent;color:rgba(255,255,255,.7);' +
        'font-size:18px;cursor:pointer;touch-action:manipulation';
      x.addEventListener('click', function () { bar.remove(); });
      bar.appendChild(x);
      document.body.appendChild(bar);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
})(typeof window !== 'undefined' ? window : this);
