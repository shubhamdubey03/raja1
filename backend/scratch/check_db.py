import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.order import Order
from app.models.user import User
from app.models.notification import Notification

async def main():
    async with async_session_factory() as session:
        # Get all orders
        res_orders = await session.execute(select(Order))
        orders = res_orders.scalars().all()
        print("--- ORDERS ---")
        for o in orders:
            print(f"ID: {o.id}, Number: {o.order_number}, Status: {o.status.value}, UserID: {o.user_id}")

        # Get all users
        res_users = await session.execute(select(User))
        users = res_users.scalars().all()
        print("\n--- USERS ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Mobile: {u.mobile}, Role: {u.role.value}")

        # Get all notifications
        res_notifs = await session.execute(select(Notification))
        notifs = res_notifs.scalars().all()
        print("\n--- NOTIFICATIONS ---")
        for n in notifs:
            print(f"ID: {n.id}, UserID: {n.user_id}, Title: {n.title}, Body: {n.body}, Type: {n.notification_type}, Read: {n.is_read}, Status: {n.delivery_status}")

if __name__ == "__main__":
    asyncio.run(main())
