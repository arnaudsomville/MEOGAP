"""Declared public operations owned by the MEOGAP gateway."""

from meogap.rest.contracts import PUBLIC_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products',
        'gat_list_products',
        'Browse the scientific product catalogue.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products/{{product_id}}',
        'gat_get_product',
        'Retrieve a product definition.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products/{{product_id}}/input-requirements',
        'gat_get_product_input_requirements',
        'Inspect abstract scientific input requirements.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests',
        'gat_create_analysis_request',
        'Submit an analysis request.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}/confirm',
        'gat_confirm_analysis_request',
        'Confirm a proposed analysis request.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/analysis-requests',
        'gat_list_analysis_requests',
        'List analysis requests.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}',
        'gat_get_analysis_request',
        'Retrieve the authoritative request state.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}/cancel',
        'gat_cancel_analysis_request',
        'Request analysis cancellation.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/map',
        'gat_get_result_map',
        'Request a map representation.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/series',
        'gat_get_result_series',
        'Request an analytical series.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/lineage',
        'gat_get_result_lineage',
        'Inspect result lineage.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/deliveries',
        'gat_create_delivery',
        'Request final-product or dependency-archive delivery.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/deliveries/{{delivery_id}}',
        'gat_get_delivery',
        'Retrieve delivery state and access.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/credits/balance',
        'gat_get_credit_balance',
        'Retrieve the caller credit balance.',
    ),
)
