import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from discrete_engine.database import engine, Base, SessionLocal
from discrete_engine.models import ProductModel, CustomerModel, OrderItemModel

def seed_database():
    print("Initializing Database Schemas...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Check if already seeded
    if db.query(ProductModel).first():
        print("Database already seeded. Aborting.")
        return

    print("Seeding Catalog...")
    # Seed 50 Products
    products = []
    for i in range(1, 51):
        p = ProductModel(
            sku=f"SKU-{i:03d}",
            name=f"Enterprise Product {i}",
            cost=round(random.uniform(10.0, 50.0), 2),
            price=round(random.uniform(55.0, 150.0), 2),
            is_active=True
        )
        products.append(p)
    db.add_all(products)

    print("Seeding Customers...")
    # Seed 100 Customers (20% VIP)
    customers = []
    for i in range(1, 101):
        tier = "VIP" if i <= 20 else "STANDARD"
        c = CustomerModel(id=f"CUST-{i:03d}", tier=tier)
        customers.append(c)
    db.add_all(customers)
    db.commit()

    print("Seeding Telemetry (Orders) for Jan 2023 and Jan 2024...")
    # Helper to generate dates
    def random_date(start_date, end_date):
        delta = end_date - start_date
        int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
        random_second = random.randrange(int_delta)
        return start_date + timedelta(seconds=random_second)

    jan_2023_start = datetime(2023, 1, 1)
    jan_2023_end = datetime(2023, 1, 31, 23, 59, 59)
    jan_2024_start = datetime(2024, 1, 1)
    jan_2024_end = datetime(2024, 1, 31, 23, 59, 59)

    orders = []

    # PERIOD 1: January 2023 (Stable Demand on SKUs 1-30)
    for _ in range(1000):
        # Customers buy heavily from the first 30 SKUs
        sku_idx = random.randint(1, 30)
        cust_idx = random.randint(1, 100)
        o = OrderItemModel(
            order_id=f"ORD-23-{random.randint(1000, 9999)}",
            sku=f"SKU-{sku_idx:03d}",
            customer_id=f"CUST-{cust_idx:03d}",
            quantity=random.randint(1, 5),
            timestamp=random_date(jan_2023_start, jan_2023_end)
        )
        orders.append(o)

    # PERIOD 2: January 2024 (Faded Trends on 1-15, New Movers on 31-50)
    for _ in range(1000):
        # Customers abandon SKUs 1-15 (Faded Trends)
        # Shift buying purely to SKUs 16-50
        sku_idx = random.randint(16, 50)
        cust_idx = random.randint(1, 100)
        o = OrderItemModel(
            order_id=f"ORD-24-{random.randint(1000, 9999)}",
            sku=f"SKU-{sku_idx:03d}",
            customer_id=f"CUST-{cust_idx:03d}",
            quantity=random.randint(1, 5),
            timestamp=random_date(jan_2024_start, jan_2024_end)
        )
        orders.append(o)

    db.add_all(orders)
    db.commit()
    db.close()
    print("Database seeding completed successfully! Injected 2,000 telemetry events.")

if __name__ == "__main__":
    seed_database()
