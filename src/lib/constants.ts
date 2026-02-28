export const MACHINE_STATUSES = ['running', 'maintenance_due', 'down'] as const

export const ISSUE_TYPES = [
  'Electrical',
  'Mechanical',
  'Hydraulic',
  'Pneumatic',
  'Software',
  'Lubrication',
  'Calibration',
  'Cleaning',
  'Inspection',
  'Other',
] as const

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

export const WORK_ORDER_STATUSES = ['open', 'in_progress', 'pending_parts', 'completed'] as const

export const PM_INTERVALS = [
  { label: 'Daily', days: 1 },
  { label: 'Weekly', days: 7 },
  { label: 'Bi-weekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
  { label: 'Semi-annual', days: 180 },
  { label: 'Annual', days: 365 },
] as const
