from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from database import engine, Base, get_db_session
from pipelines import ProductionDiscreteEngine
from models import ProductModel, OrderItemModel, CustomerModel
from pydantic import BaseModel
from typing import List

# Auto-instantiate the database layers upon application runtime
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Grand Unified Discrete Mathematics Engine",
    description="Deterministic Set-Theoretic Analytics & Operational Logic Infrastructure Backend"
)

# Enable CORS for the React UI to fetch data directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryItem(BaseModel):
    sku: str
    name: str
    price: float
    quantity: int

class TelemetryPayload(BaseModel):
    order_id: str
    customer_id: str
    customer_tier: str
    timestamp: str
    items: List[TelemetryItem]

@app.get("/api/v1/analytics/pulse")
def health_check():
    return {"status": "ACTIVE", "engine": "Deterministic_Set_Matrix_v1.0"}

@app.post("/api/v1/telemetry/ingest")
def ingest_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db_session)):
    # Create Customer
    customer = db.query(CustomerModel).filter(CustomerModel.id == payload.customer_id).first()
    if not customer:
        customer = CustomerModel(id=payload.customer_id, tier=payload.customer_tier)
        db.add(customer)
        db.commit()

    dt = datetime.strptime(payload.timestamp, "%Y-%m-%dT%H:%M:%S.%fZ") if "Z" in payload.timestamp else datetime.now()

    # Create Items
    for item in payload.items:
        prod = db.query(ProductModel).filter(ProductModel.sku == item.sku).first()
        if not prod:
            prod = ProductModel(sku=item.sku, name=item.name, cost=item.price, price=item.price)
            db.add(prod)
            db.commit()
            
        order_item = OrderItemModel(
            order_id=payload.order_id, 
            sku=prod.sku, 
            customer_id=customer.id, 
            quantity=item.quantity, 
            timestamp=dt
        )
        db.add(order_item)

    db.commit()
    return {"success": True, "message": f"Ingested {len(payload.items)} items for order {payload.order_id}"}

@app.get("/api/v1/analytics/audit")
def execute_system_audit(
    t1_start: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS"),
    t1_end: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS"),
    t2_start: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS"),
    t2_end: str = Query(..., description="Format: YYYY-MM-DD HH:MM:SS"),
    db: Session = Depends(get_db_session)
):
    """
    Ingests dynamic time strings, parses parameters into datetime vectors,
    and runs them through the 4-stage discrete analytics pipeline.
    """
    try:
        dt1_s = datetime.strptime(t1_start, "%Y-%m-%d %H:%M:%S")
        dt1_e = datetime.strptime(t1_end, "%Y-%m-%d %H:%M:%S")
        dt2_s = datetime.strptime(t2_start, "%Y-%m-%d %H:%M:%S")
        dt2_e = datetime.strptime(t2_end, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter formatting structure. Use: 'YYYY-MM-DD HH:MM:SS'")

    engine_instance = ProductionDiscreteEngine(db)
    
    # Run the core 4-task execution sweep
    matrix_results = engine_instance.calculate_temporal_matrix(dt1_s, dt1_e, dt2_s, dt2_e)
    inference_layer = engine_instance.compile_operational_inferences(dt1_s, dt1_e, dt2_s, dt2_e)
    
    return {
        "metadata": {
            "execution_timestamp": datetime.utcnow().isoformat(),
            "target_period_1": f"{t1_start} to {t1_end}",
            "target_period_2": f"{t2_start} to {t2_end}"
        },
        "cardinality_matrices": {
            "period_1_subsets": matrix_results["p1_cardinalities"],
            "period_2_subsets": matrix_results["p2_cardinalities"]
        },
        "discrete_identities": matrix_results["identities"],
        "intelligence_payload": inference_layer
    }
