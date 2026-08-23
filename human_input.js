// human_input.js — Humanized Input Engine cho BrowserMulti
// Sinh quỹ đạo chuột Bézier + jitter, keystroke dynamics, scroll decay physics.
'use strict';

const state = new WeakMap(); // page -> {x, y}

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function gauss(sigma = 1) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
}

// Velocity profile: ease-in -> peak -> ease-out (peak lệch ngẫu nhiên quanh giữa)
function timeWarp(s, peak) {
  if (s < peak) return (s / peak) ** (2.2 + Math.random() * 0.6) / 2 * 1.0 * peak;
  return 0.5 + ((s - peak) / (1 - peak)) ** (1 / (2.4 + Math.random() * 0.8)) * 0.5;
}

function getPos(page) {
  return state.get(page) || { x: rand(80, 200), y: rand(120, 300) };
}
function setPos(page, x, y) {
  state.set(page, { x, y });
}

// ==================== HUMAN MOUSE MOVE ====================
async function humanMouseMove(page, targetX, targetY, opts = {}) {
  const from = opts.from || getPos(page);
  targetX = clamp(Math.round(targetX), 0, 40000);
  targetY = clamp(Math.round(targetY), 0, 40000);

  const dx = targetX - from.x, dy = targetY - from.y;
  const dist = Math.hypot(dx, dy);

  // Số bước: ~9-14px/event, tối thiểu 10, tối đa 140
  const pxPerEvent = rand(9, 14);
  let N = clamp(Math.round(dist / pxPerEvent), dist < 24 ? 4 : 10, 140);

  // Điểm kiểm soát P1/P2: lệch vuông góc ngẫu nhiên trong bounding box hợp lý
  const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);
  const bow1 = gauss(dist * 0.12), bow2 = gauss(dist * 0.10);
  const p0 = { x: from.x, y: from.y };
  const p3 = { x: targetX, y: targetY };
  const p1 = {
    x: from.x + dx * rand(0.15, 0.35) + perpX * bow1,
    y: from.y + dy * rand(0.15, 0.35) + perpY * bow1,
  };
  const p2 = {
    x: from.x + dx * rand(0.6, 0.85) + perpX * bow2,
    y: from.y + dy * rand(0.6, 0.85) + perpY * bow2,
  };

  const peak = rand(0.38, 0.55); // vị trí đỉnh vận tốc
  const baseInterval = opts.hz ? 1000 / opts.hz : rand(14, 18); // ~60Hz
  const trace = [];
  const t0 = Date.now();

  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const t = timeWarp(s, peak);
    const pt = bezier(p0, p1, p2, p3, t);
    const jx = clamp(gauss(0.5), -1, 1);
    const jy = clamp(gauss(0.5), -1, 1);
    const ex = clamp(Math.round(pt.x + jx), 0, 40000);
    const ey = clamp(Math.round(pt.y + jy), 0, 40000);
    await page.mouse.move(ex, ey);
    trace.push({ t: Date.now() - t0, x: ex, y: ey });
    setPos(page, ex, ey);
    await sleep(baseInterval * rand(0.75, 1.3));
  }

  // Overshoot + correction (xác suất ~30%, chỉ khi khoảng cách đáng kể)
  if (dist > 90 && Math.random() < 0.3) {
    const ov = rand(3, 11);
    const ox = Math.round(targetX + (dx / (dist || 1)) * ov);
    const oy = Math.round(targetY + (dy / (dist || 1)) * ov);
    await page.mouse.move(ox, oy);
    trace.push({ t: Date.now() - t0, x: ox, y: oy });
    setPos(page, ox, oy);
    await sleep(rand(40, 90));
    for (let k = 0; k < 2; k++) {
      const cx = Math.round(ox + (targetX - ox) * (0.5 + 0.5 * k));
      const cy = Math.round(oy + (targetY - oy) * (0.5 + 0.5 * k));
      await page.mouse.move(cx, cy);
      trace.push({ t: Date.now() - t0, x: cx, y: cy });
      setPos(page, cx, cy);
      await sleep(rand(16, 34));
    }
  }

  const durationMs = Date.now() - t0;
  let pathLength = 0;
  for (let i = 1; i < trace.length; i++) {
    pathLength += Math.hypot(trace[i].x - trace[i - 1].x, trace[i].y - trace[i - 1].y);
  }
  const intervals = trace.map((e, i) => i ? e.t - trace[i - 1].t : e.t).slice(1);
  return {
    events: trace,
    count: trace.length,
    durationMs,
    pathLength: Math.round(pathLength),
    avgInterval: intervals.length ? +(intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1) : 0,
    minInterval: intervals.length ? Math.min(...intervals) : 0,
    maxInterval: intervals.length ? Math.max(...intervals) : 0,
    from, to: { x: targetX, y: targetY },
  };
}

// ==================== HUMAN CLICK ====================
async function humanClick(page, selectorOrCoords, opts = {}) {
  let tx, ty;
  if (typeof selectorOrCoords === 'string') {
    const loc = page.locator(selectorOrCoords).first();
    const box = await loc.boundingBox();
    if (!box) throw new Error('boundingBox null: ' + selectorOrCoords);
    tx = box.x + box.width * rand(0.3, 0.7);
    ty = box.y + box.height * rand(0.3, 0.7);
  } else {
    tx = selectorOrCoords.x; ty = selectorOrCoords.y;
  }

  const moveStats = await humanMouseMove(page, tx, ty, opts.moveOpts || {});
  await sleep(rand(50, 150)); // pre-click pause
  await page.mouse.down();
  const dwell = rand(60, 120); // dwell time
  await sleep(dwell);
  await page.mouse.up();

  return { move: moveStats, prePause: true, dwellMs: +dwell.toFixed(1) };
}

// ==================== HUMAN TYPE ====================
async function humanType(page, selector, text, opts = {}) {
  if (selector) await humanClick(page, selector, opts.clickOpts || {});
  await sleep(rand(150, 350)); // focus settle

  const log = [];
  const t0 = Date.now();
  for (const ch of String(text)) {
    const key = ch === ' ' ? ' ' : ch;
    await page.keyboard.down(key);
    const dwell = rand(60, 100); // dwell 60-100ms
    await sleep(dwell);
    await page.keyboard.up(key);

    let flight = rand(80, 180); // flight 80-180ms
    let extraNote = '';
    if (/[\s.,!?]/.test(ch)) {
      flight += rand(150, 300); // nhịp suy nghĩ tại space/dấu câu
      extraNote = '+think';
    }
    await sleep(flight);
    log.push({ ch, dwellMs: +dwell.toFixed(1), flightMs: +flight.toFixed(1), note: extraNote });
  }
  return { totalMs: Date.now() - t0, keys: log };
}

// ==================== HUMAN SCROLL ====================
async function humanScroll(page, totalDeltaY, opts = {}) {
  const sign = Math.sign(totalDeltaY);
  let remaining = Math.abs(totalDeltaY);
  const trace = [];
  const t0 = Date.now();
  const decayK = rand(0.25, 0.45);
  const pos = getPos(page);
  await page.mouse.move(pos.x, pos.y).catch(() => {});

  let i = 0;
  while (remaining > 0) {
    // delta suy giảm theo e^{-k*i}, mỗi nốt 60-140px
    let d = Math.min(remaining, rand(60, 140) * Math.exp(-decayK * i * 0.35));
    if (d < 12 && remaining > 0) d = Math.min(remaining, rand(20, 45)); // đuôi mượt
    d = Math.max(8, Math.round(d));
    const wheelY = sign * d;
    const wheelX = Math.random() < 0.15 ? Math.round(gauss(3)) : 0; // lệch ngang hiếm
    await page.mouse.wheel(wheelX, wheelY);
    remaining -= d;
    trace.push({ t: Date.now() - t0, deltaY: wheelY });
    setPos(page, pos.x, pos.y);
    i++;
    if (i % rand(5, 8) === 0) await sleep(rand(100, 250)); // reading pause
    await sleep(rand(16, 40));
  }
  return { totalMs: Date.now() - t0, chunks: trace.length, deltas: trace };
}

module.exports = { humanMouseMove, humanClick, humanType, humanScroll, gauss, rand };
