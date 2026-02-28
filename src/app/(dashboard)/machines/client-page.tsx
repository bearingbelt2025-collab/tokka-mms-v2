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

// ─── Add Machine Dialog ────────────────────────────────────────────────────────

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

// ─── Machine Detail Dialog ──────────────────────────────────────────────────────

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
              <p className="text-xs font-semibold font-mono-display mb-2 text-muted-foreground uppercase tracking-wide">Change Status</p>
              <div className="flex flex-wrap gap-2">
                {MACHINE_STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={machine.status === s.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(s.value as MachineStatus)}
                    disabled={updatingStatus || machine.status === s.value}
                    className="text-xs h-7"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Tabs */}
          {loadingDetail ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading details...</p>
          ) : detail ? (
            <Tabs defaultValue="work-orders">
              <TabsList className="bg-secondary">
                <TabsTrigger value="work-orders" className="text-xs">Work Orders ({detail.workOrders.length})</TabsTrigger>
                <TabsTrigger value="pm" className="text-xs">PM Schedule ({detail.pmSchedules.length})</TabsTrigger>
                <TabsTrigger value="downtime" className="text-xs">Downtime ({detail.downtimeLogs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="work-orders" className="mt-3">
                {detail.workOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No work orders</p>
                ) : (
                  <div className="space-y-2">
                    {detail.workOrders.map((wo) => (
                      <div key={wo.id} className="bg-background rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{wo.title}</p>
                          <WoStatusBadge status={wo.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <PriorityBadge priority={wo.priority} size="sm" />
                          {wo.assignee && <p className="text-xs text-muted-foreground">Assigned: {wo.assignee.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pm" className="mt-3">
                {detail.pmSchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No PM schedules</p>
                ) : (
                  <div className="space-y-2">
                    {detail.pmSchedules.map((pm) => (
                      <div key={pm.id} className="bg-background rounded-md border border-border p-3">
                        <p className="text-sm font-medium">{pm.task_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Next due: {pm.next_due ? format(new Date(pm.next_due), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="downtime" className="mt-3">
                {detail.downtimeLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No downtime records</p>
                ) : (
                  <div className="space-y-2">
                    {detail.downtimeLogs.map((dt) => (
                      <div key={dt.id} className="bg-background rounded-md border border-border p-3">
                        <p className="text-sm font-medium">{dt.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(dt.started_at), 'MMM d, yyyy HH:mm')}
                          {dt.duration_minutes && ` • ${dt.duration_minutes} min`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MachinesClientPage() {
  const { data: machines, loading, refetch } = useSupabase<Machine>(
    (sb) => (sb as any).from('machines').select('*').order('name')
  )
  const [search, setSearch] = useState('')
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const { isAdmin } = useAuth()

  const filtered = (machines ?? []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.machine_type.toLowerCase().includes(search.toLowerCase()) ||
      m.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Machines"
        description={`${filtered.length} machine${filtered.length !== 1 ? 's' : ''} registered`}
        action={
          isAdmin ? (
            <Button size="sm" onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Machine
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-background"
        />
      </div>

      {loading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Cog}
          title="No machines found"
          description={search ? 'Try a different search term' : 'Add your first machine to get started'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onClick={() => setSelectedMachine(machine)}
            />
          ))}
        </div>
      )}

      <AddMachineDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={refetch}
      />

      <MachineDetailDialog
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
