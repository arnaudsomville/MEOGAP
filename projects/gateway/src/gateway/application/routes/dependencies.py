"""Shared route dependencies for the public Gateway."""

from __future__ import annotations

from fastapi import Depends
from meogap.rest.middleware import Identity, get_identity

from gateway.core.demo import owner_for_token

DEMO_OWNER_DEPENDENCY = Depends(get_identity)


def demo_owner(identity: Identity = DEMO_OWNER_DEPENDENCY) -> str:
    """Derive the deterministic owner from the authenticated bearer token."""
    return owner_for_token(identity.token)
