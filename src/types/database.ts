export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown'
export type WoStatus = 'open' | 'in_progress' | 'pending_parts' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type UserRole = 'admin' | 'technician'

export interface Machine {
  id: string
  name: string
  machine_type: string
  location: string
  status: MachineStatus
  specs: Record<string, string> | null
  photo_url: string | null
  installed_date: string | null
  created_at: string
  updated_at: string
}

export interface MachineInsert {
  name: string
  machine_type: string
  location: string
  status?: MachineStatus
  specs?: Record<string, string> | null
  photo_url?: string | null
  installed_date?: string | null
}

export interface WorkOrder {
  id: string
  title: string
  description: string | null
  machine_id: string | null
  status: WoStatus
  priority: Priority
  assigned_to: string | null
  created_by: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkOrderInsert {
  title: string
  description?: string | null
  machine_id?: string | null
  status?: WoStatus
  priority: Priority
  assigned_to?: string | null
  created_by: string
  due_date?: string | null
}

export interface Profile {
  id: string
  name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface PmSchedule {
  id: string
  machine_id: string | null
  task_name: string
  frequency_days: number | null
  last_completed: string | null
  next_due: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PmScheduleInsert {
  machine_id?: string | null
  task_name: string
  frequency_days?: number | null
  next_due?: string | null
  notes?: string | null
}

export interface DowntimeLog {
  id: string
  machine_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  reason: string
  category: string | null
  logged_by: string
  created_at: string
}

export interface DowntimeLogInsert {
  machine_id: string
  started_at: string
  ended_at?: string | null
  duration_minutes?: number | null
  reason: string
  category?: string | null
  logged_by: string
}

export interface DashboardKpis {
  total_machines: number
  running_machines: number
  breakdown_machines: number
  open_work_orders: number
  in_progress_work_orders: number
  overdue_pm_tasks: number
  total_downtime_minutes_30d: number
}
