'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Plus, Camera, User, ClipboardList, Search } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { PriorityBadge } from '@/components/priority-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Machine, WorkOrder, Profile, WorkOrderInsert, WorkOrderStatus, WorkOrderPriority } from '@/types/database'
import { ISSUE_TYPES, PRIORITIES, WORK_ORDER_STATUSES } from '@/lib/constants'
import { cn } from '@/lib/utils'

type WorkOrderWithRelations = WorkOrder & {
  machine: { id: number; name: string } | null
  creator: { id: string; name: string; avatar_url: string | null } | null
  assignee: { id: string; name: string; avatar_url: string | null } | null
}

const PRIORITY_STRIPE: Record<WorkOrderPriority, string> = {
  low: 'border-l-slate-500',
  medium: 'border-l-blue-500',
  high: 'border-l-amber-500',
  critical: 'border-l-red-500',
}

const PRIORITY_BUTTON: Record<WorkOrderPriority, { bg: string; activeBg: string; text: string; label: string }> = {
  low: { bg: 'bg-secondary hover:bg-slate-700', activeBg: 'bg-slate-600 border-2 border-slate-400', text: 'text-slate-300', label: 'LOW' },
  medium: { bg: 'bg-secondary hover:bg-blue-900/40', activeBg: 'bg-blue-700/60 border-2 border-blue-400', text: 'text-blue-300', label: 'MED' },
  high: { bg: 'bg-secondary hover:bg-amber-900/40', activeBg: 'bg-amber-700/40 border-2 border-amber-400', text: 'text-amber-300', label: 'HIGH' },
  critical: { bg: 'bg-secondary hover:bg-red-900/40', activeBg: 'bg-red-700/40 border-2 border-red-400', text: 'text-red-300', label: 'CRIT' },
}

// ─── Quick Create Dialog ───────────────────────────────────────────────────────

function QuickCreateDialog({
  open,
  onClose,
  onCreated,
  machines,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  machines: Machine[]
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [machineId, setMachineId] = useState('')
  const [issueType, setIssueType] = useState('')
  const [priority, setPriority] = useState<WorkOrderPriority>('medium')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [machineSearch, setMachineSearch] = useState('')

  const resetForm = () => {
    setMachineId(''); setIssueType(''); setPriority('medium')
    setDescription(''); setPhotoFile(null); setPhotoPreview(null); setMachineSearch('')
  }

  const filteredMachines = machines.filter((m) =>
    m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.location.toLowerCase().includes(machineSearch.toLowerCase())
  )

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    try {
      let photo_url: string | null = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const filename = `work-orders/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(filename, photoFile)
        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage.from('photos').getPublicUrl(filename)
        photo_url = publicData.publicUrl
      }

      // Get profile id
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      const profileData = profileRaw as { id: string } | null

      if (!profileData) throw new Error('Profile not found')

      const insert: WorkOrderInsert = {
        machine_id: parseInt(machineId),
        created_by: profileData.id,
        issue_type: issueType,
        priority,
        description: description || null,
        photo_url,
        status: 'open',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('work_orders').insert(insert)
      if (error) throw error

      toast({ title: 'Work order created', description: 'Work order has been created successfully.' })
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
          <DialogTitle className="font-mono-display">New Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Machine */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Select Machine *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search machine..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className="bg-background pl-8 text-sm h-9"
              />
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto border border-border rounded-md p-1.5 bg-background">
              {filteredMachines.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No machines found</p>
              ) : (
                filteredMachines.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMachineId(String(m.id))}
                    className={cn(
                      'text-left px-3 py-2 rounded-sm text-sm transition-colors',
                      machineId === String(m.id)
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-secondary text-foreground'
                    )}
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.location}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Issue Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType} required>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority *</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_BUTTON[p]
                const isActive = priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'py-2.5 rounded-md text-sm font-mono-display font-bold transition-all',
                      cfg.text,
                      isActive ? cfg.activeBg : cfg.bg
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              className="bg-background border-border resize-none text-sm"
            />
          </div>

          {/* Photo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Photo (optional)</Label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative h-16 w-16 rounded-md border border-border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  >
                    <ClipboardList className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                {photoFile ? 'Change Photo' : 'Add Photo'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button
              type="submit"
              disabled={loading || !machineId || !issueType}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {loading ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Work Order Detail Dialog ──────────────────────────────────────────────────

function WorkOrderDetailDialog({
  wo,
  onClose,
  onUpdated,
  profiles,
}: {
  wo: WorkOrderWithRelations | null
  onClose: () => void
  onUpdated: () => void
  profiles: Profile[]
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [editDesc, setEditDesc] = useState(wo?.description ?? '')
  const [assignTo, setAssignTo] = useState<string>(wo?.assigned_to ?? '')

  useEffect(() => {
    setEditDesc(wo?.description ?? '')
    setAssignTo(wo?.assigned_to ?? '')
  }, [wo])

  if (!wo) return null

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    setLoading(true)
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('work_orders').update(update).eq('id', wo.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Status updated' })
      onUpdated()
      onClose()
    }
    setLoading(false)
  }

  const handleAssign = async () => {
    if (!assignTo) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('work_orders')
      .update({ assigned_to: assignTo, status: 'assigned' })
      .eq('id', wo.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Assigned', description: 'Work order assigned.' })
      onUpdated()
      onClose()
    }
    setLoading(false)
  }

  const handleSaveDesc = async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('work_orders').update({ description: editDesc }).eq('id', wo.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Description updated' })
      onUpdated()
    }
    setLoading(false)
  }

  const STATUS_TRANSITIONS: Record<WorkOrderStatus, { next: WorkOrderStatus; label: string; color: string }[]> = {
    open: [{ next: 'assigned', label: 'Assign', color: 'bg-blue-600 hover:bg-blue-700 text-white' }, { next: 'in_progress', label: 'Start Work', color: 'bg-amber-600 hover:bg-amber-700 text-white' }],
    assigned: [{ next: 'in_progress', label: 'Start Work', color: 'bg-amber-600 hover:bg-amber-700 text-white' }],
    in_progress: [{ next: 'completed', label: 'Mark Complete', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }],
    completed: [],
  }

  return (
    <Dialog open={!!wo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">WO #{wo.id} — {wo.machine?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={wo.priority} />
            <WoStatusBadge status={wo.status} />
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}</span>
          </div>

          {/* Issue */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Issue Type</p>
            <p className="text-sm font-medium">{wo.issue_type}</p>
          </div>

          {/* Photo */}
          {wo.photo_url && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wo.photo_url} alt="Work order" className="rounded-md border border-border max-h-48 object-cover" />
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="bg-background border-border resize-none text-sm"
              placeholder="No description"
            />
            {editDesc !== (wo.description ?? '') && (
              <Button size="sm" onClick={handleSaveDesc} disabled={loading} className="mt-1.5 h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                Save
              </Button>
            )}
          </div>

          {/* Assignee info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created By</p>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{wo.creator?.name ?? 'Unknown'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Assigned To</p>
              {wo.assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={wo.assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-secondary">{wo.assignee.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{wo.assignee.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Unassigned</span>
              )}
            </div>
          </div>

          {wo.completed_at && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed At</p>
              <p className="text-sm">{format(new Date(wo.completed_at), 'MMM d, yyyy HH:mm')}</p>
            </div>
          )}

          <Separator />

          {/* Assign (admin) */}
          {isAdmin && wo.status !== 'completed' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Assign Technician</p>
              <div className="flex gap-2">
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger className="bg-background border-border flex-1 h-9 text-sm">
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAssign} disabled={!assignTo || loading} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Status actions */}
          {STATUS_TRANSITIONS[wo.status].length > 0 && (
            <div className="flex gap-2">
              {STATUS_TRANSITIONS[wo.status].map(({ next, label, color }) => (
                <Button
                  key={next}
                  size="sm"
                  disabled={loading}
                  onClick={() => handleStatusChange(next)}
                  className={cn('flex-1 font-medium', color)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const supabase = useSupabase()
  const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedWo, setSelectedWo] = useState<WorkOrderWithRelations | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | WorkOrderStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | WorkOrderPriority>('all')
  const [machineFilter, setMachineFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [woRes, machinesRes, profilesRes] = await Promise.all([
      sb
        .from('work_orders')
        .select('*, machine:machines(id, name), creator:profiles!work_orders_created_by_fkey(id, name, avatar_url), assignee:profiles!work_orders_assigned_to_fkey(id, name, avatar_url)')
        .order('created_at', { ascending: false }),
      supabase.from('machines').select('*').order('name'),
      supabase.from('profiles').select('*').order('name'),
    ])
    setWorkOrders((woRes.data ?? []) as WorkOrderWithRelations[])
    setMachines(machinesRes.data ?? [])
    setProfiles(profilesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter logic
  const filtered = workOrders.filter((wo) => {
    if (statusFilter !== 'all' && wo.status !== statusFilter) return false
    if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false
    if (machineFilter !== 'all' && String(wo.machine_id) !== machineFilter) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle={`${workOrders.filter((w) => w.status !== 'completed').length} open`}
        action={{ label: 'New Work Order', onClick: () => setCreateOpen(true), icon: Plus }}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="bg-secondary h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-2">All</TabsTrigger>
            {WORK_ORDER_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs h-6 px-2 capitalize">
                {s.replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
          <SelectTrigger className="bg-card border-border h-8 w-36 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Machine filter */}
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="bg-card border-border h-8 w-44 text-xs">
            <SelectValue placeholder="Machine" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-xs">All Machines</SelectItem>
            {machines.map((m) => (
              <SelectItem key={m.id} value={String(m.id)} className="text-xs">{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work order list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description="Try adjusting your filters or create a new work order"
          icon={ClipboardList}
          className="mt-12"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => (
            <div
              key={wo.id}
              onClick={() => setSelectedWo(wo)}
              className={cn(
                'bg-card border border-border border-l-4 rounded-md p-4 cursor-pointer hover:border-border/80 hover:bg-card/80 transition-colors',
                PRIORITY_STRIPE[wo.priority]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-mono-display text-foreground">
                      {wo.machine?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">{wo.issue_type}</span>
                  </div>
                  {wo.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{wo.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <PriorityBadge priority={wo.priority} />
                    <WoStatusBadge status={wo.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {/* Assignee */}
                <div className="shrink-0 text-right">
                  {wo.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={wo.assignee.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-secondary font-mono-display">
                          {wo.assignee.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground hidden sm:block">{wo.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuickCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchData}
        machines={machines}
      />
      <WorkOrderDetailDialog
        wo={selectedWo}
        onClose={() => setSelectedWo(null)}
        onUpdated={fetchData}
        profiles={profiles}
      />
    </div>
  )
}
