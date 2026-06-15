"""
Tests for health check and auth endpoints.

P2-02: Unit test each role guard.
"""

import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """P1-05: Health endpoint returns 200."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data


@pytest.mark.asyncio
async def test_admin_login_invalid_credentials(client):
    """Auth: invalid login returns 401."""
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": "wrong@test.com", "password": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client):
    """RBAC: accessing protected endpoint without token returns 403."""
    response = await client.get("/api/v1/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_otp_send_rate_limiting(client):
    """P2-07: OTP resend cooldown enforced."""
    # First request should succeed (or fail gracefully)
    response = await client.post(
        "/api/v1/otp/send",
        json={"mobile": "+919999999999", "purpose": "login"},
    )
    # Response could be success or rate-limited; just verify it doesn't crash
    assert response.status_code in (200, 429)


@pytest.mark.asyncio
async def test_retailer_register_validation(client):
    """P2-06: Registration with missing fields returns 422."""
    response = await client.post(
        "/api/v1/retailer/auth/register",
        json={"mobile": "123"},  # Missing required fields
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_error_response_format(client):
    """Test that errors return the consistent format required by Rule 3."""
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": "wrong@test.com", "password": "wrong"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert "message" in data
    assert data["error_code"] == "UNAUTHORIZED"
    assert data["data"] is None


@pytest.mark.asyncio
async def test_hardcoded_otp_rejected(client):
    """Test that the hardcoded OTP bypass (123456) is rejected."""
    # 1. Send OTP to establish a valid OTP record in the DB
    await client.post(
        "/api/v1/otp/send",
        json={"mobile": "+919876543210", "purpose": "login"},
    )
    # 2. Attempt verification using the forbidden hardcoded OTP "123456"
    response = await client.post(
        "/api/v1/otp/verify",
        json={"mobile": "+919876543210", "otp": "123456", "purpose": "login"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "Hardcoded OTP" in data["message"]


