"""
Unit and integration tests for Razorpay payment integration.
P3-14 Payment Gateway Integration tests.
"""

import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from fastapi import status
from sqlalchemy import select

from app.main import app
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.ledger import LedgerEntry, LedgerType
from app.database import async_session_factory

# Dummy Retailer User
mock_retailer = User(
    email="retailer_payment_test@test.com",
    role=UserRole.RETAILER,
    full_name="Retailer Payment Test",
)

@pytest.fixture(autouse=True)
async def setup_test_user_and_order():
    # 1. Override dependencies to bypass JWT checking
    app.dependency_overrides[get_current_user] = lambda: mock_retailer
    yield
    app.dependency_overrides.clear()


async def clean_test_data():
    from sqlalchemy import delete
    from app.models.order import OrderItem
    async with async_session_factory() as session:
        res = await session.execute(
            select(User).where(
                (User.email == mock_retailer.email) |
                (User.mobile == "+919999999912")
            )
        )
        test_users = res.scalars().all()
        test_user_ids = [u.id for u in test_users]

        if test_user_ids:
            ord_res = await session.execute(
                select(Order).where(
                    Order.order_number.like("ORD-TEST-%") |
                    Order.user_id.in_(test_user_ids)
                )
            )
            test_orders = ord_res.scalars().all()
            test_order_ids = [o.id for o in test_orders]
        else:
            test_order_ids = []

        if test_user_ids or test_order_ids:
            await session.execute(
                delete(LedgerEntry).where(
                    LedgerEntry.user_id.in_(test_user_ids) |
                    LedgerEntry.reference_id.in_(test_order_ids)
                )
            )
        if test_order_ids or test_user_ids:
            await session.execute(
                delete(Payment).where(
                    Payment.order_id.in_(test_order_ids) |
                    Payment.user_id.in_(test_user_ids)
                )
            )
        if test_order_ids:
            await session.execute(delete(OrderItem).where(OrderItem.order_id.in_(test_order_ids)))
            await session.execute(delete(Order).where(Order.id.in_(test_order_ids)))
        if test_user_ids:
            await session.execute(delete(User).where(User.id.in_(test_user_ids)))

        await session.commit()


@pytest.mark.asyncio
async def test_initiate_payment_order_not_found(client):
    """Verify payment initiation fails with 404 if order does not exist."""
    response = await client.post(
        "/api/v1/payments/initiate",
        json={"order_id": str(uuid4())}
    )
    assert response.status_code == 404
    assert response.json()["success"] is False
    assert "Order not found" in response.json()["message"]


@pytest.mark.asyncio
@patch("razorpay.Client")
async def test_initiate_and_verify_payment_success(mock_razorpay_client, client):
    """Verify payment initiation and signature verification success flow."""
    await clean_test_data()
    rzp_order_id = f"order_rzp_{uuid4().hex[:12]}"
    rzp_payment_id = f"pay_rzp_{uuid4().hex[:12]}"
    rzp_signature = f"sig_rzp_{uuid4().hex[:12]}"

    # Mock Razorpay order creation
    mock_client_instance = MagicMock()
    mock_razorpay_client.return_value = mock_client_instance
    mock_client_instance.order.create.return_value = {
        "id": rzp_order_id,
        "amount": 50000,
        "currency": "INR",
        "receipt": "receipt_1"
    }

    # 1. Seed user and order in DB
    async with async_session_factory() as session:
        res = await session.execute(
            select(User).where((User.email == mock_retailer.email) | (User.mobile == "+919999999912"))
        )
        user = res.scalars().first()
        if not user:
            user = User(
                email=mock_retailer.email,
                role=UserRole.RETAILER,
                full_name=mock_retailer.full_name,
                password_hash="hashed",
                mobile="+919999999912"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        mock_retailer.id = user.id

        # Create order
        order = Order(
            user_id=user.id,
            subtotal=42372,
            gst_amount=7628,
            grand_total=50000,
            delivery_address="Test Street, Mumbai, 400001",
            status=OrderStatus.PENDING,
            order_number=f"ORD-TEST-{uuid4().hex[:8]}"
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)
        order_id = order.id

    # 2. Call initiate payment endpoint
    response = await client.post(
        "/api/v1/payments/initiate",
        json={"order_id": str(order_id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gateway_order_id"] == rzp_order_id
    assert data["amount"] == 50000

    # 3. Call verify payment endpoint
    # Mock successful verify_payment_signature (does not raise exception)
    mock_client_instance.utility.verify_payment_signature.return_value = True

    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": rzp_signature
    }
    verify_response = await client.post(
        "/api/v1/payments/verify",
        json=verify_payload
    )
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert verify_data["success"] is True
    assert "Payment verified" in verify_data["message"]


@pytest.mark.asyncio
@patch("razorpay.Client")
async def test_verify_payment_invalid_signature(mock_razorpay_client, client):
    """Verify payment signature verification fails with 400 on invalid signature."""
    mock_client_instance = MagicMock()
    mock_razorpay_client.return_value = mock_client_instance
    # Raise SignatureVerificationError
    import razorpay.errors
    mock_client_instance.utility.verify_payment_signature.side_effect = razorpay.errors.SignatureVerificationError()

    verify_payload = {
        "razorpay_order_id": f"order_rzp_{uuid4().hex[:12]}",
        "razorpay_payment_id": f"pay_rzp_{uuid4().hex[:12]}",
        "razorpay_signature": "invalid_signature"
    }
    verify_response = await client.post(
        "/api/v1/payments/verify",
        json=verify_payload
    )
    assert verify_response.status_code == 400
    assert "Signature verification failed" in verify_response.json()["message"]


@pytest.mark.asyncio
@patch("razorpay.Client")
async def test_webhook_payment_captured(mock_razorpay_client, client):
    """Verify webhook captures the payment event correctly, updates payment and order status, and creates ledger entry."""
    await clean_test_data()
    rzp_order_id = f"order_rzp_{uuid4().hex[:12]}"
    rzp_payment_id = f"pay_rzp_{uuid4().hex[:12]}"

    # Mock webhook verification
    mock_client_instance = MagicMock()
    mock_razorpay_client.return_value = mock_client_instance
    mock_client_instance.utility.verify_webhook_signature.return_value = True

    # 1. Seed database with User, Order and INITIATED Payment
    async with async_session_factory() as session:
        res = await session.execute(
            select(User).where((User.email == mock_retailer.email) | (User.mobile == "+919999999912"))
        )
        user = res.scalars().first()
        if not user:
            user = User(
                email=mock_retailer.email,
                role=UserRole.RETAILER,
                full_name=mock_retailer.full_name,
                password_hash="hashed",
                mobile="+919999999912"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        order = Order(
            user_id=user.id,
            subtotal=42372,
            gst_amount=7628,
            grand_total=50000,
            delivery_address="Test Street, Mumbai, 400001",
            status=OrderStatus.PENDING,
            order_number=f"ORD-TEST-{uuid4().hex[:8]}"
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)

        payment = Payment(
            order_id=order.id,
            user_id=user.id,
            amount=50000,
            status=PaymentStatus.INITIATED,
            method=PaymentMethod.ONLINE,
            gateway_order_id=rzp_order_id
        )
        session.add(payment)
        await session.commit()
        
        db_order_id = order.id
        db_payment_id = payment.id

    # 2. Call Webhook
    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": rzp_payment_id,
                    "order_id": rzp_order_id,
                    "amount": 50000
                }
            }
        }
    }
    headers = {
        "X-Razorpay-Signature": "webhook_signature_12345"
    }
    response = await client.post(
        "/api/v1/payments/webhook",
        json=webhook_payload,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    # 3. Verify changes committed to database
    async with async_session_factory() as session:
        # Check Payment Status is SUCCESS
        pay_res = await session.execute(select(Payment).where(Payment.id == db_payment_id))
        db_payment = pay_res.scalar_one()
        assert db_payment.status == PaymentStatus.SUCCESS
        assert db_payment.gateway_payment_id == rzp_payment_id

        # Check Order Status is CONFIRMED
        ord_res = await session.execute(select(Order).where(Order.id == db_order_id))
        db_order = ord_res.scalar_one()
        assert db_order.status == OrderStatus.CONFIRMED

        # Check LedgerEntry was created
        ledger_res = await session.execute(
            select(LedgerEntry).where(
                LedgerEntry.reference_type == "payment",
                LedgerEntry.reference_id == db_payment_id
            )
        )
        db_ledger = ledger_res.scalar_one_or_none()
        assert db_ledger is not None
        assert db_ledger.entry_type == LedgerType.CREDIT
        assert db_ledger.amount == 50000


@pytest.mark.asyncio
async def test_create_order_cart_empty(client):
    """Verify order placement endpoint does not crash with 500 error, and returns 400 when cart is empty."""
    await clean_test_data()
    # Seed user in DB
    async with async_session_factory() as session:
        res = await session.execute(
            select(User).where((User.email == mock_retailer.email) | (User.mobile == "+919999999912"))
        )
        user = res.scalars().first()
        if not user:
            user = User(
                email=mock_retailer.email,
                role=UserRole.RETAILER,
                full_name=mock_retailer.full_name,
                password_hash="hashed",
                mobile="+919999999912"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        mock_retailer.id = user.id

    response = await client.post(
        "/api/v1/orders",
        json={
            "delivery_address": "Test Street, Mumbai, 400001",
        }
    )
    assert response.status_code == 400
    assert "Cart is empty" in response.json()["message"]

