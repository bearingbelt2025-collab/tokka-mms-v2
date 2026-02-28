export const MACHINE_STATUSES = [
  { value: 'running', label: 'Running' },
  { value: 'maintenance_due', label: 'Maintenance Due' },
  { value: 'breakdown', label: 'Breakdown' },
] as const

export const ISSUE_TYPES = [
  'Mechanical Failure',
  'Electrical Issue',
  'Lubrication Required',
  'Belt/Chain Replacement',
  'Bearing Failure',
  'Overheating',
  'Vibration/Noise',
  'Calibration Required',
  'Hydraulic Issue',
  'Pneumatic Issue',
  'Other',
]

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

export const WO_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_parts', label: 'Pending Parts' },
  { value: 'closed', label: 'Closed' },
] as const

export const PM_FREQUENCIES = [
  { days: 7, label: 'Weekly (7 days)' },
  { days: 14, label: 'Bi-weekly (14 days)' },
  { days: 30, label: 'Monthly (30 days)' },
  { days: 60, label: 'Bi-monthly (60 days)' },
  { days: 90, label: 'Quarterly (90 days)' },
  { days: 180, label: 'Semi-annual (180 days)' },
  { days: 365, label: 'Annual (365 days)' },
]

export const DOWNTIME_REASONS = [
  'Mechanical Breakdown',
  'Electrical Failure',
  'Planned Maintenance',
  'Material Shortage',
  'Operator Issue',
  'Power Outage',
  'External Factor',
  'Other',
]
