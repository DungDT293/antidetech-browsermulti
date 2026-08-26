const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.env.BROWSERMULTI_ROOT || 'D:\\dichchrome';
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version;
const EXECUTABLE = process.env.BROWSERMULTI_EXECUTABLE || path.join(ROOT, 'dist', `browsermulti-${VERSION}-win64`, 'chrome.exe');
const OUTPUT = process.env.BROWSERMULTI_WEBRTC_REPORT || path.join(ROOT, 'validation_webrtc.json');
const PROXY = process.env.BROWSERMULTI_PROXY || undefined;

function isPrivateIp(ip) {
  return /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
    ip === '::1' || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd') || ip.toLowerCase().startsWith('fe80:');
}

(async () => {
  const result = {
    version: VERSION,
    executable: EXECUTABLE,
    proxy_configured: Boolean(PROXY),
    candidates: [],
    private_addresses: [],
    public_addresses: [],
    gathering_complete: false,
    verdict: 'INCONCLUSIVE',
  };
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: EXECUTABLE,
      headless: true,
      proxy: PROXY ? { server: PROXY } : undefined,
      args: ['--no-first-run', '--no-default-browser-check'],
    });
    const page = await browser.newPage();
    result.candidates = await page.evaluate(async () => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const candidates = [];
      pc.createDataChannel('browsermulti-webrtc-check');
      pc.onicecandidate = event => {
        if (event.candidate) candidates.push(event.candidate.toJSON());
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve();
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') resolve();
        };
        setTimeout(resolve, 10000);
      });
      const complete = pc.iceGatheringState === 'complete';
      pc.close();
      return { candidates, complete };
    });
    result.gathering_complete = result.candidates.complete;
    result.candidates = result.candidates.candidates;
    const addresses = [...new Set(result.candidates.map(candidate => {
      const match = candidate.candidate.match(/\s(\S+)\s\d+\s+typ\s+(host|srflx|prflx|relay)\b/);
      return match ? match[1] : null;
    }).filter(Boolean))];
    result.private_addresses = addresses.filter(isPrivateIp);
    result.public_addresses = addresses.filter(ip => !isPrivateIp(ip) && !ip.toLowerCase().endsWith('.local'));
    result.candidate_addresses = addresses;
    if (!result.gathering_complete) result.verdict = 'INCONCLUSIVE';
    else if (result.private_addresses.length) result.verdict = 'FAIL_PRIVATE_ADDRESS_EXPOSED';
    else result.verdict = 'PASS_NO_PRIVATE_ADDRESS_EXPOSED';
  } catch (error) {
    result.error = String(error.message || error);
  } finally {
    if (browser) await browser.close().catch(() => {});
    fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit(result.verdict.startsWith('PASS') ? 0 : 1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
