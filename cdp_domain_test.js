// Raw CDP domain isolation test: which protocol domain triggers bot detection?
const WebSocket = require('ws');
const { spawn } = require('child_process');

const EXECUTABLE = 'D:\\dichchrome\\src\\out\\Default\\chrome.exe';
const SITE = 'http://127.0.0.1:8933/probe';

// local probe server
const http = require('http');
const HTML = require('fs').readFileSync('D:\\dichchrome\\test_reports\\cdp_probe.html', 'utf8');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(HTML);
}).listen(8933, '127.0.0.1');

function launchChrome() {
  return new Promise((resolve) => {
    const proc = spawn(EXECUTABLE, [
      '--remote-debugging-port=9222',
      '--user-data-dir=D:\\dichchrome\\cdp_profile',
      '--no-first-run', '--no-default-browser-check', '--window-size=1200,900',
      'about:blank',
    ], { stdio: 'ignore' });
    // Wait for devtools endpoint
    const wait = async () => {
      for (let i = 0; i < 40; i++) {
        try {
          const r = await fetch('http://127.0.0.1:9222/json/version');
          if (r.ok) return resolve(proc);
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error('devtools endpoint not up');
    };
    wait();
  });
}

function getWsUrl() {
  return (async () => {
    for (let i = 0; i < 40; i++) {
      try {
        const tabs = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
        const page = tabs.find((t) => t.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('no page target');
  })();
}

function send(ws, id, method, params = {}, sessionId) {
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
}

async function run(domains, targetUrl) {
  const SITE = targetUrl || 'http://127.0.0.1:8933/probe';
  const isLocal = !targetUrl;
  const proc = await launchChrome();
  const ws = new WebSocket(await getWsUrl(), { maxPayload: 64 * 1024 * 1024 });
  let idc = 1;
  const pending = {};
  ws.on('message', (data) => {
    const m = JSON.parse(data);
    if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
  });
  await new Promise((r) => ws.on('open', r));
  const call = (method, params, sessionId) =>
    new Promise((res) => { const id = idc++; pending[id] = res; send(ws, id, method, params, sessionId); });

  // Attach to the page target
  const targets = (await call('Target.getTargets')).result.targetInfos;
  const page = targets.find((t) => t.type === 'page');
  const { result: { sessionId } } = await call('Target.attachToTarget', { targetId: page.targetId, flatten: true });

  // Enable ONLY requested domains
  for (const d of domains) await call(d + '.enable', {}, sessionId);

  // Navigate to local probe
  await call('Runtime.evaluate', { expression: `location.href='${SITE}'`, awaitPromise: false }, sessionId);

  // Poll for result
  let result = null;
  const expr = isLocal
    ? `(function(){var o=document.getElementById('out');return o&&o.textContent.startsWith('RESULT:')?o.textContent.slice(7):''})()`
    : `(function(){try{var c=document.querySelector('#jsonResult');return c&&c.textContent.includes('isBot')?c.textContent:''}catch(e){return ''}})()`;
  for (let i = 0; i < (isLocal ? 20 : 40) && !result; i++) {
    await new Promise((r) => setTimeout(r, isLocal ? 1000 : 2000));
    const res = await call('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
    }, sessionId);
    const txt = res?.result?.result?.value || '';
    if (!isLocal && txt.includes('isBot')) {
      try { result = JSON.parse(txt); } catch (e) {}
    } else if (isLocal && txt) {
      try { result = JSON.parse(txt); } catch (e) {}
    }
  }

  console.log(`\n=== domains: [${domains.join(', ')}] ===`);
  if (isLocal) console.log(JSON.stringify(result, null, 1));

  ws.close();
  proc.kill();
  return result;
}

(async () => {
  const suites = [
    ['none'],
    ['Runtime'],
  ];
  if (process.argv[2] === 'site') {
    // Real detection site: none vs Runtime
    for (const s of [['none'], ['Runtime']]) {
      const r = await run(s, 'https://deviceandbrowserinfo.com/are_you_a_bot');
      console.log(`>>> [${s.join(',')}] isBot =`, r ? r.isBot : 'NO RESULT');
    }
  } else {
  const SITE = 'http://127.0.0.1:8933/probe'; // local probe page
  const results = {};
  for (const s of suites) {
    results[s.join(',')] = await run(s);
  }
  console.log('\n=== DIFF none vs Runtime ===');
  const [a, b] = [results['none'], results['Runtime']];
  if (a && b) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
        console.log(`DIFF ${k}: none=${JSON.stringify(a[k])} | runtime=${JSON.stringify(b[k])}`);
      }
    }
    // numeric closeness check for timers
    console.log('\ntimerMainMinDelta:', a.timerMainMinDelta, 'vs', b.timerMainMinDelta);
    console.log('workerMinDelta:', a.workerMinDelta, 'vs', b.workerMinDelta);
    console.log('workerStartupLatency:', a.workerStartupLatency, 'vs', b.workerStartupLatency);
    console.log('workerExecAgeMs:', a.workerExecAgeMs, 'vs', b.workerExecAgeMs);
  } else {
    console.log('missing results', Object.keys(results));
  }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
