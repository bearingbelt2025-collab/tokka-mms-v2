'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { CalendarClock, Plus, CheckCircle2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Machine, PmSchedule, Profile, PmScheduleInsert } from '@/types/database'
import { PM_INTERVALS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type PmScheduleWithRelations = PmSchedule & {
  machine: { id: number; name: string } | null
  assignee: { id: string; name: string } | null
}

// ─── Create PM Schedule Dialog ─────────────────────────────────────────────────

function CreatePmDialog({
  open,
  onClose,
  onCreated,
  machines,
  profiles,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  machines: Machine[]
  profiles: Profile[]
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    machine_id: '',
    task_name: '',
    interval_days: '30',
    last_done: '',
    assigned_to: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setForm({ machine_id: '', task_name: '', interval_days: '30', last_done: '', assigned_to: '', notes: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const lastDone = form.last_done || null
      const nextDue = lastDone
        ? new Date(new Date(lastDone).getTime() + Number(form.interval_days) * 86400000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const insert: PmScheduleInsert = {
        machine_id: Number(form.machine_id),
        task_name: form.task_name,
        interval_days: Number(form.interval_days),
        last_done: lastDone,
        next_due: nextDue,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('pm_schedules').insert(insert)
      if (error) throw error

      toast({ title: 'PM schedule created', description: form.task_name })
      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Create PM Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine *</Label>
            <Select value={form.machine_id} onValueChange={(v) => setForm(p => ({ ...p, machine_id: v }))} required>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Task Name *</Label>
            <Input
              value={form.task_name}
              onChange={(e) => setForm(p => ({ ...p, task_name: e.target.value }))}
              required
              placeholder="Oil change, belt inspection..."
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interval *</Label>
            <Select value={form.interval_days} onValueChange={(v) => setForm(p => ({ ...p, interval_days: v }))} required>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PM_INTERVALS.map((i) => (
                  <SelectItem key={i.days} value={String(i.days)}>{i.label} ({i.days} days)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Last Done (optional)</Label>
            <Input
              type="date"
              value={form.last_done}
              onChange={(e) => setForm(p => ({ ...p, last_done: e.target.value }))}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assign To</Label>
            <Select value={form.assigned_to} onValueChange={(v) => setForm(p => ({ ...p, assigned_to: v }))}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional instructions..."
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Mark Done Dialog ──────────────────────────────────────────────────────────

function MarkDoneDialog({
  pm,
  onClose,
  onUpdated,
}: {
  pm: PmScheduleWithRelations | null
  onClose: () => void
  onUpdated: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [doneDate, setDoneDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!pm) return
    setLoading(true)

    const nextDue = new Date(
      new Date(doneDate).getTime() + pm.interval_days * 86400000
    ).toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('pm_schedules').update({
      last_done: doneDate,
      next_due: nextDue,
    }).eq('id', pm.id)

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Marked as done', description: `Next due: ${format(new Date(nextDue), 'MMM d, yyyy')}` })
      onUpdated()
      onClose()
    }
    setLoading(false)
  }

  if (!pm) return null

  return (
    <Dialog open={!!pm} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Mark as Done</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Marking <span className="text-foreground font-medium">{pm.task_name}</span> as completed.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Completion Date</Label>
            <Input
              type="date"
              value={doneDate}
              onChange={(e) => setDoneDate(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit}
            >
              {loading ? 'Saving...' : 'Confirm Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── PM Row ────────────────────────────────────────────────────────────────────

function PmRow({ pm, onMarkDone }: { pm: PmScheduleWithRelations; onMarkDone: () => void }) {
  const daysUntil = differenceInDays(new Date(pm.next_due), new Date())
  const isOverdue = daysUntil < 0
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7

  return (
    <div className={cn(
      'bg-card border rounded-lg p-4',
      isOverdue ? 'border-red-500/40' : isDueSoon ? 'border-amber-500/40' : 'border-border'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-body truncate">{pm.task_name}</p>
            {isOverdue && (
              <span className="text-[10px] font-mono-display bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-sm shrink-0">OVERDUE</span>
            )}
            {isDueSoon && !isOverdue && (
              <span className="text-[10px] font-mono-display bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-sm shrink-0">DUE SOON</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pm.machine?.name ?? 'Unknown'} · Every {pm.interval_days} days
          </p>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Due</p>
              <p className={cn('text-xs font-mono-display', isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-foreground')}>
                {format(new Date(pm.next_due), 'MMM d, yyyy')}
                {isOverdue ? ` (${Math.abs(daysUntil)}d overdue)` : ` (${daysUntil}d)`}
              </p>
            </div>
            {pm.last_done && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Done</p>
                <p className="text-xs font-mono-display">{format(new Date(pm.last_done), 'MMM d, yyyy')}</p>
              </div>
            )}
            {pm.assignee && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned</p>
                <p className="text-xs">{pm.assignee.name}</p>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onMarkDone}
          className="shrink-0 h-8 text-xs"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Done
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PmSchedulePage() {
  const supabase = useSupabase()
  const { isAdmin } = useAuth()
  const [pmSchedules, setPmSchedules] = useState<PmScheduleWithRelations[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [markDonePm, setMarkDonePm] = useState<PmScheduleWithRelations | null>(null)

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [pmRes, machinesRes, profilesRes] = await Promise.all([
      sb
        .from('pm_schedules')
        .select('*, machine:machines(id,name), assignee:profiles(id,name)')
        .order('next_due'),
      supabase.from('machines').select('id, name').order('name'),
      supabase.from('profiles').select('id, name, email, role, avatar_url, created_at').order('name'),
    ])
    setPmSchedules((pmRes.data ?? []) as PmScheduleWithRelations[])
    setMachines(machinesRes.data ?? [])
    setProfiles(profilesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const overdue = pmSchedules.filter(pm => new Date(pm.next_due) < new Date())
  const upcoming = pmSchedules.filter(pm => new Date(pm.next_due) >= new Date())

  return (
    <div>
      <PageHeader
        title="PM Schedule"
        subtitle={`${overdue.length} overdue · ${upcoming.length} upcoming`}
        action={{
          label: 'Add Schedule',
          onClick: () => setCreateOpen(true),
          show: isAdmin,
          icon: Plus,
        }}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : pmSchedules.length === 0 ? (
        <EmptyState
          title="No PM schedules"
          description="Create preventive maintenance schedules for your machines"
          icon={CalendarClock}
          className="mt-12"
        />
      ) : (
        <div className="space-y-3">
          {pmSchedules.map((pm) => (
            <PmRow key={pm.id} pm={pm} onMarkDone={() => setMarkDonePm(pm)} />
          ))}
        </div>
      )}

      <CreatePmDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchData}
        machines={machines}
        profiles={profiles}
      />
      <MarkDoneDialog
        pm={markDonePm}
        onClose={() => setMarkDonePm(null)}
        onUpdated={fetchData}
      />
    </div>
  )
}
