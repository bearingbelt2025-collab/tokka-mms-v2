'use client'
import { useState } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { format, isPast, isToday, addDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { LoadingTable } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PmSchedule, Machine, PmScheduleInsert } from '@/types/database'

type PmWithMachine = PmSchedule & {
  machine: { name: string; location: string } | null
}

function getScheduleStatus(nextDue: string | null) {
  if (!nextDue) return { label: 'No date', variant: 'secondary' as const, icon: Clock }
  const date = new Date(nextDue)
  if (isPast(date) && !isToday(date)) return { label: 'Overdue', variant: 'destructive' as const, icon: AlertTriangle }
  if (isToday(date) || date <= addDays(new Date(), 7)) return { label: 'Due soon', variant: 'outline' as const, icon: Clock }
  return { label: 'On track', variant: 'secondary' as const, icon: CheckCircle2 }
}

// ─── Add PM Dialog ────────────────────────────────────────────────────────────
function AddPmDialog({
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
  const [form, setForm] = useState({
    task_name: '',
    machine_id: '',
    frequency_days: '30',
    next_due: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const insert: PmScheduleInsert = {
      task_name: form.task_name,
      machine_id: form.machine_id || null,
      frequency_days: parseInt(form.frequency_days),
      next_due: form.next_due || null,
      notes: form.notes || null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('pm_schedules').insert(insert)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'PM task added' })
      onAdded()
      onClose()
      setForm({ task_name: '', machine_id: '', frequency_days: '30', next_due: '', notes: '' })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Add PM Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Task Name *</Label>
            <Input value={form.task_name} onChange={(e) => setForm(p => ({ ...p, task_name: e.target.value }))} required placeholder="Oil change" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine</Label>
            <Select value={form.machine_id} onValueChange={(v) => setForm(p => ({ ...p, machine_id: v }))}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select machine..." /></SelectTrigger>
              <SelectContent>
                {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Frequency (days)</Label>
              <Input type="number" min="1" value={form.frequency_days} onChange={(e) => setForm(p => ({ ...p, frequency_days: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Next Due</Label>
              <Input type="date" value={form.next_due} onChange={(e) => setForm(p => ({ ...p, next_due: e.target.value }))} className="bg-background" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground">
              {loading ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Mark Complete Dialog ─────────────────────────────────────────────────────
function MarkCompleteDialog({
  pm,
  onClose,
  onCompleted,
}: {
  pm: PmWithMachine | null
  onClose: () => void
  onCompleted: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    if (!pm) return
    setLoading(true)
    const nextDue = pm.frequency_days
      ? format(addDays(new Date(), pm.frequency_days), 'yyyy-MM-dd')
      : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pm_schedules')
      .update({ last_completed: new Date().toISOString(), next_due: nextDue })
      .eq('id', pm.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Task completed', description: nextDue ? `Next due: ${nextDue}` : undefined })
      onCompleted()
      onClose()
    }
    setLoading(false)
  }

  if (!pm) return null

  return (
    <Dialog open={!!pm} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Mark as Complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mark <span className="text-foreground font-medium">{pm.task_name}</span> as completed?
            {pm.frequency_days && (
              <> The next due date will be set to <span className="text-foreground font-medium">{format(addDays(new Date(), pm.frequency_days), 'MMM d, yyyy')}</span>.</>)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button disabled={loading} onClick={handleComplete} className="flex-1 bg-primary text-primary-foreground">
              {loading ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PmScheduleClientPage() {
  const { data: pmSchedules, loading, refetch } = useSupabase<PmWithMachine>(
    (sb) =>
      (sb as any)
        .from('pm_schedules')
        .select('*, machine:machines(name,location)')
        .order('next_due', { nullsFirst: false })
  )
  const { data: machines } = useSupabase<Machine>(
    (sb) => (sb as any).from('machines').select('id,name').order('name')
  )
  const [showAdd, setShowAdd] = useState(false)
  const [selectedPm, setSelectedPm] = useState<PmWithMachine | null>(null)
  const { isAdmin } = useAuth()

  const overdue = (pmSchedules ?? []).filter((pm) => {
    if (!pm.next_due) return false
    const d = new Date(pm.next_due)
    return isPast(d) && !isToday(d)
  })

  return (
    <div>
      <PageHeader
        title="PM Schedule"
        description={`${(pmSchedules ?? []).length} tasks${overdue.length > 0 ? ` • ${overdue.length} overdue` : ''}`}
        action={
          isAdmin ? (
            <Button size="sm" onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Task
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingTable />
      ) : (pmSchedules ?? []).length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No PM tasks"
          description="Add your first preventive maintenance task"
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Task</TableHead>
                <TableHead className="text-xs text-muted-foreground">Machine</TableHead>
                <TableHead className="text-xs text-muted-foreground">Frequency</TableHead>
                <TableHead className="text-xs text-muted-foreground">Next Due</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground">Last Done</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pmSchedules ?? []).map((pm) => {
                const s = getScheduleStatus(pm.next_due)
                return (
                  <TableRow key={pm.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-sm">{pm.task_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pm.machine?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pm.frequency_days ? `${pm.frequency_days}d` : '—'}</TableCell>
                    <TableCell className="text-sm">
                      {pm.next_due ? format(new Date(pm.next_due), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant} className="text-xs gap-1">
                        <s.icon className="h-3 w-3" />
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pm.last_completed ? format(new Date(pm.last_completed), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSelectedPm(pm)}
                        >
                          Complete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddPmDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={refetch}
        machines={machines ?? []}
      />
      <MarkCompleteDialog
        pm={selectedPm}
        onClose={() => setSelectedPm(null)}
        onCompleted={refetch}
      />
    </div>
  )
}
