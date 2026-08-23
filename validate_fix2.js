// validate_fix2.js — bóc context verdict chính xác
const { chromium } = require('playwright');
const H = require('./human_input');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext('D:\\dichchrome\\user_data', {
    executablePath: 'D:\\dichchrome\\src\\out\\Default\\chrome.exe',
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  console.log('===== INCOLUMITAS: context quanh fail/pass =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://bot.incolumitas.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await H.humanMouseMove(page, vp.w * 0.4, vp.h * 0.4);
    await H.humanScroll(page, 300);
    await sleep(20000); // chờ đủ test chạy xong

    const ctxs = await page.evaluate(() => {
      const txt = document.body.innerText;
      const out = [];
      const re = /(passed|failed|PASSED|FAILED)/g;
      let m;
      while ((m = re.exec(txt)) && out.length < 40) {
        out.push(txt.slice(Math.max(0, m.index - 90), m.index + 60).replace(/\n/g, ' ¶ '));
      }
      // thêm phần đầu trang (summary/red box)
      out.unshift('=== HEAD 1200 ===\n' + txt.slice(0, 1200));
      return out;
    });
    console.log(ctxs.join('\n\n---\n\n'));
    await page.close();
  }

  console.log('\n===== FINGERPRINT: click tab Browser Smart Signals =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://fingerprint.com/demo/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(5000);
    await H.humanMouseMove(page, 640, 300);

    // Tìm và click tab "Browser Smart Signals" trong card kết quả
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role=tab], div, span')].filter((e) =>
        e.children.length === 0 && /browser smart signals/i.test(e.textContent || ''));
      if (els.length) { els[0].click(); return true; }
      return false;
    });
    console.log('clicked tab:', clicked);
    await sleep(2500);

    const block = await page.evaluate(() => {
      const txt = document.body.innerText;
      const i = txt.toLowerCase().indexOf('browser smart signals');
      const j = txt.toLowerCase().indexOf('bot detection');
      return txt.slice(Math.min(i < 0 ? 1e9 : i, j < 0 ? 1e9 : j), Math.max(i, j) + 500);
    });
    console.log('--- Block ---\n' + block.replace(/\n{3,}/g, '\n'));

    // Tìm cặp label:value của bot/incognito/suspicious trong DOM lá
    const pairs = await page.evaluate(() => {
      const leaves = [...document.querySelectorAll('div,span,p,td')]
        .filter((e) => e.children.length === 0)
        .map((e) => (e.textContent || '').trim())
        .filter((t) => t && t.length < 80);
      const out = [];
      for (let k = 0; k < leaves.length - 1; k++) {
        if (/^(bot detection|incognito|suspicious|bot activity|detected as bot)$/i.test(leaves[k])) {
          out.push(leaves[k] + ' => ' + leaves[k + 1]);
        }
      }
      return [...new Set(out)];
    });
    console.log('--- Pairs ---\n' + JSON.stringify(pairs, null, 1));
    await page.close();
  }

  await ctx.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
