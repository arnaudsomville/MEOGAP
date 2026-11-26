"""Assembly of the implemented deterministic Gateway router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPBearer

from gateway.application.routes.account import register_account_routes
from gateway.application.routes.aois import register_aoi_routes
from gateway.application.routes.catalogue import register_catalogue_routes
from gateway.application.routes.dependencies import demo_owner
from gateway.application.routes.places import register_place_routes
from gateway.application.routes.requests import register_request_routes
from gateway.application.routes.results import register_result_routes
from gateway.application.schemas import API_TAG
from gateway.core.demo import DemoStore
from gateway.core.places import PlaceDatabase


def build_demo_router(store: DemoStore, places: PlaceDatabase | None = None) -> APIRouter:
    """Build public Gateway routes backed by deterministic in-memory state.

    Args:
    ----
        store(DemoStore): process-local deterministic Gateway state.
        places(PlaceDatabase | None): local place search database; created lazily by default.

    Returns:
    -------
        APIRouter: implemented public business routes.

    """
    router = APIRouter(
        tags=[API_TAG],
        dependencies=[Depends(demo_owner), Security(HTTPBearer(auto_error=False, scheme_name='bearerAuth'))],
    )
    register_catalogue_routes(router, store)
    register_aoi_routes(router, store)
    register_request_routes(router, store)
    register_place_routes(router, places or PlaceDatabase())
    register_result_routes(router, store)
    register_account_routes(router, store)
    return router
