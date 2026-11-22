"""Every public model must build a JSON Schema, so FastAPI can publish it as OpenAPI."""

import json

import nigehban_contracts
import pytest
from nigehban_contracts import Alert, Page
from pydantic import BaseModel

PUBLIC_MODELS = [
    getattr(nigehban_contracts, name)
    for name in nigehban_contracts.__all__
    if isinstance(getattr(nigehban_contracts, name), type)
    and issubclass(getattr(nigehban_contracts, name), BaseModel)
]


def test_public_models_are_exported():
    assert len(PUBLIC_MODELS) >= 20


@pytest.mark.parametrize("model", PUBLIC_MODELS, ids=lambda m: m.__name__)
def test_model_builds_json_schema(model):
    schema = model.model_json_schema()
    json.dumps(schema)
    assert schema["type"] == "object"


def test_bag_schema_uses_class_key():
    schema = nigehban_contracts.BagInfo.model_json_schema(by_alias=True)
    assert "class" in schema["properties"]
    assert "class_" not in schema["properties"]


def test_generic_page_schema():
    schema = Page[Alert].model_json_schema()
    assert schema["properties"]["items"]["type"] == "array"
