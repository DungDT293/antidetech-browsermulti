// incolumitas_dump.js — dump toàn bộ kết quả ra file
const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext('D:\\dichchrome\\user_data', {
    executablePath: 'D:\\dichchrome\\src\\out\\Default\\chrome.exe',
    headless: false,
    viewport: null,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = await ctx.newPage();
  await page.goto('https://bot.incolumitas.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(18000);
  const txt = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync('D:\\dichchrome\\test_reports\\incolumitas_full.txt', txt);
  console.log('saved len=', txt.length);

  const lines = txt.split('\n').filter((l) => /"(OK|KO|failed|passed)"|:\s*"?(OK|KO)"/i.test(l));
  console.log(lines.slice(0, 100).join('\n'));
  await ctx.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
