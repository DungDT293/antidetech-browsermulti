// cdp_site_quick.js — raw CDP domain test against the real detection site
const http = require('http');
http.createServer(() => {}).listen(8933, '127.0.0.1'); // placeholder (not used)

let src = require('fs').readFileSync('D:\\dichchrome\\cdp_domain_test.js', 'utf8');
// Reuse launchChrome/getWsUrl/send/call/run from cdp_domain_test by evaluating it
// but override SITE to the real site and skip its own main().
eval(src.split('(async () =>')[0]);

(async () => {
  await run(['none']);
  await run(['Runtime']);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
