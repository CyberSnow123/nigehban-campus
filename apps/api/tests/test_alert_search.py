"""How the alerts search box reads its text (no database needed)."""

import pytest
from nigehban_contracts import BagClass, EventType

from app.services.alert_search import SearchTerms, parse_search


@pytest.mark.parametrize(
    "q", ["person 12", "Person #12", "PERSON#12", "person  # 12", "p12", "P-12", "p 12"]
)
def test_person_forms(q):
    terms = parse_search(q)
    assert (terms.person, terms.bag, terms.any_track) == (12, None, None)


@pytest.mark.parametrize(
    ("q", "bag_class"),
    [
        ("bag 31", None),
        ("Bag #31", None),
        ("bag-31", None),
        ("Handbag #31", BagClass.HANDBAG),
        ("backpack 31", BagClass.BACKPACK),
    ],
)
def test_bag_forms(q, bag_class):
    terms = parse_search(q)
    assert (terms.bag, terms.bag_class, terms.person) == (31, bag_class, None)


@pytest.mark.parametrize("q", ["12", "#12", "# 12"])
def test_bare_number_matches_any_track(q):
    assert parse_search(q).any_track == 12


@pytest.mark.parametrize(
    ("q", "event_type"),
    [
        ("theft", EventType.POSSIBLE_THEFT),
        ("Possible theft", EventType.POSSIBLE_THEFT),
        ("abandoned", EventType.ABANDONED_BAG),
        ("library", None),
    ],
)
def test_type_words(q, event_type):
    assert parse_search(q).type is event_type


@pytest.mark.parametrize(
    "q", ["CAM 03", "Main Library", "SEC-2026-004-T", "personnel", "bags", "people 12"]
)
def test_other_text_is_plain_text(q):
    assert parse_search(q) == SearchTerms(q, type=None)


def test_spaces_are_tidied():
    assert parse_search("  cam   03 ").text == "cam 03"
