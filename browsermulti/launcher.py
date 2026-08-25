from pathlib import Path
from typing import Dict, List, Optional, Union


_REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BINARY_PATH = _REPO_ROOT / "src" / "out" / "Default" / "chrome.exe"
_PACKAGED_BINARY_PATH = _REPO_ROOT / "dist" / "browsermulti-152.0.7977.54-win64" / "chrome.exe"


def _default_binary_path() -> Path:
    if _PACKAGED_BINARY_PATH.exists():
        return _PACKAGED_BINARY_PATH
    return DEFAULT_BINARY_PATH


_DEFAULT_BINARY_PATH = _default_binary_path()


from playwright.async_api import BrowserContext, Page, async_playwright

from browsermulti.input_helper import SmoothInputController

async def launch_persistent_context(
    user_data_dir: Union[str, Path] = "./profiles/default",
    executable_path: Union[str, Path] = _DEFAULT_BINARY_PATH,
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
    playwright = await async_playwright().start()
    proxy_config = {"server": proxy} if isinstance(proxy, str) else proxy
    launch_args = ["--no-first-run", "--no-default-browser-check"]
    if args:
        launch_args.extend(args)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        executable_path=str(executable_path),
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
