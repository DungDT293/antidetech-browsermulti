import asyncio
import tempfile
from pathlib import Path

from browsermulti import launch_persistent_context


async def run_test():
    profile = Path(tempfile.mkdtemp(prefix="browsermulti-sdk-"))
    context = await launch_persistent_context(
        user_data_dir=profile,
        headless=True,
        enable_smooth_input=True,
    )
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://example.com", wait_until="domcontentloaded")
        if hasattr(page, "input_controller"):
            await page.input_controller.move_to(300, 200, steps=3)
        assert "Example Domain" in await page.title()
        print("--- SDK RUN TEST: SUCCESS ---")
    finally:
        await context.close()


if __name__ == "__main__":
    asyncio.run(run_test())
