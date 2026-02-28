export type MachineStatus = 'running' | 'maintenance_due' | 'breakdown'
export type WoStatus = 'open' | 'in_progress' | 'pending_parts' | 'closed'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type UserRole = 'admin' | 'technician'

export interface Machine {
  id: string
  name: string
  model: string | null
  serial_number: string | null
  location: string | null
  status: MachineStatus
  notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface WorkOrder {
  id: string
  machine_id: string
  issue_type: string
  issue_description: string
  priority: Priority
  status: WoStatus
  assigned_to: string | null
  photo_url: string | null
  created_at: string
  closed_at: string | null
}

export interface PmSchedule {
  id: string
  machine_id: string
  task_description: string
  frequency_days: number
  next_due_date: string
  last_completed_date: string | null
  is_active: boolean
  created_at: string
}

export interface DowntimeLog {
  id: string
  machine_id: string
  reason: string
  notes: string | null
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      machines: {
        Row: Machine
        Insert: Omit<Machine, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Machine, 'id' | 'created_at' | 'updated_at'>>
      }
      work_orders: {
        Row: WorkOrder
        Insert: Omit<WorkOrder, 'id' | 'created_at'>
        Update: Partial<Omit<WorkOrder, 'id' | 'created_at'>>
      }
      pm_schedules: {
        Row: PmSchedule
        Insert: Omit<PmSchedule, 'id' | 'created_at'>
        Update: Partial<Omit<PmSchedule, 'id' | 'created_at'>>
      }
      downtime_logs: {
        Row: DowntimeLog
        Insert: Omit<DowntimeLog, 'id' | 'created_at'>
        Update: Partial<Omit<DowntimeLog, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'>
        Update: Partial<Omit<UserProfile, 'created_at'>>
      }
    }
  }
}
