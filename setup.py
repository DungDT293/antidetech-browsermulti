from pathlib import Path

from setuptools import find_packages, setup


README = Path(__file__).with_name("README.md")

setup(
    name="browsermulti",
    version="152.0.7977.54",
    packages=find_packages(),
    install_requires=["playwright>=1.40.0"],
    author="DungDT293",
    description="BrowserMulti Custom Chromium Automation SDK for Playwright",
    long_description=README.read_text(encoding="utf-8"),
    long_description_content_type="text/markdown",
    python_requires=">=3.8",
)
