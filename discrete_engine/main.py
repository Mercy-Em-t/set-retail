from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from .database import engine, Base, get_db_session
from .pipelines import ProductionDiscreteEngine

# Auto-instantiate the database layers upon application runtime
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Grand Unified Discrete Mathematics Engine",
    description="Deterministic Set-Theoretic Analytics & Operational Logic Infrastructure Backend"
)

@app.get("/api/v1/analytics/pulse")
def health_check():
    return {"status": "ACTIVE", "engine": "Deterministic_Set_Matrix_v1.0"}

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
