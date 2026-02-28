'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { Activity, ClipboardList, AlertTriangle, Clock } from 'lucide-react'
import { formatDistanceToNow, format, startOfMonth, endOfMonth } from 'date-fns'
import { KpiCard } from '@/components/kpi-card'
import { MachineCard } from '@/components/machine-card'
import { PriorityBadge } from '@/components/priority-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { KpiCardSkeleton, CardSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import type { Machine, WorkOrder, PmSchedule } from '@/types/database'

type WorkOrderWithMachine = WorkOrder & {
  machine: { name: string } | null
  creator: { name: string } | null
  assignee: { name: string } | null
}

type PmScheduleWithMachine = PmSchedule & {
  machine: { name: string } | null
}

interface DashboardData {
  machines: Machine[]
  openWorkOrders: WorkOrderWithMachine[]
  overduePm: PmScheduleWithMachine[]
  downtimeHoursThisMonth: number
  recentWorkOrders: WorkOrderWithMachine[]
  openWoCountByMachine: Record<number, number>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()
  const { toast } = useToast()

  const fetchDashboard = useCallback(async () => {
    const now = new Date()
    const monthStart = startOfMonth(now).toISOString()
    const monthEnd = endOfMonth(now).toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const [machinesRes, woRes, pmRes, downtimeRes] = await Promise.all([
      supabase.from('machines').select('*').order('name'),
      sb
        .from('work_orders')
        .select('*, machine:machines(name), creator:profiles!work_orders_created_by_fkey(name), assignee:profiles!work_orders_assigned_to_fkey(name)')
        .neq('status', 'completed')
        .order('created_at', { ascending: false }),
      sb
        .from('pm_schedules')
        .select('*, machine:machines(name)')
        .lt('next_due', now.toISOString()),
      sb
        .from('downtime_logs')
        .select('duration_minutes')
        .gte('started_at', monthStart)
        .lte('started_at', monthEnd)
        .not('duration_minutes', 'is', null),
    ])

    // Recent 5 WOs (all statuses)
    const recentWoRes = await sb
      .from('work_orders')
      .select('*, machine:machines(name), creator:profiles!work_orders_created_by_fkey(name), assignee:profiles!work_orders_assigned_to_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    const totalDowntimeMinutes = ((downtimeRes.data ?? []) as { duration_minutes: number | null }[]).reduce(
      (sum: number, d: { duration_minutes: number | null }) => sum + (d.duration_minutes ?? 0),
      0
    )

    // Calculate open WO count per machine
    const openWoCountByMachine: Record<number, number> = {}
    for (const wo of (woRes.data ?? []) as { machine_id: number }[]) {
      openWoCountByMachine[wo.machine_id] = (openWoCountByMachine[wo.machine_id] ?? 0) + 1
    }

    // Check for query errors
    const queryError = machinesRes.error || woRes.error || pmRes.error || downtimeRes.error || recentWoRes.error
    if (queryError) {
      setError(queryError.message)
      toast({ variant: 'destructive', title: 'Failed to load dashboard', description: queryError.message })
      setLoading(false)
      return
    }

    setError(null)
    setData({
      machines: machinesRes.data ?? [],
      openWorkOrders: (woRes.data ?? []) as WorkOrderWithMachine[],
      overduePm: (pmRes.data ?? []) as PmScheduleWithMachine[],
      downtimeHoursThisMonth: Math.round((totalDowntimeMinutes / 60) * 10) / 10,
      recentWorkOrders: (recentWoRes.data ?? []) as WorkOrderWithMachine[],
      openWoCountByMachine,
    })
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    fetchDashboard()

    // Real-time subscriptions
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downtime_logs' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_schedules' }, fetchDashboard)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDashboard, supabase])

  const runningCount = data?.machines.filter((m) => m.status === 'running').length ?? 0
  const totalMachines = data?.machines.length ?? 0

  const getDaysOverdue = (nextDue: string) => {
    const diff = new Date().getTime() - new Date(nextDue).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <h2 className="text-sm font-mono-display font-bold mb-1">Failed to load dashboard</h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">{error}</p>
        <Button size="sm" onClick={fetchDashboard} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold font-mono-display">Dashboard</h1>
        <p className="text-xs text-muted-foreground font-body mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              title="Machines Running"
              value={`${runningCount}/${totalMachines}`}
              icon={Activity}
              accentColor="green"
              subtitle={`${totalMachines - runningCount} offline`}
            />
            <KpiCard
              title="Open Work Orders"
              value={data?.openWorkOrders.length ?? 0}
              icon={ClipboardList}
              accentColor="amber"
              subtitle="Unresolved issues"
            />
            <KpiCard
              title="Overdue PM Tasks"
              value={data?.overduePm.length ?? 0}
              icon={AlertTriangle}
              accentColor="red"
              subtitle="Past schedule"
            />
            <KpiCard
              title="Downtime This Month"
              value={`${data?.downtimeHoursThisMonth ?? 0}h`}
              icon={Clock}
              accentColor="red"
              subtitle="Total hours lost"
            />
          </>
        )}
      </div>

      {/* Row 2 — Machine Status Grid */}
      <div className="bg-card border border-border rounded-md p-4">
        <h2 className="text-sm font-semibold font-mono-display mb-3">Machine Status</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        ) : data?.machines.length === 0 ? (
          <EmptyState
            title="No machines registered"
            description="Add machines in the Machine Registry"
            icon={Activity}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {data?.machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Row 3 — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Work Orders */}
        <div className="bg-card border border-border rounded-md">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold font-mono-display">Recent Work Orders</h2>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 items-start">
                  <div className="animate-pulse h-3 flex-1 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : data?.recentWorkOrders.length === 0 ? (
            <EmptyState
              title="No work orders yet"
              description="Work orders will appear here"
              icon={ClipboardList}
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border">
              {data?.recentWorkOrders.map((wo) => (
                <div key={wo.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold font-mono-display text-foreground truncate">
                        {wo.machine?.name ?? 'Unknown Machine'}
                      </span>
                      <span className="text-xs text-muted-foreground">{wo.issue_type}</span>
                    </div>
                    {wo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{wo.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <PriorityBadge priority={wo.priority} />
                      <WoStatusBadge status={wo.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue PM Tasks */}
        <div className="bg-card border border-border rounded-md">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold font-mono-display">Overdue PM Tasks</h2>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 items-start">
                  <div className="animate-pulse h-3 flex-1 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : data?.overduePm.length === 0 ? (
            <EmptyState
              title="All PM tasks on schedule"
              description="No overdue preventive maintenance"
              icon={AlertTriangle}
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border">
              {data?.overduePm.map((pm) => {
                const daysOverdue = getDaysOverdue(pm.next_due)
                return (
                  <div key={pm.id} className="px-4 py-3 border-l-2 border-l-red-500 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold font-mono-display truncate">
                        {pm.machine?.name ?? 'Unknown Machine'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{pm.task_name}</p>
                    </div>
                    <span className="text-xs font-mono-display font-bold text-red-400 shrink-0 bg-red-500/10 px-1.5 py-0.5 rounded-sm">
                      {daysOverdue}d overdue
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
