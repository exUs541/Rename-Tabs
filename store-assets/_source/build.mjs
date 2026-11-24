// Builds all store images (screenshots + promo tiles) with headless Edge.
//   node store-assets/_source/build.mjs            -> everything
//   node store-assets/_source/build.mjs 3 promo    -> only screenshot 3 and the promo tiles
//
// The popup and the dashboard you see in the images are the REAL ones (popup/*, options/* of this repo),
// run with a small stub for the chrome.* APIs and made-up example data (example.com addresses only).
// Rebuild after UI changes. Only the tab strips are an illustration (labelled), because the browser's own
// tab bar cannot be captured.
import { render } from './render.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');            // extension root
const out = path.join(here, '..');                   // store-assets/
const tmp = mkdtempSync(path.join(os.tmpdir(), 'tm-shots-'));
const url = (p) => 'file:///' + p.replace(/\\/g, '/');

const logoUri = 'data:image/svg+xml;base64,' + readFileSync(path.join(out, 'brand', 'logo.svg')).toString('base64');

// ── Theme: take the light/dark colour variables straight from the extension's CSS ────
const themes = (cssFile) => {
  const css = readFileSync(path.join(root, cssFile), 'utf8');
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]);
  return { light: `:root{${blocks[0]};color-scheme:light}`, dark: `:root{${blocks[0]};${blocks[1]};color-scheme:dark}` };
};
const popupThemes = themes('popup/popup.css');
const optionsThemes = themes('options/options.css');

// ── Example data (made up on purpose: example.com only, no real sites) ───────────────
const svgIcon = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7c5cff"/>' +
  '<path d="M18 33l9 9 19-21" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>').toString('base64');
const R = (id, conditionType, conditionValue, actionTitle, actionIconType, actionIconValue) =>
  ({ id, conditionType, conditionValue, actionTitle, actionIconType, actionIconValue });
const exampleRules = () => [
  R('r1', 'startsWith', 'https://mail.example.com', 'Inbox', 'emoji', '📬'),
  R('r2', 'contains', 'example.com/docs', 'Docs', 'emoji', '📘'),
  R('r3', 'startsWith', 'https://app.example.com/admin', 'Admin', 'emoji', '🛠️'),
  R('r4', 'contains', 'staging.', 'STAGING', 'emoji', '🚧'),
  R('r5', 'contains', 'localhost', 'Local dev', 'emoji', '💻'),
  R('r6', 'exact', 'https://board.example.com/sprint', 'Sprint board', 'image', svgIcon),
];

const chromeStub = (store, activeUrl) => `<script>
  const __store = ${JSON.stringify(store)};
  const area = { get: (k, cb) => { const o = {}; (Array.isArray(k) ? k : [k]).forEach(x => { if (x in __store) o[x] = JSON.parse(JSON.stringify(__store[x])); }); cb(o); },
                 set: (d, cb) => { Object.assign(__store, d); cb && cb(); } };
  window.chrome = { runtime: { openOptionsPage() {}, sendMessage() {}, lastError: null },
    storage: { local: area, sync: area, onChanged: { addListener() {} } },
    tabs: { query: (q, cb) => cb([{ id: 1, url: ${JSON.stringify(activeUrl)} }]) } };
</script>`;
const noMotion = '*,*::before,*::after{transition:none!important;animation:none!important}';

/** The real popup as a standalone page, prefilled like a user who is about to save a rule. */
function popupPage(name, { theme = 'dark', fill = true } = {}) {
  let html = readFileSync(path.join(root, 'popup', 'popup.html'), 'utf8');
  const after = `<script>window.addEventListener('load', () => {
      ${fill ? `const ct = document.getElementById('conditionType'); ct.value = 'startsWith'; ct.dispatchEvent(new Event('change'));
      document.getElementById('conditionValue').value = 'https://app.example.com/admin';
      document.getElementById('actionTitle').value = 'Admin';
      document.getElementById('actionEmoji').value = '🛠️';` : ''}
    });</script>`;
  html = html
    .replace('href="popup.css"', `href="${url(path.join(root, 'popup', 'popup.css'))}"`)
    .replace('src="../icons/icon48.png"', `src="${url(path.join(root, 'icons', 'icon48.png'))}"`)
    .replace('</head>', `<style>${popupThemes[theme]}${noMotion}</style></head>`)
    .replace('<script src="popup.js"></script>',
      `${chromeStub({ rules: [] }, 'https://app.example.com/admin/users')}<script src="${url(path.join(root, 'popup', 'popup.js'))}"></script>${after}`);
  const file = path.join(tmp, `popup-${name}.html`);
  writeFileSync(file, html);
  return url(file);
}

/** The real dashboard. view: rules | settings | edit (rule dialog open) */
function optionsPage(name, { theme = 'light', view = 'rules' } = {}) {
  let html = readFileSync(path.join(root, 'options', 'options.html'), 'utf8');
  const after = `<script>window.addEventListener('load', () => {
      ${view === 'settings' ? "document.getElementById('navGeneral').click();" : ''}
      ${view === 'edit' ? "document.querySelectorAll('.rule-item .edit-btn')[3].click();" : ''}
    });</script>`;
  html = html
    .replace('href="options.css"', `href="${url(path.join(root, 'options', 'options.css'))}"`)
    .replace('src="../icons/icon48.png"', `src="${url(path.join(root, 'icons', 'icon48.png'))}"`)
    .replace('</head>', `<style>${optionsThemes[theme]}${noMotion}</style></head>`)
    .replace('<script src="options.js"></script>',
      `${chromeStub({ rules: exampleRules(), syncEnabled: true }, 'https://app.example.com/')}<script src="${url(path.join(root, 'options', 'options.js'))}"></script>${after}`);
  const file = path.join(tmp, `options-${name}.html`);
  writeFileSync(file, html);
  return url(file);
}

/** Embeds a page as a scaled iframe (w x h are the page's own viewport size). */
const frame = (src, w, h, scale, style = '') =>
  `<div class="frame" style="width:${w * scale}px;height:${h * scale}px;${style}">` +
  `<iframe src="${src}" style="width:${w}px;height:${h}px;transform:scale(${scale})"></iframe></div>`;
const POPUP = { w: 340, h: 464 };   // natural height of the filled-in popup (measured)
const popupFrame = (src, scale, style) => frame(src, POPUP.w, POPUP.h, scale, style);
const DASH = { w: 720, h: 600 };
const dashFrame = (src, scale, style, h = DASH.h) => frame(src, DASH.w, h, scale, style);

// ── Tab strips (illustration) ────────────────────────────────────────────────────────
const GLOBE = '<span class="globe"></span>';
const BEFORE = [
  [GLOBE, 'Inbox (12) – anna@mail.example…'], [GLOBE, 'Handbook – Docs | Example Co…'],
  [GLOBE, 'Console | Example Cloud Admin'], [GLOBE, 'app – staging.example.com'], [GLOBE, 'localhost:3000'],
];
const AFTER = [['📬', 'Inbox'], ['📘', 'Docs'], ['🛠️', 'Admin'], ['🚧', 'STAGING'], ['💻', 'Local dev']];
const win = (tabs, addr) => `
  <div class="win">
    <div class="tabs">${tabs.map(([f, t], i) =>
      `<div class="tab${i === 2 ? ' on' : ''}"><span class="fav">${f}</span><span class="t">${t}</span></div>`).join('')}</div>
    <div class="bar"><span class="dots"><i></i><i></i><i></i></span><div class="addr">${addr}</div></div>
  </div>`;
const ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9cc6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v11M3.5 9L8 13.5 12.5 9"/></svg>';
const strips = (style, { width = 620 } = {}) => `
  <div class="strips" style="width:${width}px;${style}">
    <div class="tag">Before</div>${win(BEFORE, 'app.example.com/admin')}
    <div class="rule">${ARROW}<span>One rule: address starts with <code>app.example.com/admin</code></span>${ARROW}</div>
    <div class="tag after">After</div>${win(AFTER, 'app.example.com/admin')}
    <div class="note">Simplified illustration</div>
  </div>`;

// ── Shared look ──────────────────────────────────────────────────────────────────────
const CHECK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238dbaff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E\")";
const baseCss = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden}
  body{position:relative;font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;color:#fff;background:#0b0e15}
  .bg{position:absolute;inset:0;background:
      radial-gradient(900px 520px at 88% 4%,rgba(64,128,255,.30),transparent 62%),
      radial-gradient(700px 500px at 2% 110%,rgba(112,88,255,.22),transparent 60%),
      linear-gradient(180deg,#121621,#090b11)}
  .brand{position:absolute;display:flex;align-items:center;gap:12px;font-weight:650;font-size:22px;letter-spacing:.2px}
  .brand img{width:40px;height:40px;display:block}
  h1{font-weight:780;letter-spacing:-.022em;line-height:1.05}
  h1 em{font-style:normal;background:linear-gradient(90deg,#9cc6ff,#5f93ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:#b9c0d0;line-height:1.4}
  ul.pts{list-style:none;display:grid;gap:13px;color:#e8ebf2}
  ul.pts li{display:flex;gap:13px;align-items:center}
  ul.pts li::before{content:"";flex:none;width:24px;height:24px;border-radius:8px;background:rgba(95,147,255,.18) ${CHECK} center/15px no-repeat}
  .chips{display:flex;flex-wrap:wrap;gap:10px}
  .chip{padding:8px 15px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#e8ebf2;font-weight:560}
  .frame{position:absolute;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.12)}
  .frame iframe{display:block;border:0;transform-origin:0 0}
  /* tab strip illustration */
  .strips{position:absolute;display:flex;flex-direction:column;gap:10px}
  .tag{align-self:flex-start;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.08);color:#aab3c6;font-size:14px;font-weight:600;letter-spacing:.03em}
  .tag.after{background:rgba(95,147,255,.22);color:#a9ccff}
  .rule{align-self:center;display:flex;align-items:center;gap:12px;margin:8px 0;padding:10px 18px;border-radius:12px;background:rgba(95,147,255,.14);border:1px solid rgba(95,147,255,.35);color:#dbe7ff;font-size:15.5px}
  .rule code{font:600 14px ui-monospace,Consolas,monospace;color:#fff}
  .win{border-radius:14px;overflow:hidden;background:#232937;box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.10)}
  .tabs{display:flex;gap:2px;padding:10px 10px 0;background:#10131a}
  .tab{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:42px;padding:0 10px;border-radius:9px 9px 0 0;font-size:14.5px;color:#a3abbd;white-space:nowrap}
  .tab.on{background:#232937;color:#fff}
  .tab .t{overflow:hidden;text-overflow:ellipsis}
  .fav{flex:none;width:18px;height:18px;display:grid;place-items:center;font-size:15px;line-height:1}
  .globe{width:15px;height:15px;border-radius:50%;border:2px solid #6b7488;display:block}
  .bar{display:flex;align-items:center;gap:12px;padding:9px 12px}
  .dots{display:flex;gap:5px}.dots i{width:8px;height:8px;border-radius:50%;background:#3a4256;display:block}
  .addr{flex:1;height:28px;border-radius:14px;background:#10131a;color:#98a0b3;font-size:13px;display:flex;align-items:center;padding:0 14px}
  .note{align-self:flex-end;font-size:11.5px;color:#767e92}
`;
const page = (name, w, h, body, extraCss = '') => {
  const file = path.join(tmp, `${name}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${baseCss}body{width:${w}px;height:${h}px}${extraCss}</style><body><div class="bg"></div>${body}</body>`);
  return file;
};

// ── Screenshots (1280 x 800) ─────────────────────────────────────────────────────────
const slideCss = `
  .brand{left:72px;top:56px}
  .copy{position:absolute;left:72px;top:176px;width:500px}
  h1{font-size:58px}
  .sub{margin-top:22px;font-size:23px}
  ul.pts{margin-top:30px;font-size:20.5px}
  .chips{margin-top:30px;font-size:18px}
`;
const slide = (name, { headline, sub, points, chips, visual }) => page(name, 1280, 800, `
  <div class="brand"><img src="${logoUri}" alt=""><span>TabMaster</span></div>
  <div class="copy">
    <h1>${headline}</h1>
    <p class="sub">${sub}</p>
    ${points ? `<ul class="pts">${points.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
    ${chips ? `<div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>` : ''}
  </div>
  ${visual}`, slideCss);

const SHOTS = {
  1: () => slide('shot1', {
    headline: 'Give every tab its <em>own name and icon</em>',
    sub: 'Rename tabs and swap the favicon for an emoji or your own image, automatically.',
    chips: ['Rename tabs', 'Emoji icons', 'Custom images', 'Address rules'],
    visual: strips('right:60px;top:200px'),
  }),
  2: () => slide('shot2', {
    headline: 'Create a rule <em>from the popup</em>',
    sub: 'The current address is already filled in. Pick how it should match, add a name and an emoji, save.',
    points: ['Suggested matches in one click', 'Edit the same rule again on that page', 'Applies instantly, no reload'],
    visual: popupFrame(popupPage('quick', { theme: 'light' }), 1.4, 'right:110px;top:75px'),
  }),
  3: () => slide('shot3', {
    headline: 'All your rules <em>in one place</em>',
    sub: 'Review, edit and delete every rule on the dashboard.',
    points: ['Emoji or your own image as icon', 'Rename to anything, or keep the page title', 'Checked top to bottom, first match wins'],
    visual: dashFrame(optionsPage('rules', { theme: 'dark', view: 'rules' }), 0.92, 'right:56px;top:100px'),
  }),
  4: () => slide('shot4', {
    headline: 'Match addresses <em>your way</em>',
    sub: 'Five conditions decide which pages a rule changes. Target one page, one site or a whole group of pages.',
    chips: ['Starts with', 'Ends with', 'Contains', 'Does not contain', 'Is exactly'],
    visual: dashFrame(optionsPage('edit', { theme: 'light', view: 'edit' }), 0.92, 'right:56px;top:100px'),
  }),
  5: () => slide('shot5', {
    headline: 'Private, synced and <em>backed up</em>',
    sub: 'No account, no tracking, no servers. Your rules stay in your browser.',
    points: ['Optional sync through your browser account', 'Export and import as a JSON file', 'Light and dark theme follow your system'],
    visual: dashFrame(optionsPage('s-dark', { theme: 'dark', view: 'rules' }), 0.78, 'left:640px;top:96px') +
            dashFrame(optionsPage('s-light', { theme: 'light', view: 'settings' }), 0.78, 'left:700px;top:318px', 440),
  }),
};

// ── Promo tiles ──────────────────────────────────────────────────────────────────────
const promoSmall = () => page('promo-small', 440, 280, `
  <div class="brand" style="left:34px;top:32px;gap:0"><img src="${logoUri}" alt="" style="width:76px;height:76px"></div>
  <div style="position:absolute;left:34px;top:122px;right:30px">
    <div style="font-size:40px;font-weight:780;letter-spacing:-.02em;line-height:1">TabMaster</div>
    <div style="margin-top:12px;font-size:21px;line-height:1.3;color:#d5dae6;font-weight:560">Rename tabs.<br>Change tab icons.<br><span style="color:#8dbaff">Automatically.</span></div>
  </div>`);

const promoMarquee = () => page('promo-marquee', 1400, 560, `
  <div class="brand" style="left:80px;top:62px"><img src="${logoUri}" alt=""><span>TabMaster</span></div>
  <div style="position:absolute;left:80px;top:150px;width:600px">
    <h1 style="font-size:64px">Every tab,<br><em>named your way.</em></h1>
    <p class="sub" style="margin-top:22px;font-size:25px">Rename browser tabs and change their icons with simple address rules.</p>
    <div class="chips" style="margin-top:32px;font-size:19px"><span class="chip">Rename tabs</span><span class="chip">Emoji &amp; image icons</span><span class="chip">Address rules</span></div>
  </div>
  ${strips('left:740px;top:84px', { width: 580 })}`);

// ── Run ──────────────────────────────────────────────────────────────────────────────
const NAMES = { 1: 'screenshot-1-rename-tabs-and-icons', 2: 'screenshot-2-quick-rule-popup', 3: 'screenshot-3-rules-dashboard',
                4: 'screenshot-4-five-url-conditions', 5: 'screenshot-5-private-synced-backup' };
const want = process.argv.slice(2);
const on = (k) => want.length === 0 || want.includes(String(k));

for (const n of [1, 2, 3, 4, 5]) {
  if (!on(n)) continue;
  render(SHOTS[n](), path.join(out, 'screenshots', NAMES[n] + '.png'), 1280, 800, { wait: 3000 });
  console.log('wrote', NAMES[n] + '.png');
}
if (on('promo')) {
  render(promoSmall(), path.join(out, 'promo-small-440x280.png'), 440, 280, { wait: 2000 });
  console.log('wrote promo-small-440x280.png');
  render(promoMarquee(), path.join(out, 'promo-marquee-1400x560.png'), 1400, 560, { wait: 3000 });
  console.log('wrote promo-marquee-1400x560.png');
}
