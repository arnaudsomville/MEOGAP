"""Declared public operations owned by the MEOGAP gateway."""

from meogap.rest.contracts import PUBLIC_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products',
        'gateway_list_products',
        'Browse the scientific product catalogue.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products/{{product_id}}',
        'gateway_get_product',
        'Retrieve a product definition.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/catalogue/products/{{product_id}}/input-requirements',
        'gateway_get_product_input_requirements',
        'Inspect abstract scientific input requirements.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/aois',
        'gateway_list_user_aois',
        'List AOIs owned by the authenticated user.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/aois',
        'gateway_create_user_aoi',
        'Create an AOI owned by the authenticated user.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/aois/{{aoi_id}}',
        'gateway_get_user_aoi',
        'Retrieve an AOI owned by the authenticated user.',
    ),
    Operation(
        'PATCH',
        f'{PUBLIC_API_PREFIX}/aois/{{aoi_id}}',
        'gateway_update_user_aoi',
        'Update an owned AOI and increment its revision.',
    ),
    Operation(
        'DELETE',
        f'{PUBLIC_API_PREFIX}/aois/{{aoi_id}}',
        'gateway_delete_user_aoi',
        'Delete an owned AOI. Existing request snapshots are unaffected.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests',
        'gateway_create_analysis_request',
        'Submit an analysis request.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}/confirm',
        'gateway_confirm_analysis_request',
        'Confirm a proposed analysis request.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/analysis-requests',
        'gateway_list_analysis_requests',
        'List analysis requests.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}',
        'gateway_get_analysis_request',
        'Retrieve the authoritative request state.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/analysis-requests/{{request_id}}/cancel',
        'gateway_cancel_analysis_request',
        'Request analysis cancellation.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/map',
        'gateway_get_result_map',
        'Request a map representation.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/series',
        'gateway_get_result_series',
        'Request an analytical series.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/lineage',
        'gateway_get_result_lineage',
        'Inspect result lineage.',
    ),
    Operation(
        'POST',
        f'{PUBLIC_API_PREFIX}/results/{{result_id}}/deliveries',
        'gateway_create_delivery',
        'Request final-product or dependency-archive delivery.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/deliveries/{{delivery_id}}',
        'gateway_get_delivery',
        'Retrieve delivery state and access.',
    ),
    Operation(
        'GET',
        f'{PUBLIC_API_PREFIX}/credits/balance',
        'gateway_get_credit_balance',
        'Retrieve the caller credit balance.',
    ),
)
