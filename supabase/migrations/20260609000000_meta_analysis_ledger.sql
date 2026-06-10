-- Enable the TimescaleDB extension for time-series scaling
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the state memory ledger table
CREATE TABLE IF NOT EXISTS meta_analysis_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    execution_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    jaccard_index NUMERIC(10,4),
    overlap_coefficient NUMERIC(10,4),
    markov_state_arrays JSONB,
    tautology_violations JSONB,
    human_logic_fallacies JSONB
);

-- Convert to a hypertable, partitioned by execution_timestamp
SELECT create_hypertable('meta_analysis_ledger', 'execution_timestamp', if_not_exists => TRUE);

-- Create indexes for scaling multi-tenant lookups
CREATE INDEX IF NOT EXISTS idx_meta_ledger_shop_id ON meta_analysis_ledger(shop_id, execution_timestamp DESC);
