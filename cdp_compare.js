const { chromium } = require('playwright');
const http = require('http');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';
const HTML = require('fs').readFileSync('D:\\dichchrome\\test_reports\\cdp_probe.html', 'utf8');

function serve(onResult) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/result') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => { onResult(body); res.end('ok'); });
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(HTML);
    });
    srv.listen(8933, '127.0.0.1', () => resolve(srv));
  });
}

async function withCDP(srv) {
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8933/probe', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('out').textContent.startsWith('RESULT:'), null, { timeout: 20000 });
  const txt = await page.evaluate(() => document.getElementById('out').textContent.slice(7));
  await ctx.close();
  return JSON.parse(txt);
}

async function withoutCDP() {
  const { spawn } = require('child_process');
  const proc = spawn(EXECUTABLE, [
    '--headless', '--no-sandbox', '--user-data-dir=D:\\dichchrome\\temp_baseline',
    'http://127.0.0.1:8933/probe',
  ], { stdio: 'ignore', detached: false });
  // Wait for POSTed result
  for (let i = 0; i < 40 && !baseResult; i++) await new Promise((r) => setTimeout(r, 500));
  try { proc.kill(); } catch (e) {}
  return baseResult;
}

let baseResult = null;

(async () => {
  const srv = await serve((body) => { baseResult = body ? JSON.parse(body) : null; });
  console.log('=== BASELINE (khong CDP) ===');
  const base = await withoutCDP();
  console.log(JSON.stringify(base, null, 1));
  console.log('\n=== VOI PLAYWRIGHT (CDP attached) ===');
  const cdp = await withCDP(srv);
  console.log(JSON.stringify(cdp, null, 1));
  srv.close();

  // Compare
  console.log('\n=== SO SANH ===');
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(cdp || {})]);
  for (const k of keys) {
    if (JSON.stringify(base?.[k]) !== JSON.stringify(cdp?.[k])) {
      console.log(`DIFF ${k}: baseline=${JSON.stringify(base?.[k])} | CDP=${JSON.stringify(cdp?.[k])}`);
    }
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
