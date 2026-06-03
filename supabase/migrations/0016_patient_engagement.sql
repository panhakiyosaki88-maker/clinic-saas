-- ============================================================================
-- Migration 0016 — Patient Engagement (Phase 3)
-- ----------------------------------------------------------------------------
-- Consent tracking, a per-patient communication log, segmentation tags, and a
-- document category. Conventions per 0004: clinic_id, audit/soft-delete columns,
-- RLS gated by patients.read/patients.write, triggers. Purely additive.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- patient_consents
-- ----------------------------------------------------------------------------
create table if not exists public.patient_consents (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  consent_type text not null,            -- treatment | data_sharing | marketing | ...
  granted      boolean not null,
  signed_on    date,
  document_id  uuid references public.patient_documents (id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  deleted_at   timestamptz
);
create index if not exists patient_consents_patient_idx on public.patient_consents (patient_id, deleted_at);

-- ----------------------------------------------------------------------------
-- patient_communications  (log of messages sent to / received from the patient)
-- ----------------------------------------------------------------------------
create table if not exists public.patient_communications (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  channel     public.contact_method,
  direction   text not null default 'outbound',  -- outbound | inbound
  subject     text,
  body        text,
  status      text,                               -- sent | failed | pending
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_communications_patient_idx on public.patient_communications (patient_id, sent_at desc);

-- ----------------------------------------------------------------------------
-- patient_tags + patient_tag_links  (segmentation)
-- ----------------------------------------------------------------------------
create table if not exists public.patient_tags (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  name       text not null,
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  unique (clinic_id, name)
);

create table if not exists public.patient_tag_links (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  tag_id     uuid not null references public.patient_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (patient_id, tag_id)
);
create index if not exists patient_tag_links_patient_idx on public.patient_tag_links (patient_id);
create index if not exists patient_tag_links_tag_idx on public.patient_tag_links (tag_id);

-- ----------------------------------------------------------------------------
-- document category
-- ----------------------------------------------------------------------------
alter table public.patient_documents add column if not exists category text;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
create trigger set_updated_at before update on public.patient_consents
  for each row execute function public.set_updated_at();
create trigger audit_patient_consents after insert or update or delete on public.patient_consents
  for each row execute function public.process_audit();

create trigger audit_patient_communications after insert or update or delete on public.patient_communications
  for each row execute function public.process_audit();

create trigger set_updated_at before update on public.patient_tags
  for each row execute function public.set_updated_at();
create trigger audit_patient_tags after insert or update or delete on public.patient_tags
  for each row execute function public.process_audit();

create trigger audit_patient_tag_links after insert or update or delete on public.patient_tag_links
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by patients.read / patients.write)
-- ============================================================================
alter table public.patient_consents       enable row level security;
alter table public.patient_communications enable row level security;
alter table public.patient_tags           enable row level security;
alter table public.patient_tag_links      enable row level security;

do $$
declare t text;
begin
  -- tables that allow select + insert + update + delete
  foreach t in array array['patient_consents','patient_tags'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
      create policy %1$s_insert on public.%1$s
        for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
      create policy %1$s_update on public.%1$s
        for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
      create policy %1$s_delete on public.%1$s
        for delete using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
    $f$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- tables that allow select + insert + delete (links + comms log)
  foreach t in array array['patient_communications','patient_tag_links'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
      create policy %1$s_insert on public.%1$s
        for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
      create policy %1$s_delete on public.%1$s
        for delete using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
    $f$, t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
end $$;
