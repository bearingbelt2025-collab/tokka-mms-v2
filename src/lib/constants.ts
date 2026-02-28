export const ISSUE_TYPES = [
  'Bearing Failure',
  'Belt Wear',
  'Calibration',
  'Conveyor Jam',
  'Die Replacement',
  'Electrical',
  'Lubrication Required',
  'Motor Overheating',
  'Noise',
  'Sensor Malfunction',
  'Vibration',
  'Other',
] as const

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export const WORK_ORDER_STATUSES = ['open', 'assigned', 'in_progress', 'completed'] as const
export const MACHINE_STATUSES = ['running', 'maintenance_due', 'breakdown'] as const

export const PRIORITY_COLORS = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
} as const

export const STATUS_COLORS = {
  running: 'bg-emerald-500',
  maintenance_due: 'bg-amber-500',
  breakdown: 'bg-red-500',
} as const

export const WO_STATUS_COLORS = {
  open: 'bg-slate-500',
  assigned: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
} as const
