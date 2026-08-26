import json
import os
import shutil
import tempfile
import urllib.error
import urllib.request
import zipfile
from importlib.metadata import PackageNotFoundError, version as installed_version
from pathlib import Path
from typing import Optional


_REPO_ROOT = Path(__file__).resolve().parent.parent
_VERSION_FILE = _REPO_ROOT / "version.json"
_RELEASE_BASE = "https://github.com/DungDT293/antidetech-browsermulti/releases/download"


def _read_version() -> str:
    try:
        return str(json.loads(_VERSION_FILE.read_text(encoding="utf-8"))["version"])
    except (OSError, KeyError, TypeError, ValueError) as exc:
        raise RuntimeError(f"Invalid BrowserMulti version metadata: {_VERSION_FILE}") from exc


def get_version() -> str:
    if _VERSION_FILE.is_file():
        return _read_version()
    try:
        return installed_version("browsermulti")
    except PackageNotFoundError as exc:
        raise RuntimeError("BrowserMulti package metadata is unavailable") from exc


def cache_dir(version: Optional[str] = None) -> Path:
    return Path.home() / ".browsermulti" / "bin" / (version or get_version())


def release_url(version: Optional[str] = None) -> str:
    selected = version or get_version()
    artifact = f"browsermulti-{selected}-win64.zip"
    return f"{_RELEASE_BASE}/v{selected}/{artifact}"


def _safe_extract(archive: Path, destination: Path) -> None:
    root = destination.resolve()
    with zipfile.ZipFile(archive) as source:
        for member in source.infolist():
            target = (destination / member.filename).resolve()
            if os.path.commonpath((str(root), str(target))) != str(root):
                raise RuntimeError(f"Unsafe ZIP member path: {member.filename}")
        source.extractall(destination)


def ensure_binary() -> str:
    """Return cached Chrome executable, downloading the versioned release if needed."""
    version = get_version()
    target_dir = cache_dir(version)
    executable = target_dir / "chrome.exe"
    if executable.is_file():
        return str(executable.resolve())

    target_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_root = Path(tempfile.mkdtemp(prefix=f"browsermulti-{version}-", dir=target_dir.parent))
    archive = temp_root / "runtime.zip"
    extracted = temp_root / "extracted"
    try:
        url = release_url(version)
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
        raise RuntimeError(f"Downloaded BrowserMulti release is not a valid ZIP: {release_url(version)}") from exc
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)
