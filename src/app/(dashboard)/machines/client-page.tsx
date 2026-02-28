'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Cog, Plus, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { MachineCard } from '@/components/machine-card'
import { StatusBadge } from '@/components/status-badge'
import { PriorityBadge } from '@/components/priority-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { LoadingGrid } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { Machine, WorkOrder, DowntimeLog, PmSchedule, MachineStatus, MachineInsert } from '@/types/database'
import { MACHINE_STATUSES } from '@/lib/constants'

type WorkOrderWithProfiles = WorkOrder & {
  creator: { name: string } | null
  assignee: { name: string } | null
}

type PmScheduleRow = PmSchedule

type DowntimeLogWithProfile = DowntimeLog & {
  logged_by_profile: { name: string } | null
}

interface MachineDetailData {
  workOrders: WorkOrderWithProfiles[]
  pmSchedules: PmScheduleRow[]
  downtimeLogs: DowntimeLogWithProfile[]
}

// ─── Add Machine Dialog ───────────────────────────────────────────────────────

function AddMachineDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    machine_type: '',
    location: '',
    capacity: '',
    power: '',
    brand: '',
    year: '',
    installed_date: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setForm({ name: '', machine_type: '', location: '', capacity: '', power: '', brand: '', year: '', installed_date: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let photo_url: string | null = null

      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const filename = `machines/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(filename, photoFile)
        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage.from('photos').getPublicUrl(filename)
        photo_url = publicData.publicUrl
      }

      const specs: Record<string, string> = {}
      if (form.capacity) specs.capacity = form.capacity
      if (form.power) specs.power = form.power
      if (form.brand) specs.brand = form.brand
      if (form.year) specs.year = form.year

      const insert: MachineInsert = {
        name: form.name,
        machine_type: form.machine_type,
        location: form.location,
        specs,
        photo_url,
        installed_date: form.installed_date || null,
        status: 'running',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('machines').insert(insert)
      if (error) throw error

      toast({ title: 'Machine added', description: `${form.name} has been registered.` })
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
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Add Machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Photo */}
          <div className="flex items-center gap-3">
            <div
              className="h-20 w-20 rounded-md border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Machine photo (optional)</p>
              <Button type="button" variant="outline" size="sm" className="mt-1 text-xs h-7" onClick={() => fileRef.current?.click()}>
                Choose Photo
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="CNC Machine #3" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type *</Label>
              <Input value={form.machine_type} onChange={(e) => setForm(p => ({ ...p, machine_type: e.target.value }))} required placeholder="CNC Lathe" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location *</Label>
              <Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} required placeholder="Line A" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Capacity</Label>
              <Input value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="500 kg/hr" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Power</Label>
              <Input value={form.power} onChange={(e) => setForm(p => ({ ...p, power: e.target.value }))} placeholder="15 kW" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Mazak" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label>
              <Input value={form.year} onChange={(e) => setForm(p => ({ ...p, year: e.target.value }))} placeholder="2019" className="bg-background" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Installed Date</Label>
              <Input type="date" value={form.installed_date} onChange={(e) => setForm(p => ({ ...p, installed_date: e.target.value }))} className="bg-background" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Adding...' : 'Add Machine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Machine Detail Dialog ─────────────────────────────────────────────────────

function MachineDetailDialog({
  machine,
  onClose,
  onUpdated,
}: {
  machine: Machine | null
  onClose: () => void
  onUpdated: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [detail, setDetail] = useState<MachineDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!machine) return
    setLoadingDetail(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    Promise.all([
      sb
        .from('work_orders')
        .select('*, creator:profiles!work_orders_created_by_fkey(name), assignee:profiles!work_orders_assigned_to_fkey(name)')
        .eq('machine_id', machine.id)
        .order('created_at', { ascending: false })
        .limit(20),
      sb
        .from('pm_schedules')
        .select('*')
        .eq('machine_id', machine.id)
        .order('next_due'),
      sb
        .from('downtime_logs')
        .select('*, logged_by_profile:profiles!downtime_logs_logged_by_fkey(name)')
        .eq('machine_id', machine.id)
        .order('started_at', { ascending: false })
        .limit(20),
    ]).then(([woRes, pmRes, dtRes]) => {
      setDetail({
        workOrders: (woRes.data ?? []) as WorkOrderWithProfiles[],
        pmSchedules: (pmRes.data ?? []) as PmScheduleRow[],
        downtimeLogs: (dtRes.data ?? []) as DowntimeLogWithProfile[],
      })
      setLoadingDetail(false)
    })
  }, [machine, supabase])

  const handleStatusChange = async (status: MachineStatus) => {
    if (!machine) return
    setUpdatingStatus(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('machines').update({ status }).eq('id', machine.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Status updated', description: `Machine status set to ${status.replace('_', ' ')}` })
      onUpdated()
      onClose()
    }
    setUpdatingStatus(false)
  }

  if (!machine) return null

  const specs = machine.specs as Record<string, string> | null

  return (
    <Dialog open={!!machine} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">{machine.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top info */}
          <div className="flex gap-4">
            {machine.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={machine.photo_url} alt={machine.name} className="h-24 w-24 rounded-md object-cover border border-border shrink-0" />
            ) : (
              <div className="h-24 w-24 rounded-md bg-muted flex items-center justify-center border border-border shrink-0">
                <Cog className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Type:</span> {machine.machine_type}</p>
              <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Location:</span> {machine.location}</p>
              {machine.installed_date && (
                <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Installed:</span> {format(new Date(machine.installed_date), 'MMM d, yyyy')}</p>
              )}
              <StatusBadge status={machine.status} size="sm" />
            </div>
          </div>

          {/* Specs */}
          {specs && Object.keys(specs).length > 0 && (
            <div className="bg-background rounded-md border border-border p-3">
              <p className="text-xs font-semibold font-mono-display mb-2 text-muted-foreground uppercase tracking-wide">Specifications</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground capitalize">{k}</p>
                    <p className="text-sm font-medium">{v as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin: Change Status */}
          {isAdmin && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Change Status</Label>
              <div className="flex gap-2">
                {MACHINE_STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={machine.status === s ? 'default' : 'outline'}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(s)}
                    className={
                      machine.status === s
                        ? s === 'running' ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : s === 'maintenance_due' ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                        : ''
                    }
                  >
                    {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="work-orders">
            <TabsList className="bg-secondary">
              <TabsTrigger value="work-orders" className="text-xs">Work Orders ({detail?.workOrders.length ?? 0})</TabsTrigger>
              <TabsTrigger value="downtime" className="text-xs">Downtime ({detail?.downtimeLogs.length ?? 0})</TabsTrigger>
              <TabsTrigger value="pm" className="text-xs">PM Schedule ({detail?.pmSchedules.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="work-orders" className="mt-3">
              {loadingDetail ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : detail?.workOrders.length === 0 ? (
                <EmptyState title="No work orders" icon={Cog} className="py-6" />
              ) : (
                <div className="space-y-2">
                  {detail?.workOrders.map((wo) => (
                    <div key={wo.id} className="bg-background border border-border rounded-md p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{wo.issue_type}</p>
                          {wo.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{wo.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <PriorityBadge priority={wo.priority} />
                          <WoStatusBadge status={wo.status} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(wo.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="downtime" className="mt-3">
              {loadingDetail ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : detail?.downtimeLogs.length === 0 ? (
                <EmptyState title="No downtime recorded" icon={Cog} className="py-6" />
              ) : (
                <div className="space-y-2">
                  {detail?.downtimeLogs.map((dl) => (
                    <div key={dl.id} className="bg-background border border-border rounded-md p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{dl.reason ?? 'No reason given'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(dl.started_at), 'MMM d, yyyy HH:mm')}</p>
                        </div>
                        {dl.duration_minutes && (
                          <span className="text-xs font-mono-display bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-sm shrink-0">
                            {Math.floor(dl.duration_minutes / 60)}h {dl.duration_minutes % 60}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pm" className="mt-3">
              {loadingDetail ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : detail?.pmSchedules.length === 0 ? (
                <EmptyState title="No PM schedules" icon={Cog} className="py-6" />
              ) : (
                <div className="space-y-2">
                  {detail?.pmSchedules.map((pm) => {
                    const isOverdue = new Date(pm.next_due) < new Date()
                    return (
                      <div key={pm.id} className={`bg-background border rounded-md p-3 ${isOverdue ? 'border-red-500/40' : 'border-border'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{pm.task_name}</p>
                            <p className="text-xs text-muted-foreground">Every {pm.interval_days} days</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-mono-display ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isOverdue ? 'OVERDUE' : 'On Schedule'}
                            </p>
                            <p className="text-xs text-muted-foreground">Due: {format(new Date(pm.next_due), 'MMM d')}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MachinesPage() {
  const supabase = useSupabase()
  const { isAdmin } = useAuth()
  const [machines, setMachines] = useState<Machine[]>([])
  const [openWoCount, setOpenWoCount] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)

  const fetchMachines = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [machinesRes, woRes] = await Promise.all([
      supabase.from('machines').select('*').order('name'),
      sb.from('work_orders').select('machine_id').neq('status', 'completed'),
    ])
    setMachines(machinesRes.data ?? [])

    const counts: Record<number, number> = {}
    for (const wo of (woRes.data ?? []) as { machine_id: number }[]) {
      counts[wo.machine_id] = (counts[wo.machine_id] ?? 0) + 1
    }
    setOpenWoCount(counts)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMachines()
  }, [fetchMachines])

  return (
    <div>
      <PageHeader
        title="Machine Registry"
        subtitle={`${machines.length} machines registered`}
        action={{
          label: 'Add Machine',
          onClick: () => setAddOpen(true),
          show: isAdmin,
          icon: Plus,
        }}
      />

      {loading ? (
        <LoadingGrid count={6} />
      ) : machines.length === 0 ? (
        <EmptyState
          title="No machines registered"
          description="Add your first machine to get started"
          icon={Cog}
          className="mt-12"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              openWoCount={openWoCount[machine.id] ?? 0}
              onClick={() => setSelectedMachine(machine)}
            />
          ))}
        </div>
      )}

      <AddMachineDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchMachines} />
      <MachineDetailDialog
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        onUpdated={fetchMachines}
      />
    </div>
  )
}
