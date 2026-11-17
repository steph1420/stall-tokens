// Payment balance hotfix e2e (local demo data only). Usage: node e2e/beta-pay.mjs <outdir>  (BETA_URL to point at a local preview)
// Typing Cash or UPI moves the other to the balance; the slider follows; a waive only comes from "Round off / waive".
import { chromium } from '@playwright/test';
import { demoOps } from './seed-plain.mjs';

const out = process.argv[2] ?? '.';
const BETA = process.env.BETA_URL ?? 'https://steph1420.github.io/stall-tokens-beta/';
const results = [];
const rec = (name, ok, ev = '') => { results.push({ name, ok, ev }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${ev}`); };
const step = async (name, f) => { try { const ev = await f(); rec(name, ev !== false, typeof ev === 'string' ? ev : ''); } catch (e) { rec(name, false, String(e.message ?? e).split('\n')[0]); } };
const rupees = (t) => Number(String(t).replace(/[^0-9.]/g, '') || 'NaN');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });

async function seed(p, theme) {
  await p.evaluate(async ({ theme, ops }) => {
    localStorage.setItem('stall-tokens-beta.v2.device', JSON.stringify({ deviceId: `pay${theme}0001`, theme, servingName: 'Server-A', haptics: 'off' }));
    await new Promise((res, rej) => { const r = indexedDB.open('stall-tokens-beta.v2.log', 1); r.onupgradeneeded = () => r.result.createObjectStore('ops', { keyPath: 'opId' });
      r.onerror = () => rej(r.error); r.onsuccess = () => { const tx = r.result.transaction('ops', 'readwrite'); ops.forEach((o) => tx.objectStore('ops').put(o)); tx.oncomplete = () => { r.result.close(); res(); }; }; });
  }, { theme, ops: demoOps() });
}

for (const theme of (process.env.THEMES ?? 'night,day').split(',')) {
  const ctx = await b.newContext({ viewport: { width: 421, height: 927 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const T = (n) => `[${theme}] ${n}`;
  const shot = (n) => p.screenshot({ path: `${out}/pay-${n}-${theme}.png` });
  const box = async (n) => rupees(await p.getByRole('button', { name: new RegExp(`^${n}`) }).first().innerText());
  const total = async () => rupees(await p.evaluate(() => [...globalThis.document.querySelectorAll('div')].find((d) => d.textContent === 'To collect')?.nextElementSibling?.textContent ?? ''));
  const type = async (n, digits) => {
    await p.getByRole('button', { name: new RegExp(`^${n}`) }).first().click();
    for (const k of digits.split('')) await p.getByRole('button', { name: k, exact: true }).click();
    await p.getByRole('button', { name: 'Done', exact: true }).click(); await p.waitForTimeout(150);
  };
  const clear = async (n) => {
    await p.getByRole('button', { name: new RegExp(`^${n}`) }).first().click();
    for (let i = 0; i < 6; i++) await p.getByRole('button', { name: 'Delete', exact: true }).click();
    await p.getByRole('button', { name: 'Done', exact: true }).click(); await p.waitForTimeout(150);
  };
  const slideTo = async (f) => { const r = await p.getByRole('slider').boundingBox(); await p.mouse.click(r.x + r.width * f, r.y + r.height / 2); await p.waitForTimeout(150); };
  const waivedShown = async () => (await p.getByRole('button', { name: /^Waived ₹/ }).count()) > 0;
  const state = async () => { const [c, u, t] = [await box('Cash'), await box('UPI'), await total()]; return { c, u, t, ok: c + u === t && !(await waivedShown()) }; };
  const ev = (x) => `₹${String(x.c)} cash + ₹${String(x.u)} UPI = ₹${String(x.t)}, no waive`;

  await p.goto(BETA); await seed(p, theme); await p.reload(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /counter/i }).first().click();
  for (const [n, k] of [['Tea', 4], ['Samosa', 3]]) for (let i = 0; i < k; i++) await p.getByRole('button', { name: new RegExp(`^${n}, add one`) }).first().click();
  await p.getByRole('button', { name: /^Bill|items/ }).last().click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /^Pay/ }).first().click(); await p.waitForTimeout(300);
  const t0 = await total();

  await step(T('type Cash: UPI becomes the balance'), async () => { await type('Cash', '50'); const x = await state(); return x.ok && x.c === 50 && x.u === t0 - 50 ? ev(x) : false; });
  await step(T('type UPI: Cash becomes the balance'), async () => { await type('UPI', '40'); const x = await state(); return x.ok && x.u === 40 && x.c === t0 - 40 ? ev(x) : false; });
  await step(T('slider then type Cash (Steve\'s case): UPI follows, no "Waived"'), async () => {
    await slideTo(0.85); const s0 = await state(); await type('Cash', '30'); const x = await state(); await shot('01-slider-then-type');
    return s0.ok && x.ok && x.c === 30 && x.u === t0 - 30 ? `after slider ${ev(s0)}; then ${ev(x)}` : false;
  });
  await step(T('type then slider: still adds up'), async () => { await type('UPI', '20'); await slideTo(0.3); const x = await state(); return x.ok ? ev(x) : false; });
  await step(T('Cash over the total shows change due; Confirm stays allowed'), async () => {
    await type('Cash', String(t0 + 100)); const x = await state(); await shot('02-change-due');
    const chg = await p.getByRole('status').filter({ hasText: 'Change' }).innerText();
    const enabled = await p.getByRole('button', { name: 'Confirm payment' }).isEnabled();
    return x.ok && x.c === t0 && x.u === 0 && /100/.test(chg) && enabled ? `${ev(x)}; "${chg.replace(/\s+/g, ' ')}"` : false;
  });
  await step(T('UPI over the total is clamped to the total'), async () => { await type('UPI', String(t0 + 500)); const x = await state(); return x.ok && x.u === t0 && x.c === 0 ? ev(x) : false; });
  await step(T('clear a field: the other takes the whole amount'), async () => { await clear('UPI'); const x = await state(); return x.ok && x.c === t0 && x.u === 0 ? ev(x) : false; });
  await step(T('waive only through "Round off / waive"; boxes rebalance'), async () => {
    await type('UPI', '30'); await p.getByRole('button', { name: 'Round off / waive' }).click();
    for (const k of '10'.split('')) await p.getByRole('button', { name: k, exact: true }).click();
    await p.getByRole('button', { name: 'Done', exact: true }).click(); await p.waitForTimeout(150); await shot('03-round-off');
    const [c, u] = [await box('Cash'), await box('UPI')];
    return (await waivedShown()) && u === 30 && c === t0 - 40 ? `Waived ₹10 shown; ₹${String(c)} + ₹${String(u)} + ₹10 = ₹${String(t0)}` : false;
  });
  await step(T('Confirm payment records it'), async () => {
    await p.getByRole('button', { name: 'Confirm payment' }).click(); await p.waitForTimeout(400);
    return (await p.getByText(/Paid ✓|Paid$/).count()) > 0 ? 'Paid shown' : false;
  });
  await step(T('no page errors'), async () => (errors.length === 0 ? 'none' : errors.join('; ')));
  await ctx.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
console.log(`SUMMARY ${String(pass)}/${String(results.length)} pass`);
process.exit(pass === results.length ? 0 : 1);
