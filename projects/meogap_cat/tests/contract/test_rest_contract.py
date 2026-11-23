"""Contract tests for the data and asset catalogue service."""

from pathlib import Path

import pytest
from meogap.rest.contracts import INTERNAL_API_PREFIX, INTERNAL_HEALTH_PATH
from meogap.test_utilities.contracts import ContractCase, assert_contract_compliance

from meogap_cat.application.app import SERVICE_NAME, app
from meogap_cat.application.rest import OPERATIONS

pytestmark = pytest.mark.contract

CONTRACT_PATH = Path(__file__).resolve().parents[3] / 'meogap_interfaces' / 'rest' / f'{SERVICE_NAME}.openapi.json'
CASE = ContractCase(
    service=SERVICE_NAME,
    contract_path=CONTRACT_PATH,
    app=app,
    operations=OPERATIONS,
    health_path=INTERNAL_HEALTH_PATH,
    api_prefix=INTERNAL_API_PREFIX,
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
