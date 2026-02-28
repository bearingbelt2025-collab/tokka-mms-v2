// ============================================
// TOKKA MMS — Supabase Database Types
// Auto-generated pattern matching the Supabase schema
// ============================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'admin' | 'technician'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role?: 'admin' | 'technician'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: 'admin' | 'technician'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      machines: {
        Row: {
          id: number
          name: string
          machine_type: string
          location: string
          status: 'running' | 'maintenance_due' | 'breakdown'
          photo_url: string | null
          specs: Record<string, unknown>
          installed_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          machine_type: string
          location: string
          status?: 'running' | 'maintenance_due' | 'breakdown'
          photo_url?: string | null
          specs?: Record<string, unknown>
          installed_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          machine_type?: string
          location?: string
          status?: 'running' | 'maintenance_due' | 'breakdown'
          photo_url?: string | null
          specs?: Record<string, unknown>
          installed_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_orders: {
        Row: {
          id: number
          machine_id: number
          created_by: string
          assigned_to: string | null
          issue_type: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'critical'
          status: 'open' | 'assigned' | 'in_progress' | 'completed'
          photo_url: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: number
          machine_id: number
          created_by: string
          assigned_to?: string | null
          issue_type: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'assigned' | 'in_progress' | 'completed'
          photo_url?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: number
          machine_id?: number
          created_by?: string
          assigned_to?: string | null
          issue_type?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'assigned' | 'in_progress' | 'completed'
          photo_url?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      pm_schedules: {
        Row: {
          id: number
          machine_id: number
          task_name: string
          interval_days: number
          last_completed: string | null
          next_due: string
          created_at: string
        }
        Insert: {
          id?: number
          machine_id: number
          task_name: string
          interval_days: number
          last_completed?: string | null
          next_due: string
          created_at?: string
        }
        Update: {
          id?: number
          machine_id?: number
          task_name?: string
          interval_days?: number
          last_completed?: string | null
          next_due?: string
          created_at?: string
        }
      }
      downtime_logs: {
        Row: {
          id: number
          machine_id: number
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          reason: string | null
          logged_by: string
          created_at: string
        }
        Insert: {
          id?: number
          machine_id: number
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          reason?: string | null
          logged_by: string
          created_at?: string
        }
        Update: {
          id?: number
          machine_id?: number
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          reason?: string | null
          logged_by?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ============================================
// Convenience Row type aliases
// ============================================
export type Profile    = Database['public']['Tables']['profiles']['Row']
export type Machine    = Database['public']['Tables']['machines']['Row']
export type WorkOrder  = Database['public']['Tables']['work_orders']['Row']
export type PmSchedule = Database['public']['Tables']['pm_schedules']['Row']
export type DowntimeLog = Database['public']['Tables']['downtime_logs']['Row']

// ============================================
// Convenience Insert type aliases
// ============================================
export type ProfileInsert    = Database['public']['Tables']['profiles']['Insert']
export type MachineInsert    = Database['public']['Tables']['machines']['Insert']
export type WorkOrderInsert  = Database['public']['Tables']['work_orders']['Insert']
export type PmScheduleInsert = Database['public']['Tables']['pm_schedules']['Insert']
export type DowntimeLogInsert = Database['public']['Tables']['downtime_logs']['Insert']

// ============================================
// Convenience Update type aliases
// ============================================
export type ProfileUpdate    = Database['public']['Tables']['profiles']['Update']
export type MachineUpdate    = Database['public']['Tables']['machines']['Update']
export type WorkOrderUpdate  = Database['public']['Tables']['work_orders']['Update']
export type PmScheduleUpdate = Database['public']['Tables']['pm_schedules']['Update']
export type DowntimeLogUpdate = Database['public']['Tables']['downtime_logs']['Update']

// ============================================
// Derived / union types for application use
// ============================================
export type MachineStatus    = Machine['status']
export type WorkOrderStatus  = WorkOrder['status']
export type WorkOrderPriority = WorkOrder['priority']
export type UserRole         = Profile['role']

// Work order joined with related records
export type WorkOrderWithRelations = WorkOrder & {
  machine: Pick<Machine, 'id' | 'name' | 'machine_type' | 'location'>
  creator: Pick<Profile, 'id' | 'name' | 'avatar_url'>
  assignee: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

// Machine with aggregated stats (used in dashboard)
export type MachineWithStats = Machine & {
  open_work_orders: number
  overdue_pm_count: number
  active_downtime: DowntimeLog | null
}

// PM schedule with machine info
export type PmScheduleWithMachine = PmSchedule & {
  machine: Pick<Machine, 'id' | 'name' | 'location'>
}

