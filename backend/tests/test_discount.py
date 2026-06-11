import pytest
from app.main import app
from app.deps import require_admin
from app.models.user import User, UserRole


# Dummy mock admin user
mock_admin = User(
    email="testadmin@test.com",
    role=UserRole.ADMIN,
    full_name="Test Admin",
)


@pytest.fixture(autouse=True)
def override_dependencies():
    # Override require_admin dependency to bypass JWT checking in tests
    app.dependency_overrides[require_admin] = lambda: mock_admin
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_discounts(client):
    """Verify that GET /admin/discounts is accessible and returns a list."""
    response = await client.get("/api/v1/admin/discounts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_dealer_schemes(client):
    """Verify that GET /admin/dealer-schemes is accessible and returns a list."""
    response = await client.get("/api/v1/admin/dealer-schemes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
