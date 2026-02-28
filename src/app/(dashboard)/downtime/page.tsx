'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
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
import { AlertTriangle, Plus, StopCircle } from 'lucide-react'
import { DOWNTIME_REASONS } from '@/lib/constants'
import type { DowntimeLog, Machine } from '@/types/database'
import { format, formatDuration, intervalToDuration } from 'date-fns'

export default function DowntimePage() {
  const [logs, setLogs] = useState<(DowntimeLog & { machines: Pick<Machine, 'name'> | null })[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    machine_id: '',
    reason: '',
    notes: '',
  })
  const [now, setNow] = useState(new Date())
  const supabase = createClient()
  const { toast } = useToast()

  // Live clock for active downtime duration
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const load = useCallback(async () => {
    const [logRes, machRes] = await Promise.all([
      supabase
        .from('downtime_logs')
        .select('*, machines(name)')
        .order('start_time', { ascending: false })
        .limit(50),
      supabase.from('machines').select('*').order('name'),
    ])
    if (logRes.data) setLogs(logRes.data as any)
    if (machRes.data) setMachines(machRes.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Update machine status to breakdown
    await supabase
      .from('machines')
      .update({ status: 'breakdown' })
      .eq('id', form.machine_id)

    const { error } = await supabase.from('downtime_logs').insert([{
      ...form,
      start_time: new Date().toISOString(),
    }])

    if (error) {
      toast({ title: 'Error logging downtime', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Downtime logged!' })
      setOpen(false)
      setForm({ machine_id: '', reason: '', notes: '' })
      load()
    }
    setSaving(false)
  }

  const endDowntime = async (log: DowntimeLog) => {
    const endTime = new Date().toISOString()
    const durationMinutes = Math.floor(
      (new Date().getTime() - new Date(log.start_time).getTime()) / 60000
    )

    await supabase
      .from('downtime_logs')
      .update({ end_time: endTime, duration_minutes: durationMinutes })
      .eq('id', log.id)

    await supabase
      .from('machines')
      .update({ status: 'running' })
      .eq('id', log.machine_id)

    toast({ title: 'Downtime ended!' })
    load()
  }

  const getDuration = (log: DowntimeLog) => {
    const end = log.end_time ? new Date(log.end_time) : now
    const duration = intervalToDuration({ start: new Date(log.start_time), end })
    return formatDuration(duration, { format: ['hours', 'minutes'] }) || '< 1 min'
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Downtime Tracking"
        description="Log and track machine downtime events"
        action={
          <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
            <Plus className="h-4 w-4 mr-1" /> Log Downtime
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="No downtime recorded"
          description="Log a downtime event when a machine goes down"
          action={
            <Button variant="destructive" onClick={() => setOpen(true)}>Log Downtime</Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.machines?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{log.reason}</p>
                      {log.notes && <p className="text-xs text-slate-500 truncate max-w-[150px]">{log.notes}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(log.start_time), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{getDuration(log)}</TableCell>
                  <TableCell>
                    {log.end_time ? (
                      <Badge variant="secondary">Resolved</Badge>
                    ) : (
                      <Badge variant="destructive" className="animate-pulse">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!log.end_time && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => endDowntime(log)}
                        className="gap-1"
                      >
                        <StopCircle className="h-3 w-3" /> End
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Downtime Event</DialogTitle>
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
              <Label>Reason *</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => setForm({ ...form, reason: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {DOWNTIME_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} variant="destructive">
                {saving ? 'Logging...' : 'Log Downtime'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
