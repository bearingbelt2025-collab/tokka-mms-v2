'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, CheckCircle, AlertTriangle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import type { Machine, PmSchedule } from '@/types/database'

type PmScheduleWithMachine = PmSchedule & {
  machine: { name: string } | null
}

export default function PmSchedulePage() {
  const [schedules, setSchedules] = useState<PmScheduleWithMachine[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = useSupabase()
  const { toast } = useToast()

  const [form, setForm] = useState({
    machine_id: '',
    task_name: '',
    frequency_days: '30',
    last_done_at: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [schedulesRes, machinesRes] = await Promise.all([
      sb
        .from('pm_schedules')
        .select('*, machine:machines(name)')
        .order('next_due_at', { ascending: true }),
      sb.from('machines').select('id, name').order('name'),
    ])
    if (schedulesRes.error) throw schedulesRes.error
    if (machinesRes.error) throw machinesRes.error
    setSchedules(schedulesRes.data || [])
    setMachines(machinesRes.data || [])
  }, [supabase])

  useEffect(() => {
    fetchData()
      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [fetchData, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      const lastDoneAt = form.last_done_at ? new Date(form.last_done_at) : new Date()
      const nextDueAt = addDays(lastDoneAt, parseInt(form.frequency_days))

      const { error } = await sb.from('pm_schedules').insert({
        machine_id: parseInt(form.machine_id),
        task_name: form.task_name,
        frequency_days: parseInt(form.frequency_days),
        last_done_at: lastDoneAt.toISOString(),
        next_due_at: nextDueAt.toISOString(),
        notes: form.notes || null,
      })

      if (error) throw error

      toast({ title: 'PM Schedule created successfully' })
      setOpen(false)
      setForm({ machine_id: '', task_name: '', frequency_days: '30', last_done_at: '', notes: '' })
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkDone = async (schedule: PmScheduleWithMachine) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const now = new Date()
      const nextDue = addDays(now, schedule.frequency_days)

      const { error } = await sb
        .from('pm_schedules')
        .update({
          last_done_at: now.toISOString(),
          next_due_at: nextDue.toISOString(),
        })
        .eq('id', schedule.id)

      if (error) throw error
      toast({ title: 'PM marked as done' })
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const now = new Date()
  const overdueSchedules = schedules.filter((s) => new Date(s.next_due_at) < now)
  const upcomingSchedules = schedules.filter((s) => new Date(s.next_due_at) >= now)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PM Schedule</h1>
          <p className="text-muted-foreground">Manage preventive maintenance schedules</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create PM Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Machine *</Label>
                <Select
                  value={form.machine_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, machine_id: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task_name">Task Name *</Label>
                <Input
                  id="task_name"
                  value={form.task_name}
                  onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
                  placeholder="e.g., Oil change, Filter replacement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency (days) *</Label>
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  value={form.frequency_days}
                  onChange={(e) => setForm((f) => ({ ...f, frequency_days: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_done">Last Done At</Label>
                <Input
                  id="last_done"
                  type="datetime-local"
                  value={form.last_done_at}
                  onChange={(e) => setForm((f) => ({ ...f, last_done_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Create Schedule'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No PM schedules"
          description="Create your first preventive maintenance schedule"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {overdueSchedules.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Overdue ({overdueSchedules.length})
              </h2>
              <div className="space-y-3">
                {overdueSchedules.map((s) => (
                  <div key={s.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{s.task_name}</p>
                        <p className="text-sm text-muted-foreground">{s.machine?.name}</p>
                        <p className="text-xs text-destructive">
                          Due: {format(new Date(s.next_due_at), 'MMM d, yyyy')}
                        </p>
                        {s.last_done_at && (
                          <p className="text-xs text-muted-foreground">
                            Last done: {format(new Date(s.last_done_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Every {s.frequency_days}d</span>
                        <Button size="sm" variant="outline" onClick={() => handleMarkDone(s)}>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingSchedules.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcomingSchedules.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{s.task_name}</p>
                        <p className="text-sm text-muted-foreground">{s.machine?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(s.next_due_at), 'MMM d, yyyy')}
                        </p>
                        {s.last_done_at && (
                          <p className="text-xs text-muted-foreground">
                            Last done: {format(new Date(s.last_done_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Every {s.frequency_days}d</span>
                        <Button size="sm" variant="outline" onClick={() => handleMarkDone(s)}>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
