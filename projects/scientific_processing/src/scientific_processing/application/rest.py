"""Declared internal operations owned by the scientific processing service."""

from meogap.rest.contracts import INTERNAL_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/catalogue/products',
        'scientific_processing_list_products',
        'Expose the scientific catalogue.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/catalogue/products/{{product_id}}',
        'scientific_processing_get_product',
        'Expose a scientific product definition.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/evaluations',
        'scientific_processing_evaluate_feasibility',
        'Evaluate scientific feasibility and input requirements.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/complexity-estimates',
        'scientific_processing_estimate_complexity',
        'Estimate technical computation complexity.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/computations',
        'scientific_processing_compute_product',
        'Execute a scientific product computation.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/harmonizations',
        'scientific_processing_harmonize_source',
        'Harmonize an original L0 source representation.',
    ),
)
