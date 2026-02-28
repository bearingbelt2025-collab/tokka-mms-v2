export type MachineStatus = 'running' | 'maintenance_due' | 'down'
export type WorkOrderStatus = 'open' | 'in_progress' | 'pending_parts' | 'completed'
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Machine {
  id: number
  name: string
  machine_type: string
  location: string
  status: MachineStatus
  specs: unknown
  photo_url: string | null
  installed_date: string | null
  created_at: string
  updated_at: string
}

export type MachineInsert = Omit<Machine, 'id' | 'created_at' | 'updated_at'>

export interface Profile {
  id: string
  name: string
  email: string
  role: 'admin' | 'technician' | 'viewer'
  avatar_url: string | null
  created_at: string
}

export interface WorkOrder {
  id: number
  machine_id: number
  created_by: string
  assigned_to: string | null
  issue_type: string
  description: string | null
  priority: WorkOrderPriority
  status: WorkOrderStatus
  photo_url: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export type WorkOrderInsert = Omit<WorkOrder, 'id' | 'created_at' | 'updated_at'>

export interface PmSchedule {
  id: number
  machine_id: number
  task_name: string
  interval_days: number
  last_done: string | null
  next_due: string
  assigned_to: string | null
  notes: string | null
  created_at: string
}

export type PmScheduleInsert = Omit<PmSchedule, 'id' | 'created_at'>

export interface DowntimeLog {
  id: number
  machine_id: number
  logged_by: string
  reason: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  created_at: string
}

export type DowntimeLogInsert = Omit<DowntimeLog, 'id' | 'created_at'>

export interface KpiSnapshot {
  id: number
  snapshot_date: string
  total_machines: number
  machines_running: number
  machines_down: number
  machines_maintenance_due: number
  open_work_orders: number
  critical_work_orders: number
  avg_resolution_hours: number | null
  total_downtime_minutes: number
  created_at: string
}
