import json
from pathlib import Path

from browsermulti.input_helper import SmoothInputController
from browsermulti.launcher import launch, launch_persistent_context

_VERSION_FILE = Path(__file__).resolve().parent.parent / "version.json"
__version__ = json.loads(_VERSION_FILE.read_text(encoding="utf-8"))["version"]
__all__ = ["launch", "launch_persistent_context", "SmoothInputController"]
