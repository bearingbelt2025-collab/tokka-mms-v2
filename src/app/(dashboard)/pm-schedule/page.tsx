'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { PM_FREQUENCIES } from '@/lib/constants'
import type { PmSchedule, Machine } from '@/types/database'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export default function PmSchedulePage() {
  const [schedules, setSchedules] = useState<(PmSchedule & { machines: Pick<Machine, 'name'> | null })[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    machine_id: '',
    task_description: '',
    frequency_days: 30,
    next_due_date: '',
  })
  const supabase = createClient()
  const { toast } = useToast()

  const load = useCallback(async () => {
    const [schRes, machRes] = await Promise.all([
      supabase
        .from('pm_schedules')
        .select('*, machines(name)')
        .eq('is_active', true)
        .order('next_due_date'),
      supabase.from('machines').select('*').order('name'),
    ])
    if (schRes.data) setSchedules(schRes.data as any)
    if (machRes.data) setMachines(machRes.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('pm_schedules').insert([form])
    if (error) {
      toast({ title: 'Error saving PM schedule', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'PM schedule created!' })
      setOpen(false)
      setForm({ machine_id: '', task_description: '', frequency_days: 30, next_due_date: '' })
    }
    setSaving(false)
  }

  const markComplete = async (id: string, freqDays: number) => {
    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + freqDays)
    const { error } = await supabase
      .from('pm_schedules')
      .update({
        last_completed_date: new Date().toISOString(),
        next_due_date: nextDue.toISOString(),
      })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error updating PM', variant: 'destructive' })
    } else {
      toast({ title: 'PM marked complete!' })
      load()
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="PM Schedule"
        description="Preventive maintenance schedules"
        action={
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add PM Task
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title="No PM schedules"
          description="Create preventive maintenance tasks for your machines"
          action={<Button onClick={() => setOpen(true)}>Add PM Task</Button>}
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((pm) => {
                const overdue = isPast(new Date(pm.next_due_date))
                return (
                  <TableRow key={pm.id}>
                    <TableCell className="font-medium">{pm.machines?.name || 'Unknown'}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm truncate">{pm.task_description}</p>
                    </TableCell>
                    <TableCell className="text-sm">{pm.frequency_days} days</TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p>{format(new Date(pm.next_due_date), 'MMM d, yyyy')}</p>
                        <p className={`text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                          {formatDistanceToNow(new Date(pm.next_due_date), { addSuffix: true })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {overdue ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Overdue
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> On Track
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markComplete(pm.id, pm.frequency_days)}
                      >
                        Mark Done
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add PM Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Machine *</Label>
              <Select
                value={form.machine_id}
                onValueChange={(v) => setForm({ ...form, machine_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Description *</Label>
              <Textarea
                value={form.task_description}
                onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                placeholder="e.g. Lubricate bearings and check belt tension"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={String(form.frequency_days)}
                onValueChange={(v) => setForm({ ...form, frequency_days: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PM_FREQUENCIES.map((f) => (
                    <SelectItem key={f.days} value={String(f.days)}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>First Due Date *</Label>
              <Input
                type="date"
                value={form.next_due_date}
                onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Schedule'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
