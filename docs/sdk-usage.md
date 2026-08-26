# Python SDK Usage

## Install

```powershell
python -m pip install browsermulti
```

For local development:

```powershell
python -m pip install -e D:\dichchrome
```

## Launch persistent context

```python
import asyncio
from browsermulti import launch_persistent_context


async def main():
    context = await launch_persistent_context(
        user_data_dir="./profiles/example",
        headless=True,
        locale="en-US",
        timezone_id="America/New_York",
        enable_smooth_input=True,
    )
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://example.com")
        if hasattr(page, "input_controller"):
            await page.input_controller.move_to(300, 200, steps=3)
    finally:
        await context.close()


asyncio.run(main())
```

## Proxy

Pass a Playwright proxy string or dictionary through `proxy`:

```python
proxy="socks5://127.0.0.1:1080"
```

Use only for authorized automation and testing. Input helpers provide UI interaction convenience; they do not guarantee detection outcomes or replace site authorization.
