import asyncio
import math
import random
from typing import List, Tuple

from playwright.async_api import Page


def cubic_bezier(
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float],
    t: float,
) -> Tuple[float, float]:
    u = 1.0 - t
    return (
        (u**3) * p0[0]
        + 3 * (u**2) * t * p1[0]
        + 3 * u * (t**2) * p2[0]
        + (t**3) * p3[0],
        (u**3) * p0[1]
        + 3 * (u**2) * t * p1[1]
        + 3 * u * (t**2) * p2[1]
        + (t**3) * p3[1],
    )


class SmoothInputController:
    """Smooth pointer and keyboard helpers for authorized UI testing."""

    def __init__(self, page: Page):
        self.page = page
        self.current_pos = (150.0, 150.0)

    async def move_to(self, target_x: float, target_y: float, steps: int = 30):
        if steps < 1:
            raise ValueError("steps must be positive")
        start = self.current_pos
        dx = target_x - start[0]
        dy = target_y - start[1]
        deviation = min(math.hypot(dx, dy) * 0.25, 80.0)
        p1 = (
            start[0] + dx * 0.25 + random.uniform(-deviation, deviation),
            start[1] + dy * 0.25 + random.uniform(-deviation, deviation),
        )
        p2 = (
            start[0] + dx * 0.75 + random.uniform(-deviation, deviation),
            start[1] + dy * 0.75 + random.uniform(-deviation, deviation),
        )
        for i in range(steps + 1):
            t = i / steps
            eased = t * t * (3.0 - 2.0 * t)
            await self.page.mouse.move(
                *cubic_bezier(start, p1, p2, (target_x, target_y), eased)
            )
            await asyncio.sleep(0.01)
        self.current_pos = (target_x, target_y)

    async def smooth_click(self, selector: str):
        locator = self.page.locator(selector).first
        box = await locator.bounding_box()
        if not box:
            await locator.click()
            return
        await self.move_to(
            box["x"] + box["width"] / 2,
            box["y"] + box["height"] / 2,
        )
        await asyncio.sleep(0.05)
        await locator.click()

    async def natural_type(
        self, selector: str, text: str, delay_ms: float = 60
    ):
        if delay_ms < 0:
            raise ValueError("delay_ms must be non-negative")
        await self.smooth_click(selector)
        for char in text:
            await self.page.keyboard.type(char)
            await asyncio.sleep(random.uniform(delay_ms * 0.8, delay_ms * 1.2) / 1000)


def generate_mouse_path(
    start: Tuple[float, float], end: Tuple[float, float], steps: int = 30
) -> List[Tuple[float, float]]:
    if steps < 1:
        raise ValueError("steps must be positive")
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    deviation = min(math.hypot(dx, dy) * 0.25, 80.0)
    p1 = (start[0] + dx * 0.25, start[1] + dy * 0.25)
    p2 = (start[0] + dx * 0.75, start[1] + dy * 0.75)
    return [
        cubic_bezier(start, p1, p2, end, i / steps)
        for i in range(steps + 1)
    ]
