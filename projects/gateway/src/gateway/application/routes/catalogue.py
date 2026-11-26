"""Catalogue routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter

from gateway.application.schemas import (
    COMMON_UNAUTHORIZED,
    NOT_FOUND_ERRORS,
    ProductListResponse,
    ProductMissionsResponse,
    ProductRequirementsResponse,
    ProductResponse,
)
from gateway.core.demo import DemoStore
from gateway.core.demo.models import ProductListView, ProductMissionsView, ProductRequirementsView, ProductView


def register_catalogue_routes(router: APIRouter, store: DemoStore) -> None:
    """Register deterministic catalogue routes."""

    @router.get(
        '/api/v1/catalogue/products',
        operation_id='gateway_list_products',
        summary='Browse the scientific product catalogue.',
        response_model=ProductListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_products() -> ProductListView:
        """Return deterministic public product descriptors."""
        return store.list_products()

    @router.get(
        '/api/v1/catalogue/products/{product_id}',
        operation_id='gateway_get_product',
        summary='Retrieve a product definition.',
        response_model=ProductResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_product(product_id: str) -> ProductView:
        """Return one deterministic public product descriptor."""
        return store.get_product(product_id)

    @router.get(
        '/api/v1/catalogue/products/{product_id}/input-requirements',
        operation_id='gateway_get_product_input_requirements',
        summary='Inspect abstract scientific input requirements.',
        response_model=ProductRequirementsResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_product_requirements(product_id: str) -> ProductRequirementsView:
        """Return one deterministic product requirement descriptor."""
        return store.get_product_requirements(product_id)

    @router.get(
        '/api/v1/catalogue/products/{product_id}/missions',
        operation_id='gateway_list_product_missions',
        summary='List compatible source missions for a product.',
        response_model=ProductMissionsResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def list_product_missions(product_id: str) -> ProductMissionsView:
        """Return product-compatible missions and their declared metadata."""
        return store.list_product_missions(product_id)
