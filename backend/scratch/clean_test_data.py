import asyncio
from sqlalchemy import select, delete
from app.database import async_session_factory, engine
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.ledger import LedgerEntry

async def clean_test_data():
    async with async_session_factory() as session:
        # Find test users
        res = await session.execute(
            select(User).where(
                (User.email == "retailer_payment_test@test.com") |
                (User.mobile == "+919999999912") |
                (User.email == "retailer_test@test.com")
            )
        )
        test_users = res.scalars().all()
        test_user_ids = [u.id for u in test_users]
        
        # Find test orders by number pattern or test user ID
        ord_res = await session.execute(
            select(Order).where(
                Order.order_number.like("ORD-TEST-%") |
                Order.user_id.in_(test_user_ids) if test_user_ids else False
            )
        )
        test_orders = ord_res.scalars().all()
        test_order_ids = [o.id for o in test_orders]
        
        print(f"Found {len(test_users)} test users, {len(test_orders)} test orders.")
        
        # 1. Delete ledger entries for test users/orders
        if test_user_ids or test_order_ids:
            deleted_ledger = await session.execute(
                delete(LedgerEntry).where(
                    LedgerEntry.user_id.in_(test_user_ids) |
                    LedgerEntry.reference_id.in_(test_order_ids)
                )
            )
            print(f"Deleted ledger entries.")
            
        # 2. Delete payments for test orders/users
        if test_order_ids or test_user_ids:
            await session.execute(
                delete(Payment).where(
                    Payment.order_id.in_(test_order_ids) |
                    Payment.user_id.in_(test_user_ids)
                )
            )
            print("Deleted payments.")
            
        # 3. Delete order items for test orders
        if test_order_ids:
            await session.execute(
                delete(OrderItem).where(OrderItem.order_id.in_(test_order_ids))
            )
            print("Deleted order items.")
            
        # 4. Delete orders
        if test_order_ids:
            await session.execute(
                delete(Order).where(Order.id.in_(test_order_ids))
            )
            print("Deleted orders.")
            
        # 5. Delete test users
        if test_user_ids:
            await session.execute(
                delete(User).where(User.id.in_(test_user_ids))
            )
            print("Deleted users.")
            
        await session.commit()
        print("Test data cleanup completed successfully!")

if __name__ == "__main__":
    asyncio.run(clean_test_data())
