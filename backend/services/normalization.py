import re
from dataclasses import dataclass


MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
MONTH_ALIASES = {
    month[:3].casefold(): month for month in MONTHS
} | {month.casefold(): month for month in MONTHS}
CITY_PLACEHOLDERS = {"", "n/a", "na", "unknown", "not available", "not specified", "-"}
NON_CITY_LOCATIONS = {"online", "online learning", "onshore", "offshore", "main campus", "multiple campuses"}


def compact(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_city(value):
    raw = compact(value)
    if raw.casefold() in CITY_PLACEHOLDERS or raw.casefold() == "international":
        return None
    return raw.title()


def display_city(value):
    return normalize_city(value) or "Location not specified"


def location_matches_city(value, selected_city):
    """Return true only when a valid city/campus value names the selected city."""
    actual = normalize_city(value)
    wanted = normalize_city(selected_city)
    if not actual or not wanted:
        return False
    if actual.casefold() == wanted.casefold():
        return True
    return bool(re.search(rf"(?<!\w){re.escape(wanted)}(?!\w)", actual, re.IGNORECASE))


def location_city_choices(value):
    choices = []
    for part in re.split(r"\s*(?:,|/|;|\band\b)\s*", compact(value), flags=re.IGNORECASE):
        cleaned = re.sub(r"\s+campuses?$", "", part, flags=re.IGNORECASE).strip()
        normalized = normalize_city(cleaned)
        if normalized and normalized.casefold() not in NON_CITY_LOCATIONS and normalized not in choices:
            choices.append(normalized)
    return choices


def normalize_field(value):
    raw = compact(value)
    return raw.casefold() if raw else None


def display_field(value):
    return compact(value) or "Not classified"


def normalize_degree(value):
    raw = compact(value)
    key = raw.casefold().replace("’", "'")
    rules = (
        (("phd", "doctor"), "Doctorate"),
        (("master", "masters", "master's", "postgraduate"), "Postgraduate"),
        (("bachelor", "bachelor's", "undergraduate", "ug"), "Undergraduate"),
        (("graduate diploma",), "Graduate Diploma"),
        (("graduate certificate",), "Graduate Certificate"),
        (("diploma",), "Diploma"),
        (("foundation",), "Foundation"),
        (("certificate",), "Certificate"),
    )
    for variants, canonical in rules:
        if any(key == item or key.startswith(item + " ") for item in variants):
            return canonical
    return "Unspecified" if not raw else raw.title()


@dataclass(frozen=True)
class NormalizedIntake:
    raw: str
    months: tuple[str, ...]
    classification: str


def normalize_intake(value):
    raw = compact(value)
    lower = raw.casefold()
    months = []
    for token, month in MONTH_ALIASES.items():
        if re.search(rf"(?<![a-z]){re.escape(token)}(?![a-z])", lower) and month not in months:
            months.append(month)
    if months:
        classification = "Multiple intakes" if len(months) > 1 else "Month"
    elif "trimester" in lower:
        classification = "Trimester"
    elif "semester" in lower:
        classification = "Semester"
    elif any(word in lower for word in ("rolling", "flexible", "monthly", "apply now")):
        classification = "Rolling"
    elif raw:
        classification = "Unstructured"
    else:
        classification = "Unavailable"
    return NormalizedIntake(raw=raw, months=tuple(months), classification=classification)


def currency_quality(currency, country):
    code = compact(currency).upper()
    unusual = compact(country).casefold() == "new zealand" and code not in {"", "NZD"}
    return {"raw": code, "normalized": code or None, "requires_confirmation": unusual}
