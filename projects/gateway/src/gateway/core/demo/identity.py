"""Deterministic demo identity mapping owned by the Gateway."""

from __future__ import annotations

from gateway.core.demo.constants import DEMO_ACCOUNTS, DEMO_OWNER_ID
from gateway.core.demo.models import AccountView


def owner_for_token(token: str) -> str:
    """Map a deterministic demo bearer token to an owner identifier.

    Args:
    ----
        token(str): syntactically validated bearer credential.

    Returns:
    -------
        str: deterministic owner identifier derived by the Gateway.

    """
    return DEMO_ACCOUNTS.get(token, (DEMO_OWNER_ID, ''))[0]


def account_identity(owner_id: str) -> AccountView:
    """Return the deterministic demo account identity for an owner.

    Args:
    ----
        owner_id(str): trusted owner identifier.

    Returns:
    -------
        AccountView: public account identity.

    """
    display_name = next(
        (name for account_owner, name in DEMO_ACCOUNTS.values() if account_owner == owner_id),
        'MEOGAP demo user',
    )
    return AccountView(user_id=owner_id, display_name=display_name, session_status='AUTHENTICATED')
