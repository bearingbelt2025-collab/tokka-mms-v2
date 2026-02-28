'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Clock, Plus, Square, AlertTriangle } from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Machine, DowntimeLog, DowntimeLogInsert } from '@/types/database'

type DowntimeLogWithDetails = DowntimeLog & {
  machine: { id: number; name: string } | null
  logged_by_profile: { name: string } | null
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Live Duration Counter ─────────────────────────────────────────────────────

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [minutes, setMinutes] = useState(differenceInMinutes(new Date(), new Date(startedAt)))

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutes(differenceInMinutes(new Date(), new Date(startedAt)))
    }, 60000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <span className="font-mono-display font-bold text-red-400">
      {formatDuration(minutes)}
    </span>
  )
}

// ─── Log Downtime Dialog ───────────────────────────────────────────────────────

function LogDowntimeDialog({
  open,
  onClose,
  onLogged,
  availableMachines,
}: {
  open: boolean
  onClose: () => void
  onLogged: () => void
  availableMachines: Machine[] // machines not currently in active downtime
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const [machineId, setMachineId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => { setMachineId(''); setReason('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    try {
      // Get profile id
      const { data: profileRaw } = await sb
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      const profileData = profileRaw as { id: string } | null
      if (!profileData) throw new Error('Profile not found')

      const insert: DowntimeLogInsert = {
        machine_id: parseInt(machineId),
        reason: reason || null,
        logged_by: profileData.id,
        started_at: new Date().toISOString(),
      }

      const { error: logError } = await sb.from('downtime_logs').insert(insert)
      if (logError) throw logError

      // Update machine status to breakdown
      const { error: machineError } = await sb
        .from('machines')
        .update({ status: 'breakdown' })
        .eq('id', parseInt(machineId))
      if (machineError) console.warn('Could not update machine status:', machineError.message)

      toast({ title: 'Downtime logged', description: 'Machine status set to Breakdown.' })
      resetForm()
      onLogged()
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
          <DialogTitle className="font-mono-display">Log Downtime</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId} required>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select machine..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {availableMachines.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">All machines already in downtime</div>
                ) : (
                  availableMachines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} — {m.location}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Motor failure, belt snap..."
              className="bg-background"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button
              type="submit"
              disabled={loading || !machineId}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {loading ? 'Logging...' : 'Log Downtime'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DowntimePage() {
  const supabase = useSupabase()
  const { toast } = useToast()
  const [allLogs, setAllLogs] = useState<DowntimeLogWithDetails[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [logOpen, setLogOpen] = useState(false)
  const [ending, setEnding] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [logsRes, machinesRes] = await Promise.all([
      sb
        .from('downtime_logs')
        .select('*, machine:machines(id, name), logged_by_profile:profiles!downtime_logs_logged_by_fkey(name)')
        .order('started_at', { ascending: false })
        .limit(100),
      supabase.from('machines').select('*').order('name'),
    ])
    setAllLogs((logsRes.data ?? []) as DowntimeLogWithDetails[])
    setMachines(machinesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('downtime-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downtime_logs' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const activeLogs = allLogs.filter((l) => l.ended_at === null)
  const historyLogs = allLogs.filter((l) => l.ended_at !== null)

  // Machines not currently in active downtime
  const activeMachineIds = new Set(activeLogs.map((l) => l.machine_id))
  const availableMachines = machines.filter((m) => !activeMachineIds.has(m.id))

  const handleEndDowntime = async (log: DowntimeLogWithDetails) => {
    setEnding(log.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const endedAt = new Date()
      const durationMinutes = differenceInMinutes(endedAt, new Date(log.started_at))

      const { error: logError } = await sb
        .from('downtime_logs')
        .update({ ended_at: endedAt.toISOString(), duration_minutes: durationMinutes })
        .eq('id', log.id)
      if (logError) throw logError

      // Check if machine has other active downtimes
      const { data: otherActive } = await sb
        .from('downtime_logs')
        .select('id')
        .eq('machine_id', log.machine_id)
        .is('ended_at', null)
        .neq('id', log.id)

      if (!otherActive?.length) {
        await sb.from('machines').update({ status: 'running' }).eq('id', log.machine_id)
      }

      toast({
        title: 'Downtime ended',
        description: `Duration: ${formatDuration(durationMinutes)}. Machine set to Running.`,
      })
      fetchData()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setEnding(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Downtime Tracking"
        subtitle={`${activeLogs.length} active`}
        action={{ label: 'Log Downtime', onClick: () => setLogOpen(true), icon: Plus }}
      />

      {/* Active Downtimes */}
      {activeLogs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
            <h2 className="text-sm font-semibold font-mono-display text-red-400">
              Active Downtime ({activeLogs.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeLogs.map((log) => (
              <div
                key={log.id}
                className="bg-card border border-red-500/40 border-l-4 border-l-red-500 rounded-md p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold font-mono-display">{log.machine?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.reason ?? 'No reason given'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <LiveDuration startedAt={log.started_at} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Since {format(new Date(log.started_at), 'HH:mm, MMM d')}
                  </p>
                  <Button
                    size="sm"
                    disabled={ending === log.id}
                    onClick={() => handleEndDowntime(log)}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    {ending === log.id ? 'Ending...' : 'End Downtime'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downtime History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold font-mono-display">
            History ({historyLogs.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-md p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : historyLogs.length === 0 ? (
          <EmptyState
            title="No downtime history"
            description="Completed downtime events will appear here"
            icon={Clock}
            className="py-8"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-card border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Machine</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Start</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">End</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-mono-display font-semibold text-sm">{log.machine?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{log.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.started_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.ended_at ? format(new Date(log.ended_at), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.duration_minutes !== null ? (
                          <span className="font-mono-display text-xs bg-secondary px-1.5 py-0.5 rounded-sm">
                            {formatDuration(log.duration_minutes)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.logged_by_profile?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {historyLogs.map((log) => (
                <div key={log.id} className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold font-mono-display">{log.machine?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{log.reason ?? 'No reason'}</p>
                    </div>
                    {log.duration_minutes !== null && (
                      <span className="font-mono-display text-xs bg-secondary px-1.5 py-0.5 rounded-sm shrink-0">
                        {formatDuration(log.duration_minutes)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{format(new Date(log.started_at), 'MMM d, HH:mm')}</span>
                    <span>{log.logged_by_profile?.name ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <LogDowntimeDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={fetchData}
        availableMachines={availableMachines}
      />
    </div>
  )
}
