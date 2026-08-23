// test_human_behavior.js — Kiểm thử Humanized Input Engine trên trang thật
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const H = require('./human_input');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';
const SHOT_DIR = 'D:\\dichchrome\\test_reports\\screenshots';

function printMove(name, s) {
  console.log(`  [MOVE ${name}] ${s.count} events | ${s.durationMs}ms | path=${s.pathLength}px ` +
    `| interval avg=${s.avgInterval} min=${s.minInterval} max=${s.maxInterval} ms`);
  const pts = s.events;
  const sample = [pts[0], pts[Math.floor(pts.length / 3)], pts[Math.floor(2 * pts.length / 3)], pts[pts.length - 1]];
  console.log(`  quỹ đạo: ${sample.map(p => `(${p.x},${p.y})@${p.t}ms`).join(' -> ')}`);
}

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  console.log('Launching BrowserMulti (viewport: null)...');
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  // ================= PAGE 1: Cloudflare Turnstile =================
  console.log('\n===== TEST 1: Cloudflare Turnstile (human-like click) =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://2captcha.com/demo/cloudflare-turnstile', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Nếu đã resolved sẵn thì bỏ qua click
    let already = await page.evaluate(() => {
      const i = document.querySelector('[name="cf-turnstile-response"]');
      return !!i && i.value.length > 0;
    });

    if (!already) {
      // Tìm checkbox trong iframe cloudflare
      let box = null;
      for (let i = 0; i < 10 && !box; i++) {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue;
          try {
            const loc = f.locator('input[type="checkbox"], .ctp-checkbox-label').first();
            box = await loc.boundingBox({ timeout: 1000 }).catch(() => null);
            if (box) break;
          } catch (e) {}
        }
        if (!box) await new Promise((r) => setTimeout(r, 1500));
      }
      if (!box) { console.log('  KHÔNG tìm thấy widget checkbox'); }
      else {
        const tx = box.x + box.width * 0.5 + H.rand(-3, 3);
        const ty = box.y + box.height * 0.5 + H.rand(-2, 2);
        console.log(`  Target checkbox: (${tx.toFixed(0)}, ${ty.toFixed(0)})`);
        const st = await H.humanClick(page, { x: tx, y: ty });
        printMove('to-turnstile', st.move);
        console.log(`  dwell=${st.dwellMs}ms (chuẩn người 60-120ms)`);
      }
    } else {
      console.log('  Widget đã tự resolve trước đó.');
    }

    // Chờ token (tối đa 30s)
    let resolved = false, tokenLen = 0;
    for (let i = 0; i < 60 && !resolved; i++) {
      resolved = await page.evaluate(() => {
        const input = document.querySelector('[name="cf-turnstile-response"]');
        return !!input && input.value.length > 0;
      });
      if (!resolved) await new Promise((r) => setTimeout(r, 500));
    }
    tokenLen = await page.evaluate(() => {
      const i = document.querySelector('[name="cf-turnstile-response"]');
      return i ? i.value.length : 0;
    });
    console.log(resolved ? `  ✅ TURNSTILE RESOLVED — token ${tokenLen} chars` : '  ❌ chưa resolve trong 30s');
    await page.screenshot({ path: path.join(SHOT_DIR, 'human_turnstile.png'), fullPage: true });
    await page.close();
  }

  // ================= PAGE 2: reCAPTCHA v3 =================
  console.log('\n===== TEST 2: reCAPTCHA v3 (ambient behavior + score) =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://recaptcha-demo.appspot.com/recaptcha-v3-request-scores.php',
      { waitUntil: 'networkidle', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Hành vi ambient: di chuyển tự nhiên vài chặng + cuộn nhẹ
    const vp = page.viewportSize() || { width: 1280, height: 800 };
    let m1 = await H.humanMouseMove(page, H.rand(vp.width * 0.3, vp.width * 0.6), H.rand(vp.height * 0.3, vp.height * 0.5));
    printMove('ambient-1', m1);
    let sc = await H.humanScroll(page, 240);
    console.log(`  [SCROLL] ${sc.chunks} wheel chunks | ${sc.totalMs}ms | decay envelope`);
    let m2 = await H.humanMouseMove(page, H.rand(vp.width * 0.1, vp.width * 0.4), H.rand(vp.height * 0.5, vp.height * 0.8));
    printMove('ambient-2', m2);

    // Đọc score; nếu chưa có thì bấm Try again theo kiểu người
    let bodyText = '', score = null;
    for (let i = 0; i < 8 && score === null; i++) {
      bodyText = await page.evaluate(() => document.body.innerText);
      const m = bodyText.match(/"score"\s*:\s*([\d.]+)/);
      if (m) { score = parseFloat(m[1]); break; }
      try {
        const again = page.locator('a:has-text("Try again")').first();
        if (await again.count()) await H.humanClick(page, 'a:has-text("Try again")');
        else break;
        await page.waitForLoadState('networkidle').catch(() => {});
      } catch (e) { break; }
    }
    console.log(score !== null ? `  ✅ reCAPTCHA v3 SCORE = ${score}` : '  ❌ không đọc được score');
    await page.screenshot({ path: path.join(SHOT_DIR, 'human_recaptcha_v3.png'), fullPage: true });
    await page.close();
  }

  // ================= PAGE 3: keystroke dynamics demo =================
  console.log('\n===== TEST 3: Keystroke dynamics (dwell/flight) =====');
  {
    const page = await ctx.newPage();
    await page.goto('https://www.w3schools.com/html/html_forms.asp', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    // thử trang local fallback nếu w3schools chặn
    let ok = await page.evaluate(() => !!document.querySelector('#fname, input[name="firstname"]'));
    if (!ok) {
      await page.setContent('<input id="fname">');
    }
    const sel = '#fname, input[name="firstname"]';
    const r = await H.humanType(page, sel, 'Nguyen Van TeSt 123!');
    console.log(`  Tổng thời gian gõ 19 ký tự: ${r.totalMs}ms`);
    console.log(`  Mẫu log: ${JSON.stringify(r.keys.slice(0, 6))}`);
    const val = await page.inputValue(sel);
    console.log(`  Giá trị input sau khi gõ: "${val}" ${val === 'Nguyen Van TeSt 123!' ? '✅' : '⚠️'}`);
    await page.close();
  }

  await ctx.close();
  console.log('\nHoàn tất kiểm thử Humanized Input Engine.');
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
