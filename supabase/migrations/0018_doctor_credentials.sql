-- ============================================================================
-- Migration 0018 — Doctor Credentials & Documents (Phase 2)
-- ----------------------------------------------------------------------------
-- avatar_path on doctors + doctor_documents (Storage metadata), structured
-- doctor_qualifications and doctor_licenses. Adds a private doctor-documents
-- Storage bucket with per-clinic path isolation. RLS gated by doctors.read /
-- doctors.write. Purely additive. Mirrors 0004_patients.sql conventions.
-- ============================================================================

alter table public.doctors add column if not exists avatar_path text;

-- ----------------------------------------------------------------------------
-- doctor_documents  (metadata; bytes live in Storage)
-- ----------------------------------------------------------------------------
create table if not exists public.doctor_documents (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  file_path   text not null,           -- {clinic_id}/{doctor_id}/{file}
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  category    text,                     -- license | certificate | cv | id | other
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists doctor_documents_doctor_idx on public.doctor_documents (doctor_id, deleted_at);

-- ----------------------------------------------------------------------------
-- doctor_qualifications  (education / training)
-- ----------------------------------------------------------------------------
create table if not exists public.doctor_qualifications (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  degree      text not null,
  institution text,
  field       text,
  year        integer,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists doctor_qualifications_doctor_idx on public.doctor_qualifications (doctor_id, deleted_at);

-- ----------------------------------------------------------------------------
-- doctor_licenses  (a doctor may hold licenses in several jurisdictions)
-- ----------------------------------------------------------------------------
create table if not exists public.doctor_licenses (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  license_number text not null,
  authority      text,
  jurisdiction   text,
  issued_on      date,
  expiry_on      date,
  verified       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists doctor_licenses_doctor_idx on public.doctor_licenses (doctor_id, deleted_at);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
create trigger set_updated_at before update on public.doctor_qualifications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.doctor_licenses
  for each row execute function public.set_updated_at();
create trigger audit_doctor_documents after insert or update or delete on public.doctor_documents
  for each row execute function public.process_audit();
create trigger audit_doctor_qualifications after insert or update or delete on public.doctor_qualifications
  for each row execute function public.process_audit();
create trigger audit_doctor_licenses after insert or update or delete on public.doctor_licenses
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by doctors.read / doctors.write)
-- ============================================================================
alter table public.doctor_documents      enable row level security;
alter table public.doctor_qualifications  enable row level security;
alter table public.doctor_licenses        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['doctor_documents','doctor_qualifications','doctor_licenses'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.read'));
      create policy %1$s_insert on public.%1$s
        for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));
      create policy %1$s_update on public.%1$s
        for update using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));
    $f$, t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

-- ============================================================================
-- STORAGE: private bucket with per-clinic path isolation
-- Object path convention: {clinic_id}/{doctor_id}/{filename}.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('doctor-documents', 'doctor-documents', false)
on conflict (id) do nothing;

create policy "doctor docs: clinic read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.read')
  );

create policy "doctor docs: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

create policy "doctor docs: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );
