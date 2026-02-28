'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/page-header'
import { MachineCard } from '@/components/machine-card'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import { CardSkeleton } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Machine, MachineInsert } from '@/types/database'

type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown'
const MACHINE_STATUSES: MachineStatus[] = ['running', 'idle', 'maintenance', 'breakdown']

// ─── Add / Edit Machine Dialog ─────────────────────────────────────────────────

function MachineDialog({
  open,
  onClose,
  onSaved,
  machine,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  machine?: Machine
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const isEdit = !!machine

  const [name, setName] = useState(machine?.name ?? '')
  const [location, setLocation] = useState(machine?.location ?? '')
  const [model, setModel] = useState(machine?.model ?? '')
  const [serialNumber, setSerialNumber] = useState(machine?.serial_number ?? '')
  const [status, setStatus] = useState<MachineStatus>(machine?.status as MachineStatus ?? 'running')
  const [loading, setLoading] = useState(false)

  // Sync fields if machine changes (for edit)
  useEffect(() => {
    if (machine) {
      setName(machine.name)
      setLocation(machine.location ?? '')
      setModel(machine.model ?? '')
      setSerialNumber(machine.serial_number ?? '')
      setStatus(machine.status as MachineStatus ?? 'running')
    }
  }, [machine])

  const resetForm = () => {
    setName(''); setLocation(''); setModel(''); setSerialNumber(''); setStatus('running')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      if (isEdit && machine) {
        const { error } = await sb
          .from('machines')
          .update({ name, location: location || null, model: model || null, serial_number: serialNumber || null, status })
          .eq('id', machine.id)
        if (error) throw error
        toast({ title: 'Machine updated' })
      } else {
        const insert: MachineInsert = {
          name,
          location: location || null,
          model: model || null,
          serial_number: serialNumber || null,
          status,
        }
        const { error } = await sb.from('machines').insert(insert)
        if (error) throw error
        toast({ title: 'Machine added' })
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
          <DialogTitle className="font-mono-display">{isEdit ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Conveyor Belt A" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Line 1, Bay 3" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Siemens S7-1200" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Serial Number</Label>
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g. SN-001" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MachineStatus)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {MACHINE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <StatusBadge status={s} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Machine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteMachineDialog({
  machine,
  onClose,
  onDeleted,
}: {
  machine: Machine | null
  onClose: () => void
  onDeleted: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!machine) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const { error } = await sb.from('machines').delete().eq('id', machine.id)
      if (error) throw error
      toast({ title: 'Machine deleted' })
      onDeleted()
      onClose()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!machine} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Delete Machine</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Deleting <span className="font-semibold text-foreground">{machine?.name}</span> will also remove all associated work orders and downtime logs. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              disabled={loading}
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MachinesPage() {
  const supabase = useSupabase()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editMachine, setEditMachine] = useState<Machine | null>(null)
  const [deleteMachine, setDeleteMachine] = useState<Machine | null>(null)

  const fetchMachines = useCallback(async () => {
    const { data } = await supabase.from('machines').select('*').order('name')
    setMachines(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMachines()

    const channel = supabase
      .channel('machines-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, fetchMachines)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchMachines, supabase])

  const statusGroups: Record<MachineStatus, Machine[]> = {
    breakdown: machines.filter((m) => m.status === 'breakdown'),
    maintenance: machines.filter((m) => m.status === 'maintenance'),
    idle: machines.filter((m) => m.status === 'idle'),
    running: machines.filter((m) => m.status === 'running'),
  }

  return (
    <div>
      <PageHeader
        title="Machine Registry"
        subtitle={`${machines.length} machines`}
        action={{ label: 'Add Machine', onClick: () => setAddOpen(true), icon: Plus }}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} lines={4} />)}
        </div>
      ) : machines.length === 0 ? (
        <EmptyState
          title="No machines registered"
          description="Add your first machine to get started"
          icon={Plus}
          action={{ label: 'Add Machine', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-6">
          {(Object.entries(statusGroups) as [MachineStatus, Machine[]][]).map(([status, group]) =>
            group.length > 0 ? (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs text-muted-foreground">({group.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.map((machine) => (
                    <div key={machine.id} className="relative group">
                      <MachineCard machine={machine} />
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                        <button
                          onClick={() => setEditMachine(machine)}
                          className="p-1 rounded bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeleteMachine(machine)}
                          className="p-1 rounded bg-secondary/80 hover:bg-red-600 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <MachineDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchMachines} />
      <MachineDialog
        open={!!editMachine}
        onClose={() => setEditMachine(null)}
        onSaved={fetchMachines}
        machine={editMachine ?? undefined}
      />
      <DeleteMachineDialog
        machine={deleteMachine}
        onClose={() => setDeleteMachine(null)}
        onDeleted={fetchMachines}
      />
    </div>
  )
}
