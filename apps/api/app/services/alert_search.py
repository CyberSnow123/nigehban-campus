"""The `q` search on ``GET /api/alerts`` (Backend.md §3).

The text is read as one of these, in order (case and extra spaces do not matter):
- a person: ``person 12``, ``Person #12``, ``P12``, ``P-07`` -> owner or carrier is track 12
- a bag: ``bag 31``, ``Bag #31``, ``Handbag #18``, ``backpack 5`` -> bag track 31 (of that
  class, when one is named), as the UI writes it
- a number: ``12`` or ``#12`` -> bag, owner or carrier track 12, or the number in the text
- anything else: part of the ref code, camera name or location; ``theft`` and ``abandoned``
  also match alerts of that type
"""

import re
from dataclasses import dataclass

from nigehban_contracts import BagClass, EventType
from sqlalchemy import ColumnElement, and_, or_

from app.models import Alert, Camera

_TRACK = r"\s*-?\s*#?\s*(\d{1,9})"
_PERSON = re.compile(rf"(?:person|p){_TRACK}", re.IGNORECASE)
_BAG = re.compile(rf"(bag|handbag|backpack){_TRACK}", re.IGNORECASE)
_NUMBER = re.compile(r"#?\s*(\d{1,9})")

_TYPE_WORDS = {
    "theft": EventType.POSSIBLE_THEFT,
    "possible theft": EventType.POSSIBLE_THEFT,
    "abandoned": EventType.ABANDONED_BAG,
    "abandoned bag": EventType.ABANDONED_BAG,
}


@dataclass(frozen=True)
class SearchTerms:
    text: str
    person: int | None = None
    bag: int | None = None
    bag_class: BagClass | None = None
    any_track: int | None = None
    type: EventType | None = None


def parse_search(q: str) -> SearchTerms:
    text = " ".join(q.split())
    if match := _PERSON.fullmatch(text):
        return SearchTerms(text, person=int(match[1]))
    if match := _BAG.fullmatch(text):
        word = match[1].lower()
        bag_class = None if word == "bag" else BagClass(word)
        return SearchTerms(text, bag=int(match[2]), bag_class=bag_class)
    number = _NUMBER.fullmatch(text)
    return SearchTerms(
        text,
        any_track=int(number[1]) if number else None,
        type=_TYPE_WORDS.get(text.lower()),
    )


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_condition(q: str) -> ColumnElement[bool]:
    """The SQL filter for ``q``. The query must join ``Camera``."""
    terms = parse_search(q)
    if terms.person is not None:
        return or_(Alert.owner_track_id == terms.person, Alert.carrier_track_id == terms.person)
    if terms.bag is not None:
        same_bag = Alert.bag_track_id == terms.bag
        if terms.bag_class is None:
            return same_bag
        return and_(same_bag, Alert.bag_class == terms.bag_class.value)

    pattern = f"%{_escape_like(terms.text)}%"
    options: list[ColumnElement[bool]] = [
        Alert.ref_code.ilike(pattern, escape="\\"),
        Camera.name.ilike(pattern, escape="\\"),
        Camera.location.ilike(pattern, escape="\\"),
    ]
    if terms.any_track is not None:
        options += [
            Alert.bag_track_id == terms.any_track,
            Alert.owner_track_id == terms.any_track,
            Alert.carrier_track_id == terms.any_track,
        ]
    if terms.type is not None:
        options.append(Alert.type == terms.type.value)
    return or_(*options)
