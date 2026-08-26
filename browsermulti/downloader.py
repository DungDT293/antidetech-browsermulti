import os
import shutil
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Optional

from . import __version__

_RELEASE_URL = (
    "https://github.com/DungDT293/antidetech-browsermulti/releases/download/"
    f"v{__version__}/browsermulti-{__version__}-win64.zip"
)


def cache_dir(version: Optional[str] = None) -> Path:
    return Path.home() / ".browsermulti" / "bin" / (version or __version__)


def release_url(version: Optional[str] = None) -> str:
    selected = version or __version__
    return (
        "https://github.com/DungDT293/antidetech-browsermulti/releases/download/"
        f"v{selected}/browsermulti-{selected}-win64.zip"
    )


def _safe_extract(archive: Path, destination: Path) -> None:
    root = destination.resolve()
    with zipfile.ZipFile(archive) as source:
        for member in source.infolist():
            target = (destination / member.filename).resolve()
            if os.path.commonpath((str(root), str(target))) != str(root):
                raise RuntimeError(f"Unsafe ZIP member path: {member.filename}")
        source.extractall(destination)


def ensure_binary() -> str:
    """Return cached Chrome or download the versioned GitHub Release runtime."""
    target_dir = cache_dir()
    executable = target_dir / "chrome.exe"
    if executable.is_file():
        return str(executable.resolve())

    target_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_root = Path(tempfile.mkdtemp(prefix=f"browsermulti-{__version__}-", dir=target_dir.parent))
    archive = temp_root / "runtime.zip"
    extracted = temp_root / "extracted"
    url = release_url()
    try:
        try:
            urllib.request.urlretrieve(url, archive)
        except (OSError, urllib.error.URLError) as exc:
            raise RuntimeError(
                f"Could not download BrowserMulti runtime from {url}. "
                f"Expected cache path: {target_dir}"
            ) from exc
        extracted.mkdir()
        _safe_extract(archive, extracted)
        candidates = list(extracted.rglob("chrome.exe"))
        if len(candidates) != 1:
            raise RuntimeError(f"Release must contain exactly one chrome.exe: {url}")
        if target_dir.exists():
            shutil.rmtree(target_dir)
        shutil.copytree(candidates[0].parent, target_dir)
        if not executable.is_file():
            raise RuntimeError(f"Downloaded release missing expected executable: {executable}")
        return str(executable.resolve())
    except zipfile.BadZipFile as exc:
        raise RuntimeError(f"Downloaded BrowserMulti release is not a valid ZIP: {url}") from exc
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)
