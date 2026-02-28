'use client'

export const dynamic = 'force-dynamic'

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

    const [machinesRes, openWoRes, overduePmRes, downtimeRes, recentWoRes] =
      await Promise.all([
        sb.from('machines').select('*').order('name'),
        sb
          .from('work_orders')
          .select(
            'id, wo_number, title, priority, status, created_at, machine:machines(name), creator:users!work_orders_created_by_fkey(name), assignee:users!work_orders_assigned_to_fkey(name)'
          )
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false }),
        sb
          .from('pm_schedules')
          .select('id, task_name, frequency_days, last_done_at, next_due_at, machine:machines(name)')
          .lt('next_due_at', new Date().toISOString())
          .order('next_due_at', { ascending: true }),
        sb
          .from('downtime_logs')
          .select('duration_minutes')
          .gte('start_time', monthStart)
          .lte('start_time', monthEnd),
        sb
          .from('work_orders')
          .select(
            'id, wo_number, title, priority, status, created_at, machine:machines(name), creator:users!work_orders_created_by_fkey(name), assignee:users!work_orders_assigned_to_fkey(name)'
          )
          .order('created_at', { ascending: false })
          .limit(5),
      ])

    if (machinesRes.error) throw machinesRes.error
    if (openWoRes.error) throw openWoRes.error
    if (overduePmRes.error) throw overduePmRes.error
    if (downtimeRes.error) throw downtimeRes.error
    if (recentWoRes.error) throw recentWoRes.error

    const totalDowntimeMinutes = (downtimeRes.data || []).reduce(
      (sum: number, row: { duration_minutes: number }) => sum + (row.duration_minutes || 0),
      0
    )

    const openWoCountByMachine: Record<number, number> = {}
    ;(openWoRes.data || []).forEach((wo: WorkOrderWithMachine & { machine_id: number }) => {
      openWoCountByMachine[wo.machine_id] = (openWoCountByMachine[wo.machine_id] || 0) + 1
    })

    setData({
      machines: machinesRes.data || [],
      openWorkOrders: openWoRes.data || [],
      overduePm: overduePmRes.data || [],
      downtimeHoursThisMonth: Math.round(totalDowntimeMinutes / 60),
      recentWorkOrders: recentWoRes.data || [],
      openWoCountByMachine,
    })
  }, [supabase])

  useEffect(() => {
    fetchDashboard()
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard')
        toast({ title: 'Error', description: err.message, variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [fetchDashboard, toast])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your maintenance operations</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load dashboard"
          description={error}
          action={
            <Button onClick={() => { setLoading(true); setError(null); fetchDashboard().catch(e => setError(e.message)).finally(() => setLoading(false)) }}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  const { machines, openWorkOrders, overduePm, downtimeHoursThisMonth, recentWorkOrders, openWoCountByMachine } = data!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your maintenance operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Machines"
          value={machines.length}
          icon={Activity}
          description="Registered in system"
        />
        <KpiCard
          title="Open Work Orders"
          value={openWorkOrders.length}
          icon={ClipboardList}
          description="Pending or in progress"
          trend={openWorkOrders.length > 5 ? 'up' : 'neutral'}
        />
        <KpiCard
          title="Overdue PM"
          value={overduePm.length}
          icon={AlertTriangle}
          description="Past due date"
          trend={overduePm.length > 0 ? 'up' : 'neutral'}
          className={overduePm.length > 0 ? 'border-destructive/50' : ''}
        />
        <KpiCard
          title="Downtime This Month"
          value={`${downtimeHoursThisMonth}h`}
          icon={Clock}
          description={`${format(new Date(), 'MMMM yyyy')}`}
        />
      </div>

      {/* Machines Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Machines</h2>
        {machines.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No machines registered"
            description="Add your first machine to get started"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                openWoCount={openWoCountByMachine[machine.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Work Orders */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Work Orders</h2>
          {recentWorkOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No work orders yet"
              description="Create your first work order"
            />
          ) : (
            <div className="space-y-3">
              {recentWorkOrders.map((wo) => (
                <div key={wo.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{wo.wo_number}</span>
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <p className="text-sm font-medium">{wo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {wo.machine?.name} &bull; {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <WoStatusBadge status={wo.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue PM */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Overdue Preventive Maintenance</h2>
          {overduePm.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No overdue PM"
              description="All scheduled maintenance is up to date"
            />
          ) : (
            <div className="space-y-3">
              {overduePm.map((pm) => (
                <div key={pm.id} className="flex items-start justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{pm.task_name}</p>
                    <p className="text-xs text-muted-foreground">{pm.machine?.name}</p>
                    <p className="text-xs text-destructive">
                      Due: {format(new Date(pm.next_due_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Every {pm.frequency_days}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
