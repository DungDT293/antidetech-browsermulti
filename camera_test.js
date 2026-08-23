// Camera test: instrument the real site's JS behavior under Page-only vs Page+Runtime CDP
const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const SITE = 'https://deviceandbrowserinfo.com/are_you_a_bot';

// local probe server (serves camera init script)
const CAMERA_INIT = `(function(){
  if (window.__cameraInstalled) return;
  window.__cameraInstalled = true;
  const L = [];
  const rec = (t, d) => { try { L.push({ t: Math.round(performance.now()), api: t, d }); } catch(e){} };
  window.__cameraLog = L;

  // console methods: deep-dump argument descriptors
  for (const fn of ['debug','log','info','warn','error','dir','table','trace','timeEnd','timeLog']) {
    try {
      const orig = console[fn].bind(console);
      console[fn] = function(...args){
        try {
          const detail = args.map(a => {
            if (a && typeof a === 'object') {
              const descs = {};
              for (const k of Object.getOwnPropertyNames(a)) {
                const dd = Object.getOwnPropertyDescriptor(a, k);
                if (dd && dd.get) {
                  // DO NOT invoke the getter — record metadata only
                  let src = '';
                  try { src = String(dd.get).slice(0, 60); } catch (e) {}
                  descs[k] = { getter: true, src };
                } else {
                  descs[k] = { value: String(dd && dd.value).slice(0, 80) };
                }
              }
              return { __type: a.constructor && a.constructor.name, props: descs };
            }
            return String(a).slice(0, 100);
          });
          rec('console.'+fn, JSON.stringify(detail));
        } catch(e){ rec('console.'+fn, 'dump_err '+e.message); }
        return orig(...args);
      };
    } catch(e){}
  }

  // Worker constructor
  try {
    const OW = window.Worker;
    window.Worker = function(u, o){
      rec('new_Worker', String(u).slice(0,200));
      return new OW(u, o);
    };
    window.Worker.prototype = OW.prototype;
  } catch(e){}

  // Object.defineProperty logging for suspicious names
  try {
    const odp = Object.defineProperty;
    const seen = new Set();
    Object.defineProperty = function(t, k, d){
      try {
        const tn = (t === window ? 'window' : t && t.constructor && t.constructor.name || typeof t);
        const key = tn+'.'+String(k);
        if ((d.get || d.set) && !seen.has(key)) { seen.add(key); rec('defineProperty', key); }
      } catch(e){}
      return odp(t, k, d);
    };
  } catch(e){}

  // Date.now & performance.timeOrigin access counters
  let dnCount = 0, toCount = 0, pnCount = 0;
  try {
    const dn = Date.now.bind(Date);
    Date.now = function(){ dnCount++; if (dnCount % 5000 === 1) rec('Date.now', 'count='+dnCount); return dn(); };
  } catch(e){}
})();

`;

function launchChrome() {
  return new Promise((resolve) => {
    const proc = spawn(EXECUTABLE, [
      '--remote-debugging-port=9222',
      '--user-data-dir=D:\\dichchrome\\cdp_profile2',
      '--no-first-run', '--no-default-browser-check', '--window-size=1200,900',
      'about:blank',
    ], { stdio: 'ignore' });
    (async () => {
      for (let i = 0; i < 40; i++) {
        try { const r = await fetch('http://127.0.0.1:9222/json/version'); if (r.ok) return resolve(proc); } catch (e) {}
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error('devtools endpoint not up');
    })();
  });
}

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const tabs = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
      const p = tabs.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no page target');
}

async function run(enableRuntime) {
  const proc = await launchChrome();
  const ws = new WebSocket(await getWsUrl(), { maxPayload: 64 * 1024 * 1024 });
  let idc = 1;
  const pending = {};
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } });
  await new Promise((r) => ws.on('open', r));
  const call = (method, params, sessionId) =>
    new Promise((res) => { const id = idc++; pending[id] = res; ws.send(JSON.stringify({ id, method, params, sessionId })); });

  const targets = (await call('Target.getTargets')).result.targetInfos;
  const page = targets.find((t) => t.type === 'page' && t.url.includes('about:blank'));
  const { result: { sessionId } } = await call('Target.attachToTarget', { targetId: page.targetId, flatten: true });

  // Page.enable needed only for addScriptToEvaluateOnNewDocument (proven clean alone)
  await call('Page.enable', {}, sessionId);
  await call('Page.addScriptToEvaluateOnNewDocument', { source: CAMERA_INIT }, sessionId);
  if (enableRuntime) await call('Runtime.enable', {}, sessionId);

  await call('Page.navigate', { url: SITE }, sessionId);

  let verdict = null;
  for (let i = 0; i < 40 && !verdict; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await call('Runtime.evaluate', {
      expression: `(function(){try{var c=document.querySelector('#jsonResult');return c&&c.textContent.includes('isBot')?c.textContent:''}catch(e){return ''}})()`,
      returnByValue: true,
    }, sessionId).catch(() => null);
    const txt = res?.result?.result?.value || '';
    if (txt.includes('isBot')) { try { verdict = JSON.parse(txt); } catch (e) {} }
  }

  // Collect camera log
  let cam = [];
  try {
    const res = await call('Runtime.evaluate', { expression: 'JSON.stringify(window.__cameraLog||[])', returnByValue: true }, sessionId);
    cam = JSON.parse(res.result.result.value);
  } catch (e) {}

  console.log(`\n===== runtime=${enableRuntime} =====`);
  if (verdict) {
    console.log('isBot =', verdict.isBot);
    for (const [k, v] of Object.entries(verdict.details || {})) if (v === true) console.log('  TRUE ->', k);
  } else console.log('NO VERDICT');
  console.log('--- camera log ---');
  for (const e of cam.slice(0, 80)) console.log(`${e.t}ms ${e.api} ${e.d}`);

  ws.close(); proc.kill();
  return { verdict, cam };
}

(async () => {
  const off = await run(false);
  const on = await run(true);
  // summarize differences in camera logs
  const summarize = (cam) => {
    const m = {};
    for (const e of cam) { const k = e.api.split('.')[0]; m[k] = (m[k] || 0) + 1; }
    return m;
  };
  console.log('\n=== SUMMARY ===');
  console.log('off:', JSON.stringify(summarize(off.cam)));
  console.log('on :', JSON.stringify(summarize(on.cam)));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
