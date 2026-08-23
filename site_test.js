const { chromium } = require('playwright');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';

async function testSite(name, opts = {}) {
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
    ...opts,
  });
  const page = await ctx.newPage();
  let result = null;
  try {
    await page.goto('https://deviceandbrowserinfo.com/are_you_a_bot', {
      waitUntil: 'domcontentloaded', timeout: 120000,
    });
    for (let i = 0; i < 30 && !result; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await page.evaluate(() => {
        try {
          const c = document.querySelector('#jsonResult');
          if (c && c.textContent.includes('isBot')) return JSON.parse(c.textContent);
        } catch (e) {}
        return null;
      });
    }
  } catch (e) {
    result = { error: e.message.split('\n')[0] };
  }
  await ctx.close();
  console.log(`\n=== ${name} ===`);
  if (!result) { console.log('NO RESULT'); return; }
  if (result.error) { console.log(result.error); return; }
  console.log('isBot =', result.isBot);
  for (const [k, v] of Object.entries(result.details || {})) {
    if (v === true) console.log('  TRUE ->', k);
  }
}

(async () => {
  const cfg = process.argv[2] || 'default';
  GetOpts: {
    var opts = {};
    if (cfg === 'noviewport') opts.viewport = null;
    if (cfg === 'nosandbox') opts.args = ['--no-first-run', '--no-default-browser-check'];
  }
  await testSite('config=' + cfg, opts);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
