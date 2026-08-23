// verify_spec_gaps.js — Rà soát & đóng dấu các mục ⚠️ trong SPEC.md (Ma trận 7 tầng)
const { chromium } = require('playwright');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const USER_DATA = 'D:\\dichchrome\\user_data';

(async () => {
  const rows = [];
  const add = (tier, item, status, detail) => rows.push({ tier, item, status, detail });

  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXECUTABLE,
    headless: false,
    viewport: null, // BẮT BUỘC: dùng kích thước cửa sổ thật, tránh outerWidth=0
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  // ============ TẦNG 3: DOM / Blink identity (trên about:blank) ============
  const p1 = await ctx.newPage();
  await p1.goto('about:blank');

  // window.chrome descriptor
  const chromeDesc = await p1.evaluate(() => {
    const d = Object.getOwnPropertyDescriptor(window, 'chrome');
    return d ? { writable: d.writable, enumerable: d.enumerable, configurable: d.configurable } : null;
  });
  add(3, 'Descriptor window.chrome', JSON.stringify(chromeDesc), 'writable/enumerable/configurable');

  // window.chrome branches
  const branches = await p1.evaluate(() => ({
    runtime: typeof window.chrome?.runtime,
    csi: typeof window.chrome?.csi,
    loadTimes: typeof window.chrome?.loadTimes,
    app: typeof window.chrome?.app,
    appIsInstalled: typeof window.chrome?.app?.getIsInstalled,
  }));
  add(3, 'window.chrome branches', JSON.stringify(branches), '');

  // plugins named lookup + prototype
  const pluginInfo = await p1.evaluate(() => {
    const pl = navigator.plugins;
    const named1 = pl['Chrome PDF Viewer'];
    const named2 = pl['PDF Viewer'];
    const first = pl[0];
    const protoOk = first && Object.getPrototypeOf(first).constructor.name === 'Plugin';
    const mimeProtoOk =
      first &&
      first.length > 0 &&
      Object.getPrototypeOf(Object.getPrototypeOf(first[0]) === null ? {} : first[0]).constructor.name;
    let mimeP = '';
    try { mimeP = Object.getPrototypeOf(first[0]).constructor.name; } catch (e) {}
    return {
      length: pl.length,
      namedChromePDF: !!named1,
      namedPDFViewer: !!named2,
      indexedFirst: !!first,
      pluginProto: protoOk,
      mimeTypeProto: mimeP,
    };
  });
  add(3, 'plugins named+indexed+proto', JSON.stringify(pluginInfo), "['Chrome PDF Viewer'], [0], prototype");

  // Permissions sync
  const permSync = await p1.evaluate(async () => {
    try {
      const st = (await navigator.permissions.query({ name: 'notifications' })).state;
      return { permissionsState: st, notificationPermission: Notification.permission };
    } catch (e) { return { error: e.message }; }
  });
  // Consistency = the two values map to each other (prompt<->default, granted<->granted, denied<->denied)
  const permOk =
    permSync.permissionsState !== undefined &&
    ((permSync.permissionsState === 'prompt' && permSync.notificationPermission === 'default') ||
     (permSync.permissionsState === 'denied' && permSync.notificationPermission === 'denied') ||
     (permSync.permissionsState === 'granted' && permSync.notificationPermission === 'granted'));
  add(3, 'Permissions sync', permOk ? 'SYNC' : 'MISMATCH', JSON.stringify(permSync));

  // Worker scope consistency (dedicated)
  const workerConsistency = await p1.evaluate(async () => {
    return new Promise((resolve) => {
      try {
        const w = new Worker(
          URL.createObjectURL(new Blob([`
            self.postMessage({
              hc: self.navigator.hardwareConcurrency,
              lang: self.navigator.language,
              langs: JSON.stringify(self.navigator.languages),
              tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
              wd: self.navigator.webdriver
            });
          `], { type: 'application/javascript' }))
        );
        w.onmessage = (e) => resolve({
          mainHC: navigator.hardwareConcurrency,
          mainLang: navigator.language,
          worker: e.data,
        });
        setTimeout(() => resolve({ error: 'worker timeout' }), 8000);
      } catch (e) { resolve({ error: e.message }); }
    });
  });
  // WorkerNavigator: webdriver is NOT part of WorkerNavigator per spec (undefined is correct)
  const wcOk =
    !workerConsistency.error &&
    workerConsistency.mainHC === workerConsistency.worker.hc &&
    workerConsistency.mainLang === workerConsistency.worker.lang;
  add(3, 'WorkerNavigator nhất quán', wcOk ? 'CONSISTENT' : 'MISMATCH',
      JSON.stringify(workerConsistency) + ' (worker.webdriver=undefined là đúng spec)');

  // webdriver getter nativeness
  const wdNative = await p1.evaluate(() => {
    const d = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver') ||
              Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    return { value: navigator.webdriver, hasGetter: !!(d && d.get),
             getterStr: d && d.get ? String(d.get).slice(0, 60) : null };
  });
  add(2, 'navigator.webdriver native getter', JSON.stringify(wdNative), 'phải là getter C++ [native code]');

  // ============ TẦNG 4: Screen geometry (cửa sổ thật) ============
  const geom = await p1.evaluate(() => ({
    innerW: innerWidth, innerH: innerHeight,
    outerW: outerWidth, outerH: outerHeight,
    screenW: screen.width, screenH: screen.height,
    availW: screen.availWidth, availH: screen.availHeight,
    screenX: screenX, screenY: screenY,
    dpr: devicePixelRatio,
  }));
  const geomOk = geom.outerW > 0 && geom.outerH > 0 && geom.screenH > 0 && geom.availH > 0;
  add(4, 'Screen geometry', geomOk ? 'OK' : 'ANOMALY', JSON.stringify(geom));

  await p1.close();

  // ============ TẦNG 1: TLS/H2 fingerprint ============
  const p2 = await ctx.newPage();
  try {
    await p2.goto('https://tls.peet.ws/api/clean', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tls = await p2.evaluate(() => JSON.parse(document.body.innerText));
    add(1, 'TLS JA4 / Akamai hash / H2',
        `ja4=${tls.ja4} akamai_hash=${tls.akamai_hash} http=${tls.http_version}`, '');
  } catch (e) {
    add(1, 'TLS JA4 / Akamai hash / H2', 'ERROR', e.message.split('\n')[0]);
  }
  await p2.close();

  // ============ TẦN 2: CDP detection trên trang thật (Playwright drive!) ============
  const p3 = await ctx.newPage();
  let verdict = null;
  try {
    await p3.goto('https://deviceandbrowserinfo.com/are_you_a_bot', {
      waitUntil: 'domcontentloaded', timeout: 120000,
    });
    for (let i = 0; i < 40 && !verdict; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      verdict = await p3.evaluate(() => {
        try {
          const c = document.querySelector('#jsonResult');
          if (c && c.textContent.includes('isBot')) return JSON.parse(c.textContent);
        } catch (e) {}
        return null;
      });
    }
  } catch (e) { /* ignore */ }
  if (verdict) {
    const trues = Object.entries(verdict.details || {}).filter(([, v]) => v === true).map(([k]) => k);
    add(2, 'CDP flags (deviceandbrowserinfo, qua Playwright)', verdict.isBot ? 'isBot=true' : 'isBot=false',
        trues.length ? trues.join(', ') : '(không có cờ true)');
  } else {
    add(2, 'CDP flags (deviceandbrowserinfo, qua Playwright)', 'NO RESULT', 'site timeout');
  }
  await p3.close();

  await ctx.close();

  // ============ Bảng tổng hợp ============
  console.log('\n## Verify Spec Gaps — Kết quả\n');
  console.log('| Tầng | Mục | Trạng thái | Chi tiết |');
  console.log('|------|-----|-----------|----------|');
  for (const r of rows) {
    console.log(`| ${r.tier} | ${r.item} | ${r.status} | ${r.detail.replace(/\|/g, '/')} |`);
  }

  require('fs').writeFileSync('D:\\dichchrome\\test_reports\\spec_gaps_report.json',
    JSON.stringify(rows, null, 2));
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
