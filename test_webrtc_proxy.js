const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.env.BROWSERMULTI_ROOT || 'D:\\dichchrome';
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version;
const EXECUTABLE = process.env.BROWSERMULTI_EXECUTABLE ||
  path.join(ROOT, 'dist', `browsermulti-${VERSION}-win64`, 'chrome.exe');
const OUTPUT = process.env.BROWSERMULTI_WEBRTC_PROXY_REPORT ||
  path.join(ROOT, 'validation_webrtc_proxy.json');
const PROXY = process.env.TEST_PROXY || '';
const EXPECTED_PUBLIC_IP = process.env.TEST_EXPECTED_PUBLIC_IP || '';
const STUN = process.env.TEST_WEBRTC_STUN || '';

function redactProxy(value) {
  if (!value) return { configured: false };
  try {
    const parsed = new URL(value);
    return {
      configured: true,
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port || null,
      has_credentials: Boolean(parsed.username || parsed.password),
    };
  } catch (_) {
    return { configured: true, parseable: false };
  }
}

function isPrivateIp(ip) {
  const lower = ip.toLowerCase();
  return /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
    lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
}

function candidateInfo(candidate) {
  const text = candidate.candidate || '';
  const match = text.match(/\s(\S+)\s\d+\s+typ\s+(host|srflx|prflx|relay)\b/);
  return {
    candidate: text,
    type: candidate.type || (match && match[2]) || null,
    protocol: candidate.protocol || null,
    address: candidate.address || (match && match[1]) || null,
  };
}

function writeResult(result) {
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

(async () => {
  const result = {
    test: 'webrtc-proxy-privacy',
    version: VERSION,
    executable: EXECUTABLE,
    proxy: redactProxy(PROXY),
    expected_public_ip_configured: Boolean(EXPECTED_PUBLIC_IP),
    policy: '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    candidates: [],
    candidate_types: [],
    candidate_addresses: [],
    mdns_addresses: [],
    private_addresses: [],
    public_addresses: [],
    relay_candidates: 0,
    gathering_complete: false,
    verdict: 'INCONCLUSIVE',
    evidence_class: 'A',
  };
  let browser;
  let profile;
  try {
    if (!PROXY) {
      result.verdict = 'INCONCLUSIVE_NO_PROXY';
      result.error = 'Set TEST_PROXY to an authorized proxy; proxy route cannot be tested otherwise.';
      writeResult(result);
      process.exitCode = 1;
      return;
    }
    if (!fs.existsSync(EXECUTABLE)) throw new Error(`Missing executable: ${EXECUTABLE}`);
    profile = fs.mkdtempSync(path.join(os.tmpdir(), 'browsermulti-webrtc-proxy-'));
    browser = await chromium.launch({
      executablePath: EXECUTABLE,
      headless: true,
      proxy: { server: PROXY },
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      ],
    });
    const page = await browser.newPage();
    const gathered = await page.evaluate(async (stun) => {
      const pc = new RTCPeerConnection(stun ? { iceServers: [{ urls: stun }] } : { iceServers: [] });
      const candidates = [];
      pc.createDataChannel('browsermulti-webrtc-proxy-check');
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
        setTimeout(resolve, 15000);
      });
      const complete = pc.iceGatheringState === 'complete';
      pc.close();
      return { candidates, complete };
    }, STUN);
    result.gathering_complete = gathered.complete;
    result.candidates = gathered.candidates.map(candidateInfo);
    result.candidate_types = [...new Set(result.candidates.map(c => c.type).filter(Boolean))];
    result.relay_candidates = result.candidates.filter(c => c.type === 'relay').length;
    const addresses = [...new Set(result.candidates.map(c => c.address).filter(Boolean))];
    result.candidate_addresses = addresses;
    result.mdns_addresses = addresses.filter(ip => ip.toLowerCase().endsWith('.local'));
    result.private_addresses = addresses.filter(ip => !ip.toLowerCase().endsWith('.local') && isPrivateIp(ip));
    result.public_addresses = addresses.filter(ip => !ip.toLowerCase().endsWith('.local') && !isPrivateIp(ip));
    result.expected_public_ip_exposed = Boolean(EXPECTED_PUBLIC_IP && addresses.includes(EXPECTED_PUBLIC_IP));
    if (!result.gathering_complete) {
      result.verdict = 'INCONCLUSIVE_GATHERING_TIMEOUT';
    } else if (result.expected_public_ip_exposed || result.public_addresses.some(ip => !result.candidates.some(c => c.address === ip && c.type === 'relay'))) {
      result.verdict = 'FAIL_PUBLIC_IP_EXPOSED';
    } else if (result.relay_candidates) {
      result.verdict = 'PASS_RELAY_OR_PROXY_ROUTE';
    } else {
      result.verdict = 'PASS_MDNS_OR_RELAY_NO_PUBLIC_IP';
      result.route_attribution = 'limited: no relay candidate; non-public candidates are mDNS/private only';
    }
  } catch (error) {
    result.verdict = 'INCONCLUSIVE_ERROR';
    result.error = String(error.message || error);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (profile) fs.rmSync(profile, { recursive: true, force: true });
    result.cleanup = !profile || !fs.existsSync(profile);
    writeResult(result);
  }
  process.exitCode = result.verdict.startsWith('PASS') ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exit(1);
});
