# SPEC — Ma trận 7 tầng kiểm tra trình duyệt (đối thủ: Akamai, Cloudflare, DataDome, Kasada, HUMAN/PerimeterX, F5 Shape, Arkose Labs, reCAPTCHA Enterprise)
> `v154 Research Phase (Historical POC)` contains historical research notes. `v152.0.7977.65 (Canonical Stable Distribution)` is current release identity. Current claims require current-version evidence.
> Bản đặc tả mục tiêu chính thức của BrowserMulti. Đối chiếu trạng thái với DEVLOG.md §6.
> **Cập nhật 2026-08-22:**
> - GIAI ĐOẠN 1 (CDP HARDENING) HOÀN THÀNH — deviceandbrowserinfo.com trả về isBot=false ngay cả khi drive bằng Playwright.
> - GIAI ĐOẠN 2 (HUMANIZED INPUT) HOÀN THÀNH — reCAPTCHA v3 = 0.9, Turnstile PASS với human_input.js.
> - GIAI ĐOẠN 3 (VALIDATION MỞ RỘNG) HOÀN THÀNH — BrowserScan Normal; Incolumitas 33/33 OK; FingerprintJS Pro toàn bộ Not Detected. Chi tiết: VALIDATION_REPORT.md.
> Trạng thái: ✅ đạt | ⚠️ một phần/chưa verify | ❌ chưa làm | ➖ không cần patch (upstream chuẩn)

## Tầng 1 — Network & Transport Layer
| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| TLS JA3/JA4/JA3N | ✅ | Build thật = binary Chromium thật, fingerprint trùng Chrome (ja4 `t13d1517h2_8daaf6152771_cb7bf5808d99` đã verify) |
| GREASE đúng vị trí | ✅ | Nhị phân thật → tự nhiên đúng |
| ALPN h2/http1.1 | ✅ | Verify http_version=h2 |
| HTTP/2 SETTINGS/PRIORITY/WINDOW_UPDATE (Akamai fp) | ✅ | akamai_hash=`52d84b11...` có mặt, ja4 trùng Chrome h2 (verify qua tls.peet.ws) |
| TCP/IP p0f (window/TTL=128/DF/MSS) | ✅ | Stack Windows thật |
| WebRTC ICE/SRTP/DTLS | ✅ VERIFIED PASS (direct, mDNS host candidates) | `.65` run completed ICE gathering; no literal private/public IP exposed. Proxy mode not tested in this run; validate proxy policy separately. | Direct smoke remains separate. |
| Direct CLI Smoke (Automation Mode) | ⚠️ INCONCLUSIVE | no-sandbox and token-sandbox modes timed out without exit code `0` or DOM output; not VERIFIED PASS. |
| Direct CLI Smoke (OS AppContainer) | ⚠️ BLOCKED_BY_OS_ACL_ON_DRIVE_D | Prior run returned `Access is denied (0x5)` and `STATUS_BREAKPOINT (0x80000003)`. |
| ECH / DoH mặc định | ⚠️ cần bật flag như Chrome ổn định |

## Tầng 2 — V8 Execution Environment
| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| CDP Error.stack ẩn frame | ✅ | Upstream sạch (verify: stack giống hệt khi không attach) |
| **CDP Micro-timing** | ✅ **ĐÃ VÁ** | `enable()` bỏ `setMaxCallStackSizeToCapture` (new Error() 17µs→10µs→gần baseline); `messageAdded` bỏ hẳn reporting Runtime-only (console.call 150µs→~40-65µs). **Verify: isBot=false qua Playwright** |
| **CDP Console getters** | ✅ **ĐÁ VÁ** | Patch `v8-runtime-agent-impl.cc messageAdded`: không serialize console args cho Runtime-only client → getter `.stack` poisoned không còn fire (verify errStackGetterFired=false) |
| Function.prototype.toString native | ✅ | Verify: `[native code]` chuẩn |
| Hàm không bọc Proxy | ➖ | Không dùng JS injection nên tự nhiên sạch |
| Math/JIT quirk x86_64 | ✅ | V8 thật |
| performance.now jitter clamp 100µs | ✅ | TimeClamper upstream nguyên vẹn (đo minDelta=0.1ms cả main+worker) |
| performance.memory hợp lệ | ✅ | API thật của build |

## Tầng 3 — Blink/DOM Identity (verify_spec_gaps.js — PASS toàn bộ)
| Hạng mục | Trạng thái | Kết quả đo được |
|---|---|---|
| navigator.webdriver=false (native getter) | ✅ | `function get webdriver() { [native code] }`, value=false |
| Biến cdc_/__webdriver/nightmare | ✅ | Không dùng Selenium/Puppeteer-inject |
| window.chrome descriptor | ✅ | `{writable:true, enumerable:true, configurable:true}` |
| window.chrome branches | ⚠️ | csi/loadTimes/app/app.getIsInstalled ✅; **runtime=undefined** (Chrome thật có nhờ builtin extension — cân nhắc patch sau nếu gặp site check; sannysoft vẫn pass) |
| plugins named+indexed+proto | ✅ | length=5, `['Chrome PDF Viewer']`✅, `[0]`✅, prototype=Plugin/MimeType✅ |
| Client Hints header == getHighEntropyValues() | ✅ | Cùng nguồn GenerateBrandVersionList (Sec-Ch-Ua = "Google Chrome" đã verify) |
| WorkerNavigator nhất quán | ✅ | hc/lang/tz đồng bộ; worker.webdriver=undefined là đúng spec (WorkerNavigator không có attr này) |
| Permissions.query ↔ Notification.permission | ✅ | SYNC (denied==denied; mapping prompt↔default/granted↔granted) |

## Tầng 4 — Hardware & Subsystem
| Hạng mục | Trạng thái |
|---|---|
| WebGL vendor/renderer thật (ANGLE/Direct3D) | ✅ GPU thật, không spoof |
| WebGL extensions/limits/shaders | ✅ |
| Canvas 2D Skia/DirectWrite thật, không noise injection | ✅ Nguyên tắc dự án: KHÔNG inject nhiễu — dùng giá trị thật |
| AudioContext fingerprint | ✅ Hệ âm thanh thật |
| Font metrics | ✅ Font Windows thật |
| Screen geometry (availHeight vs taskbar, screenX/Y, outer dims) | ✅ | viewport:null trong Playwright → outer=1296×854 thật, availH=1040 (=1080-40 taskbar) — verify |
| enumerateDevices/maxTouchPoints | ✅ Phần cứng thật |

## Tầng 5 — Behavioral Biometrics (human_input.js — HOÀN THÀNH & verify 2026-08-22)
| Hạng mục | Trạng thái | Kết quả đo được |
|---|---|---|
| Mouse Bézier + micro-tremor | ✅ | Cubic Bézier P1/P2 random, jitter Gaussian ±1px, overshoot+correction 30%; verify quỹ đạo (191,280)→(577,267) path=407px/28 events |
| event.isTrusted=true | ✅ | Events sinh từ CDP Input domain → isTrusted=true, không thể phân biệt in-page |
| pointermove sync refresh rate | ✅ | Interval avg 29-33ms (min 17/max 51) — dải tự nhiên 30-60Hz, không bắn hàng trăm event/ms |
| Keystroke dwell/flight | ✅ | Dwell 61-86ms (chuẩn 60-100); flight 92-150ms (chuẩn 80-180); space/dấu câu +150-300ms think-pause |
| Scroll decay physics | ✅ | Wheel chunks suy giảm e^{-kt} (240px→3 chunks), reading pause mỗi 5-8 chunk |
| visibilitychange/focus động | ➖ | Người dùng thủ công thì tự nhiên |

**Verify trên trang thật**: Turnstile token 21 chars ✅; reCAPTCHA v3 score = **0.9** sau ambient behavior ✅; keystroke demo gõ đúng chuỗi ✅

**Giai đoạn 3 — Validation thương mại (VALIDATION_REPORT.md)**:
| Hệ thống | Kết quả |
|---|---|
| BrowserScan | Test Results: Normal (Webdriver/UA/CDP/Navigator) ✅ |
| Incolumitas | **33/33 = OK, 0 FAILED** (kể cả puppeteerExtraStealthUsed=OK) ✅ |
| FingerprintJS Pro | Bot/VPN/Tampering/DevTools/VM/Privacy/Blocklist/HighActivity = Not Detected; Suspect Score 6 ✅ |
| Antoine Vastel bots | Server 502 — ngừng hoạt động ⚪ |

## Tầng 6 — IP Reputation
| Hạng mục | Trạng thái |
|---|---|
| Residential/Mobile IP | ➖ Phụ thuộc người vận hành (proxy), không phải code browser |
| GeoIP ↔ timezone/language/Accept-Language | ⚠️ Cần hướng dẫn cấu hình profile (--lang, timezone hệ thống) |
| Không mở cổng proxy lộ / header leak | ✅ Không gắn proxy trung gian mặc định |

## Tầng 7 — Profile Aging & Identity
| Hạng mục | Trạng thái |
|---|---|
| Cache/LocalStorage/IndexedDB tích lũy | ✅ user_data cố định qua launch_browser.bat |
| History/Bookmark tự nhiên | ⚠️ Người dùng tự nuôi |
| Cookie dài hạn NID/AEC/SID, __cf_bm/cf_clearance | ✅ Profile giữ cookie vĩnh viễn |
| Private State Tokens | ✅ Upstream hỗ trợ |
| Release lifecycle consistency | ✅ `v152.0.7977.65` is canonical; v154 notes are historical POC |

---

**Nguyên tắc vàng của dự án** (rút từ kinh nghiệm): *không bao giờ inject JS để spoof giá trị* — mọi fingerprint phải đến từ việc build binary thật chạy trên phần cứng thật. Chỉ can thiệp source-level những chỗ Chromium tự tiết lộ trạng thái bất thường (headless UA, brand list, preview serialization...).
