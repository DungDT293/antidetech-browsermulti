"""Capture and compare BrowserMulti's stable browser identity surface."""

import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List

from playwright.async_api import async_playwright

ROOT = Path(os.environ.get("BROWSERMULTI_ROOT", Path(__file__).resolve().parents[1]))
VERSION = json.loads((ROOT / "version.json").read_text(encoding="utf-8"))["version"]
EXECUTABLE = Path(
    os.environ.get(
        "BROWSERMULTI_EXECUTABLE",
        ROOT / "dist" / f"browsermulti-{VERSION}-win64" / "chrome.exe",
    )
)
BASELINE = ROOT / "fingerprint_snapshot_152.json"

_CAPTURE_SCRIPT = r"""
async () => {
  const safe = (fn, fallback = null) => {
    try { return fn(); } catch (_) { return fallback; }
  };
  const permission = async (name) => {
    try { return (await navigator.permissions.query({name})).state; }
    catch (_) { return "unsupported"; }
  };
  const uaData = navigator.userAgentData || null;
  const high = uaData ? await safe(
    () => uaData.getHighEntropyValues([
      "architecture", "bitness", "model", "platform", "platformVersion",
      "uaFullVersion", "fullVersionList", "wow64"
    ]), {}
  ) : {};
  const webgl = (() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { available: false };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      available: true,
      vendor: safe(() => gl.getParameter(gl.VENDOR)),
      renderer: safe(() => gl.getParameter(gl.RENDERER)),
      version: safe(() => gl.getParameter(gl.VERSION)),
      shading_language_version: safe(() => gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
      unmasked_vendor: debug ? safe(() => gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : null,
      unmasked_renderer: debug ? safe(() => gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
      max_texture_size: safe(() => gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      max_cube_map_texture_size: safe(() => gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)),
      max_renderbuffer_size: safe(() => gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
      max_vertex_attribs: safe(() => gl.getParameter(gl.MAX_VERTEX_ATTRIBS)),
      max_vertex_uniform_vectors: safe(() => gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)),
      max_fragment_uniform_vectors: safe(() => gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)),
      aliased_line_width_range: safe(() => Array.from(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE))),
      aliased_point_size_range: safe(() => Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE))),
      extensions: safe(() => (gl.getSupportedExtensions() || []).sort()),
    };
  })();
  const audio = (() => {
    const out = { available: typeof AudioContext !== "undefined", sample_rate: null, base_latency: null,
      output_latency: null, max_channel_count: null, state: null, render_digest: null };
    if (!out.available) return out;
    const ctx = safe(() => new AudioContext());
    if (!ctx) return out;
    out.sample_rate = safe(() => ctx.sampleRate);
    out.base_latency = safe(() => ctx.baseLatency);
    out.output_latency = safe(() => ctx.outputLatency, null);
    out.max_channel_count = safe(() => ctx.destination.maxChannelCount);
    out.state = safe(() => ctx.state);
    safe(() => ctx.close());
    return out;
  })();
  const plugins = Array.from(navigator.plugins || []).map(p => ({name: p.name, filename: p.filename, length: p.length}));
  const mime_types = Array.from(navigator.mimeTypes || []).map(m => ({type: m.type, suffixes: m.suffixes, description: m.description}));
  const chrome_descriptor = safe(() => {
    const d = Object.getOwnPropertyDescriptor(window, "chrome");
    return d ? {configurable: !!d.configurable, enumerable: !!d.enumerable, writable: !!d.writable,
      has_value: Object.prototype.hasOwnProperty.call(d, "value")} : null;
  });
  const webdriver_descriptor = safe(() => {
    let proto = Navigator.prototype;
    while (proto && !Object.prototype.hasOwnProperty.call(proto, "webdriver")) proto = Object.getPrototypeOf(proto);
    const d = proto && Object.getOwnPropertyDescriptor(proto, "webdriver");
    return d ? {configurable: !!d.configurable, enumerable: !!d.enumerable, has_getter: typeof d.get === "function",
      getter_source: d.get ? Function.prototype.toString.call(d.get) : null} : null;
  });
  return {
    navigator: {
      user_agent: navigator.userAgent,
      app_version: navigator.appVersion,
      app_name: navigator.appName,
      app_code_name: navigator.appCodeName,
      platform: navigator.platform,
      vendor: navigator.vendor,
      vendor_sub: navigator.vendorSub,
      product: navigator.product,
      product_sub: navigator.productSub,
      language: navigator.language,
      languages: Array.from(navigator.languages || []),
      hardware_concurrency: navigator.hardwareConcurrency,
      device_memory: navigator.deviceMemory === undefined ? null : navigator.deviceMemory,
      max_touch_points: navigator.maxTouchPoints,
      cookie_enabled: navigator.cookieEnabled,
      do_not_track: navigator.doNotTrack,
      webdriver: navigator.webdriver,
      pdf_viewer_enabled: safe(() => navigator.pdfViewerEnabled),
      plugins_length: navigator.plugins.length,
      plugins,
      mime_types_length: navigator.mimeTypes.length,
      mime_types,
      user_agent_data_present: !!uaData,
      ua_data_brands: uaData ? uaData.brands : [],
      ua_data_mobile: uaData ? uaData.mobile : null,
      ua_data_platform: uaData ? uaData.platform : null,
      ua_data_architecture: high.architecture || null,
      ua_data_bitness: high.bitness || null,
      ua_data_model: high.model || null,
      ua_data_platform_version: high.platformVersion || null,
      ua_data_full_version: high.uaFullVersion || null,
      ua_data_full_version_list: high.fullVersionList || [],
      ua_data_wow64: high.wow64 === undefined ? null : high.wow64,
    },
    screen: {
      width: screen.width, height: screen.height, avail_width: screen.availWidth, avail_height: screen.availHeight,
      color_depth: screen.colorDepth, pixel_depth: screen.pixelDepth, pixel_ratio: devicePixelRatio,
      orientation_type: safe(() => screen.orientation.type), orientation_angle: safe(() => screen.orientation.angle),
      is_extended: safe(() => screen.isExtended),
    },
    window: {
      inner_width: innerWidth, inner_height: innerHeight, outer_width: outerWidth, outer_height: outerHeight,
      screen_x: screenX, screen_y: screenY, device_pixel_ratio: devicePixelRatio,
      chrome_present: typeof window.chrome === "object", chrome_runtime_present: !!safe(() => window.chrome && window.chrome.runtime),
      chrome_descriptor, location_protocol: location.protocol,
    },
    document: {
      hidden: document.hidden, visibility_state: document.visibilityState, has_focus: document.hasFocus(),
      content_type: document.contentType, character_set: document.characterSet, compat_mode: document.compatMode,
      title_length: document.title.length, doctype_present: !!document.doctype,
    },
    webgl,
    audio,
    permissions: {
      notification: safe(() => Notification.permission, "unsupported"),
      notifications: await permission("notifications"),
      geolocation: await permission("geolocation"),
      camera: await permission("camera"),
      microphone: await permission("microphone"),
      clipboard_read: await permission("clipboard-read"),
      clipboard_write: await permission("clipboard-write"),
    },
    descriptors: { chrome: chrome_descriptor, webdriver: webdriver_descriptor },
  };
}
"""


def _leaf_count(value: Any) -> int:
    if isinstance(value, dict):
        return sum(_leaf_count(item) for item in value.values())
    if isinstance(value, list):
        return sum(_leaf_count(item) for item in value)
    return 1


def _diff(before: Any, after: Any, prefix: str = "") -> List[Dict[str, Any]]:
    if isinstance(before, dict) and isinstance(after, dict):
        changes = []
        for key in sorted(set(before) | set(after)):
            path = f"{prefix}.{key}" if prefix else key
            if key not in before:
                changes.append({"path": path, "kind": "added", "after": after[key]})
            elif key not in after:
                changes.append({"path": path, "kind": "removed", "before": before[key]})
            else:
                changes.extend(_diff(before[key], after[key], path))
        return changes
    if before != after:
        return [{"path": prefix, "kind": "changed", "before": before, "after": after}]
    return []


async def capture() -> Dict[str, Any]:
    if not EXECUTABLE.is_file():
        raise FileNotFoundError(f"Missing BrowserMulti executable: {EXECUTABLE}")
    profile = Path(tempfile.mkdtemp(prefix="browsermulti-fingerprint-"))
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                executable_path=str(EXECUTABLE),
                headless=True,
                args=["--no-first-run", "--no-default-browser-check"],
            )
            try:
                context = await browser.new_context(viewport=None)
                page = await context.new_page()
                await page.goto("data:text/html,<title>BrowserMulti fingerprint snapshot</title>", wait_until="load")
                fingerprint = await page.evaluate(_CAPTURE_SCRIPT)
                await context.close()
            finally:
                await browser.close()
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return fingerprint


def main() -> int:
    fingerprint = asyncio.run(capture())
    field_count = _leaf_count(fingerprint)
    assert field_count >= 50, f"snapshot schema too small: {field_count} leaves"
    current = {
        "schema_version": 1,
        "version": VERSION,
        "fingerprint": fingerprint,
        "field_count": field_count,
        "metadata": {
            "executable": str(EXECUTABLE.resolve()),
            "headless": True,
            "viewport": None,
            "proxy_configured": bool(os.environ.get("BROWSERMULTI_PROXY")),
            "evidence_class": "A",
        },
    }
    if BASELINE.exists():
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        changes = _diff(baseline.get("fingerprint", {}), fingerprint, "fingerprint")
        current["comparison"] = {"status": "PASS" if not changes else "FAIL", "diff": changes}
        print(json.dumps({"status": current["comparison"]["status"], "field_count": field_count, "diff_count": len(changes)}, indent=2))
        return 0 if not changes else 1

    current["comparison"] = {"status": "BASELINE_CREATED", "diff": []}
    BASELINE.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": "BASELINE_CREATED", "field_count": field_count}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
