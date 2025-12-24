-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type proposal_status as enum ('draft','sent','viewed','approved','declined','expired','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status_new as enum ('draft','unpaid','paid','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_type as enum ('website','landing_page','web_app','brand_identity','seo','graphic_design','video_editing','retainer','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clause_scope as enum ('global','website','landing_page','web_app','brand_identity','seo','graphic_design','video_editing','retainer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clause_section as enum ('scope_deliverables','timeline','pricing_payment','revisions','ip_ownership','change_requests','legal_acceptance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_plan_type as enum ('full_upfront','split','milestones','monthly_retainer','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_trigger_type as enum ('on_approval','fixed_date','relative_days_from_approval');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_status as enum ('pending','created','sent','paid','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider as enum ('stripe','paypal','cash','etransfer','crypto','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','succeeded','failed','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_event_type as enum (
    'created','updated','service_added','service_removed','pricing_changed',
    'sent','viewed','reminder_sent','approved','declined','expired','note'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_event_type as enum (
    'created','updated','linked_to_proposal','activated','sent','viewed','reminder_sent',
    'payment_recorded','paid','voided','note'
  );
exception when duplicate_object then null; end $$;

-- Proposals table
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  title text not null,
  description text,
  status proposal_status not null default 'draft',
  currency text not null default 'CAD',
  value int not null default 0,
  expires_at timestamptz,
  sent_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns to proposals table if they don't exist
alter table proposals add column if not exists created_by_user_id uuid;
alter table proposals add column if not exists value int not null default 0;

create index if not exists idx_proposals_client on proposals (client_id);
create index if not exists idx_proposals_status_created on proposals (status, created_at);
create index if not exists idx_proposals_expires on proposals (expires_at);

-- Proposal items
create table if not exists proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  service_type service_type not null,
  name text not null,
  description text,
  quantity numeric not null default 1,
  unit_price_cents int not null default 0,
  line_total_cents int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposal_items_proposal on proposal_items (proposal_id);
create index if not exists idx_proposal_items_service on proposal_items (service_type);

-- Update invoices table to support proposal linking
alter table invoices add column if not exists proposal_id uuid references proposals(id) on delete set null;
alter table invoices add column if not exists activation_source text;
alter table invoices add column if not exists locked_from_send boolean not null default true;

create index if not exists idx_invoices_proposal on invoices (proposal_id);
create unique index if not exists uq_invoices_one_per_proposal on invoices (proposal_id) where proposal_id is not null;

-- Invoice items link to proposal items
alter table invoice_items add column if not exists proposal_item_id uuid references proposal_items(id) on delete set null;
create index if not exists idx_invoice_items_proposal_item on invoice_items (proposal_item_id);

-- Payments table
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  provider payment_provider not null default 'other',
  amount_cents int not null,
  currency text not null default 'CAD',
  status payment_status not null default 'pending',
  received_at timestamptz,
  created_at timestamptz not null default now()
);

-- Add provider_reference column if it doesn't exist
alter table payments add column if not exists provider_reference text;

create index if not exists idx_payments_invoice on payments (invoice_id);
create index if not exists idx_payments_provider_ref on payments (provider, provider_reference);

-- Clause library
create table if not exists clauses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  scope clause_scope not null,
  section clause_section not null,
  title text not null,
  body text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clauses_scope_active on clauses (scope, is_active);
create index if not exists idx_clauses_section_sort on clauses (section, sort_order);

-- Service clause mapping
create table if not exists service_clause_map (
  id uuid primary key default gen_random_uuid(),
  service_type service_type not null,
  clause_id uuid not null references clauses(id) on delete cascade,
  required boolean not null default true,
  sort_override int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (service_type, clause_id)
);

create index if not exists idx_service_clause_map_service on service_clause_map (service_type);
create index if not exists idx_service_clause_map_clause on service_clause_map (clause_id);

-- Proposal clause snapshots (locked at send)
create table if not exists proposal_clause_snapshots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  version int not null default 1,
  snapshot_hash text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version)
);

-- Add status column if it doesn't exist
alter table proposal_clause_snapshots add column if not exists status text not null default 'locked';

create index if not exists idx_clause_snapshots_proposal on proposal_clause_snapshots (proposal_id);

-- Proposal clause snapshot items
create table if not exists proposal_clause_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references proposal_clause_snapshots(id) on delete cascade,
  clause_code text not null,
  section clause_section not null,
  title text not null,
  body text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_snapshot_items_snapshot on proposal_clause_snapshot_items (snapshot_id);
create index if not exists idx_snapshot_items_section_sort on proposal_clause_snapshot_items (section, sort_order);

-- Billing plans
create table if not exists billing_plans (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id) on delete cascade,
  plan_type billing_plan_type not null default 'full_upfront',
  currency text not null default 'CAD',
  total_cents int not null default 0,
  deposit_cents int not null default 0,
  payment_terms_days int not null default 7,
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Billing plan schedule items
create table if not exists billing_plan_schedule_items (
  id uuid primary key default gen_random_uuid(),
  billing_plan_id uuid not null references billing_plans(id) on delete cascade,
  sequence int not null,
  label text not null,
  amount_cents int not null,
  due_at timestamptz,
  trigger_type schedule_trigger_type not null default 'on_approval',
  trigger_value int,
  invoice_id uuid references invoices(id) on delete set null,
  status schedule_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_bpsi_plan on billing_plan_schedule_items (billing_plan_id);
create index if not exists idx_bpsi_status on billing_plan_schedule_items (status);
create index if not exists idx_bpsi_invoice on billing_plan_schedule_items (invoice_id);

-- Proposal events
create table if not exists proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  type proposal_event_type not null,
  meta jsonb,
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposal_events_proposal on proposal_events (proposal_id);
create index if not exists idx_proposal_events_type_created on proposal_events (type, created_at);

-- Invoice events
create table if not exists invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  type invoice_event_type not null,
  meta jsonb,
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_events_invoice on invoice_events (invoice_id);
create index if not exists idx_invoice_events_type_created on invoice_events (type, created_at);

-- Triggers for updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_proposals_updated_at on proposals;
create trigger trg_proposals_updated_at before update on proposals
  for each row execute function set_updated_at();

drop trigger if exists trg_clauses_updated_at on clauses;
create trigger trg_clauses_updated_at before update on clauses
  for each row execute function set_updated_at();

drop trigger if exists trg_billing_plans_updated_at on billing_plans;
create trigger trg_billing_plans_updated_at before update on billing_plans
  for each row execute function set_updated_at();

-- Trigger for line total calculation
create or replace function calc_line_total() returns trigger as $$
begin
  new.line_total_cents = (new.unit_price_cents * new.quantity)::int;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_proposal_items_line_total on proposal_items;
create trigger trg_proposal_items_line_total before insert or update on proposal_items
  for each row execute function calc_line_total();

drop trigger if exists trg_invoice_items_line_total on invoice_items;
create trigger trg_invoice_items_line_total before insert or update on invoice_items
  for each row execute function calc_line_total();
