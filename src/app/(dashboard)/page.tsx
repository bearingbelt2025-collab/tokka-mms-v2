import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/kpi-card'
import { StatusBadge } from '@/components/status-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { formatDistanceToNow } from 'date-fns'
import {
  Cog,
  ClipboardList,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const [machinesRes, workOrdersRes, pmRes, downtimeRes] = await Promise.all([
    supabase.from('machines').select('*').order('name'),
    supabase
      .from('work_orders')
      .select('*, machines(name)')
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('pm_schedules')
      .select('*, machines(name)')
      .eq('is_active', true)
      .order('next_due_date'),
    supabase
      .from('downtime_logs')
      .select('*')
      .is('end_time', null)
      .order('start_time', { ascending: false }),
  ])

  const machines = machinesRes.data || []
  const workOrders = workOrdersRes.data || []
  const pmSchedules = pmRes.data || []
  const activeDowntime = downtimeRes.data || []

  const machineStats = {
    total: machines.length,
    running: machines.filter((m) => m.status === 'running').length,
    maintenance_due: machines.filter((m) => m.status === 'maintenance_due').length,
    breakdown: machines.filter((m) => m.status === 'breakdown').length,
  }

  const overdueCount = pmSchedules.filter(
    (pm) => new Date(pm.next_due_date) < new Date()
  ).length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Plant overview — real-time status</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Machines"
          value={machineStats.total}
          icon={<Cog className="h-5 w-5" />}
          color="blue"
        />
        <KpiCard
          title="Open Work Orders"
          value={workOrders.length}
          icon={<ClipboardList className="h-5 w-5" />}
          color="orange"
        />
        <KpiCard
          title="Overdue PM"
          value={overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <KpiCard
          title="Active Downtime"
          value={activeDowntime.length}
          icon={<Activity className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Machine Status Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Machine Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {machines.map((machine) => (
              <div
                key={machine.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50"
              >
                <div>
                  <p className="font-medium text-sm text-slate-900">{machine.name}</p>
                  <p className="text-xs text-slate-500">{machine.location}</p>
                </div>
                <StatusBadge status={machine.status} />
              </div>
            ))}
          </div>
          {machines.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No machines registered</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Open Work Orders</CardTitle>
              <Link href="/work-orders" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {workOrders.map((wo) => (
              <div key={wo.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {(wo.machines as any)?.name || 'Unknown Machine'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{wo.issue_description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                  </p>
                </div>
                <WoStatusBadge status={wo.status} />
              </div>
            ))}
            {workOrders.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                All caught up!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue PM */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Overdue PM Schedules</CardTitle>
              <Link href="/pm-schedule" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pmSchedules
              .filter((pm) => new Date(pm.next_due_date) < new Date())
              .slice(0, 5)
              .map((pm) => (
                <div key={pm.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {(pm.machines as any)?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{pm.task_description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-500 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(pm.next_due_date), { addSuffix: true })}
                  </div>
                </div>
              ))}
            {overdueCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No overdue tasks!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
