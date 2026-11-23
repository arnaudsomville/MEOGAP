"""Declared internal operations owned by the control and orchestration service."""

from meogap.rest.contracts import INTERNAL_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests',
        'con_create_request',
        'Create a request and prepare a proposal.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}/confirm',
        'con_confirm_request',
        'Confirm a proposal and launch computation.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/requests',
        'con_list_requests',
        'List caller-visible requests.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}',
        'con_get_request',
        'Retrieve request status.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/credits/balance',
        'con_get_credit_balance',
        'Retrieve the caller credit balance.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/authorizations',
        'con_decide_access',
        'Decide access to a result or resource.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/deliveries',
        'con_create_delivery',
        'Create a delivery resource.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}/cancel',
        'con_cancel_request',
        'Request cancellation of a request.',
    ),
)
