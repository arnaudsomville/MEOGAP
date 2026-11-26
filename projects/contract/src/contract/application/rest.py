"""Declared internal operations owned by the control and orchestration service."""

from meogap.rest.contracts import INTERNAL_API_PREFIX, Operation

OPERATIONS: tuple[Operation, ...] = (
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests',
        'contract_create_request',
        'Create a request and prepare a proposal.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}/confirm',
        'contract_confirm_request',
        'Confirm a proposal and launch computation.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/requests',
        'contract_list_requests',
        'List caller-visible requests.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}',
        'contract_get_request',
        'Retrieve request status.',
    ),
    Operation(
        'GET',
        f'{INTERNAL_API_PREFIX}/credits/balance',
        'contract_get_credit_balance',
        'Retrieve the caller credit balance.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/authorizations',
        'contract_decide_access',
        'Decide access to a result or resource.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/deliveries',
        'contract_create_delivery',
        'Create a delivery resource.',
    ),
    Operation(
        'POST',
        f'{INTERNAL_API_PREFIX}/requests/{{request_id}}/cancel',
        'contract_cancel_request',
        'Request cancellation of a request.',
    ),
)
