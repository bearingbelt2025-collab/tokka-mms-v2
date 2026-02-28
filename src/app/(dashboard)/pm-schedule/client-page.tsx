'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { format, isPast, isToday, addDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { CardSkeleton } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Machine, PmSchedule, PmScheduleInsert } from '@/types/database'

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'
const FREQUENCY_OPTIONS: { value: FrequencyType; label: string; days: number }[] = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'annually', label: 'Annually', days: 365 },
  { value: 'custom', label: 'Custom', days: 0 },
]

type PmWithMachine = PmSchedule & { machine: { name: string } | null }

// ─── Status helpers ────────────────────────────────────────────────────────────

function getPmStatus(nextDue: string): 'overdue' | 'due-today' | 'upcoming' | 'ok' {
  const d = new Date(nextDue)
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'due-today'
  if (d <= addDays(new Date(), 7)) return 'upcoming'
  return 'ok'
}

const PM_STATUS_STYLES: Record<string, string> = {
  overdue: 'border-l-red-500 bg-red-500/5',
  'due-today': 'border-l-amber-500 bg-amber-500/5',
  upcoming: 'border-l-blue-500 bg-blue-500/5',
  ok: 'border-l-emerald-500',
}

// ─── PM Schedule Dialog ────────────────────────────────────────────────────────

function PmDialog({
  open,
  onClose,
  onSaved,
  pm,
  machines,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  pm?: PmSchedule
  machines: Machine[]
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const isEdit = !!pm

  const [machineId, setMachineId] = useState(pm?.machine_id ? String(pm.machine_id) : '')
  const [taskName, setTaskName] = useState(pm?.task_name ?? '')
  const [frequency, setFrequency] = useState<FrequencyType>((pm?.frequency_type as FrequencyType) ?? 'monthly')
  const [customDays, setCustomDays] = useState(pm?.custom_frequency_days ? String(pm.custom_frequency_days) : '')
  const [nextDue, setNextDue] = useState(pm?.next_due ? pm.next_due.split('T')[0] : '')
  const [notes, setNotes] = useState(pm?.notes ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (pm) {
      setMachineId(String(pm.machine_id))
      setTaskName(pm.task_name)
      setFrequency(pm.frequency_type as FrequencyType)
      setCustomDays(pm.custom_frequency_days ? String(pm.custom_frequency_days) : '')
      setNextDue(pm.next_due.split('T')[0])
      setNotes(pm.notes ?? '')
    }
  }, [pm])

  const resetForm = () => {
    setMachineId(''); setTaskName(''); setFrequency('monthly'); setCustomDays(''); setNextDue(''); setNotes('')
  }

  const getFrequencyDays = (): number => {
    if (frequency === 'custom') return parseInt(customDays) || 30
    return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.days ?? 30
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const frequencyDays = getFrequencyDays()
      if (isEdit && pm) {
        const { error } = await sb
          .from('pm_schedules')
          .update({
            machine_id: parseInt(machineId),
            task_name: taskName,
            frequency_type: frequency,
            custom_frequency_days: frequency === 'custom' ? parseInt(customDays) : null,
            frequency_days: frequencyDays,
            next_due: new Date(nextDue).toISOString(),
            notes: notes || null,
          })
          .eq('id', pm.id)
        if (error) throw error
        toast({ title: 'PM task updated' })
      } else {
        const insert: PmScheduleInsert = {
          machine_id: parseInt(machineId),
          task_name: taskName,
          frequency_type: frequency,
          custom_frequency_days: frequency === 'custom' ? parseInt(customDays) : null,
          frequency_days: frequencyDays,
          next_due: new Date(nextDue).toISOString(),
          notes: notes || null,
        }
        const { error } = await sb.from('pm_schedules').insert(insert)
        if (error) throw error
        toast({ title: 'PM task created' })
      }
      resetForm()
      onSaved()
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
          <DialogTitle className="font-mono-display">{isEdit ? 'Edit PM Task' : 'Add PM Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} required placeholder="e.g. Lubricate bearings" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyType)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {frequency === 'custom' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Custom Interval (days)</Label>
              <Input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="e.g. 45"
                className="bg-background"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Next Due Date *</Label>
            <Input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="bg-background" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Task'}
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
  const { toast } = useToast()
  const [pmList, setPmList] = useState<PmWithMachine[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editPm, setEditPm] = useState<PmSchedule | null>(null)
  const [completing, setCompleting] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [pmRes, machinesRes] = await Promise.all([
      sb
        .from('pm_schedules')
        .select('*, machine:machines(name)')
        .order('next_due', { ascending: true }),
      supabase.from('machines').select('*').order('name'),
    ])
    setPmList((pmRes.data ?? []) as PmWithMachine[])
    setMachines(machinesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('pm-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_schedules' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const handleComplete = async (pm: PmWithMachine) => {
    setCompleting(pm.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const frequencyDays = pm.frequency_days ?? 30
      const nextDue = addDays(new Date(), frequencyDays).toISOString()
      const { error } = await sb
        .from('pm_schedules')
        .update({ last_completed: new Date().toISOString(), next_due: nextDue })
        .eq('id', pm.id)
      if (error) throw error
      toast({ title: 'PM task marked complete', description: `Next due: ${format(new Date(nextDue), 'MMM d, yyyy')}` })
      fetchData()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setCompleting(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const { error } = await sb.from('pm_schedules').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'PM task deleted' })
      fetchData()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="PM Schedule"
        subtitle={`${pmList.length} tasks`}
        action={{ label: 'Add PM Task', onClick: () => setAddOpen(true), icon: Plus }}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      ) : pmList.length === 0 ? (
        <EmptyState
          title="No PM tasks scheduled"
          description="Add preventive maintenance tasks to keep your machines running"
          icon={CheckCircle2}
          action={{ label: 'Add PM Task', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {pmList.map((pm) => {
            const pmStatus = getPmStatus(pm.next_due)
            return (
              <div
                key={pm.id}
                className={`bg-card border border-border border-l-4 rounded-md p-4 ${PM_STATUS_STYLES[pmStatus]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold font-mono-display">{pm.task_name}</span>
                      {pmStatus === 'overdue' && (
                        <span className="text-xs font-mono-display font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-sm">OVERDUE</span>
                      )}
                      {pmStatus === 'due-today' && (
                        <span className="text-xs font-mono-display font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">DUE TODAY</span>
                      )}
                      {pmStatus === 'upcoming' && (
                        <span className="text-xs font-mono-display font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-sm">UPCOMING</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pm.machine?.name ?? 'Unknown'} · {FREQUENCY_OPTIONS.find(f => f.value === pm.frequency_type)?.label ?? pm.frequency_type}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Due: <span className="text-foreground font-medium">{format(new Date(pm.next_due), 'MMM d, yyyy')}</span></span>
                      {pm.last_completed && (
                        <span>Last done: {format(new Date(pm.last_completed), 'MMM d')}</span>
                      )}
                    </div>
                    {pm.notes && <p className="text-xs text-muted-foreground mt-1 italic">{pm.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      disabled={completing === pm.id}
                      onClick={() => handleComplete(pm)}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {completing === pm.id ? '...' : 'Done'}
                    </Button>
                    <button
                      onClick={() => setEditPm(pm)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={deleting === pm.id}
                      onClick={() => handleDelete(pm.id)}
                      className="p-1.5 rounded hover:bg-red-600 text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PmDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchData}
        machines={machines}
      />
      <PmDialog
        open={!!editPm}
        onClose={() => setEditPm(null)}
        onSaved={fetchData}
        pm={editPm ?? undefined}
        machines={machines}
      />
    </div>
  )
}
