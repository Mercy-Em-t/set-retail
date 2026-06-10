from datetime import datetime
from sqlalchemy.orm import Session
from .models import ProductModel, OrderItemModel, CustomerModel

class ProductionDiscreteEngine:
    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # TASK 1: Define Mathematical Architecture
    # ==========================================
    def harvest_universal_universe(self) -> set:
        """Retrieves Universal Set U of all catalog items (Task 1)."""
        products = self.db.query(ProductModel.sku).filter(ProductModel.is_active == True).all()
        return {p.sku for p in products}

    # ==========================================
    # TASK 2: Build Set Decomposition Engine
    # ==========================================
    def decompose_timeframe_primitives(self, start_date: datetime, end_date: datetime) -> dict:
        """Extracts ordered elements, complements, singletons, and VIP core tokens (Task 2)."""
        universe = self.harvest_universal_universe()
        
        # Pull raw ledger joins
        items = (
            self.db.query(OrderItemModel.sku, OrderItemModel.customer_id)
            .filter(OrderItemModel.timestamp >= start_date, OrderItemModel.timestamp <= end_date)
            .all()
        )
        
        # Tabulate frequencies and customer relationships
        frequency_map = {}
        vip_customers = {c.id for c in self.db.query(CustomerModel.id).filter(CustomerModel.tier == "VIP").all()}
        vip_sku_buyers = set()

        for sku, customer_id in items:
            frequency_map[sku] = frequency_map.get(sku, 0) + 1
            if customer_id in vip_customers:
                vip_sku_buyers.add(sku)
                
        ordered_set = set(frequency_map.keys())
        
        # Calculate Relative Complement (Dead Stock)
        dead_stock_set = universe.difference(ordered_set)
        
        # Isolate Singletons vs Repeat Movers
        singletons_set = {sku for sku, count in frequency_map.items() if count == 1}
        repeat_movers_set = ordered_set.difference(singletons_set)
        
        # Isolate Atomic Primitive Core Layer
        primitive_vip_core = repeat_movers_set.intersection(vip_sku_buyers)
        
        return {
            "universe": universe,
            "ordered": ordered_set,
            "dead_stock": dead_stock_set,
            "singletons": singletons_set,
            "repeats": repeat_movers_set,
            "vip_core": primitive_vip_core
        }

    # ==========================================
    # TASK 3: Build Temporal Comparison Matrix
    # ==========================================
    def calculate_temporal_matrix(self, t1_start: datetime, t1_end: datetime, t2_start: datetime, t2_end: datetime) -> dict:
        """Applies mathematical intersections and differences across periods (Task 3)."""
        period_1 = self.decompose_timeframe_primitives(t1_start, t1_end)
        period_2 = self.decompose_timeframe_primitives(t2_start, t2_end)
        
        a_t1 = period_1["ordered"]
        a_t2 = period_2["ordered"]
        
        # Set Identities
        stable_demand = a_t1.intersection(a_t2)
        faded_trends = a_t1.difference(a_t2)
        new_movers = a_t2.difference(a_t1)
        volatility = a_t1.symmetric_difference(a_t2)
        
        return {
            "p1_cardinalities": {k: len(v) for k, v in period_1.items()},
            "p2_cardinalities": {k: len(v) for k, v in period_2.items()},
            "identities": {
                "stable_demand": list(stable_demand),
                "faded_trends": list(faded_trends),
                "new_movers": list(new_movers),
                "volatility": list(volatility)
            }
        }

    # ==========================================
    # TASK 4: Build Inference Engine
    # ==========================================
    def compile_operational_inferences(self, t1_start: datetime, t1_end: datetime, t2_start: datetime, t2_end: datetime) -> dict:
        """Transforms structural gaps into plain-English directives (Task 4)."""
        matrix = self.calculate_temporal_matrix(t1_start, t1_end, t2_start, t2_end)
        ids = matrix["identities"]
        
        directives = []
        
        if len(ids["faded_trends"]) > (matrix["p1_cardinalities"]["ordered"] * 0.25):
            directives.append("CRITICAL MARGIN WARN: High volume of products have entered the Faded Trends complement subset. Liquidate dead inventory channels immediately.")
            
        if len(ids["stable_demand"]) < (matrix["p2_cardinalities"]["ordered"] * 0.10):
            directives.append("OPERATIONAL INSTABILITY ERROR: Year-over-year intersection matrix is critically low. Purchasing profiles are highly volatile.")
            
        if len(ids["new_movers"]) > len(ids["stable_demand"]):
            directives.append("STRATEGY DISCOVERY ALERT: New demand channels are expanding faster than stable inventory baselines. Adjust safety margins upward.")

        return {
            "metrics": {
                "stable_count": len(ids["stable_demand"]),
                "churn_count": len(ids["faded_trends"]),
                "velocity_count": len(ids["new_movers"]),
                "symmetric_volatility_count": len(ids["volatility"])
            },
            "directives": directives
        }
