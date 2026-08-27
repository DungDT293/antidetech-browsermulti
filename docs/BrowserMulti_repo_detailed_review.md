# BrowserMulti — Đánh giá Repo Chi Tiết

> Historical audit snapshot. Version claims below describe the repository state observed on 2026-08-26; current release metadata lives in `version.json`.

**Repo:** `https://github.com/DungDT293/antidetech-browsermulti`
**Ngày đánh giá:** 2026-08-26
**Phạm vi:** đọc README, handoff, SPEC, validation report, architecture/build docs và các file SDK chính được public trong repo.
**Mục tiêu:** đánh giá chất lượng kiến trúc, độ trưởng thành engineering, tính reproducibility và các điểm yếu có thể trở thành blocker khi đưa project thành một Chromium distribution/SDK nghiêm túc.

> **Lưu ý:** Đây là đánh giá code/repository từ những phần đã đọc trực tiếp. Không phải security audit toàn bộ Chromium/V8 patch line-by-line, không phải fuzzing audit và không phải chứng nhận “undetectable”.

---

## 1. Executive Summary

### Nhận định tổng thể

**Audit snapshot — không phải trạng thái hiện hành.** BrowserMulti có ý tưởng kỹ thuật tốt và hướng kiến trúc đúng: thay vì chỉ dùng JavaScript injection, project can thiệp ở Chromium/Blink/V8 source level, sau đó expose qua Python Playwright SDK. README mô tả native C++ patches, Playwright/CDP, static build và automated upstream synchronization. [README](https://github.com/DungDT293/antidetech-browsermulti)

Current documentation after P1 uses this status: **implementation complete; selected validation gates pending**. Current truth lives in `README.md`, `VALIDATION_REPORT.md`, `docs/validation.md`, and `handoff.md`.

Điểm mạnh nhất của project là:

- Chọn đúng abstraction layer: Chromium/Blink/V8 thay vì chỉ patch JS runtime.
- Có separation giữa Chromium root patch và V8 patch.
- Có automated build/sync pipeline.
- Có benchmark và validation report tương đối bài bản.
- Có Python SDK để biến custom Chromium thành thứ có thể sử dụng từ automation code.
- Có tư duy reproducibility tốt hơn nhiều repo stealth browser dạng script.

Audit snapshot kết luận project **chưa ở mức production-grade browser platform**. Kết luận này vẫn có giá trị như historical review; current docs ghi rõ P1 implementation complete nhưng selected validation gates còn pending.

Ba blocker trong audit snapshot:

1. **Version/release consistency 152 ↔ 154** — đã được chuẩn hóa cho current `.65` metadata.
2. **Runtime/build/validation phụ thuộc machine-specific Windows paths** — SDK đã cải thiện; workspace build portability còn roadmap.
3. **Direct-launch/sandbox uncertainty và thiếu CI regression integration** — direct CLI hiện vẫn `INCONCLUSIVE_TIMEOUT`; CI/provenance còn roadmap.

Không dùng bảng điểm audit cũ làm điểm số hiện hành.

### Điểm số tổng quan

| Hạng mục | Điểm |
|---|---:|
| Ý tưởng / kiến trúc | 8.5/10 |
| Chromium integration | 8.0/10 |
| SDK design | 7.0/10 |
| Validation tư duy | 8.0/10 |
| Build/release engineering | 6.0/10 |
| Reproducibility | 5.5/10 |
| Maintainability | 6.0/10 |
| Documentation | 7.5/10 |
| Production readiness | 5.5/10 |
| Tiềm năng phát triển | 9.0/10 |

**Đánh giá chung của audit snapshot: ~7.2/10 tại 2026-08-26; không phải điểm số hiện hành.**

---

# 2. Điểm mạnh nổi bật

## 2.1. Kiến trúc native C++ là quyết định đúng

README xác định BrowserMulti là custom Chromium build với native source patches qua Blink/V8, không dựa vào JavaScript injection. Đây là khác biệt kiến trúc quan trọng. [README](https://github.com/DungDT293/antidetech-browsermulti)

Project còn giữ Chromium root và V8 như hai repository riêng và apply patch độc lập. `docs/architecture.md` ghi rõ:

- Chromium patch riêng.
- V8 patch riêng.
- `git apply --3way --ignore-whitespace`.
- Static non-component build với `is_component_build = false`.

Điều này cho thấy tác giả hiểu đúng cấu trúc source tree của Chromium/V8 thay vì coi toàn bộ source như một Git repository duy nhất.

**Đánh giá: rất tốt.**

---

## 2.2. Không phụ thuộc hoàn toàn vào “stealth JS”

SPEC nêu nguyên tắc dự án là không inject JS để spoof fingerprint; thay vào đó dùng binary Chromium thật và chỉ patch các trạng thái source-level mà browser tự bộc lộ. `SPEC.md` ghi rõ các nhóm như:

- `navigator.webdriver`
- Client Hints
- plugins
- V8 Inspector/CDP behavior
- canvas/WebGL/audio/font theo hướng giữ giá trị thật

Đây là tư duy kỹ thuật tốt hơn cách “đè `navigator.*` bằng JavaScript”.

---

## 2.3. Validation có chiều sâu hơn mức POC thông thường

`VALIDATION_REPORT.md` ghi nhận:

- BrowserScan: Normal.
- Incolumitas: 33/33 OK.
- FingerprintJS Pro: các smart signals được báo “Not Detected”.
- Antoine Vastel test không thực hiện được vì endpoint trả 502.
- reCAPTCHA v3 = 0.9 và Turnstile PASS được tham chiếu từ giai đoạn trước.

README cũng công bố benchmark 5/5:

- reCAPTCHA v3: 0.9
- Turnstile: PASS
- Sannysoft: PASS
- TLS fingerprint: PASS
- DeviceAndBrowserInfo: `isBot=false`

Điểm tốt ở đây không chỉ là số PASS, mà là repo có riêng `SPEC.md`, `VALIDATION_REPORT.md`, `handoff.md` và script benchmark/validation.

---

## 2.4. Tác giả đã nhận diện đúng vấn đề build Chromium

`handoff.md` ghi lại các bài học như:

- V8 là Git repo độc lập.
- `gclient.bat` cần dùng trên Windows.
- Không nên `git fetch --tags` toàn bộ.
- Chrome version phải sort bằng `System.Version`.
- Phải chạy `gn gen` sau khi đổi version/build config.
- Component build gây DLL/SxS conflict.
- Không được suy ra success chỉ từ Ninja output; phải kiểm tra exit code + artifact + extracted launch + benchmark.

Đây là dấu hiệu engineering khá tốt: dự án không chỉ lưu “happy path” mà còn lưu failure history.

---

## 2.5. Static build là lựa chọn hợp lý cho artifact phân phối

Architecture docs dùng:

```gn
is_debug = false
is_component_build = false
symbol_level = 0
blink_symbol_level = 0
target_cpu = "x64"
```

và handoff ghi nhận static build đã hoàn thành với exit code 0.

Việc tránh component DLL graph là quyết định hợp lý nếu mục tiêu là portable distribution trên Windows.

---

## 2.6. SDK có API usable

`browsermulti/launcher.py` đã có lớp abstraction:

```python
launch_persistent_context(...)
launch(...)
```

với các tham số:

- `user_data_dir`
- `executable_path`
- `headless`
- `proxy`
- `viewport`
- `locale`
- `timezone_id`
- `enable_smooth_input`

Đây là hướng tốt vì người dùng không cần trực tiếp hiểu toàn bộ Chromium launch mechanics.

---

# 3. Historical audit findings

> Findings below describe the 2026-08-26 audit snapshot. Current `.65` status and remaining gates are authoritative in `README.md`, `VALIDATION_REPORT.md`, `docs/validation.md`, and `handoff.md`.

## Historical findings

> Version/path examples and scores below are retained as audit evidence from 2026-08-26, not current release metadata.

## CRITICAL-01 — Mismatch version 152 ↔ 154

Đây là điểm mình xem là **nghiêm trọng nhất về reproducibility**.

Các nguồn trong repo đang thể hiện những version khác nhau:

### README

README badge và release artifact đang nói:

```text
Chromium v152.0.7977.54
browsermulti-152.0.7977.54-win64.zip
152.0.7977.54.manifest
```

### handoff.md

`handoff.md` cũng ghi Stable source target:

```text
152.0.7977.54
```

### Nhưng architecture.md

Architecture lại chỉ:

```text
BrowserMulti_chromium_v154.patch
BrowserMulti_v8_v154.patch
```

### SPEC.md

SPEC còn có các dòng nói về:

```text
Release lifecycle consistency
Version thật từ trunk (154)
```

### Vì sao đây là blocker? (historical audit finding; resolved for current `.65` metadata)

Với một custom Chromium distribution, version là một phần của identity.

Nếu:

```text
binary = 152
patch = 154
docs = 152
SPEC = 154
SDK packaged path = 152
```

thì người khác clone repo có thể không biết:

- patch nào là canonical,
- binary nào là canonical,
- benchmark đang dùng build nào,
- build script expected version nào,
- release artifact nào tương ứng với source state.

### Mức độ

**CRITICAL**

### Cần sửa

Tạo duy nhất một source of truth:

```text
VERSION = 152.0.7977.54
PATCH_VERSION = same
SDK_ARTIFACT_VERSION = same
RELEASE_VERSION = same
```

hoặc chuyển toàn bộ sang 154 nếu đó mới là branch/source thực sự hiện hành.

Không nên để version nằm rải rác trong:

- README
- patch filename
- SDK constant
- release notes
- SPEC
- handoff
- manifest

mà không được generate tự động.

---

# 4. Historical CRITICAL-02 — SDK artifact version coupling

> Resolved for current `.65` package by versioned resolution and downloader. Text below preserves original audit reasoning.


`browsermulti/launcher.py` chứa:

```python
_PACKAGED_BINARY_PATH = (
    _REPO_ROOT
    / "dist"
    / "browsermulti-152.0.7977.54-win64"
    / "chrome.exe"
)
```

Đây là technical debt rõ ràng.

Khi version thay đổi:

```text
152 → 153 → 154
```

SDK phải được sửa source.

Điều này làm vỡ nguyên tắc:

> build version mới phải là một pipeline-driven change, không phải sửa tay source code.

### Nên làm

SDK nên:

1. đọc version marker;
2. tìm artifact directory theo version;
3. cho phép `BROWSERMULTI_EXECUTABLE`;
4. hoặc tốt hơn, binary path phải là config/runtime concern, không phải package source constant.

Ví dụ abstraction tốt hơn:

```text
BrowserMultiConfig
    ├── executable_path
    ├── version
    ├── profile_dir
    └── launch_options
```

**Mức độ: CRITICAL.**

---

# 5. Historical CRITICAL-03 — Reproducibility vẫn phụ thuộc machine-local paths

> Partially improved for current SDK path resolution; build workspace portability and reset safety remain open roadmap work.


Docs hiện có các path như:

```text
D:\dichchrome\src
D:\dichchrome_private_patches
D:\dichchrome\dist
```

Build docs cũng giả định:

```powershell
D:\dichchrome\auto_sync_and_build.ps1
```

Đối với tác giả thì usable, nhưng đối với người clone repo thì đây chưa phải một project self-contained.

### Hệ quả

Một developer mới sẽ phải tự suy luận:

```text
repo root
→ Chromium checkout ở đâu?
→ private patches ở đâu?
→ output ở đâu?
→ version marker ở đâu?
→ SDK binary resolution ở đâu?
```

### Đặc biệt nguy hiểm

`auto_sync_and_build.ps1` có reset source:

```text
git checkout .
git clean -df
```

Nếu chạy nhầm vào Chromium checkout có local changes, thay đổi có thể bị mất.

Docs có cảnh báo backup, nhưng engineering tốt hơn là:

- refuse dirty worktree;
- yêu cầu explicit `--force-clean`;
- dùng dedicated worktree;
- hoặc clone/checkout tự quản lý trong build workspace.

**Mức độ: CRITICAL.**

---

# 6. Historical CRITICAL-04 — Build PASS chưa đồng nghĩa release PASS

> Still current as a warning: direct CLI smoke remains inconclusive.


`handoff.md` rất đáng chú ý ở phần validation:

- build exit code 0;
- benchmark 5/5 PASS;
- nhưng **direct extracted headless smoke test chưa được cleanly verified**;
- từng gặp Windows sandbox `Access is denied (0x5)`;
- một số lần profile tạo được nhưng chưa có reliable clean exit.

Đây là điểm repo làm đúng khi không “fake PASS”.

Tuy nhiên đối với release engineering thì đây vẫn là blocker.

### Vì sao?

Một browser binary muốn gọi là release-ready cần tối thiểu:

```text
compile
→ package
→ extract
→ launch
→ create profile
→ navigate
→ shutdown
→ exit code
```

đều phải có evidence.

Hiện:

```text
compile = PASS
benchmark = PASS
direct launch = uncertain
```

nên trạng thái đúng phải là:

**Build-ready / benchmark-validated, chưa phải fully release-verified.**

**Mức độ: CRITICAL.**

---

# 7. Historical CRITICAL-05 — Validation mạnh nhưng chưa có regression gate tương xứng

> P1 snapshot tooling now exists; CI/release integration remains roadmap work.


Repo có validation tốt cho một snapshot.

Nhưng Chromium thay đổi liên tục.

Một patch chạy ở:

```text
152
```

không có nghĩa patch còn đúng ở:

```text
153
154
155
...
```

### Điều cần có

Sau mỗi Chromium update:

```text
build
↓
unit tests
↓
DOM fingerprint suite
↓
CDP tests
↓
browser identity tests
↓
network tests
↓
SDK smoke tests
↓
packaged launch test
↓
diff fingerprint snapshot
↓
PASS/FAIL gate
```

Nếu bất kỳ tầng nào thay đổi bất thường → build không được publish.

Hiện repo có nhiều script validation nhưng chưa thể hiện một CI regression system đủ mạnh và độc lập để bảo đảm lifecycle dài hạn.

**Mức độ: CRITICAL/HIGH.**

---

# 8. Historical HIGH — SPEC đang mô tả trạng thái rất rộng so với evidence thực tế

> Current SPEC now separates implementation, single-run observation, and pending validation more explicitly.


`SPEC.md` liệt kê 7 tầng:

1. Network/Transport
2. V8
3. Blink/DOM
4. Hardware
5. Behavioral
6. IP Reputation
7. Profile Aging/Identity

Đây là một spec rất tham vọng.

Vấn đề là một số mục là:

```text
✅
```

trong khi bản chất chúng phụ thuộc environment/operator.

Ví dụ:

- IP reputation.
- GeoIP.
- residential/mobile proxy.
- WebRTC leakage.
- history/bookmark aging.
- profile aging.
- external network behavior.

Chính SPEC cũng có một số mục `⚠️`, đây là tốt. Nhưng các phần “✅” cần phân biệt rõ:

```text
verified by deterministic test
```

và:

```text
expected from architecture
```

và:

```text
observed once on one host
```

Ba loại evidence này không nên cùng một trạng thái PASS.

### Nên có evidence class

```text
A = deterministic automated regression
B = reproducible external test
C = single-run observation
D = architectural assumption
```

Đây sẽ làm SPEC đáng tin hơn rất nhiều.

---

# 9. Historical HIGH — Benchmark không nên được hiểu là “đánh bại anti-bot”

> Current validation docs now use scenario-scoped wording and reject universal claims.


`VALIDATION_REPORT.md` trong snapshot audit cũ có kết luận khá mạnh rằng BrowserMulti vượt qua các hệ thống phòng thủ thương mại trong danh sách kiểm thử. Báo cáo hiện tại đã hạ claim về bằng chứng theo kịch bản và không xem đó là bảo đảm phổ quát.

Về mặt test result, dữ liệu có giá trị.

Nhưng về engineering claim, phạm vi cần chặt hơn.

Một hệ thống bot defense hiện đại thường có:

```text
browser signals
+
behavior
+
network
+
IP reputation
+
session history
+
account graph
+
site-specific telemetry
```

Một browser pass trên BrowserScan/Incolumitas/FingerprintJS không đồng nghĩa pass mọi deployment của Cloudflare/Akamai/DataDome/Kasada/Arkose.

### Nên đổi cách diễn đạt

Từ:

> “vượt qua hệ thống phòng thủ”

sang:

> “đạt kết quả PASS trên các test scenario đã ghi nhận.”

Đó là wording chính xác hơn và bảo vệ uy tín dự án.

---

# 10. Historical HIGH — SDK launch behavior còn có coupling không cần thiết

> Current `.65` launcher preserves `viewport=None` and supports versioned binary resolution; lifecycle ownership remains open roadmap work.


`launcher.py` đang:

- tự `async_playwright().start()`;
- launch persistent context;
- monkey-patch `context.new_page`;
- gắn `page.input_controller`.

Cách này usable nhưng có vài vấn đề maintainability:

### A. Resource lifecycle

`async_playwright().start()` tạo lifecycle riêng nhưng hàm chỉ trả `BrowserContext`.

Người dùng close context nhưng lifecycle Playwright object có thể không rõ ràng.

Nên có object quản lý:

```text
BrowserMultiSession
    ├── playwright
    ├── context
    └── close()
```

### B. Monkey patch

```python
context.new_page = new_page
```

là cách nhanh nhưng không phải API design sạch lâu dài.

### C. Type contract

`BrowserContext` bị mở rộng động bằng:

```python
page.input_controller = ...
```

và:

```python
context.new_page = ...
```

Type checker sẽ khó theo dõi.

Đây là vấn đề design hơn là bug runtime.

**Mức độ: HIGH/MEDIUM.**

---

# 11. Historical HIGH — `input_helper.py` còn heuristic đơn giản

> Current docs classify smooth input as a UI convenience, not a security control or behavioral equivalence claim.


`browsermulti/input_helper.py` dùng:

- cubic Bézier;
- fixed default `steps=30`;
- `asyncio.sleep(0.01)`;
- random delay theo range;
- keyboard character-by-character.

Đây là helper UI hữu ích.

Nhưng về mặt engineering, nó chưa phải behavioral model có tính thống kê mạnh.

Ví dụ:

```python
for i in range(steps + 1):
    ...
    await asyncio.sleep(0.01)
```

tạo cadence tương đối đơn giản.

Các heuristic kiểu:

```text
Bézier
+ random.uniform
+ fixed delay
```

không nên được coi là behavioral equivalence với real-user telemetry.

Repo cũng đã ghi trong README rằng smooth input không phải security control và không đảm bảo human-like behavior. Đây là disclaimer đúng.

### Kết luận

Giữ nó như:

> UI automation helper

không nên coi nó là:

> behavioral fingerprint engine

**Mức độ: MEDIUM/HIGH tùy mục tiêu.**

---

# 12. Historical HIGH — Default viewport của SDK có thể tạo mismatch với validation

> Resolved for current launcher: default `viewport=None`; explicit viewport remains caller-controlled.


`launcher.py` đặt:

```python
viewport or {"width": 1280, "height": 800}
```

Trong khi SPEC/validation có các đo đạc screen geometry dựa trên môi trường thật và `viewport: null`.

Điều này có nghĩa:

```text
SDK default behavior
```

và

```text validation configuration
```

không nhất thiết giống nhau.

Khi đánh giá fingerprint, đây là điểm rất quan trọng.

### Nên quy định rõ

Ba khái niệm:

```text
physical display
browser window
viewport
```

không được trộn lẫn.

Test matrix cần cố định:

```text
headful
headless
viewport=None
viewport=explicit
remote desktop
real monitor
```

---

# 13. Historical HIGH — Profile architecture chưa đủ mạnh để gọi là profile system hoàn chỉnh

> Remains open. Profile lifecycle is not yet fully verified for production use.


README/SDK có persistent context và `user_data_dir`, nhưng profile system hiện chủ yếu là:

```text
directory + browser preferences
```

Một profile platform production-grade cần quản lý rõ:

- identity metadata;
- lifecycle;
- proxy binding;
- locale/timezone policy;
- browser version compatibility;
- storage lifecycle;
- export/import;
- clone;
- backup;
- corruption recovery;
- locking;
- concurrent access;
- migration when browser version changes.

Hiện chưa thấy abstraction hoàn chỉnh kiểu:

```text
ProfileManager
Profile
ProfilePolicy
ProfileStorage
ProfileMigration
```

**Mức độ: HIGH.**

---

# 14. Historical MEDIUM/HIGH — Không nên để “fingerprint knobs” trở thành nguồn tạo fingerprint độc nhất

> Current Coherence Engine follows this boundary: observational presets, no arbitrary hardware spoofing.


SPEC cho thấy project quan tâm nhiều fingerprint surface.

Điều cần tránh là tạo một profile:

```text
random UA
random viewport
random timezone
random GPU
random fonts
random deviceMemory
random language
```

mà các giá trị không có coherence.

Fingerprint tốt không phải là:

> nhiều giá trị khác nhau

mà là:

> một identity nhất quán.

Đây nên trở thành nguyên tắc trung tâm của profile subsystem.

---

# 15. MEDIUM — Documentation nhiều nhưng chưa có “single canonical state”

Repo có:

- README
- SPEC
- DEVLOG
- handoff
- architecture
- build-and-release
- SDK usage
- operations
- security-and-ip

Đây là điểm mạnh về lượng tài liệu.

Nhưng nhiều tài liệu cùng mô tả version/state/build assumptions.

Khi project đổi version, dễ phát sinh:

```text
README = A
SPEC = B
handoff = C
patch = D
SDK = A
artifact = B
```

Đây chính xác là vấn đề 152/154 đã xuất hiện.

### Nên tách

```text
docs/
  architecture.md
  development.md
  release.md

generated/
  current-version.json

README.md
  chỉ lấy version từ generated/source-of-truth
```

---

# 16. MEDIUM — Có dấu hiệu project đang ưu tiên “research milestone” hơn “product lifecycle”

Các tài liệu hiện rất mạnh ở:

```text
patch
benchmark
validation
build
```

nhưng yếu hơn ở:

```text
release channels
upgrade policy
backward compatibility
artifact provenance
CI matrix
issue triage
test ownership
rollback
migration
```

Điều này bình thường đối với research project.

Nếu mục tiêu tiếp theo là sản phẩm, đây là giai đoạn cần chuyển trọng tâm.

---

# 17. MEDIUM — Release artifact và source provenance cần chặt hơn

README đề cập ZIP local:

```text
browsermulti-152.0.7977.54-win64.zip
```

và release instructions.

Nhưng đối với Chromium distribution nghiêm túc nên có provenance:

```text
Chromium commit SHA
V8 commit SHA
patch SHA
build args hash
toolchain version
Python SDK version
benchmark result ID
artifact SHA256
```

Ví dụ release metadata:

```json
{
  "browser_version": "152.0.7977.54",
  "chromium_commit": "...",
  "v8_commit": "...",
  "patch_revision": "...",
  "build_config_hash": "...",
  "artifact_sha256": "...",
  "benchmark": "PASS"
}
```

Điều này giúp biết chính xác binary nào được test.

---

# 18. Những điểm yếu KHÔNG nên phóng đại

Một số điểm hiện tại thực ra không phải “bug chí mạng”:

### 18.1. Windows-only

Nếu mục tiêu hiện tại là Windows x64, đây là scope limitation chứ chưa phải defect.

### 18.2. Smooth input heuristic đơn giản

Nếu coi nó là convenience helper, cách implement hiện tại là chấp nhận được.

### 18.3. Private patches nằm ngoài Git public

Đây không hẳn là điểm yếu; nó có thể là chủ ý để tách proprietary/custom patch khỏi Chromium public source. Nhưng nó làm build third-party khó reproducible hơn.

### 18.4. Không có full source Chromium trong repo

Đây là cách đúng về repo size/licensing. Không nên xem đó là defect.

---

# 19. Historical ma trận ưu tiên sửa

> Current implementation status is tracked in `docs/p0-p1-p2-remediation-plan.md`; the table below is retained as the original audit priority record.

# 19. Ma trận ưu tiên sửa

| ID | Vấn đề | Severity | Ưu tiên |
|---|---|---|---:|
| C1 | Version 152/154 mismatch | CRITICAL | P0 |
| C2 | SDK hard-code artifact version | CRITICAL | P0 |
| C3 | Machine-local build paths | CRITICAL | P0 |
| C4 | Direct launch/sandbox chưa fully verified | CRITICAL | P0 |
| C5 | Chưa có regression gate toàn diện sau Chromium upgrade | CRITICAL/HIGH | P0 |
| H1 | Evidence classes trong SPEC chưa đủ chặt | HIGH | P1 |
| H2 | Claims về anti-bot cần scope chính xác hơn | HIGH | P1 |
| H3 | SDK lifecycle + monkey patch | HIGH | P1 |
| H4 | Profile manager chưa đủ abstraction | HIGH | P1 |
| H5 | Viewport/environment validation mismatch | HIGH | P1 |
| M1 | Behavioral helper còn heuristic | MEDIUM | P2 |
| M2 | Documentation state phân tán | MEDIUM | P2 |
| M3 | Artifact provenance thiếu | MEDIUM | P2 |
| M4 | CI/release/product lifecycle | MEDIUM | P2 |

---

# 20. Historical roadmap nên làm theo thứ tự

> The current roadmap is maintained in `docs/p0-p1-p2-remediation-plan.md`.

# 20. Roadmap nên làm theo thứ tự

## P0 — Stabilize build/release identity

### Việc 1: Unified version

Chỉ cho phép một version source-of-truth.

Ví dụ:

```text
version.json
```

chứa:

```json
{
  "chromium": "152.0.7977.54",
  "browsermulti": "152.0.7977.54"
}
```

Tất cả:

- patch filename;
- SDK;
- README badge;
- artifact path;
- manifest checks;
- release name

đều lấy từ đây.

---

## P0 — Self-contained build workspace

Thay:

```text
D:\dichchrome\...
```

bằng:

```text
WORKSPACE/
  chromium/
  patches/
  out/
  dist/
  reports/
```

Build script nhận:

```text
-workspace
```

hoặc tự tính từ repo root.

---

## P0 — Release verification pipeline

Phải tự động:

```text
fetch
↓
apply patch
↓
build
↓
package
↓
extract to clean directory
↓
launch
↓
navigate
↓
shutdown
↓
verify exit code
↓
run benchmark
↓
write provenance
↓
publish
```

Không được có bước release thủ công nào quyết định PASS/FAIL.

---

## P0 — Fingerprint regression suite

Tạo snapshot:

```text
fingerprint-baseline/
  chromium_152.json
```

Sau version mới:

```text
chromium_153.json
```

so sánh:

```text
expected change
vs
unexpected change
```

Đây là thứ quan trọng hơn việc thêm nhiều stealth feature mới.

---

# 21. P1 — Thiết kế lại SDK

Nên hướng tới API:

```python
profile = BrowserProfile(
    profile_dir="./profiles/01",
    locale="en-US",
    timezone="America/New_York",
)

browser = await browsermulti.launch(profile)
```

Không để version, binary path và profile policy rải trong module.

Có thể bổ sung:

```text
BrowserMulti
BrowserProfile
ProfileManager
LaunchConfig
BuildInfo
```

---

# 22. P1 — Profile lifecycle

Nên có:

```text
create
open
lock
close
clone
export
import
backup
restore
migrate
delete
```

và version migration:

```text
profile schema v1
→
profile schema v2
```

---

# 23. P1 — Evidence model

Mỗi test nên ghi:

```text
test name
timestamp
browser version
Chromium commit
OS build
GPU
headful/headless
proxy class
profile state
result
artifact hash
```

Khi đó benchmark mới thực sự audit được.

---

# 24. P2 — Cross-platform / packaging

Sau khi Windows ổn định:

```text
Linux x64
```

sau đó mới cân nhắc:

```text
macOS
ARM64
```

Không nên mở rộng platform trước khi P0/P1 ổn định.

---

# 25. Một kiến trúc target tốt hơn

Có thể hướng tới:

```text
                    BrowserMulti
                         │
              ┌──────────┴──────────┐
              │                     │
        Build System            SDK Runtime
              │                     │
      ┌───────┴───────┐       ┌─────┴─────┐
      │               │       │           │
 Chromium           V8      Profile      Launch
 Patch               Patch    Manager      Manager
      │               │          │           │
      └────────┬──────┘          │           │
               │                 │           │
               └──────────┬──────┴───────────┘
                          │
                   Regression Suite
                          │
             ┌────────────┼────────────┐
             │            │            │
          Browser       Network      Package
          Tests          Tests        Tests
             │            │            │
             └────────────┴────────────┘
                          │
                    Release Artifact
```

Đây sẽ biến project từ:

> custom Chromium research repository

thành:

> maintainable browser platform.

---

# 26. Historical kết luận cuối

> Current conclusion: P1 implementation complete; selected validation gates pending.

# 26. Kết luận cuối

### Nếu mục tiêu là Research / POC

**Rất ổn.**

Project có nền tảng kỹ thuật mạnh hơn phần lớn repo “stealth browser” chỉ dựa vào JS patch.

### Nếu mục tiêu là Internal automation browser

**Khá gần usable**, sau khi giải quyết release identity, build reproducibility và profile lifecycle.

### Nếu mục tiêu là Production commercial browser (historical audit)

**Chưa sẵn sàng theo dữ liệu audit 2026-08-26.** Current docs still require pending gates before production use.

Blocker không nằm chủ yếu ở “thiếu stealth feature”.

Blocker nằm ở:

```text
reproducibility
+
version discipline
+
release verification
+
regression testing
+
profile architecture
+
artifact provenance
```

### Một câu đánh giá ngắn gọn

> **Core engineering của BrowserMulti tốt hơn mức điểm tổng thể hiện tại; thứ kéo điểm xuống không phải ý tưởng Chromium/Blink/V8, mà là release engineering, consistency và platform lifecycle.**

Nếu sửa đúng 5 vấn đề P0, project có thể tăng từ khoảng **7.2/10 → 8.3–8.7/10** mà chưa cần thêm quá nhiều fingerprint feature mới.

---

# 27. Nguồn đã đọc trực tiếp

- `README.md`
- `handoff.md`
- `SPEC.md`
- `VALIDATION_REPORT.md`
- `docs/architecture.md`
- `docs/build-and-release.md`
- `browsermulti/launcher.py`
- `browsermulti/input_helper.py`

Repo: `https://github.com/DungDT293/antidetech-browsermulti`

> Các nhận định về version mismatch, hard-coded artifact path, direct-launch uncertainty và build-path coupling đều được rút trực tiếp từ các file nêu trên; không phải suy đoán từ tên repo.