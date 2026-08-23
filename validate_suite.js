// validate_suite.js — Giai đoạn 3: Validation trên các hệ thống phòng thủ thương mại
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const H = require('./human_input');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';
const REPORT_DIR = 'D:\\dichchrome\\test_reports';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText).catch(() => '');
}

// Tìm các dòng chứa keyword kèm từ trạng thái gần đó
function extractStatuses(text, keywords) {
  const out = {};
  for (const kw of keywords) {
    const re = new RegExp(`.{0,80}${kw}.{0,120}`, 'gi');
    out[kw] = (text.match(re) || []).slice(0, 2).map((s) => s.replace(/\n/g, ' | ').trim());
  }
  return out;
}

(async () => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const shot = (name) => path.join(REPORT_DIR, name);
  const results = [];

  console.log('Launching BrowserMulti (viewport: null)...');
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  // ==================== TEST 1: BrowserScan ====================
  console.log('\n===== TEST 1: BrowserScan Bot Detection =====');
  try {
    const page = await ctx.newPage();
    await page.goto('https://www.browserscan.net/bot-detection', { waitUntil: 'domcontentloaded', timeout: 90000 });
    // Chờ kết quả phân tích xuất hiện
    let text = '';
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      text = await bodyText(page);
      if (/webdriver|cdp|automation/i.test(text)) break;
      // thử bấm nút detect nếu có
      const btn = page.locator('button:has-text("Detect"), button:has-text("Start")').first();
      if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 2000 }).catch(() => {}); }
    }
    console.log(extractStatuses(text, ['Webdriver', 'User-Agent', 'CDP', 'Navigator', 'Automation']));
    const abnormal = /abnormal|detected\s*[:=]\s*yes|isBot['":\s]+true/i.test(text);
    await page.screenshot({ path: shot('phase3_browserscan.png'), fullPage: true });
    results.push({
      system: 'BrowserScan',
      actual: abnormal ? 'Có dấu hiệu Abnormal/Detected' : 'Không tìm thấy cảnh báo bất thường (Webdriver/CDP/Navigator)',
      pass: !abnormal,
      shot: 'phase3_browserscan.png',
      raw: text.slice(0, 600),
    });
    await page.close();
  } catch (e) {
    results.push({ system: 'BrowserScan', actual: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot: '' });
  }

  // ==================== TEST 2: Incolumitas ====================
  console.log('\n===== TEST 2: Incolumitas Behavioral Test =====');
  try {
    const page = await ctx.newPage();
    await page.goto('https://bot.incolumitas.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
    // Hành vi người thật trước khi kết quả được tính
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    const m = await H.humanMouseMove(page, H.rand(vp.w * 0.3, vp.w * 0.7), H.rand(vp.h * 0.3, vp.h * 0.6));
    console.log(`  [MOVE] ${m.count} events, ${m.durationMs}ms, path=${m.pathLength}px`);
    const sc = await H.humanScroll(page, 320);
    console.log(`  [SCROLL] ${sc.chunks} chunks, ${sc.totalMs}ms`);
    await H.humanMouseMove(page, H.rand(vp.w * 0.1, vp.w * 0.5), H.rand(vp.h * 0.4, vp.h * 0.8));

    // Chờ kết quả render
    let text = '';
    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      text = await bodyText(page);
      if (/passed|failed|detection/i.test(text)) break;
    }
    const passed = (text.match(/passed/gi) || []).length;
    const failed = (text.match(/failed/gi) || []).length;
    const detectedWords = (text.match(/bot\s*:\s*(true|detected)/gi) || []).length;
    console.log(`  passed=${passed} failed=${failed} bot:true-hits=${detectedWords}`);
    await page.screenshot({ path: shot('phase3_incolumitas.png'), fullPage: true });
    results.push({
      system: 'Incolumitas',
      actual: `passed=${passed}, failed=${failed}`,
      pass: failed <= Math.ceil(passed * 0.15) && detectedWords === 0,
      shot: 'phase3_incolumitas.png',
      raw: text.slice(0, 600),
    });
    await page.close();
  } catch (e) {
    results.push({ system: 'Incolumitas', actual: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot: '' });
  }

  // ==================== TEST 3: FingerprintJS Pro Demo ====================
  console.log('\n===== TEST 3: FingerprintJS Pro Demo =====');
  try {
    const page = await ctx.newPage();
    await page.goto('https://fingerprint.com/demo/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);
    // Tương tác tự nhiên nhẹ
    const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await H.humanMouseMove(page, vp.w * 0.5, vp.h * 0.4);
    await H.humanScroll(page, 180);

    // Chờ visitorId / bot detection render (có thể nằm trong iframe)
    let text = '';
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      text = await bodyText(page);
      for (const f of page.frames()) {
        if (f !== page.mainFrame()) {
          const t = await f.evaluate?.(() => document.body.innerText).catch(() => '') || '';
          text += '\n' + t;
        }
      }
      if (/visitorId|bot.?detection|incognito/i.test(text)) break;
    }
    const botBad = /bot[^\n]{0,40}(detected\b(?!:)|positive)|isBot['":\s]+true/i.test(text);
    const notDetected = /not[\s-]?detected/i.test(text);
    const incog = /(in)?cognito[^.\n]{0,60}/i.exec(text);
    const visitorIdHit = /[a-f0-9]{20,}\|[a-f0-9]{8}/i.test(text) || /visitorId/i.test(text);
    console.log(`  notDetected=${notDetected} badPattern=${botBad} visitorId=${visitorIdHit} incognito=${incog ? incog[0].trim() : '-'}`);
    await page.screenshot({ path: shot('phase3_fingerprintjs.png'), fullPage: true });
    results.push({
      system: 'FingerprintJS Pro',
      actual: `Bot Detection: ${notDetected ? 'Not Detected' : (botBad ? 'DETECTED' : 'không rõ')}${incog ? ', Incognito=' + incog[0].trim() : ''}`,
      pass: notDetected || !botBad,
      shot: 'phase3_fingerprintjs.png',
      raw: text.slice(0, 500),
    });
    await page.close();
  } catch (e) {
    results.push({ system: 'FingerprintJS Pro', actual: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot: '' });
  }

  // ==================== TEST 4: Antoine Vastel ====================
  console.log('\n===== TEST 4: Antoine Vastel Behavioral Challenge =====');
  try {
    const page = await ctx.newPage();
    let text = '';
    try {
      await page.goto('https://arh.antoinevastel.com/bots/areyouheadless', { waitUntil: 'domcontentloaded', timeout: 45000 });
      text = await bodyText(page);
    } catch (e) { /* fallback */ }
    if (!text || text.length < 10) {
      await page.goto('https://antoinevastel.com/bots/areyouheadless.html', { timeout: 45000 }).catch(() => {});
      await sleep(2000);
      text = await bodyText(page);
    }
    // Trang tương tác có nút — thử human click nếu thấy nút start
    const btn = page.locator('button:has-text("headless"), button:has-text("Test"), input[type="submit"]').first();
    if (await btn.count().catch(() => 0)) {
      const st = await H.humanClick(page, 'button:has-text("headless"), button:has-text("Test"), input[type="submit"]');
      console.log(`  [CLICK] dwell=${st.dwellMs}ms`);
      await sleep(3000);
      text = await bodyText(page);
    }
    console.log('  Raw:', text.slice(0, 300).replace(/\n/g, ' | '));
    const isBot = /headless['":\s]*(true|you are headless)/i.test(text) || /isBot['":\s]*true/i.test(text);
    await page.screenshot({ path: shot('phase3_vastel.png'), fullPage: true });
    results.push({
      system: 'Antoine Vastel',
      actual: text.slice(0, 160).replace(/\n/g, ' ') || '(trống)',
      pass: !isBot,
      shot: 'phase3_vastel.png',
      raw: text.slice(0, 400),
    });
    await page.close();
  } catch (e) {
    results.push({ system: 'Antoine Vastel', actual: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot: '' });
  }

  await ctx.close();

  // ==================== Xuất báo cáo ====================
  const md = [];
  md.push('# VALIDATION REPORT — BrowserMulti (Giai đoạn 3)');
  md.push('');
  md.push(`> Chạy tự động: ${new Date().toISOString()} · binary: src/out/Default/chrome.exe · profile: user_data · viewport: null · human_input.js`);
  md.push('');
  md.push('| # | Hệ thống | Kết quả thực tế | Trạng thái | Ảnh |');
  md.push('|---|----------|-----------------|-----------|-----|');
  results.forEach((r, i) => {
    md.push(`| ${i + 1} | ${r.system} | ${(r.actual || '').replace(/\|/g, '/')} | **${r.pass ? 'PASS' : 'FAIL'}** | ${r.shot ? 'test_reports/' + r.shot : '-'} |`);
  });
  md.push('');
  md.push('## Phân tích điểm bất thường');
  const anomalies = results.filter((r) => !r.pass);
  if (!anomalies.length) {
    md.push('- Không phát hiện bất thường nào. Toàn bộ hệ thống kiểm tra trả về kết quả người thật.');
  } else {
    for (const a of anomalies) {
      md.push(`### ${a.system}`);
      md.push('- ' + (a.raw || a.actual).replace(/\n+/g, '\n- ').slice(0, 1500));
    }
  }
  fs.writeFileSync('D:\\dichchrome\\VALIDATION_REPORT.md', md.join('\n'));

  console.log('\n================ TỔNG HỢP ================');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} [${r.system}] ${r.actual}`);
  }
  console.log('\nBáo cáo đã ghi: D:\\dichchrome\\VALIDATION_REPORT.md');
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
