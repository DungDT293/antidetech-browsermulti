import json
from pathlib import Path

from setuptools import find_packages, setup


ROOT = Path(__file__).parent
VERSION = json.loads((ROOT / "version.json").read_text(encoding="utf-8"))["version"]
README = ROOT / "README.md"

setup(
    name="browsermulti",
    version=VERSION,
    packages=find_packages(),
    data_files=[("", ["version.json"])],
    install_requires=["playwright>=1.40.0"],
    author="DungDT293",
    description="BrowserMulti Custom Chromium Automation SDK for Playwright",
    long_description=README.read_text(encoding="utf-8"),
    long_description_content_type="text/markdown",
    python_requires=">=3.8",
)
