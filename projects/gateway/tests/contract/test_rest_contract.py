"""Contract tests for the public REST gateway service."""

import pytest
from meogap.rest.contracts import PUBLIC_API_PREFIX, PUBLIC_HEALTH_PATH
from meogap.test_utilities.contracts import ContractCase, assert_contract_compliance, contract_path

from gateway.application.app import SERVICE_NAME, app
from gateway.application.rest import OPERATIONS

pytestmark = pytest.mark.contract

CONTRACT_PATH = contract_path(SERVICE_NAME)
CASE = ContractCase(
    service=SERVICE_NAME,
    contract_path=CONTRACT_PATH,
    app=app,
    operations=OPERATIONS,
    health_path=PUBLIC_HEALTH_PATH,
    api_prefix=PUBLIC_API_PREFIX,
)


@pytest.mark.parametrize('case', [CASE], ids=[SERVICE_NAME])
def test_service_contract(case: ContractCase) -> None:
    """Validate the live service against the committed reference contract.

    Args:
    ----
        case(ContractCase): service contract case.

    Returns:
    -------
        None

    """
    # Act / Assert
    assert_contract_compliance(case)
