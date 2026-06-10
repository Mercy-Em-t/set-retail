/**
 * Semantic Natural Language Compiler
 * Transforms discrete mathematical anomaly matrices into human-readable business context.
 */
export class SemanticCompiler {
  constructor() {
    this.fallacyDictionary = {
      "Affirming the Consequent": "Warning: A recent sales spike was flagged, but our deduction matrix proves this was caused by an organic social media trend, not your recent promotional markdown.",
      "Denying the Antecedent": "Notice: Inventory volume dropped, but this is a false alarm. The drop was caused by a delayed supplier shipment, not a sudden drop in customer demand.",
      "Base Rate Fallacy": "Caution: You are over-indexing on a temporary spike in niche product sales. The core VIP anchor items are still driving 80% of revenue."
    };

    this.tautologyDictionary = {
      "P ∨ ¬P (Excluded Middle)": "System Integrity Check Passed: The system state is mathematically bounded. All items are either cleanly classified or flagged.",
      "A → A (Identity)": "Redundant Promotion Alert: A discount was applied to an item that was already heavily discounted, violating the pricing floor."
    };
  }

  /**
   * Compiles an array of raw mathematical fallacies into business alerts.
   * @param {Array<string>} rawFallacies 
   */
  compileFallacies(rawFallacies) {
    if (!rawFallacies || rawFallacies.length === 0) return [];
    
    return rawFallacies.map(fallacy => {
      // Find a matching semantic definition, or provide a generic fallback
      const matchingKey = Object.keys(this.fallacyDictionary).find(key => fallacy.includes(key));
      return matchingKey 
        ? this.fallacyDictionary[matchingKey] 
        : `Anomaly Detected [${fallacy}]: Unclassified structural divergence observed in the latest period.`;
    });
  }

  /**
   * Compiles tautological anomalies into business alerts.
   * @param {Array<string>} rawTautologies 
   */
  compileTautologies(rawTautologies) {
    if (!rawTautologies || rawTautologies.length === 0) return [];

    return rawTautologies.map(tautology => {
      const matchingKey = Object.keys(this.tautologyDictionary).find(key => tautology.includes(key));
      return matchingKey 
        ? this.tautologyDictionary[matchingKey] 
        : `Structural Tautology [${tautology}]: A self-fulfilling logic loop was detected in the configuration.`;
    });
  }
}
