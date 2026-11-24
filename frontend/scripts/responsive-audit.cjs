// Responsive audit: run with the dev server up (npm run dev:mock) from the frontend folder:
//   node scripts/responsive-audit.cjs   (uses installed Chrome)
const { chromium } = require('playwright-core');
const VIEWS = [
  ['phone portrait 390x844', 390, 844, 1], ['phone landscape 844x390', 844, 390, 1],
  ['tablet portrait 820x1180', 820, 1180, 1], ['tablet landscape 1180x820', 1180, 820, 1],
  ['desktop 1440x900', 1440, 900, 1], ['desktop zoom 200% (720x450)', 720, 450, 1], ['desktop zoom 400% (360x225)', 360, 225, 1],
];
const ROUTES = ['/quiz', '/playlists', '/playlists/1', '/tracks/12', '/feed', '/profile'];
const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, label.choice';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  let problems = 0;
  for (const theme of ['era-60-70', 'era-80-90']) {
    for (const [name, w, h] of VIEWS) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100 });
      const p = await ctx.newPage();
      await p.addInitScript((t) => localStorage.setItem('mood-music-theme', JSON.stringify({ state: { theme: t }, version: 0 })), theme);
      await p.goto('http://127.0.0.1:5173/login');
      await p.getByLabel('E-mail').fill('alice@example.com');
      await p.getByLabel('Password').fill('correct-horse-battery');
      await p.getByRole('button', { name: 'Sign in' }).click();
      await p.waitForURL('**/quiz');
      // create a playlist so /playlists/1 exists
      for (let i = 0; i < 4; i++) { await p.getByRole('radio').first().check(); await p.getByRole('button', { name: 'Next' }).click(); }
      await p.getByRole('button', { name: 'Get my playlist' }).click();
      await p.waitForURL('**/playlists/1');
      for (const r of ROUTES) {
        if (r === '/login') continue; // signed-in users are redirected; login checked separately
        await p.evaluate((path) => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, r);
        await p.waitForTimeout(900);
        const res = await p.evaluate((sel) => {
          const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, small: [], overlaps: [], nav: false };
          const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
          const navs = [...document.querySelectorAll('nav[aria-label=Main]')].filter(vis);
          out.nav = navs.length > 0 && navs.some((n) => n.querySelectorAll('a').length >= 4 && [...n.querySelectorAll('a')].every((a) => { const r = a.getBoundingClientRect(); return r.right <= window.innerWidth + 1 && r.left >= -1; }));
          const els = [...document.querySelectorAll(sel)].filter(vis).filter((e) => !e.closest('.sr-only') && !e.classList.contains('skip-link'));
          for (const e of els) {
            if (e.matches('input[type=radio], input[type=checkbox]') && e.closest('label')) continue; // the label is the target
            const r = e.getBoundingClientRect();
            if (e.tagName === 'A' && e.closest('p, li:not(.card), article') && !e.closest('nav') && !e.classList.contains('btn')) continue; // inline text links
            if (r.height < 43.5 || r.width < 43.5) out.small.push((e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          const boxes = els.filter((e) => !e.closest('label.choice') || e.matches('label.choice')).map((e) => [e, e.getBoundingClientRect()]);
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            const [a, A] = boxes[i], [c, C] = boxes[j];
            if (a.contains(c) || c.contains(a)) continue;
            if (a.closest('.tabbar') || c.closest('.tabbar')) continue; // fixed bar: content scrolls under it, main has bottom padding
            const ix = Math.min(A.right, C.right) - Math.max(A.left, C.left), iy = Math.min(A.bottom, C.bottom) - Math.max(A.top, C.top);
            if (ix > 2 && iy > 2) out.overlaps.push(`${(a.textContent || a.tagName).trim().slice(0, 16)} / ${(c.textContent || c.tagName).trim().slice(0, 16)}`);
          }
          return out;
        }, SEL);
        if (r === '/playlists/1') { const n = await p.locator('.track').count(); if (n === 0) console.log('NO TRACKS RENDERED', name); }
        const bad = res.overflow > 0 || res.small.length || res.overlaps.length || !res.nav;
        if (bad) { problems++; console.log(`[${theme}] ${name} ${r}: overflow=${res.overflow} nav=${res.nav} small=${JSON.stringify([...new Set(res.small)])} overlaps=${JSON.stringify(res.overlaps.slice(0, 4))}`); }
      }
      await ctx.close();
    }
  }
  console.log('checked; problem pages:', problems);
  await b.close();
})();
