"""Shared Pydantic response/request models for the public Gateway routes."""

from __future__ import annotations

from typing import Any, Literal, TypeAlias

from fastapi import status
from meogap.rest.contracts import ErrorResponse
from pydantic import BaseModel, ConfigDict

API_TAG = 'gateway'
DESCRIPTION_MAX_LENGTH = 1000
NAME_MAX_LENGTH = 120
TemporalFrequency: TypeAlias = Literal['monthly', 'semimonthly', 'weekly', 'three_day', 'two_day', 'daily']
SyntheticProvenance: TypeAlias = Literal['SYNTHETIC_DEMO']

ResponseDefinitions: TypeAlias = dict[int | str, dict[str, Any]]

COMMON_UNAUTHORIZED: ResponseDefinitions = {
    status.HTTP_401_UNAUTHORIZED: {'model': ErrorResponse, 'description': 'Missing or invalid authentication.'},
}
VALIDATION_ERRORS: ResponseDefinitions = {
    **COMMON_UNAUTHORIZED,
    status.HTTP_422_UNPROCESSABLE_ENTITY: {'model': ErrorResponse, 'description': 'Request payload was invalid.'},
}
NOT_FOUND_ERRORS: ResponseDefinitions = {
    **VALIDATION_ERRORS,
    status.HTTP_404_NOT_FOUND: {'model': ErrorResponse, 'description': 'Requested resource was not found.'},
}
CONFLICT_ERRORS: ResponseDefinitions = {
    **VALIDATION_ERRORS,
    status.HTTP_409_CONFLICT: {'model': ErrorResponse, 'description': 'Request state prevents this operation.'},
}
BALANCE_ERRORS: ResponseDefinitions = {
    **COMMON_UNAUTHORIZED,
    status.HTTP_503_SERVICE_UNAVAILABLE: {'model': ErrorResponse, 'description': 'Credit balance is unavailable.'},
}


class AnalysisPeriodRequest(BaseModel):
    """Inclusive analysis period expressed in UTC calendar months."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    start_month: str
    end_month: str


class FailureResponse(BaseModel):
    """Caller-safe request failure details."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    stage: str
    message: str | None


class AccountResponse(BaseModel):
    """Deterministic demo account identity."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    user_id: str
    display_name: str
    session_status: str


class CreditBalanceResponse(BaseModel):
    """Available deterministic demo credits."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    balance: int
    unit: str
    note: str


__all__ = [
    'API_TAG',
    'BALANCE_ERRORS',
    'COMMON_UNAUTHORIZED',
    'CONFLICT_ERRORS',
    'DESCRIPTION_MAX_LENGTH',
    'NAME_MAX_LENGTH',
    'NOT_FOUND_ERRORS',
    'VALIDATION_ERRORS',
    'AccountResponse',
    'AnalysisPeriodRequest',
    'CreditBalanceResponse',
    'FailureResponse',
    'SyntheticProvenance',
    'TemporalFrequency',
]
