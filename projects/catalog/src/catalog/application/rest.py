"""Declared internal operations owned by the data and asset catalogue service."""

from meogap.rest.contracts import INTERNAL_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/dependencies',
        'catalog_resolve_dependencies',
        'Resolve abstract requirements to concrete dependencies.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/acquisition-costs',
        'catalog_estimate_acquisition_costs',
        'Obtain itemized L0 acquisition costs.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/ingestions',
        'catalog_ingest_sources',
        'Request and report L0 ingestion.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/references',
        'catalog_resolve_references',
        'Resolve canonical asset references.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/results/{{result_id}}/lineage',
        'catalog_get_result_lineage',
        'Retrieve actual result lineage.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/source-representations',
        'catalog_resolve_source_representation',
        'Resolve an original Source Asset representation.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/representation-availability',
        'catalog_check_representation_availability',
        'Check harmonized representation availability.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/derived-assets',
        'catalog_register_derived_asset',
        'Register a Derived Asset and confirm registration.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/source-assets/{{asset_id}}/representations',
        'catalog_register_source_representation',
        'Register a harmonized representation against a Source Asset.',
    ),
)
