from importlib.metadata import PackageNotFoundError, version as installed_version
from pathlib import Path
import json

from browsermulti.downloader import ensure_binary
from browsermulti.input_helper import SmoothInputController
from browsermulti.launcher import launch, launch_persistent_context

_VERSION_FILE = Path(__file__).resolve().parent.parent / "version.json"
if _VERSION_FILE.is_file():
    __version__ = json.loads(_VERSION_FILE.read_text(encoding="utf-8"))["version"]
else:
    try:
        __version__ = installed_version("browsermulti")
    except PackageNotFoundError as exc:
        raise RuntimeError("BrowserMulti package metadata is unavailable") from exc

# Source checkouts use version.json; installed wheels use distribution metadata.

__all__ = [
    "launch",
    "launch_persistent_context",
    "SmoothInputController",
    "ensure_binary",
]
