-- Purchase must be fired exactly once (server-verified on /tak). Stamp when it happened.
alter table orders add column if not exists purchase_tracked_at timestamptz;
alter table orders add column if not exists final_generated_at timestamptz;
