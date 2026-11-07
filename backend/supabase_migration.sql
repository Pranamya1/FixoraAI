-- FixoraAI Supabase Persistence Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ─── POSTS ───────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id            text primary key,
  org_id        text not null,
  author_id     text,
  title         text not null default '',
  body          text not null default '',
  image_url     text,
  intent_tags   jsonb not null default '{}',
  status        text not null default 'DRAFT',
  compliance_score integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- index for fast org-scoped list queries
create index if not exists posts_org_id_idx on public.posts(org_id);
create index if not exists posts_status_idx on public.posts(status);

-- ─── AUDIT REPORTS ───────────────────────────────────────────────────────────
create table if not exists public.audit_reports (
  id               text primary key,
  post_id          text not null references public.posts(id) on delete cascade,
  compliance_score integer not null default 100,
  verdict          text not null default 'APPROVED',
  summary          text not null default '',
  fast_tracked     boolean not null default false,
  evaluated_at     timestamptz not null default now()
);

create index if not exists audit_reports_post_id_idx on public.audit_reports(post_id);

-- ─── VIOLATIONS ──────────────────────────────────────────────────────────────
create table if not exists public.violations (
  id                   text primary key,
  post_id              text not null references public.posts(id) on delete cascade,
  audit_report_id      text not null references public.audit_reports(id) on delete cascade,
  rule_title           text not null default '',
  category             text not null default 'GENERAL',
  severity             text not null default 'WARNING',
  page_ref             integer default 1,
  document_name        text default 'Brand Guidelines',
  offending_fragment   text default '',
  violation_explanation text default '',
  suggested_fix        text default '',
  is_resolved          boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists violations_post_id_idx on public.violations(post_id);
create index if not exists violations_audit_report_id_idx on public.violations(audit_report_id);

-- ─── RLS: Disable for service role (backend uses service role key) ─────────────
alter table public.posts disable row level security;
alter table public.audit_reports disable row level security;
alter table public.violations disable row level security;
