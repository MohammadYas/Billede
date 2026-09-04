-- Genfundet schema. Applied via Composio (Supabase Management API) on 2026-09-03
-- and checked in here for replay. Runtime uses the service role from the server only.

create extension if not exists pgcrypto;

do $$ begin
  create type order_status as enum (
    'NEW','PREVIEW_READY','PAID','IN_RETOUCH','AWAITING_APPROVAL','CHANGE_REQUESTED',
    'APPROVED','IN_PRODUCTION','SHIPPED','COMPLETED','REFUNDED','MANUAL_REVIEW','ABANDONED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type print_format as enum ('20x30','30x40','40x50','50x70');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('NONE','SENT','APPROVED','CHANGE_REQUESTED');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status order_status not null default 'NEW',
  format print_format not null default '30x40',

  original_path text,
  preview_path text,
  restored_path text,
  colourised_path text,
  mockup_path text,
  chosen_colour boolean not null default false,
  final_path text,
  preview_meta jsonb,                 -- pipeline metadata (ssim, likeness json, timings)
  is_monochrome boolean,

  payment_provider text,
  payment_session_id text unique,
  payment_intent text,
  amount integer,                     -- øre
  currency text default 'dkk',
  customer_email text,
  customer_phone text,
  customer_name text,
  shipping_address jsonb,

  approval_status approval_status not null default 'NONE',
  approval_token text unique,
  approval_reminder_sent_at timestamptz,
  change_request_text text,

  fulfillment_provider text,
  fulfillment_reference text,
  tracking_number text,
  tracking_url text,

  utm jsonb,
  internal_notes text,

  -- one timestamp per transition
  preview_ready_at timestamptz,
  paid_at timestamptz,
  in_retouch_at timestamptz,
  awaiting_approval_at timestamptz,
  change_requested_at timestamptz,
  approved_at timestamptz,
  in_production_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  manual_review_at timestamptz,
  abandoned_at timestamptz,
  deleted_at timestamptz             -- set when files are purged by the retention job
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_email_idx on orders (customer_email);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders for each row execute function set_updated_at();

-- Funnel events (server-written). Never contains personal data beyond the anonymous session id.
create table if not exists events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,                 -- PageView, ViewContent, UploadStarted, UploadCompleted, PreviewShown, PreviewFallback, InitiateCheckout, Purchase
  session_id text,
  order_id uuid references orders(id) on delete set null,
  utm_content text,
  utm jsonb,
  meta jsonb
);
create index if not exists events_name_day_idx on events (name, created_at);

-- Deletion log for the retention job.
create table if not exists deletion_log (
  id bigserial primary key,
  deleted_at timestamptz not null default now(),
  order_id uuid,
  reason text not null,
  paths text[]
);

-- Daily funnel by utm_content (the only analytics view for the test).
create or replace view v_funnel_daily as
select
  date_trunc('day', created_at at time zone 'Europe/Copenhagen')::date as day,
  coalesce(utm_content, '(none)') as utm_content,
  count(distinct session_id) filter (where name = 'PageView') as visitors,
  count(*) filter (where name = 'UploadCompleted') as uploads,
  count(*) filter (where name = 'PreviewShown') as previews,
  count(*) filter (where name = 'PreviewFallback') as fallbacks,
  count(*) filter (where name = 'InitiateCheckout') as checkouts,
  count(*) filter (where name = 'Purchase') as purchases
from events
group by 1, 2
order by 1 desc, 2;

-- RLS on. No policies = no access for anon/authenticated. Service role bypasses RLS (server only).
alter table orders enable row level security;
alter table events enable row level security;
alter table deletion_log enable row level security;

-- Private storage bucket (EU region project). Signed URLs only; no public read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('genfundet-private', 'genfundet-private', false, 26214400, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
