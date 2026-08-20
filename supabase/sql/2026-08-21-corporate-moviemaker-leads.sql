-- Lead-capture tables for the "Yoojel Corporate" and "Yoojel MovieMaker"
-- coming-soon pages. Run once in the Supabase SQL Editor.
--
-- Grants are explicit here rather than relied on as defaults -- the Stripe
-- webhook incident earlier showed service_role does not automatically get
-- table privileges on tables created outside the dashboard.

create table if not exists public.corporate_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text,
  industry text,
  country text,
  company_website text,
  employee_count text,
  revenue_range text,
  full_name text not null,
  job_title text,
  business_email text not null,
  phone text,
  preferred_contact text,
  interests text[] not null default '{}',
  requirements text
);

create table if not exists public.moviemaker_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_title text,
  genre text,
  estimated_runtime text,
  country text,
  production_stage text,
  has_screenplay boolean,
  has_concept_art boolean,
  full_name text not null,
  company text,
  role text,
  email text not null,
  phone text,
  portfolio_url text,
  description text
);

grant select, insert on public.corporate_leads to service_role;
grant select, insert on public.moviemaker_submissions to service_role;
