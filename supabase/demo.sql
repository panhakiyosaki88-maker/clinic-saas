-- ============================================================================
-- DEMO DATA — populates your clinic with realistic sample data across EVERY
-- module so you can try the whole app. Paste into the Supabase SQL Editor and
-- run. Safe to run once; re-running is a no-op (it detects existing demo data).
--
-- It seeds the clinic for EACH login email in v_emails (set below), using each
-- clinic's owner as the actor. Re-running on an already-seeded clinic is a
-- no-op; clinics are seeded independently (fresh ids per clinic).
-- To remove later, see the cleanup block at the bottom (commented out).
-- ============================================================================
do $$
declare
  -- 👇 the demo seeds the clinic for EACH of these login emails. Add/remove as
  --    needed. (An empty string '' would fall back to the newest clinic.)
  v_emails text[] := array['panhakiyosaki88@gmail.com', 'ttd2.aj@gmail.com'];
  v_email  text;
  v_clinic uuid;
  v_owner  uuid;
  v_branch uuid;
  -- fresh random ids, regenerated per clinic inside the loop so the same demo
  -- can be seeded into multiple clinics without UUID collisions.
  d1 uuid; d2 uuid; d3 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  rec1 uuid; rec2 uuid;
  pr1 uuid; pr2 uuid;
  inv1 uuid; inv2 uuid; inv3 uuid;
  cat1 uuid; cat2 uuid;
  lr1 uuid; lr2 uuid;
  base timestamptz := date_trunc('day', now());
  dow int;
begin
 foreach v_email in array v_emails loop
  v_clinic := null; v_owner := null; v_branch := null;
  -- fresh ids for this clinic
  d1 := gen_random_uuid(); d2 := gen_random_uuid(); d3 := gen_random_uuid();
  p1 := gen_random_uuid(); p2 := gen_random_uuid(); p3 := gen_random_uuid();
  p4 := gen_random_uuid(); p5 := gen_random_uuid(); p6 := gen_random_uuid();
  m1 := gen_random_uuid(); m2 := gen_random_uuid(); m3 := gen_random_uuid(); m4 := gen_random_uuid();
  rec1 := gen_random_uuid(); rec2 := gen_random_uuid();
  pr1 := gen_random_uuid(); pr2 := gen_random_uuid();
  inv1 := gen_random_uuid(); inv2 := gen_random_uuid(); inv3 := gen_random_uuid();
  cat1 := gen_random_uuid(); cat2 := gen_random_uuid();
  lr1 := gen_random_uuid(); lr2 := gen_random_uuid();

  -- Prefer the clinic owned by v_email; if that user is a member (not owner) of a
  -- clinic, use that; otherwise fall back to the most-recently-created clinic.
  if v_email <> '' then
    select c.id, c.owner_user_id into v_clinic, v_owner
    from public.clinics c
    join auth.users u on u.id = c.owner_user_id
    where lower(u.email) = lower(v_email)
    order by c.created_at desc limit 1;

    if v_clinic is null then
      select m.clinic_id, c.owner_user_id into v_clinic, v_owner
      from public.memberships m
      join auth.users u on u.id = m.user_id
      join public.clinics c on c.id = m.clinic_id
      where lower(u.email) = lower(v_email)
      order by m.created_at asc limit 1;
    end if;
  end if;

  if v_clinic is null then
    select id, owner_user_id into v_clinic, v_owner
    from public.clinics order by created_at desc limit 1;
  end if;

  if v_clinic is null then
    raise notice 'No clinic found for % — skipping.', v_email; continue;
  end if;
  select id into v_branch from public.branches where clinic_id = v_clinic order by created_at asc limit 1;

  if exists (
    select 1 from public.patients
    where clinic_id = v_clinic and patient_number = 'P009001'
  ) then
    raise notice 'Demo already present in clinic % (%) — skipping.', v_clinic, v_email; continue;
  end if;
  raise notice 'Seeding demo into clinic % for %', v_clinic, v_email;

  -- ===== Doctors + weekly schedules + time off ============================
  insert into public.doctors (id, clinic_id, full_name, specialization, license_number, consultation_fee, phone, email, is_active, created_by) values
    (d1, v_clinic, 'Dr. Sophea Chan', 'General Practitioner', 'KH-GP-1024', 20, '012 345 678', 'sophea@demo.clinic', true, v_owner),
    (d2, v_clinic, 'Dr. Rithy Pich', 'Pediatrics', 'KH-PED-2048', 25, '012 987 654', 'rithy@demo.clinic', true, v_owner),
    (d3, v_clinic, 'Dr. Maly Sok', 'Dermatology', 'KH-DERM-3072', 30, '012 555 333', 'maly@demo.clinic', true, v_owner)
  on conflict (id) do nothing;

  for dow in 1..5 loop
    insert into public.doctor_schedules (clinic_id, doctor_id, day_of_week, start_time, end_time) values
      (v_clinic, d1, dow, '08:00', '16:00'),
      (v_clinic, d2, dow, '09:00', '17:00');
  end loop;
  insert into public.doctor_schedules (clinic_id, doctor_id, day_of_week, start_time, end_time) values
    (v_clinic, d3, 6, '09:00', '13:00');
  insert into public.doctor_time_off (clinic_id, doctor_id, start_date, end_date, reason, created_by) values
    (v_clinic, d3, (now() + interval '7 days')::date, (now() + interval '10 days')::date, 'Conference', v_owner);

  -- ===== Patients ==========================================================
  insert into public.patients (id, clinic_id, branch_id, patient_seq, patient_number, full_name, gender, date_of_birth, phone, email, address, occupation, allergies, chronic_diseases, created_by) values
    (p1, v_clinic, v_branch, 9001, 'P009001', 'Dara Kim', 'male', '1989-04-12', '011 222 333', 'dara@example.com', 'Phnom Penh', 'Teacher', 'Penicillin', 'Hypertension', v_owner),
    (p2, v_clinic, v_branch, 9002, 'P009002', 'Sreyna Pov', 'female', '1995-09-30', '011 444 555', 'sreyna@example.com', 'Siem Reap', 'Engineer', null, null, v_owner),
    (p3, v_clinic, v_branch, 9003, 'P009003', 'Vannak Chea', 'male', '1978-01-05', '011 666 777', 'vannak@example.com', 'Battambang', 'Farmer', 'None', 'Diabetes type 2', v_owner),
    (p4, v_clinic, v_branch, 9004, 'P009004', 'Channary Lim', 'female', '2001-12-18', '011 888 999', 'channary@example.com', 'Phnom Penh', 'Student', null, null, v_owner),
    (p5, v_clinic, v_branch, 9005, 'P009005', 'Pisach Ngov', 'male', '1965-07-22', '012 101 202', null, 'Kampot', 'Retired', 'Aspirin', 'Asthma', v_owner),
    (p6, v_clinic, v_branch, 9006, 'P009006', 'Bopha Sao', 'female', '1990-03-03', '012 303 404', 'bopha@example.com', 'Phnom Penh', 'Nurse', null, null, v_owner)
  on conflict (id) do nothing;

  -- ===== Appointments (today + upcoming, varied statuses + walk-in) ========
  insert into public.appointments (clinic_id, branch_id, patient_id, doctor_id, scheduled_at, duration_minutes, status, is_walk_in, reason, checked_in_at, started_at, completed_at, created_by) values
    (v_clinic, v_branch, p1, d1, base + interval '9 hours', 30, 'completed', false, 'Follow-up: blood pressure', base + interval '8 hours 50 min', base + interval '9 hours', base + interval '9 hours 20 min', v_owner),
    (v_clinic, v_branch, p2, d2, base + interval '10 hours', 30, 'in_consultation', false, 'Fever and cough', base + interval '9 hours 55 min', base + interval '10 hours', null, v_owner),
    (v_clinic, v_branch, p3, d1, base + interval '10 hours 30 min', 20, 'waiting', true, 'Walk-in: wound dressing', base + interval '10 hours 25 min', null, null, v_owner),
    (v_clinic, v_branch, p4, d2, base + interval '11 hours', 30, 'scheduled', false, 'Vaccination', null, null, null, v_owner),
    (v_clinic, v_branch, p5, d1, base + interval '14 hours', 30, 'scheduled', false, 'Asthma review', null, null, null, v_owner),
    (v_clinic, v_branch, p6, d3, base + interval '1 day 9 hours', 30, 'scheduled', false, 'Skin rash', null, null, null, v_owner),
    (v_clinic, v_branch, p1, d1, base - interval '1 day' + interval '10 hours', 30, 'completed', false, 'BP check', base - interval '1 day' + interval '9 hours 55 min', base - interval '1 day' + interval '10 hours', base - interval '1 day' + interval '10 hours 25 min', v_owner),
    (v_clinic, v_branch, p2, d2, base - interval '2 days' + interval '11 hours', 30, 'completed', false, 'Consultation', null, null, base - interval '2 days' + interval '11 hours 30 min', v_owner);

  -- ===== EMR: visits + vitals =============================================
  insert into public.medical_records (id, clinic_id, patient_id, branch_id, provider_user_id, visit_date, status, chief_complaint, subjective, objective, assessment, plan, diagnosis, treatment_plan, created_by) values
    (rec1, v_clinic, p1, v_branch, v_owner, base + interval '9 hours', 'finalized', 'High blood pressure follow-up', 'Occasional headaches, compliant with medication.', 'BP 140/90, alert and oriented.', 'Hypertension, fairly controlled.', 'Continue current medication, review in 4 weeks.', 'Essential hypertension', 'Amlodipine 5mg once daily', v_owner),
    (rec2, v_clinic, p2, v_branch, v_owner, base - interval '2 days' + interval '11 hours', 'finalized', 'Fever and cough 3 days', 'Productive cough, mild fever, no shortness of breath.', 'Temp 38.1, throat mildly inflamed.', 'Upper respiratory tract infection.', 'Symptomatic treatment, fluids, rest.', 'Acute URTI', 'Paracetamol + rest', v_owner)
  on conflict (id) do nothing;

  insert into public.vital_signs (clinic_id, patient_id, medical_record_id, systolic, diastolic, pulse, temperature, height_cm, weight_kg, oxygen_saturation, created_by) values
    (v_clinic, p1, rec1, 140, 90, 78, 36.6, 170, 78, 98, v_owner),
    (v_clinic, p2, rec2, 118, 76, 88, 38.1, 162, 60, 97, v_owner);

  -- ===== Prescriptions =====================================================
  insert into public.prescriptions (id, clinic_id, patient_id, doctor_id, medical_record_id, notes, created_by) values
    (pr1, v_clinic, p1, d1, rec1, 'Take with food.', v_owner),
    (pr2, v_clinic, p2, d2, rec2, null, v_owner)
  on conflict (id) do nothing;
  insert into public.prescription_items (clinic_id, prescription_id, medicine_name, dosage, frequency, duration, quantity, sort_order) values
    (v_clinic, pr1, 'Amlodipine', '5mg', 'Once daily', '30 days', 30, 0),
    (v_clinic, pr2, 'Paracetamol', '500mg', '3x daily', '5 days', 15, 0),
    (v_clinic, pr2, 'Amoxicillin', '500mg', '2x daily', '7 days', 14, 1);

  -- ===== Pharmacy: medicines + stock ledger ===============================
  insert into public.medicines (id, clinic_id, name, generic_name, sku, category, unit, reorder_level, purchase_price, selling_price, created_by) values
    (m1, v_clinic, 'Amlodipine 5mg', 'Amlodipine', 'AML-5', 'Cardiovascular', 'tablet', 50, 0.05, 0.20, v_owner),
    (m2, v_clinic, 'Paracetamol 500mg', 'Paracetamol', 'PARA-500', 'Analgesic', 'tablet', 100, 0.02, 0.10, v_owner),
    (m3, v_clinic, 'Amoxicillin 500mg', 'Amoxicillin', 'AMOX-500', 'Antibiotic', 'capsule', 40, 0.08, 0.30, v_owner),
    (m4, v_clinic, 'Salbutamol Inhaler', 'Salbutamol', 'SALB-INH', 'Respiratory', 'inhaler', 10, 2.50, 5.00, v_owner)
  on conflict (id) do nothing;

  insert into public.inventory_transactions (clinic_id, medicine_id, change, reason, batch_number, expiry_date, unit_cost, created_by) values
    (v_clinic, m1, 500, 'purchase', 'B-AML-2401', (now() + interval '300 days')::date, 0.05, v_owner),
    (v_clinic, m2, 1000, 'purchase', 'B-PARA-2402', (now() + interval '200 days')::date, 0.02, v_owner),
    (v_clinic, m3, 30, 'purchase', 'B-AMOX-2403', (now() + interval '40 days')::date, 0.08, v_owner),  -- expiring soon
    (v_clinic, m4, 8, 'purchase', 'B-SALB-2404', (now() + interval '180 days')::date, 2.50, v_owner),    -- below reorder (10)
    (v_clinic, m1, -30, 'dispense', null, null, null, v_owner),
    (v_clinic, m2, -15, 'dispense', null, null, null, v_owner);

  -- ===== Billing: invoices + items + payments =============================
  insert into public.invoices (id, clinic_id, patient_id, branch_id, invoice_seq, invoice_number, discount, tax, notes, created_by) values
    (inv1, v_clinic, p1, v_branch, 9001, 'INV009001', 0, 0, 'Consultation + medication', v_owner),
    (inv2, v_clinic, p2, v_branch, 9002, 'INV009002', 2, 0, 'Consultation', v_owner),
    (inv3, v_clinic, p3, v_branch, 9003, 'INV009003', 0, 0, 'Wound dressing', v_owner)
  on conflict (id) do nothing;
  insert into public.invoice_items (clinic_id, invoice_id, description, quantity, unit_price, sort_order) values
    (v_clinic, inv1, 'GP consultation', 1, 20, 0),
    (v_clinic, inv1, 'Amlodipine 5mg x30', 30, 0.20, 1),
    (v_clinic, inv2, 'Pediatric consultation', 1, 25, 0),
    (v_clinic, inv3, 'Wound dressing', 1, 8, 0);
  -- inv1 fully paid, inv2 partially paid, inv3 left unpaid
  insert into public.payments (clinic_id, invoice_id, receipt_seq, receipt_number, amount, method, reference, paid_at, created_by) values
    (v_clinic, inv1, 9001, 'RCP009001', 26, 'cash', null, now() - interval '20 hours', v_owner),
    (v_clinic, inv2, 9002, 'RCP009002', 10, 'khqr', 'KHQR-DEMO-01', now() - interval '2 hours', v_owner);

  -- ===== Laboratory ========================================================
  insert into public.lab_categories (id, clinic_id, name, description, created_by) values
    (cat1, v_clinic, 'Hematology', 'Blood counts and related tests', v_owner),
    (cat2, v_clinic, 'Biochemistry', 'Metabolic panels', v_owner)
  on conflict (id) do nothing;
  insert into public.lab_requests (id, clinic_id, patient_id, doctor_id, category_id, test_name, status, notes, completed_at, created_by) values
    (lr1, v_clinic, p1, d1, cat1, 'Complete Blood Count', 'completed', 'Routine', now() - interval '1 hour', v_owner),
    (lr2, v_clinic, p3, d1, cat2, 'Fasting Blood Glucose', 'processing', 'Diabetes monitoring', null, v_owner)
  on conflict (id) do nothing;
  insert into public.lab_results (clinic_id, lab_request_id, result_value, unit, reference_range, result_text, created_by) values
    (v_clinic, lr1, '13.5', 'g/dL', '13.0–17.0', 'Hemoglobin within normal range.', v_owner);

  -- ===== Notifications (log) ==============================================
  insert into public.notifications (clinic_id, channel, type, recipient, subject, body, status, patient_id, created_by) values
    (v_clinic, 'email', 'appointment_reminder', 'dara@example.com', 'Appointment reminder', 'Reminder of your appointment.', 'sent', p1, v_owner),
    (v_clinic, 'email', 'payment_reminder', 'vannak@example.com', 'Payment reminder', 'Invoice INV009003 is outstanding.', 'skipped', p3, v_owner);

  raise notice 'Demo data loaded for clinic % (%)', v_clinic, v_email;
 end loop;
end $$;

-- ============================================================================
-- CLEANUP (optional) — removes the demo rows. Uncomment & run. Uses the same
-- v_emails list; deletes only those clinics' demo data.
-- ----------------------------------------------------------------------------
-- do $$
-- declare
--   v_emails text[] := array['panhakiyosaki88@gmail.com', 'ttd2.aj@gmail.com'];
--   v_email  text;
--   v_clinic uuid;
-- begin
--  foreach v_email in array v_emails loop
--   select c.id into v_clinic from public.clinics c
--   join auth.users u on u.id = c.owner_user_id
--   where lower(u.email) = lower(v_email) order by c.created_at desc limit 1;
--   if v_clinic is null then raise notice 'No clinic for %', v_email; continue; end if;
--   -- invoices, lab, prescriptions, appointments, vitals cascade from patients/doctors.
--   delete from public.patients  where clinic_id = v_clinic and patient_number like 'P0090%';
--   delete from public.doctors   where clinic_id = v_clinic and license_number in ('KH-GP-1024','KH-PED-2048','KH-DERM-3072');
--   delete from public.medicines where clinic_id = v_clinic and sku in ('AML-5','PARA-500','AMOX-500','SALB-INH');
--   delete from public.lab_categories where clinic_id = v_clinic and name in ('Hematology','Biochemistry');
--   delete from public.notifications  where clinic_id = v_clinic and recipient in ('dara@example.com','vannak@example.com');
--   raise notice 'Demo data removed from clinic % (%)', v_clinic, v_email;
--  end loop;
-- end $$;
