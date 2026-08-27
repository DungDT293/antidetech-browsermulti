"""Coherent, non-spoofing browser profile configuration helpers."""

from types import MappingProxyType
from typing import Any, Dict, Optional


def _preset(**values: Any) -> MappingProxyType:
    return MappingProxyType(values)


HARDWARE_PRESETS = MappingProxyType({
    "windows11_intel_uhd": _preset(
        label="Windows 11 + Intel UHD", os="Windows 11", gpu_vendor="Intel",
        gpu_renderer_family="Intel UHD Graphics", platform="Win32",
        hardware_concurrency=8, device_memory_gb=8, max_touch_points=0,
        screen_width=1920, screen_height=1080, color_depth=24,
    ),
    "windows11_nvidia_rtx": _preset(
        label="Windows 11 + NVIDIA RTX", os="Windows 11", gpu_vendor="NVIDIA",
        gpu_renderer_family="NVIDIA GeForce RTX", platform="Win32",
        hardware_concurrency=16, device_memory_gb=16, max_touch_points=0,
        screen_width=2560, screen_height=1440, color_depth=24,
    ),
    "windows10_amd_radeon": _preset(
        label="Windows 10 + AMD Radeon", os="Windows 10", gpu_vendor="AMD",
        gpu_renderer_family="AMD Radeon", platform="Win32",
        hardware_concurrency=8, device_memory_gb=8, max_touch_points=0,
        screen_width=1920, screen_height=1080, color_depth=24,
    ),
})

_COUNTRY_ALIASES = {
    "UNITED STATES": "US",
    "USA": "US",
    "UNITED KINGDOM": "GB",
    "ENGLAND": "GB",
    "VIETNAM": "VN",
    "VIET NAM": "VN",
    "GERMANY": "DE",
    "FRANCE": "FR",
    "CANADA": "CA",
    "AUSTRALIA": "AU",
    "JAPAN": "JP",
    "SOUTH KOREA": "KR",
    "KOREA": "KR",
    "SINGAPORE": "SG",
    "INDIA": "IN",
    "NETHERLANDS": "NL",
}

_LOCALE_COUNTRIES = {
    "US": {"EN-US"},
    "GB": {"EN-GB", "EN"},
    "VN": {"VI-VN"},
    "DE": {"DE-DE"},
    "FR": {"FR-FR"},
    "CA": {"EN-CA", "FR-CA"},
    "AU": {"EN-AU"},
    "JP": {"JA-JP"},
    "KR": {"KO-KR"},
    "SG": {"EN-SG", "ZH-SG"},
    "IN": {"EN-IN", "HI-IN"},
    "NL": {"NL-NL"},
}

_TIMEZONE_COUNTRIES = {
    "US": ("America/",),
    "GB": ("Europe/London",),
    "VN": ("Asia/Ho_Chi_Minh",),
    "DE": ("Europe/Berlin",),
    "FR": ("Europe/Paris",),
    "CA": ("America/",),
    "AU": ("Australia/",),
    "JP": ("Asia/Tokyo",),
    "KR": ("Asia/Seoul",),
    "SG": ("Asia/Singapore",),
    "IN": ("Asia/Kolkata", "Asia/Calcutta"),
    "NL": ("Europe/Amsterdam",),
}


def get_hardware_preset(name: str) -> Dict[str, Any]:
    """Return a mutable copy; presets never alter browser APIs."""
    try:
        return dict(HARDWARE_PRESETS[name])
    except KeyError as exc:
        choices = ", ".join(sorted(HARDWARE_PRESETS))
        raise ValueError(f"Unknown fingerprint preset {name!r}; choose one of: {choices}") from exc


def _country(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().upper().replace("_", " ")
    return _COUNTRY_ALIASES.get(normalized, normalized if len(normalized) == 2 else None)


def _locale(value: Optional[str]) -> str:
    return (value or "").strip().replace("_", "-").upper()


def validate_profile_coherence(
    locale: Optional[str], timezone: Optional[str], proxy_country: Optional[str]
) -> Dict[str, Any]:
    """Report likely geo-profile contradictions without blocking browser launch.

    This performs local policy checks only. It does not resolve proxy IPs or inspect
    credentials, and an unknown country is reported as inconclusive.
    """
    country = _country(proxy_country)
    normalized_locale = _locale(locale)
    normalized_timezone = (timezone or "").strip()
    findings = []

    if not country:
        return {
            "status": "INCONCLUSIVE_NO_PROXY_COUNTRY",
            "coherent": None,
            "locale": normalized_locale or None,
            "timezone": normalized_timezone or None,
            "proxy_country": None,
            "findings": [],
        }

    known_country = country in _LOCALE_COUNTRIES
    if known_country and normalized_locale:
        locale_matches = normalized_locale in _LOCALE_COUNTRIES[country]
        if not locale_matches:
            findings.append({
                "field": "locale",
                "message": f"Locale {normalized_locale} does not match proxy country {country}",
            })

    known_timezone = country in _TIMEZONE_COUNTRIES
    if known_timezone and normalized_timezone:
        timezone_matches = any(
            normalized_timezone == prefix or normalized_timezone.startswith(prefix)
            for prefix in _TIMEZONE_COUNTRIES[country]
        )
        if not timezone_matches:
            findings.append({
                "field": "timezone",
                "message": f"Timezone {normalized_timezone} does not match proxy country {country}",
            })

    if not known_country or not known_timezone:
        status = "INCONCLUSIVE_UNKNOWN_PROXY_COUNTRY"
    elif findings:
        status = "WARNING_MISMATCH"
    else:
        status = "COHERENT"
    return {
        "status": status,
        "coherent": not findings if status != "INCONCLUSIVE_UNKNOWN_PROXY_COUNTRY" else None,
        "locale": normalized_locale or None,
        "timezone": normalized_timezone or None,
        "proxy_country": country,
        "findings": findings,
    }
