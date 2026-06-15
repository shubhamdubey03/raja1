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
from app.models.product import Product, ProductStatus, ProductImage
from app.models.ledger import LedgerEntry, LedgerType
from app.models.order import Order, OrderItem, OrderStatus
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
                # --- Category 0: Electronics (25 items) ---
                {"name": "Logitech MX Master 3S Mouse", "sku": "ELEC-MX3S", "price": 899900, "gst": 18, "qty": 100, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80", "unit": "unit"},
                {"name": "Keychron K2 Mechanical Keyboard", "sku": "ELEC-KK2", "price": 749900, "gst": 18, "qty": 120, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80", "unit": "unit"},
                {"name": "Sony WH-1000XM4 Headphones", "sku": "ELEC-XM4", "price": 1999900, "gst": 18, "qty": 80, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80", "unit": "unit"},
                {"name": "Anker PowerPort III Charger", "sku": "ELEC-ANK65", "price": 219900, "gst": 18, "qty": 200, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "unit"},
                {"name": "Apple AirTags (4-Pack)", "sku": "ELEC-TAG4", "price": 990000, "gst": 18, "qty": 150, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1629131726692-1accd0c53db0?w=500&q=80", "unit": "pack"},
                {"name": "SanDisk 128GB microSD Card", "sku": "ELEC-SD128", "price": 119900, "gst": 18, "qty": 300, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&q=80", "unit": "piece"},
                {"name": "JBL Go 3 Portable Speaker", "sku": "ELEC-JBLG3", "price": 299900, "gst": 18, "qty": 140, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80", "unit": "unit"},
                {"name": "TP-Link AC1200 Wi-Fi Router", "sku": "ELEC-TPL12", "price": 249900, "gst": 18, "qty": 90, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80", "unit": "piece"},
                {"name": "Xiaomi Power Bank 20000mAh", "sku": "ELEC-MIPB", "price": 189900, "gst": 18, "qty": 170, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1609592424109-dd825b42a98f?w=500&q=80", "unit": "unit"},
                {"name": "Logitech C920 HD Pro Webcam", "sku": "ELEC-C920", "price": 699900, "gst": 18, "qty": 60, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1600541519468-4a18593be90f?w=500&q=80", "unit": "unit"},
                {"name": "Samsung T7 Portable SSD 1TB", "sku": "ELEC-T71T", "price": 899900, "gst": 18, "qty": 110, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1601524909162-be87252be298?w=500&q=80", "unit": "unit"},
                {"name": "Elgato Stream Deck MK.2", "sku": "ELEC-SDMK2", "price": 1299900, "gst": 18, "qty": 45, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80", "unit": "unit"},
                {"name": "Dell 24-inch IPS Monitor", "sku": "ELEC-DELL24", "price": 1149900, "gst": 18, "qty": 35, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80", "unit": "unit"},
                {"name": "Razer DeathAdder Essential Mouse", "sku": "ELEC-RAZDE", "price": 149900, "gst": 18, "qty": 160, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80", "unit": "unit"},
                {"name": "Belkin 3-Outlet Surge Protector", "sku": "ELEC-BELK3", "price": 99900, "gst": 18, "qty": 120, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "piece"},
                {"name": "Crucial RAM 16GB DDR4", "sku": "ELEC-CRU16", "price": 349900, "gst": 18, "qty": 85, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&q=80", "unit": "unit"},
                {"name": "HyperX SoloCast USB Microphone", "sku": "ELEC-SOLOM", "price": 449900, "gst": 18, "qty": 70, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=500&q=80", "unit": "unit"},
                {"name": "HDMI 2.1 Cable 2 Meters", "sku": "ELEC-HDMI2", "price": 49900, "gst": 18, "qty": 250, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1557853197-aefb550b6fdc?w=500&q=80", "unit": "piece"},
                {"name": "USB-C to USB-A Adapter", "sku": "ELEC-ADAPT", "price": 29900, "gst": 18, "qty": 400, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1563841930606-67e2b64dadb7?w=500&q=80", "unit": "piece"},
                {"name": "Ring Light 10-inch with Stand", "sku": "ELEC-RINGL", "price": 129900, "gst": 18, "qty": 110, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&q=80", "unit": "unit"},
                {"name": "Fitbit Charge 5 Tracker", "sku": "ELEC-FITC5", "price": 1199900, "gst": 18, "qty": 55, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&q=80", "unit": "unit"},
                {"name": "HP Sprocket Instant Printer", "sku": "ELEC-HPSPR", "price": 899900, "gst": 18, "qty": 40, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500&q=80", "unit": "unit"},
                {"name": "Bose SoundLink Flex Speaker", "sku": "ELEC-BOSEF", "price": 1399900, "gst": 18, "qty": 65, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80", "unit": "unit"},
                {"name": "Razer Seiren Mini Mic", "sku": "ELEC-SEIMN", "price": 399900, "gst": 18, "qty": 95, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=500&q=80", "unit": "unit"},
                {"name": "Ugreen Cable Organizer Box", "sku": "ELEC-UBOX", "price": 89900, "gst": 18, "qty": 130, "cat_idx": 0, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "piece"},

                # --- Category 1: Grocery (25 items) ---
                {"name": "Fortune Soya Health Oil 1L", "sku": "GROC-FORT1L", "price": 15500, "gst": 5, "qty": 500, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80", "unit": "bottle"},
                {"name": "Tata Salt Lite 1kg", "sku": "GROC-TSALT", "price": 2800, "gst": 5, "qty": 600, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1604928141223-93c398e2b7a4?w=500&q=80", "unit": "packet"},
                {"name": "Brooke Bond Red Label Tea 1kg", "sku": "GROC-RL1KG", "price": 42000, "gst": 5, "qty": 400, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80", "unit": "packet"},
                {"name": "Nescafe Classic Coffee 100g", "sku": "GROC-NES100", "price": 31000, "gst": 5, "qty": 350, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80", "unit": "jar"},
                {"name": "Catch Turmeric Powder 200g", "sku": "GROC-TUR200", "price": 5800, "gst": 5, "qty": 450, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80", "unit": "packet"},
                {"name": "Aashirvaad Shudh Chakki Atta 10kg", "sku": "GROC-ATTA10", "price": 46000, "gst": 5, "qty": 700, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80", "unit": "bag"},
                {"name": "Dawat Rozana Basmati Rice 5kg", "sku": "GROC-DAW5", "price": 37900, "gst": 5, "qty": 550, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80", "unit": "bag"},
                {"name": "Kellogg's Corn Flakes 875g", "sku": "GROC-FLK875", "price": 34000, "gst": 5, "qty": 280, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&q=80", "unit": "box"},
                {"name": "Saffola Gold Blended Oil 5L", "sku": "GROC-SAF5L", "price": 84900, "gst": 5, "qty": 220, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80", "unit": "can"},
                {"name": "Dabur Honey 500g", "sku": "GROC-DABHON", "price": 21000, "gst": 5, "qty": 310, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80", "unit": "bottle"},
                {"name": "Maggi 2-Minute Noodles 12-Pack", "sku": "GROC-MAG12", "price": 16800, "gst": 5, "qty": 500, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1612966608997-30d411b49f27?w=500&q=80", "unit": "pack"},
                {"name": "Parle-G Gold Biscuits 1kg", "sku": "GROC-PARLEG", "price": 12000, "gst": 5, "qty": 650, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1558961309-dbdf71799f5a?w=500&q=80", "unit": "pack"},
                {"name": "Happilo Almonds 500g", "sku": "GROC-ALM500", "price": 49900, "gst": 5, "qty": 240, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500&q=80", "unit": "packet"},
                {"name": "Cadbury Dairy Milk Silk", "sku": "GROC-CADSILK", "price": 8000, "gst": 5, "qty": 400, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&q=80", "unit": "bar"},
                {"name": "Amul Pure Ghee 1L", "sku": "GROC-GHEE1L", "price": 68000, "gst": 5, "qty": 380, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1589733901241-5e53429e1db4?w=500&q=80", "unit": "tin"},
                {"name": "Sugar Crystal Premium 5kg", "sku": "GROC-SUG5", "price": 24000, "gst": 5, "qty": 450, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?w=500&q=80", "unit": "bag"},
                {"name": "Kissan Tomato Ketchup 1kg", "sku": "GROC-KETCH", "price": 13500, "gst": 5, "qty": 320, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1607305387299-a3d9611cd46f?w=500&q=80", "unit": "bottle"},
                {"name": "Patanjali Aloe Vera Juice 1L", "sku": "GROC-AVJU", "price": 22000, "gst": 5, "qty": 290, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=500&q=80", "unit": "bottle"},
                {"name": "Hershey's Chocolate Syrup", "sku": "GROC-HERSSY", "price": 21000, "gst": 5, "qty": 270, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=500&q=80", "unit": "bottle"},
                {"name": "Himalaya Forest Honey 250g", "sku": "GROC-HIMHON", "price": 11500, "gst": 5, "qty": 330, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80", "unit": "bottle"},
                {"name": "Del Monte Penne Pasta 500g", "sku": "GROC-DELPAST", "price": 14500, "gst": 5, "qty": 360, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80", "unit": "packet"},
                {"name": "Haldiram's Bhujia Sev 1kg", "sku": "GROC-HALD1K", "price": 26000, "gst": 5, "qty": 410, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&q=80", "unit": "packet"},
                {"name": "Horlicks Health Drink 1kg", "sku": "GROC-HOR1K", "price": 38000, "gst": 5, "qty": 250, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80", "unit": "jar"},
                {"name": "Dettol Liquid Handwash Refill", "sku": "GROC-DETREF", "price": 9900, "gst": 5, "qty": 480, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1607006342468-248b61c02118?w=500&q=80", "unit": "packet"},
                {"name": "Real Fruit Juice Mixed 1L", "sku": "GROC-REALMJ", "price": 11000, "gst": 5, "qty": 340, "cat_idx": 1, "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80", "unit": "pack"},

                # --- Category 2: Personal Care (25 items) ---
                {"name": "Dettol Antiseptic Liquid 1L", "sku": "CARE-DET1L", "price": 34900, "gst": 18, "qty": 340, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80", "unit": "bottle"},
                {"name": "Colgate MaxFresh Gel Paste", "sku": "CARE-COLMAX", "price": 15500, "gst": 18, "qty": 520, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&q=80", "unit": "tube"},
                {"name": "Head & Shoulders Shampoo", "sku": "CARE-HNS18", "price": 29000, "gst": 18, "qty": 290, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80", "unit": "bottle"},
                {"name": "Nivea Soft Cream 300ml", "sku": "CARE-NIVSOFT", "price": 32500, "gst": 18, "qty": 210, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80", "unit": "tub"},
                {"name": "Pears Pure Bathing Soap 3-Pack", "sku": "CARE-PEAR3P", "price": 19800, "gst": 18, "qty": 330, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1607006342468-248b61c02118?w=500&q=80", "unit": "pack"},
                {"name": "Gillette Mach 3 Razor", "sku": "CARE-GILM3", "price": 44900, "gst": 18, "qty": 180, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=500&q=80", "unit": "unit"},
                {"name": "Durex Mutual Climax Condoms", "sku": "CARE-DURM10", "price": 25000, "gst": 18, "qty": 300, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80", "unit": "pack"},
                {"name": "Sunsilk Black Shine Shampoo", "sku": "CARE-SUNSHI", "price": 18000, "gst": 18, "qty": 410, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80", "unit": "bottle"},
                {"name": "Dove Cream Beauty Bar 125g", "sku": "CARE-DOVE125", "price": 8800, "gst": 18, "qty": 600, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1607006342468-248b61c02118?w=500&q=80", "unit": "bar"},
                {"name": "Himalaya Purifying Neem Face Wash", "sku": "CARE-HIMNE", "price": 16500, "gst": 18, "qty": 270, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80", "unit": "tube"},
                {"name": "Fogg Marco Body Spray 150ml", "sku": "CARE-FOGGMA", "price": 23000, "gst": 18, "qty": 240, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80", "unit": "bottle"},
                {"name": "Pond's Dreamflower Talc 400g", "sku": "CARE-PONDST", "price": 24000, "gst": 18, "qty": 190, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80", "unit": "can"},
                {"name": "Vaseline Intensive Care Lotion", "sku": "CARE-VAS400", "price": 31000, "gst": 18, "qty": 220, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80", "unit": "bottle"},
                {"name": "Sensodyne Fresh Mint Paste", "sku": "CARE-SENSODY", "price": 18000, "gst": 18, "qty": 350, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&q=80", "unit": "tube"},
                {"name": "Wild Stone Code Body Perfume", "sku": "CARE-WSCODE", "price": 29900, "gst": 18, "qty": 140, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80", "unit": "bottle"},
                {"name": "Axe Signature Gold Perfume", "sku": "CARE-AXESIG", "price": 34900, "gst": 18, "qty": 160, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&q=80", "unit": "bottle"},
                {"name": "Engage W2 Perfume For Women", "sku": "CARE-ENGAGEW", "price": 22000, "gst": 18, "qty": 180, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80", "unit": "bottle"},
                {"name": "L'Oreal Paris Total Repair Conditioner", "sku": "CARE-LOPTR", "price": 19900, "gst": 18, "qty": 200, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80", "unit": "bottle"},
                {"name": "Livon Hair Serum 100ml", "sku": "CARE-LIV100", "price": 25000, "gst": 18, "qty": 130, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80", "unit": "bottle"},
                {"name": "Biotique Bio Kelp Protein Shampoo", "sku": "CARE-BIOTK", "price": 15900, "gst": 18, "qty": 150, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80", "unit": "bottle"},
                {"name": "Clean & Clear Foaming Face Wash", "sku": "CARE-CCFW", "price": 12000, "gst": 18, "qty": 230, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80", "unit": "tube"},
                {"name": "Olay Total Effects Cream 50g", "sku": "CARE-OLAYTE", "price": 79900, "gst": 18, "qty": 90, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=500&q=80", "unit": "jar"},
                {"name": "Park Avenue Premium Styling Gel", "sku": "CARE-PASTG", "price": 11000, "gst": 18, "qty": 250, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80", "unit": "tube"},
                {"name": "Parachute Advanced Coconut Hair Oil", "sku": "CARE-PACO", "price": 14500, "gst": 18, "qty": 420, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1626880842125-8f7f45ee0907?w=500&q=80", "unit": "bottle"},
                {"name": "Fiama Di Wills Gel Bar 3-Pack", "sku": "CARE-FIAMA", "price": 17500, "gst": 18, "qty": 190, "cat_idx": 2, "image": "https://images.unsplash.com/photo-1607006342468-248b61c02118?w=500&q=80", "unit": "pack"},

                # --- Category 3: Home & Kitchen (25 items) ---
                {"name": "Cello H2O Stainless Steel Bottle", "sku": "HOME-CELLOH", "price": 34900, "gst": 12, "qty": 180, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&q=80", "unit": "piece"},
                {"name": "Milton Thermosteel Flask 1L", "sku": "HOME-MILTH", "price": 89900, "gst": 12, "qty": 120, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80", "unit": "piece"},
                {"name": "Pigeon Non-Stick Kadai", "sku": "HOME-PIGKAD", "price": 79900, "gst": 12, "qty": 90, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80", "unit": "piece"},
                {"name": "Hawkins Pressure Cooker 3L", "sku": "HOME-HAWK3L", "price": 149900, "gst": 12, "qty": 75, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80", "unit": "piece"},
                {"name": "Borosil Glass Tumblers (Set of 4)", "sku": "HOME-BORO4", "price": 54900, "gst": 12, "qty": 100, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80", "unit": "set"},
                {"name": "Scotch-Brite Kitchen Sponge 3-Pack", "sku": "HOME-SCOTCH", "price": 9000, "gst": 12, "qty": 350, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "pack"},
                {"name": "Vim Dishwash Gel Lemon 1L", "sku": "HOME-VIMGEL", "price": 19900, "gst": 12, "qty": 280, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1607006342468-248b61c02118?w=500&q=80", "unit": "bottle"},
                {"name": "Comfort After Wash Fabric Softener", "sku": "HOME-COMF", "price": 21500, "gst": 12, "qty": 220, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "bottle"},
                {"name": "Lizol Floor Cleaner Citrus 2L", "sku": "HOME-LIZ2L", "price": 32900, "gst": 12, "qty": 170, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "bottle"},
                {"name": "Harpic Disinfectant Toilet Cleaner", "sku": "HOME-HARP", "price": 14900, "gst": 12, "qty": 290, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80", "unit": "bottle"},
                {"name": "Hit Crawling Insect Killer Spray", "sku": "HOME-HITRED", "price": 19900, "gst": 12, "qty": 150, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80", "unit": "can"},
                {"name": "Gala NoDust Broom", "sku": "HOME-GALABR", "price": 18000, "gst": 12, "qty": 160, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "piece"},
                {"name": "Aer Pocket Bathroom Fragrance", "sku": "HOME-AERPOC", "price": 5500, "gst": 12, "qty": 400, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80", "unit": "piece"},
                {"name": "All Out Ultra Mosquito Repellent", "sku": "HOME-ALLOUT", "price": 8500, "gst": 12, "qty": 320, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80", "unit": "pack"},
                {"name": "Prestige Induction Cooktop", "sku": "HOME-PRESIND", "price": 249900, "gst": 12, "qty": 40, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80", "unit": "unit"},
                {"name": "Signoraware Executive Lunch Box", "sku": "HOME-SIGLUN", "price": 42000, "gst": 12, "qty": 110, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "set"},
                {"name": "Milton Kool Luster Water Jug", "sku": "HOME-MILJUG", "price": 69900, "gst": 12, "qty": 80, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80", "unit": "piece"},
                {"name": "Wonderchef Nutri-Blend Mixer", "sku": "HOME-WONDMX", "price": 299900, "gst": 12, "qty": 50, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=500&q=80", "unit": "unit"},
                {"name": "Cello Max Fresh Container Set", "sku": "HOME-CELLOMF", "price": 38000, "gst": 12, "qty": 130, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80", "unit": "set"},
                {"name": "Philips Daily Collection Kettle", "sku": "HOME-PHILKET", "price": 129900, "gst": 12, "qty": 65, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=500&q=80", "unit": "unit"},
                {"name": "Tefal Delicia Frypan 24cm", "sku": "HOME-TEFPAN", "price": 99900, "gst": 12, "qty": 95, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&q=80", "unit": "piece"},
                {"name": "Solimo Microfiber Bed-sheet", "sku": "HOME-SOLBS", "price": 59900, "gst": 12, "qty": 110, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&q=80", "unit": "piece"},
                {"name": "Spaces Cotton Bath Towel", "sku": "HOME-SPACET", "price": 44900, "gst": 12, "qty": 140, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&q=80", "unit": "piece"},
                {"name": "Syska 9W LED Bulb 2-Pack", "sku": "HOME-SYSBULB", "price": 17900, "gst": 12, "qty": 200, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&q=80", "unit": "pack"},
                {"name": "Duracell Power AA Batteries", "sku": "HOME-DURAA", "price": 15000, "gst": 12, "qty": 300, "cat_idx": 3, "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&q=80", "unit": "pack"}
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
                        unit=p["unit"],
                        category_id=cat_ids[p["cat_idx"]],
                        status=ProductStatus.ACTIVE,
                    )
                    db.add(product)
                    await db.flush()

                    product_img = ProductImage(
                        product_id=product.id,
                        image_url=p["image"],
                        sort_order=0
                    )
                    db.add(product_img)
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
        retailer_user_obj = existing_retailer.scalar_one_or_none()
        if not retailer_user_obj:
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

            # Seed ledger entries
            ledger_debit = LedgerEntry(
                user_id=retailer_user.id,
                entry_type=LedgerType.DEBIT,
                amount=250000,
                reference_type="order",
                reference_id=uuid.uuid4(),
                description="Order #ORD-10023",
            )
            ledger_credit = LedgerEntry(
                user_id=retailer_user.id,
                entry_type=LedgerType.CREDIT,
                amount=100000,
                reference_type="payment",
                reference_id=uuid.uuid4(),
                description="Manual Cash payment",
            )
            db.add(ledger_debit)
            db.add(ledger_credit)
        else:
            # Check if ledger entries already exist
            existing_ledger = await db.execute(select(LedgerEntry).where(LedgerEntry.user_id == retailer_user_obj.id))
            if not existing_ledger.scalars().first():
                ledger_debit = LedgerEntry(
                    user_id=retailer_user_obj.id,
                    entry_type=LedgerType.DEBIT,
                    amount=250000,
                    reference_type="order",
                    reference_id=uuid.uuid4(),
                    description="Order #ORD-10023",
                )
                ledger_credit = LedgerEntry(
                    user_id=retailer_user_obj.id,
                    entry_type=LedgerType.CREDIT,
                    amount=100000,
                    reference_type="payment",
                    reference_id=uuid.uuid4(),
                    description="Manual Cash payment",
                )
                db.add(ledger_debit)
                db.add(ledger_credit)
                print("[SEED] Ledger entries created for Retailer")

        # ── 6. Seed Sample Orders ────────────────────────────
        r_user_res = await db.execute(
            select(User).where(User.mobile == "+919876543211")
        )
        r_user = r_user_res.scalar_one_or_none()
        if r_user:
            existing_ord = await db.execute(
                select(Order).where(Order.user_id == r_user.id)
            )
            if not existing_ord.scalars().first():
                # Get some product IDs
                p_res = await db.execute(select(Product).limit(2))
                prods = p_res.scalars().all()
                if prods:
                    # Let's create an order
                    order = Order(
                        user_id=r_user.id,
                        order_number="ORD-20260612-SEED1111",
                        status=OrderStatus.CONFIRMED,
                        subtotal=sum(p.base_price for p in prods),
                        gst_amount=sum(int(p.base_price * p.gst_rate / 100) for p in prods),
                        discount_amount=0,
                        grand_total=sum(p.base_price + int(p.base_price * p.gst_rate / 100) for p in prods),
                        delivery_address="Test Retail Shop, Delhi, Delhi - 110001",
                    )
                    db.add(order)
                    await db.flush()

                    for p in prods:
                        oi = OrderItem(
                            order_id=order.id,
                            product_id=p.id,
                            product_name=p.name,
                            quantity=1,
                            unit_price=p.base_price,
                            gst_rate=p.gst_rate,
                            line_total=p.base_price,
                            gst_amount=int(p.base_price * p.gst_rate / 100),
                        )
                        db.add(oi)

                    # Create a ledger debit entry matching this order
                    ledger_debit = LedgerEntry(
                        user_id=r_user.id,
                        entry_type=LedgerType.DEBIT,
                        amount=order.grand_total,
                        reference_type="order",
                        reference_id=order.id,
                        description=f"Order {order.order_number}",
                    )
                    db.add(ledger_debit)
                    print(f"[SEED] Sample order created for Retailer: {order.order_number}")

        await db.commit()
        print("\n[SEED] [SUCCESS] Seed data insertion complete!")


if __name__ == "__main__":
    asyncio.run(seed())
