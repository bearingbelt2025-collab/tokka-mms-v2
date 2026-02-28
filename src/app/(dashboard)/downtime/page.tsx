'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Clock, AlertCircle } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
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
import type { Machine, DowntimeLog } from '@/types/database'

type DowntimeLogWithMachine = DowntimeLog & {
  machine: { name: string } | null
  reporter: { name: string } | null
}

export default function DowntimePage() {
  const [logs, setLogs] = useState<DowntimeLogWithMachine[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = useSupabase()
  const { toast } = useToast()

  const [form, setForm] = useState({
    machine_id: '',
    start_time: '',
    end_time: '',
    cause: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [logsRes, machinesRes] = await Promise.all([
      sb
        .from('downtime_logs')
        .select('*, machine:machines(name), reporter:users!downtime_logs_reported_by_fkey(name)')
        .order('start_time', { ascending: false }),
      sb.from('machines').select('id, name').order('name'),
    ])
    if (logsRes.error) throw logsRes.error
    if (machinesRes.error) throw machinesRes.error
    setLogs(logsRes.data || [])
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

      const { data: userData } = await sb.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) throw new Error('Not authenticated')

      const { data: userRow } = await sb
        .from('users')
        .select('id')
        .eq('auth_id', userId)
        .single()

      const startTime = new Date(form.start_time)
      const endTime = form.end_time ? new Date(form.end_time) : null
      const durationMinutes = endTime
        ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
        : null

      const { error } = await sb.from('downtime_logs').insert({
        machine_id: parseInt(form.machine_id),
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() || null,
        duration_minutes: durationMinutes,
        cause: form.cause || null,
        notes: form.notes || null,
        reported_by: userRow?.id || null,
      })

      if (error) throw error

      toast({ title: 'Downtime logged successfully' })
      setOpen(false)
      setForm({ machine_id: '', start_time: '', end_time: '', cause: '', notes: '' })
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log downtime'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const totalDowntimeMinutes = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
  const totalDowntimeHours = Math.round(totalDowntimeMinutes / 60)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Downtime Logs</h1>
          <p className="text-muted-foreground">Track and analyze machine downtime</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Downtime
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Downtime Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine">Machine *</Label>
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
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cause">Cause</Label>
                <Input
                  id="cause"
                  value={form.cause}
                  onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
                  placeholder="e.g., Mechanical failure, Power outage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Log Downtime'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      {!loading && logs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Total Downtime
            </div>
            <p className="text-2xl font-bold">{totalDowntimeHours}h</p>
            <p className="text-xs text-muted-foreground">{totalDowntimeMinutes} minutes total</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertCircle className="h-4 w-4" />
              Total Events
            </div>
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Downtime incidents logged</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Avg Duration
            </div>
            <p className="text-2xl font-bold">
              {logs.length > 0 ? Math.round(totalDowntimeMinutes / logs.length) : 0}m
            </p>
            <p className="text-xs text-muted-foreground">Per incident</p>
          </div>
        </div>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No downtime logs"
          description="Log your first downtime event to start tracking"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Downtime
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.machine?.name || 'Unknown Machine'}</span>
                    {!log.end_time && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        Ongoing
                      </span>
                    )}
                  </div>
                  {log.cause && (
                    <p className="text-sm text-muted-foreground">Cause: {log.cause}</p>
                  )}
                  {log.notes && (
                    <p className="text-sm text-muted-foreground">{log.notes}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Started: {format(new Date(log.start_time), 'MMM d, yyyy HH:mm')}</span>
                    {log.end_time && (
                      <span>Ended: {format(new Date(log.end_time), 'MMM d, yyyy HH:mm')}</span>
                    )}
                    {log.reporter && <span>By: {log.reporter.name}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {log.duration_minutes != null ? (
                    <>
                      <p className="font-semibold">{log.duration_minutes}m</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(log.duration_minutes / 60 * 10) / 10}h
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.start_time), { addSuffix: false })} ago
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
