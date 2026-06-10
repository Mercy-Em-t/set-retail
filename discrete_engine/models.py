from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base

class ProductModel(Base):
    __tablename__ = "products"
    
    sku = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class CustomerModel(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, index=True)
    tier = Column(String, default="STANDARD")  # E.g., 'STANDARD', 'VIP'

class OrderItemModel(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, index=True)
    sku = Column(String, ForeignKey("products.sku"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    quantity = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
