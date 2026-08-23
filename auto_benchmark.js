const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';
const REPORT_DIR = 'D:\\dichchrome\\test_reports';
const SHOT_DIR = path.join(REPORT_DIR, 'screenshots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDirs() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

async function testRecaptchaV3(ctx, results) {
  const name = 'reCAPTCHA v3 score';
  const shot = path.join(SHOT_DIR, '1_recaptcha_v3.png');
  const page = await ctx.newPage();
  try {
    await page.goto(
      'https://recaptcha-demo.appspot.com/recaptcha-v3-request-scores.php',
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    let preText = '';
    for (let i = 0; i < 15; i++) {
      preText = await page.evaluate(() => document.body.innerText);
      const m = preText.match(/"score"\s*:\s*([\d.]+)/);
      if (m) break;
      // Re-trigger a fresh score request
      const again = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find((l) => /try again/i.test(l.textContent || ''));
      });
      if (again && (await again.evaluate((el) => !!el))) {
        await again.asElement().click().catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
      }
      await sleep(2000);
    }
    const scoreMatch = preText.match(/"score"\s*:\s*([\d.]+)/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
    await page.screenshot({ path: shot, fullPage: true });
    results.push({
      name,
      detail: `score=${score}`,
      pass: typeof score === 'number' && score >= 0.7,
      shot,
    });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

async function testTurnstile(ctx, results) {
  const name = 'Cloudflare Turnstile';
  const shot = path.join(SHOT_DIR, '2_turnstile.png');
  const page = await ctx.newPage();
  try {
    await page.goto('https://2captcha.com/demo/cloudflare-turnstile', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    let tokenLen = 0;
    let resolved = false;
    for (let round = 0; round < 3 && !resolved; round++) {
      if (round === 1) {
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await sleep(3000);
      }
      for (let i = 0; i < 20 && !resolved; i++) {
        // Try clicking the interactive checkbox inside the Turnstile iframe
        for (const frame of page.frames()) {
          if (frame === page.mainFrame()) continue;
          const cb =
            (await frame.$('input[type="checkbox"]').catch(() => null)) ||
            (await frame.$('.ctp-checkbox-label').catch(() => null));
          if (cb) {
            await cb.click({ timeout: 2000 }).catch(() => {});
          }
        }
        resolved = await page.evaluate(() => {
          const input = document.querySelector('[name="cf-turnstile-response"]');
          return !!input && input.value.length > 0;
        });
        if (!resolved) await sleep(1000);
      }
    }
    tokenLen = await page.evaluate(() => {
      const input = document.querySelector('[name="cf-turnstile-response"]');
      return input ? input.value.length : 0;
    });
    // Check widget visual state inside iframe
    const frameText = await page
      .frames()
      .filter((f) => f !== page.mainFrame())
      .reduce(async (acc, f) => {
        const t = await f.textContent('body').catch(() => '');
        return (await acc) + ' ' + t;
      }, Promise.resolve(''));
    const success = resolved && tokenLen > 0;
    await page.screenshot({ path: shot, fullPage: true });
    results.push({
      name,
      detail: success
        ? `resolved (token ${tokenLen} chars)`
        : `not resolved${frameText.includes('Success') ? ' (iframe shows Success)' : ''}`,
      pass: success || frameText.includes('Success'),
      shot,
    });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

async function testSannySoft(ctx, results) {
  const name = 'bot.sannysoft.com checks';
  const shot = path.join(SHOT_DIR, '3_sannysoft.png');
  const targets = ['WebDriver', 'Chrome', 'Permissions', 'Plugins'];
  const page = await ctx.newPage();
  try {
    await page.goto('https://bot.sannysoft.com/', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await sleep(3000);
    const rows = await page.evaluate(() => {
      const out = {};
      const walk = (root) => {
        root.querySelectorAll('tr').forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td, th'));
          if (cells.length >= 2) {
            const k = cells[0].innerText.trim();
            if (k && !out[k]) out[k] = cells[cells.length - 1].innerText.trim();
          }
        });
        root.querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot) walk(el.shadowRoot);
        });
      };
      walk(document);
      return out;
    });
    await page.screenshot({ path: shot, fullPage: true });
    const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const parts = [];
    let allPass = true;
    for (const t of targets) {
      const key = Object.keys(rows).find(
        (k) => norm(k).startsWith(norm(t)) || norm(t).startsWith(norm(k))
      );
      const val = key ? rows[key] : '(row not found)';
      // 'prompt' is the correct human result for Permissions; numbers (plugin count) are info
      const ok =
        /passed/.test(val.toLowerCase()) ||
        val.toLowerCase() === 'prompt' ||
        /^\d+$/.test(val);
      if (!ok) allPass = false;
      parts.push(`${t}=${val}`);
    }
    results.push({ name, detail: parts.join(', '), pass: allPass, shot });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

async function testTls(ctx, results) {
  const name = 'TLS fingerprint (JA3/JA4)';
  const shot = path.join(SHOT_DIR, '4_tls.png');
  const page = await ctx.newPage();
  try {
    await page.goto('https://tls.peet.ws/api/clean', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(bodyText);
    await page.screenshot({ path: shot });
    const ja3 = data.ja3_hash;
    const ja4 = data.ja4;
    const httpVersion = data.http_version;
    results.push({
      name,
      detail: `ja3_hash=${ja3} ja4=${ja4} http_version=${httpVersion}`,
      pass: !!ja4,
      shot,
    });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

async function testIncolamitas(ctx, results) {
  const name = 'bot.incolamitas.com';
  const shot = path.join(SHOT_DIR, '5_incolamitas.png');
  const page = await ctx.newPage();
  try {
    await page.goto('https://bot.incolamitas.com/', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await sleep(3000);
    const counts = await page.evaluate(() => {
      const text = document.body.innerText;
      const fails = (text.match(/\bFAIL\b|failed/gi) || []).length;
      const passes = (text.match(/passed/gi) || []).length;
      return { fails, passes };
    });
    await page.screenshot({ path: shot, fullPage: true });
    results.push({
      name,
      detail: `fails=${counts.fails} passed=${counts.passes}`,
      pass: counts.fails <= 1,
      shot,
    });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

async function testDeviceAndBrowserInfo(ctx, results) {
  const name = 'deviceandbrowserinfo.com isBot';
  const shot = path.join(SHOT_DIR, '6_deviceinfo.png');
  const page = await ctx.newPage();
  try {
    await page.goto('https://deviceandbrowserinfo.com/are_you_a_bot', {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    // The result JSON is rendered after heavy fingerprinting; wait up to 60s
    let info = null;
    for (let i = 0; i < 30 && !info; i++) {
      await sleep(2000);
      info = await page.evaluate(() => {
        let parsed = null;
        try {
          const code = document.querySelector('#jsonResult');
          if (code) parsed = JSON.parse(code.textContent);
        } catch (e) {}
        if (!parsed) {
          const m = document.body.innerText.match(/"isBot"['":\s]+(true|false)/i);
          if (m) parsed = { isBot: m[1] === 'true' };
        }
        return parsed;
      });
    }
    info = info || { isBot: null };
    await page.screenshot({ path: shot, fullPage: true });
    results.push({
      name,
      detail: `isBot=${JSON.stringify(info.isBot)}`,
      pass: info.isBot === false,
      shot,
    });
  } catch (e) {
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, detail: 'ERROR: ' + e.message.split('\n')[0], pass: false, shot });
  } finally {
    await page.close();
  }
}

(async () => {
  await ensureDirs();
  const results = [];
  console.log('Launching BrowserMulti...');
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
    viewport: { width: 1280, height: 900 },
  });

  await testRecaptchaV3(ctx, results);
  await testTurnstile(ctx, results);
  await testSannySoft(ctx, results);
  await testTls(ctx, results);
  await testDeviceAndBrowserInfo(ctx, results);

  await ctx.close();

  fs.writeFileSync(path.join(REPORT_DIR, 'report.json'), JSON.stringify(results, null, 2));

  // Markdown summary
  console.log('\n## Benchmark Report - BrowserMulti\n');
  console.log('| Test | Score / Status | Result | Screenshot |');
  console.log('|------|----------------|--------|------------|');
  for (const r of results) {
    console.log(
      `| ${r.name} | ${r.detail} | ${r.pass ? '**PASS**' : '**FAIL**'} | \`${r.shot}\` |`
    );
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\nTotal: ${passed}/${results.length} PASS`);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
