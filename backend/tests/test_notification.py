"""Unit and integration tests for the Notification system."""

import pytest
from uuid import uuid4
from sqlalchemy import select
from fastapi import status

from app.main import app
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.notification import Notification, DeviceToken
from app.database import async_session_factory

# Dummy Retailer and Admin Users
mock_user = User(
    email="retailer_notif_test@test.com",
    role=UserRole.RETAILER,
    full_name="Retailer Notification Test",
    mobile="+919999999923"
)

mock_admin = User(
    email="admin_notif_test@test.com",
    role=UserRole.ADMIN,
    full_name="Admin Notification Test",
    mobile="+919999999924"
)

current_test_user = mock_user


@pytest.fixture(autouse=True)
def setup_dependencies():
    app.dependency_overrides[get_current_user] = lambda: current_test_user
    yield
    app.dependency_overrides.clear()


async def clean_test_data():
    from sqlalchemy import delete
    async with async_session_factory() as session:
        # Delete test notifications
        res_users = await session.execute(
            select(User).where(
                User.email.in_([mock_user.email, mock_admin.email])
            )
        )
        users = res_users.scalars().all()
        user_ids = [u.id for u in users]

        if user_ids:
            await session.execute(delete(Notification).where(Notification.user_id.in_(user_ids)))
            await session.execute(delete(DeviceToken).where(DeviceToken.user_id.in_(user_ids)))
            await session.execute(delete(Order).where(Order.user_id.in_(user_ids)))
            await session.execute(delete(User).where(User.id.in_(user_ids)))

        await session.commit()


@pytest.mark.asyncio
async def test_get_notifications_empty(client):
    """Verify notifications list starts empty."""
    await clean_test_data()
    
    # Seed user in DB
    async with async_session_factory() as session:
        user = User(
            email=mock_user.email,
            role=UserRole.RETAILER,
            full_name=mock_user.full_name,
            password_hash="hashed",
            mobile=mock_user.mobile
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        mock_user.id = user.id

    global current_test_user
    current_test_user = mock_user

    response = await client.get("/api/v1/notifications")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_register_device_token(client):
    """Verify standard users can register device tokens."""
    global current_test_user
    current_test_user = mock_user

    response = await client.post(
        "/api/v1/notifications/tokens",
        json={"token": "test-fcm-token-123", "platform": "android"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify token stored in DB
    async with async_session_factory() as session:
        res = await session.execute(
            select(DeviceToken).where(
                DeviceToken.user_id == mock_user.id,
                DeviceToken.token == "test-fcm-token-123"
            )
        )
        token_obj = res.scalar_one_or_none()
        assert token_obj is not None
        assert token_obj.platform == "android"


@pytest.mark.asyncio
async def test_order_status_update_sends_notification(client):
    """Verify that updating an order's status creates a notification for the user."""
    global current_test_user

    # 1. Create order for mock_user
    async with async_session_factory() as session:
        order = Order(
            user_id=mock_user.id,
            subtotal=1000,
            gst_amount=180,
            grand_total=1180,
            delivery_address="Test Address",
            status=OrderStatus.PENDING,
            order_number=f"ORD-TEST-{uuid4().hex[:8]}"
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)
        order_id = order.id

    # 2. Update status as Admin
    # Create admin user
    async with async_session_factory() as session:
        admin = User(
            email=mock_admin.email,
            role=UserRole.ADMIN,
            full_name=mock_admin.full_name,
            password_hash="hashed",
            mobile=mock_admin.mobile
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        mock_admin.id = admin.id

    current_test_user = mock_admin

    response = await client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "dispatched"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "dispatched"

    # 3. Fetch notifications as mock_user and verify notification exists
    current_test_user = mock_user
    notif_response = await client.get("/api/v1/notifications")
    assert notif_response.status_code == 200
    notifications = notif_response.json()
    assert len(notifications) == 1
    assert "Dispatched" in notifications[0]["title"]
    assert "dispatched" in notifications[0]["body"]
    assert notifications[0]["is_read"] is False
    assert notifications[0]["notification_type"] == "order"
    assert notifications[0]["reference_id"] == str(order_id)

    # 4. Mark notification as read
    notif_id = notifications[0]["id"]
    read_response = await client.patch(f"/api/v1/notifications/{notif_id}/read")
    assert read_response.status_code == 200
    assert read_response.json()["success"] is True

    # 5. Get notifications list again and check read status
    notif_response_2 = await client.get("/api/v1/notifications")
    assert notif_response_2.json()[0]["is_read"] is True
