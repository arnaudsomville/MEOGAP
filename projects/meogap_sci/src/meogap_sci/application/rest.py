"""Declared internal operations owned by the scientific processing service."""

from meogap.rest.contracts import INTERNAL_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/catalogue/products',
        'sci_list_products',
        'Expose the scientific catalogue.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/catalogue/products/{{product_id}}',
        'sci_get_product',
        'Expose a scientific product definition.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/evaluations',
        'sci_evaluate_feasibility',
        'Evaluate scientific feasibility and input requirements.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/complexity-estimates',
        'sci_estimate_complexity',
        'Estimate technical computation complexity.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/computations',
        'sci_compute_product',
        'Execute a scientific product computation.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/harmonizations',
        'sci_harmonize_source',
        'Harmonize an original L0 source representation.',
    ),
)
