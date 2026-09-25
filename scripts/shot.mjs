// Screenshot a page with headless Chrome over the DevTools protocol, after fonts
// are ready and two frames have painted. Usage: node shot.mjs <url> <out.png> [width] [height]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , url, out, width = '700', height = '1200', scale = '2'] = process.argv;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'borozdov-shot-'))}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  setTimeout(() => reject(new Error('Chrome did not start')), 15000);
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
const waiters = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    for (const w of waiters) if (w.method === msg.method) w.resolve(msg.params);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride',
    { width: +width, height: +height, deviceScaleFactor: +scale, mobile: false }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  // Poll rather than await Page.loadEventFired: the about:blank tab's own load
  // event can arrive first and release the wait before the real page exists.
  for (let i = 0; ; i++) {
    const { result } = await send('Runtime.evaluate',
      { expression: 'location.href + "|" + document.readyState' }, sessionId);
    if (result.value === `${url}|complete`) break;
    if (i > 200) throw new Error(`page never loaded: ${result.value}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  await send('Runtime.evaluate', {
    expression: 'document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))',
    awaitPromise: true,
  }, sessionId);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(out);
} finally {
  ws.close();
  chrome.kill();
}
