(() => {
  const MAX_LINES = 14;
  const PER_CAT = 3;

  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return (h >>> 0).toString(16).padStart(8, '0');
  };

  const overlap = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

  const sel = (tag, id, cls) => {
    const classes = String(cls || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    const s = tag.toLowerCase() + (id ? '#' + id : '') + classes.map((c) => '.' + c).join('');
    return s.length > 40 ? s.slice(0, 39) + '~' : s;
  };

  const format = (w, h, fp, issues) => {
    const lines = [`visual-pass ${w}x${h} fp=${fp} issues=${issues.length}`];
    const per = {};
    let more = 0;
    for (const [cat, text] of issues) {
      per[cat] = (per[cat] || 0) + 1;
      if (per[cat] > PER_CAT || lines.length > MAX_LINES) more++;
      else lines.push(`${cat} ${text}`);
    }
    if (more) lines.push(`+${more} more`);
    return lines.join('\n');
  };

  const run = () => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const r0 = Math.round;
    const name = (el) => sel(el.tagName, el.id, el.getAttribute('class'));
    const issues = [];
    const add = (cat, el, text) => issues.push([cat, `${name(el)} ${text}`]);
    const hasText = (el) => !!el && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const range = document.createRange();
    const textBox = (el) => {
      let b = null;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        b = b
          ? { left: Math.min(b.left, r.left), top: Math.min(b.top, r.top), right: Math.max(b.right, r.right), bottom: Math.max(b.bottom, r.bottom) }
          : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }
      return b;
    };
    const clippedByAncestor = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true;
      }
      return false;
    };
    const fixed = new Map();
    const inFixedLayer = (el) => {
      if (!el || el === document.body) return false;
      if (!fixed.has(el)) {
        const p = getComputedStyle(el).position;
        fixed.set(el, p === 'fixed' || p === 'sticky' || inFixedLayer(el.parentElement));
      }
      return fixed.get(el);
    };

    if (de.scrollWidth > vw) issues.push(['overflow-x', `document scrollWidth=${de.scrollWidth} > ${vw}`]);

    const fp = [scrollX, scrollY];
    const texts = [];
    const outside = [];
    // shortcut: scans the first 3000 elements, upgrade if long pages miss issues below that point
    const els = [...document.body.querySelectorAll('*')].slice(0, 3000);
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      fp.push(r0(r.left), r0(r.top), r0(r.width), r0(r.height), cs.opacity, cs.transform);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if (((r.right > vw + 1 && r.left < vw) || (r.left < -1 && r.right > 0)) && !outside.some((o) => o.contains(el)) && !clippedByAncestor(el)) {
        outside.push(el);
        add('offscreen-x', el, `left=${r0(r.left)} right=${r0(r.right)} vw=${vw}`);
      }
      const box = textBox(el);
      if (!box) continue;
      const size = parseFloat(cs.fontSize);
      if (size < 12) add('font', el, `${size}px`);
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1) {
        add('clipped', el, `scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth}`);
      }
      // shortcut: overlap compares at most 300 text elements and ignores fixed/sticky layers, upgrade if overlaps on long pages or in overlays go unreported
      if (texts.length < 300 && !inFixedLayer(el)) texts.push([el, box]);
    }

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const [a, ra] = texts[i];
        const [b, rb] = texts[j];
        if (overlap(ra, rb) && !a.contains(b) && !b.contains(a)) issues.push(['overlap', `${name(a)} x ${name(b)}`]);
      }
    }

    if (vw <= 480) {
      for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button]')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (getComputedStyle(el).display === 'inline' && hasText(el.parentElement)) continue;
        if (r.width < 24 || r.height < 24) add('tap', el, `${r0(r.width)}x${r0(r.height)}`);
      }
    }

    for (const img of document.images) {
      if (img.complete && img.naturalWidth === 0) add('img-broken', img, (img.currentSrc || img.src || '(no src)').split('/').pop().slice(0, 40));
    }

    return format(vw, de.clientHeight, hash(fp.join()), issues);
  };

  const api = { hash, overlap, sel, format, run };
  if (typeof document === 'undefined') return (module.exports = api);
  window.__vp = run;
  return run();
})()
