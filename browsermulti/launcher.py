import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Union


_REPO_ROOT = Path(__file__).resolve().parent.parent
_VERSION_FILE = _REPO_ROOT / "version.json"


from playwright.async_api import BrowserContext, Page, async_playwright

from browsermulti.downloader import cache_dir, ensure_binary, get_version, release_url
from browsermulti.input_helper import SmoothInputController


def _read_version() -> str:
    try:
        return str(json.loads(_VERSION_FILE.read_text(encoding="utf-8"))["version"])
    except (OSError, KeyError, TypeError, ValueError) as exc:
        raise RuntimeError(
            f"BrowserMulti version metadata missing or invalid: {_VERSION_FILE}"
        ) from exc


def _checked_path(path: Union[str, Path]) -> Path:
    resolved = Path(path).expanduser()
    if not resolved.is_file():
        raise FileNotFoundError(f"BrowserMulti executable does not exist: {resolved}")
    return resolved.resolve()


def _resolve_executable_path(executable_path: Optional[Union[str, Path]]) -> Path:
    if executable_path is not None:
        return _checked_path(executable_path)

    configured = os.environ.get("BROWSERMULTI_EXECUTABLE")
    if configured:
        return _checked_path(configured)

    version = _read_version()
    cached = cache_dir(version) / "chrome.exe"
    if cached.is_file():
        return cached.resolve()

    packaged = _REPO_ROOT / "dist" / f"browsermulti-{version}-win64" / "chrome.exe"
    if packaged.is_file():
        return packaged.resolve()

    try:
        return _checked_path(ensure_binary())
    except (FileNotFoundError, RuntimeError) as exc:
        raise FileNotFoundError(
            "BrowserMulti executable not found. Set executable_path, set "
            "BROWSERMULTI_EXECUTABLE, extract the versioned runtime under "
            f"{_REPO_ROOT / 'dist'}, or allow download from {release_url(version)}."
        ) from exc


async def launch_persistent_context(
    user_data_dir: Union[str, Path] = "./profiles/default",
    executable_path: Optional[Union[str, Path]] = None,
    headless: bool = False,
    proxy: Optional[Union[str, Dict[str, str]]] = None,
    args: Optional[List[str]] = None,
    viewport: Optional[Dict[str, int]] = None,
    locale: str = "en-US",
    timezone_id: Optional[str] = None,
    enable_smooth_input: bool = True,
    **kwargs,
) -> BrowserContext:
    """Launch BrowserMulti for authorized Playwright UI testing."""
    binary_path = _resolve_executable_path(executable_path)
    playwright = await async_playwright().start()
    proxy_config = {"server": proxy} if isinstance(proxy, str) else proxy
    launch_args = ["--no-first-run", "--no-default-browser-check"]
    if args:
        launch_args.extend(args)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        executable_path=str(binary_path),
        headless=headless,
        args=launch_args,
        proxy=proxy_config,
        viewport=viewport or {"width": 1280, "height": 800},
        locale=locale,
        timezone_id=timezone_id,
        **kwargs,
    )
    if enable_smooth_input:
        for page in context.pages:
            page.input_controller = SmoothInputController(page)
        original_new_page = context.new_page

        async def new_page() -> Page:
            page = await original_new_page()
            page.input_controller = SmoothInputController(page)
            return page

        context.new_page = new_page
    return context


async def launch(
    user_data_dir: Union[str, Path] = "./profiles/temp_session", **kwargs
) -> BrowserContext:
    return await launch_persistent_context(user_data_dir=user_data_dir, **kwargs)
