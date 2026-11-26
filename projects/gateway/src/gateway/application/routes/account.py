"""Account and credit routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from gateway.application.routes.dependencies import demo_owner
from gateway.application.schemas import (
    BALANCE_ERRORS,
    COMMON_UNAUTHORIZED,
    AccountResponse,
    CreditBalanceResponse,
)
from gateway.core.demo import DemoStore
from gateway.core.demo.models import AccountView, CreditBalanceView


def register_account_routes(router: APIRouter, store: DemoStore) -> None:
    """Register deterministic account and credit routes."""

    @router.get(
        '/api/v1/account',
        operation_id='gateway_get_account',
        summary='Retrieve the authenticated demo account identity.',
        response_model=AccountResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def get_account(owner_id: str = Depends(demo_owner)) -> AccountView:
        """Return the deterministic demo account identity."""
        return store.get_account(owner_id)

    @router.get(
        '/api/v1/credits/balance',
        operation_id='gateway_get_credit_balance',
        summary='Retrieve the caller credit balance.',
        response_model=CreditBalanceResponse,
        responses=BALANCE_ERRORS,
    )
    def get_credit_balance(owner_id: str = Depends(demo_owner)) -> CreditBalanceView:
        """Return available deterministic demo credits."""
        return CreditBalanceView(
            balance=store.get_balance(owner_id),
            unit='credits',
            note='Deterministic demo credits, not a financial balance.',
        )
