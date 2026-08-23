// validate_fix.js — trích xuất chính xác verdict trên incolumitas & fingerprint
const { chromium } = require('playwright');
const H = require('./human_input');
const fs = require('fs');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\\\Default\\chrome.exe'.replace('\\\\', '\\');
const USER_DATA = 'D:\\dichchrome\\user_data';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: 'D:\\dichchrome\\src\\out\\Default\\chrome.exe',
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  // ============ INCOLUMITAS: đếm CHỈ TRONG bảng kết quả ============
  console.log('===== INCOLUMITAS =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://bot.incolumitas.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await H.humanMouseMove(page, vp.w * 0.4, vp.h * 0.4);
    await H.humanScroll(page, 300);

    let report = null;
    for (let i = 0; i < 20 && !report; i++) {
      await sleep(2500);
      // Chỉ lấy text nằm TRONG vùng kết quả (loại intro/documentation)
      report = await page.evaluate(() => {
        // Ưu tiên container kết quả nếu có id/class quen thuộc
        const candidates = ['#fp', '#results', '.result', '#testsResult', '#bot'];
        let root = document.body;
        for (const sel of candidates) { const el = document.querySelector(sel); if (el) { root = el; break; } }
        const rows = [];
        // các dòng dạng "TênTest: PASSED/FAILED/OK/KO" hoặc JSON boolean
        root.querySelectorAll('li, tr, .test, [class*=result], [class*=row]').forEach((n) => {
          const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
          if (/pass|fail|ok|ko\b/i.test(t) && t.length < 160) rows.push(t);
        });
        return { rows: [...new Set(rows)].slice(0, 80), len: root.innerText.length };
      });
      if (report.rows.length >= 3) break;
    }
    const passCount = (JSON.stringify(report.rows).match(/(passed|:ok|\bok\b)/gi) || []).length;
    const failCount = (report.rows.filter((r) => /fail|\bko\b/i.test(r))).length;
    console.log('rows:', JSON.stringify(report.rows.slice(0, 30), null, 1));
    console.log(`=> PASS=${passCount} FAIL=${failCount}`);
    await page.screenshot({ path: 'D:\\dichchrome\\test_reports\\phase3_incolumitas.png', fullPage: true }).catch(() => {});
    await page.close();
  }

  // ============ FINGERPRINT DEMO: đọc Smart Signal / Bot detection ============
  console.log('\n===== FINGERPRINT DEMO =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://fingerprint.com/demo/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(5000);
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await H.humanMouseMove(page, vp.w * 0.5, vp.h * 0.35);

    let lines = [];
    for (let i = 0; i < 25 && !lines.length; i++) {
      await sleep(2000);
      lines = await page.evaluate(() => {
        const out = [];
        const scan = (doc, tag) => {
          doc.querySelectorAll('div,span,p,td,li,h1,h2,h3,h4').forEach((el) => {
            if (el.children.length === 0) {
              const t = (el.textContent || '').trim();
              if (t && t.length < 120 && /(bot|incognito|suspici|smart signal|identif)/i.test(t)) {
                out.push(tag + ': ' + t);
              }
            }
          });
        };
        scan(document, 'main');
        return [...new Set(out)];
      });
    }
    // Lấy cả giá trị liền kề (label -> value)
    const detail = await page.evaluate(() => {
      const txt = document.body.innerText;
      const idx = txt.toLowerCase().indexOf('identification results');
      return txt.slice(idx, idx + 700);
    });
    console.log('--- Identification block ---\n' + detail.replace(/\n{2,}/g, '\n'));
    console.log('--- Bot/signal lines ---\n' + lines.slice(0, 25).join('\n'));
    await page.screenshot({ path: 'D:\\dichchrome\\test_reports\\phase3_fingerprintjs.png', fullPage: true }).catch(() => {});
    await page.close();
  }

  await ctx.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
