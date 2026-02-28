-- ============================================================
-- SEED DATA FOR TOKKA MMS
-- NOTE: Run migration.sql first
-- NOTE: Create auth users in Supabase dashboard first:
--   admin@tokka.com / password123
--   tech1@tokka.com / password123
--   tech2@tokka.com / password123
-- Then update the UUIDs below to match
-- ============================================================

-- Update user profiles (set roles after auth users are created)
-- Replace these UUIDs with actual auth user IDs from your Supabase dashboard
-- UPDATE user_profiles SET role = 'admin', full_name = 'Plant Admin' WHERE email = 'admin@tokka.com';
-- UPDATE user_profiles SET role = 'technician', full_name = 'Ahmad Technician' WHERE email = 'tech1@tokka.com';
-- UPDATE user_profiles SET role = 'technician', full_name = 'Budi Technician' WHERE email = 'tech2@tokka.com';

-- ============================================================
-- MACHINES
-- ============================================================
insert into machines (name, model, serial_number, location, status, notes) values
  ('Wire Drawing Machine #1', 'WD-2000', 'WD2000-001', 'Building A, Line 1', 'running', 'Primary wire drawing machine. Last serviced Jan 2025.'),
  ('Wire Drawing Machine #2', 'WD-2000', 'WD2000-002', 'Building A, Line 2', 'maintenance_due', 'Due for monthly lubrication check.'),
  ('Wire Drawing Machine #3', 'WD-3000', 'WD3000-001', 'Building A, Line 3', 'running', 'Upgraded model with auto-tension.'),
  ('Nail Forming Machine #1', 'NF-500', 'NF500-001', 'Building B, Line 1', 'running', 'Main production nail former.'),
  ('Nail Forming Machine #2', 'NF-500', 'NF500-002', 'Building B, Line 2', 'breakdown', 'Drive belt snapped. Awaiting replacement part.'),
  ('Nail Forming Machine #3', 'NF-600', 'NF600-001', 'Building B, Line 3', 'running', 'High-speed model.'),
  ('Wire Coiling Machine', 'WC-100', 'WC100-001', 'Building A, Storage', 'running', null),
  ('Annealing Furnace #1', 'AF-800', 'AF800-001', 'Building C', 'running', 'Temperature calibrated monthly.'),
  ('Annealing Furnace #2', 'AF-800', 'AF800-002', 'Building C', 'maintenance_due', 'Thermocouple needs inspection.'),
  ('Wire Straightener', 'WS-200', 'WS200-001', 'Building A, Line 1', 'running', null),
  ('Hydraulic Press #1', 'HP-1000', 'HP1000-001', 'Building D', 'running', 'Hydraulic fluid last changed Dec 2024.'),
  ('Compressor Unit', 'CP-5000', 'CP5000-001', 'Utility Room', 'running', 'Serves all pneumatic tools on floor.');

-- ============================================================
-- WORK ORDERS
-- ============================================================
insert into work_orders (machine_id, issue_type, issue_description, priority, status, assigned_to) values
  (
    (select id from machines where name = 'Nail Forming Machine #2'),
    'Belt/Chain Replacement',
    'Drive belt snapped during production shift. Machine is down. Need OEM belt NF500-DB-01.',
    'critical',
    'open',
    'tech1@tokka.com'
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #2'),
    'Lubrication Required',
    'Monthly lubrication overdue by 5 days. Spindle bearings need grease.',
    'medium',
    'open',
    'tech2@tokka.com'
  ),
  (
    (select id from machines where name = 'Annealing Furnace #2'),
    'Calibration Required',
    'Thermocouple reading inconsistent. Temperature variance of ±15°C observed.',
    'high',
    'in_progress',
    'tech1@tokka.com'
  ),
  (
    (select id from machines where name = 'Hydraulic Press #1'),
    'Hydraulic Issue',
    'Minor hydraulic leak detected at cylinder seal. Drip rate approx 5ml/hour.',
    'medium',
    'pending_parts',
    'tech2@tokka.com'
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #1'),
    'Vibration/Noise',
    'Unusual vibration at high speed (>80% capacity). Possibly worn bearings.',
    'low',
    'open',
    null
  );

-- ============================================================
-- PM SCHEDULES
-- ============================================================
insert into pm_schedules (machine_id, task_description, frequency_days, next_due_date, last_completed_date) values
  (
    (select id from machines where name = 'Wire Drawing Machine #1'),
    'Monthly lubrication: spindle bearings, guide rollers. Check belt tension and alignment.',
    30,
    current_date + interval '12 days',
    current_date - interval '18 days'
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #2'),
    'Monthly lubrication: spindle bearings, guide rollers. Check belt tension and alignment.',
    30,
    current_date - interval '5 days',
    current_date - interval '35 days'
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #3'),
    'Monthly lubrication and auto-tension calibration check.',
    30,
    current_date + interval '8 days',
    current_date - interval '22 days'
  ),
  (
    (select id from machines where name = 'Nail Forming Machine #1'),
    'Bi-weekly: clean die block, check punch alignment, lubricate cam mechanism.',
    14,
    current_date + interval '3 days',
    current_date - interval '11 days'
  ),
  (
    (select id from machines where name = 'Nail Forming Machine #3'),
    'Bi-weekly: clean die block, check punch alignment, lubricate cam mechanism.',
    14,
    current_date - interval '2 days',
    current_date - interval '16 days'
  ),
  (
    (select id from machines where name = 'Annealing Furnace #1'),
    'Monthly: thermocouple calibration, heating element inspection, refractory check.',
    30,
    current_date + interval '15 days',
    current_date - interval '15 days'
  ),
  (
    (select id from machines where name = 'Annealing Furnace #2'),
    'Monthly: thermocouple calibration, heating element inspection, refractory check.',
    30,
    current_date - interval '8 days',
    current_date - interval '38 days'
  ),
  (
    (select id from machines where name = 'Hydraulic Press #1'),
    'Quarterly: hydraulic fluid change, filter replacement, cylinder seal inspection.',
    90,
    current_date + interval '45 days',
    current_date - interval '45 days'
  ),
  (
    (select id from machines where name = 'Compressor Unit'),
    'Monthly: air filter cleaning, oil level check, belt tension, drain condensate.',
    30,
    current_date + interval '5 days',
    current_date - interval '25 days'
  );

-- ============================================================
-- DOWNTIME LOGS
-- ============================================================
insert into downtime_logs (machine_id, reason, notes, start_time, end_time, duration_minutes) values
  (
    (select id from machines where name = 'Nail Forming Machine #2'),
    'Mechanical Breakdown',
    'Drive belt failure during morning shift. Production stopped.',
    now() - interval '3 hours',
    null,
    null
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #2'),
    'Planned Maintenance',
    'Scheduled monthly lubrication and inspection.',
    now() - interval '5 days' - interval '2 hours',
    now() - interval '5 days',
    120
  ),
  (
    (select id from machines where name = 'Annealing Furnace #1'),
    'Planned Maintenance',
    'Annual thermocouple replacement and heating element inspection.',
    now() - interval '14 days' - interval '4 hours',
    now() - interval '14 days',
    240
  ),
  (
    (select id from machines where name = 'Wire Drawing Machine #1'),
    'Electrical Failure',
    'Motor control board tripped. Reset and tested OK after 45 minutes.',
    now() - interval '20 days' - interval '45 minutes',
    now() - interval '20 days',
    45
  );
