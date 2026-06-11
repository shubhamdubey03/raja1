"""
Seed script — P1-06.

Creates: 1 Super Admin, sample categories, sample products, 1 Vendor, 1 Retailer.
Credentials from .env.test or .env.
"""

import asyncio
import uuid

from sqlalchemy import select

from app.config import get_settings
from app.database import async_session_factory, engine, Base
from app.models.user import User, UserRole, UserStatus
from app.models.vendor import Vendor
from app.models.retailer import Retailer
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.utils.security import hash_password
from app.utils.slug import generate_unique_slug

settings = get_settings()


async def seed():
    """Run seed data insertion."""
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ── 1. Super Admin ───────────────────────────────────
        existing = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN, User.is_deleted == False)  # noqa: E712
        )
        if not existing.scalar_one_or_none():
            super_admin = User(
                mobile=settings.super_admin_mobile,
                email=settings.super_admin_email,
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password(settings.super_admin_password),
            )
            db.add(super_admin)
            await db.flush()
            print(f"[SEED] Super Admin created: {settings.super_admin_email}")

        # ── 2. Sample Categories ─────────────────────────────
        categories_data = [
            {"name": "Electronics", "desc": "Electronic devices and accessories"},
            {"name": "Grocery", "desc": "Daily grocery and FMCG products"},
            {"name": "Personal Care", "desc": "Personal care and hygiene products"},
            {"name": "Home & Kitchen", "desc": "Home and kitchen essentials"},
        ]
        cat_ids = []
        for cat_data in categories_data:
            existing_cat = await db.execute(
                select(Category).where(Category.name == cat_data["name"], Category.is_deleted == False)  # noqa: E712
            )
            if not existing_cat.scalar_one_or_none():
                cat = Category(
                    name=cat_data["name"],
                    slug=generate_unique_slug(cat_data["name"]),
                    description=cat_data["desc"],
                )
                db.add(cat)
                await db.flush()
                cat_ids.append(cat.id)
                print(f"[SEED] Category created: {cat_data['name']}")
            else:
                existing_cat_obj = (await db.execute(
                    select(Category).where(Category.name == cat_data["name"])
                )).scalar_one()
                cat_ids.append(existing_cat_obj.id)

        # ── 3. Sample Products ───────────────────────────────
        if cat_ids:
            products_data = [
                {"name": "Wireless Mouse", "sku": "ELEC-001", "price": 59900, "gst": 18, "qty": 100, "cat_idx": 0},
                {"name": "USB Cable Type-C", "sku": "ELEC-002", "price": 29900, "gst": 18, "qty": 200, "cat_idx": 0},
                {"name": "Basmati Rice 5kg", "sku": "GROC-001", "price": 45000, "gst": 5, "qty": 500, "cat_idx": 1},
                {"name": "Cooking Oil 1L", "sku": "GROC-002", "price": 18000, "gst": 5, "qty": 300, "cat_idx": 1},
                {"name": "Hand Wash 250ml", "sku": "CARE-001", "price": 9900, "gst": 18, "qty": 400, "cat_idx": 2},
                {"name": "Stainless Steel Bottle", "sku": "HOME-001", "price": 79900, "gst": 12, "qty": 150, "cat_idx": 3},
            ]
            for p in products_data:
                existing_prod = await db.execute(
                    select(Product).where(Product.sku == p["sku"], Product.is_deleted == False)  # noqa: E712
                )
                if not existing_prod.scalar_one_or_none():
                    product = Product(
                        name=p["name"],
                        slug=generate_unique_slug(p["name"]),
                        sku=p["sku"],
                        base_price=p["price"],
                        gst_rate=p["gst"],
                        stock_qty=p["qty"],
                        category_id=cat_ids[p["cat_idx"]],
                        status=ProductStatus.ACTIVE,
                    )
                    db.add(product)
                    print(f"[SEED] Product created: {p['name']} (INR {p['price'] / 100:.2f})")

        # ── 4. Sample Vendor ─────────────────────────────────
        existing_vendor = await db.execute(
            select(User).where(User.mobile == "+919876543210", User.is_deleted == False)  # noqa: E712
        )
        if not existing_vendor.scalar_one_or_none():
            vendor_user = User(
                mobile="+919876543210",
                full_name="Test Vendor",
                role=UserRole.VENDOR,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password("vendor123"),
            )
            db.add(vendor_user)
            await db.flush()
            vendor = Vendor(
                user_id=vendor_user.id,
                business_name="Test Wholesale Co.",
                gst_number="29AADCB2230M1ZP",
                city="Mumbai",
                state="Maharashtra",
            )
            db.add(vendor)
            print("[SEED] Vendor created: Test Vendor (+919876543210)")

        # ── 5. Sample Retailer ───────────────────────────────
        existing_retailer = await db.execute(
            select(User).where(User.mobile == "+919876543211", User.is_deleted == False)  # noqa: E712
        )
        if not existing_retailer.scalar_one_or_none():
            retailer_user = User(
                mobile="+919876543211",
                full_name="Test Retailer",
                role=UserRole.RETAILER,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password("retailer123"),
            )
            db.add(retailer_user)
            await db.flush()
            retailer = Retailer(
                user_id=retailer_user.id,
                business_name="Test Retail Shop",
                owner_name="Test Retailer",
                business_type="General Store",
                city="Delhi",
                state="Delhi",
                credit_limit=10000000,  # INR 1,00,000 in paise
            )
            db.add(retailer)
            print("[SEED] Retailer created: Test Retailer (+919876543211)")

        await db.commit()
        print("\n[SEED] [SUCCESS] Seed data insertion complete!")


if __name__ == "__main__":
    asyncio.run(seed())
