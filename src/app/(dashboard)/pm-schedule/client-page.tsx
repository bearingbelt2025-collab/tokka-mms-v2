'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, CheckCircle, AlertTriangle } from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Machine, PmSchedule, PmScheduleInsert } from '@/types/database'

type PmScheduleWithMachine = PmSchedule & {
  machine: { id: number; name: string; location: string } | null
}

// ─── Add Schedule Dialog ───────────────────────────────────────────────────────

function AddScheduleDialog({
  open,
  onClose,
  onAdded,
  machines,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
  machines: Machine[]
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [machineId, setMachineId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => { setMachineId(''); setTaskName(''); setIntervalDays('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const days = parseInt(intervalDays)
      const nextDue = addDays(new Date(), days).toISOString()
      const insert: PmScheduleInsert = {
        machine_id: parseInt(machineId),
        task_name: taskName,
        interval_days: days,
        next_due: nextDue,
        last_completed: null,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('pm_schedules').insert(insert)
      if (error) throw error
      toast({ title: 'Schedule created', description: `PM task "${taskName}" has been scheduled.` })
      resetForm()
      onAdded()
      onClose()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Add PM Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId} required>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select machine..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {machines.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Task Name *</Label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              placeholder="e.g. Oil Change, Belt Inspection"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interval (days) *</Label>
            <Input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              required
              min="1"
              placeholder="e.g. 14"
              className="bg-background"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Adding...' : 'Add Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PmSchedulePage() {
  const supabase = useSupabase()
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<PmScheduleWithMachine[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [completing, setCompleting] = useState<number | null>(null)

  const fetchSchedules = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [schedRes, machRes] = await Promise.all([
      sb
        .from('pm_schedules')
        .select('*, machine:machines(id, name, location)')
        .order('next_due'),
      supabase.from('machines').select('*').order('name'),
    ])
    setSchedules((schedRes.data ?? []) as PmScheduleWithMachine[])
    setMachines(machRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const handleMarkComplete = async (schedule: PmScheduleWithMachine) => {
    setCompleting(schedule.id)
    const now = new Date()
    const nextDue = addDays(now, schedule.interval_days).toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pm_schedules')
      .update({ last_completed: now.toISOString(), next_due: nextDue })
      .eq('id', schedule.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({
        title: 'Task completed',
        description: `Next due: ${format(addDays(now, schedule.interval_days), 'MMM d, yyyy')}`,
      })
      fetchSchedules()
    }
    setCompleting(null)
  }

  const now = new Date()
  const overdueSchedules = schedules.filter((s) => new Date(s.next_due) < now)
  const upcomingSchedules = schedules.filter((s) => new Date(s.next_due) >= now)

  const getDaysLabel = (nextDue: string) => {
    const diff = differenceInDays(new Date(nextDue), now)
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    return `In ${diff} days`
  }

  const ScheduleRow = ({ pm, isOverdue }: { pm: PmScheduleWithMachine; isOverdue: boolean }) => (
    <div
      className={cn(
        'bg-card border rounded-md p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3',
        isOverdue ? 'border-l-4 border-l-red-500 border-border/60' : 'border-border'
      )}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 sm:hidden">
          <div>
            <p className="text-sm font-semibold font-mono-display">{pm.task_name}</p>
            <p className="text-xs text-muted-foreground">{pm.machine?.name ?? '—'}</p>
          </div>
          <span
            className={cn(
              'text-xs font-mono-display font-bold px-1.5 py-0.5 rounded-sm shrink-0',
              isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
            )}
          >
            {getDaysLabel(pm.next_due)}
          </span>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-4 items-center">
          <div>
            <p className="text-xs text-muted-foreground">Machine</p>
            <p className="text-sm font-semibold font-mono-display truncate">{pm.machine?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Task</p>
            <p className="text-sm font-medium truncate">{pm.task_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interval</p>
            <p className="text-sm">Every {pm.interval_days} days</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Done</p>
            <p className="text-sm">
              {pm.last_completed ? format(new Date(pm.last_completed), 'MMM d, yyyy') : 'Never'}
            </p>
          </div>
        </div>

        {/* Mobile extra */}
        <div className="sm:hidden mt-2 space-y-0.5">
          <p className="text-xs text-muted-foreground">Every {pm.interval_days} days &bull; Last: {pm.last_completed ? format(new Date(pm.last_completed), 'MMM d') : 'Never'}</p>
        </div>
      </div>

      {/* Due date (desktop) + Action */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden sm:block text-right min-w-[100px]">
          <p className="text-xs text-muted-foreground">Next Due</p>
          <p className="text-sm font-medium">{format(new Date(pm.next_due), 'MMM d, yyyy')}</p>
          <span
            className={cn(
              'text-xs font-mono-display font-bold',
              isOverdue ? 'text-red-400' : 'text-emerald-400'
            )}
          >
            {getDaysLabel(pm.next_due)}
          </span>
        </div>
        <Button
          size="sm"
          disabled={completing === pm.id}
          onClick={() => handleMarkComplete(pm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-medium shrink-0"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          {completing === pm.id ? 'Saving...' : 'Done'}
        </Button>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="PM Schedule"
        subtitle="Preventive Maintenance"
        action={{ label: 'Add Schedule', onClick: () => setAddOpen(true), show: isAdmin, icon: Plus }}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          title="No PM schedules"
          description="Add preventive maintenance schedules for your machines"
          icon={Calendar}
          className="mt-12"
        />
      ) : (
        <div className="space-y-5">
          {/* Overdue section */}
          {overdueSchedules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold font-mono-display text-red-400">
                  Overdue ({overdueSchedules.length})
                </h2>
              </div>
              <div className="space-y-2">
                {overdueSchedules.map((pm) => (
                  <ScheduleRow key={pm.id} pm={pm} isOverdue />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming section */}
          {upcomingSchedules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold font-mono-display">
                  Upcoming ({upcomingSchedules.length})
                </h2>
              </div>
              <div className="space-y-2">
                {upcomingSchedules.map((pm) => (
                  <ScheduleRow key={pm.id} pm={pm} isOverdue={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddScheduleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={fetchSchedules}
        machines={machines}
      />
    </div>
  )
}
