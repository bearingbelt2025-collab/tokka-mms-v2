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
  medium: { bg: 'bg-secondary hover:bg-blue-900', activeBg: 'bg-blue-800 border-2 border-blue-400', text: 'text-blue-300', label: 'MED' },
  high: { bg: 'bg-secondary hover:bg-amber-900', activeBg: 'bg-amber-800 border-2 border-amber-400', text: 'text-amber-300', label: 'HIGH' },
  critical: { bg: 'bg-secondary hover:bg-red-900', activeBg: 'bg-red-800 border-2 border-red-400', text: 'text-red-300', label: 'CRIT' },
}

// ─── Create Work Order Dialog ──────────────────────────────────────────────────

function CreateWoDialog({
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
  const { user } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    machine_id: '',
    issue_type: '',
    priority: 'medium' as WorkOrderPriority,
    description: '',
    assigned_to: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setForm({ machine_id: '', issue_type: '', priority: 'medium', description: '', assigned_to: '' })
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

      const insert: WorkOrderInsert = {
        machine_id: Number(form.machine_id),
        created_by: user.id,
        assigned_to: form.assigned_to || null,
        issue_type: form.issue_type,
        description: form.description || null,
        priority: form.priority,
        status: 'open',
        photo_url,
        resolution_notes: null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('work_orders').insert(insert)
      if (error) throw error

      toast({ title: 'Work order created', description: `${form.issue_type} on machine #${form.machine_id}` })
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
          <DialogTitle className="font-mono-display">Create Work Order</DialogTitle>
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
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Type *</Label>
            <Select value={form.issue_type} onValueChange={(v) => setForm(p => ({ ...p, issue_type: v }))} required>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_BUTTON[p]
                const isActive = form.priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={cn(
                      'flex-1 py-1.5 rounded-md text-xs font-mono-display transition-colors',
                      isActive ? cfg.activeBg + ' ' + cfg.text : cfg.bg + ' text-muted-foreground'
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
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
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the issue..."
              className="bg-background resize-none"
              rows={3}
            />
          </div>

          {/* Photo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Photo (optional)</Label>
            <div className="flex items-center gap-3">
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-md object-cover border border-border" />
              )}
              <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => fileRef.current?.click()}>
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                {photoPreview ? 'Change' : 'Add Photo'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Work Order Detail Dialog ──────────────────────────────────────────────────

function WoDetailDialog({
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
  const { isAdmin, isTech } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')

  useEffect(() => {
    if (wo) {
      setResolutionNotes(wo.resolution_notes ?? '')
      setSelectedAssignee(wo.assigned_to ?? '')
    }
  }, [wo])

  const handleStatusUpdate = async (status: WorkOrderStatus) => {
    if (!wo) return
    setUpdating(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('work_orders').update({
      status,
      resolution_notes: resolutionNotes || null,
      assigned_to: selectedAssignee || null,
      updated_at: new Date().toISOString(),
    }).eq('id', wo.id)

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Work order updated', description: `Status set to ${status.replace('_', ' ')}` })
      onUpdated()
      onClose()
    }
    setUpdating(false)
  }

  if (!wo) return null

  const canEdit = isAdmin || isTech

  return (
    <Dialog open={!!wo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">WO #{wo.id} — {wo.issue_type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={wo.priority} />
            <WoStatusBadge status={wo.status} />
            <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(wo.created_at))} ago</span>
          </div>

          {wo.description && (
            <p className="text-sm text-muted-foreground bg-background rounded-md border border-border p-3">{wo.description}</p>
          )}

          {wo.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wo.photo_url} alt="Issue photo" className="rounded-md border border-border w-full object-cover max-h-48" />
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Machine</p>
              <p className="font-medium">{wo.machine?.name ?? `#${wo.machine_id}`}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(wo.created_at), 'MMM d, HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created by</p>
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={wo.creator?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{wo.creator?.name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{wo.creator?.name ?? 'Unknown'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assignee</p>
              {canEdit ? (
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="h-7 text-xs bg-background mt-0.5">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{wo.assignee?.name ?? 'Unassigned'}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {canEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe what was done to resolve..."
                className="bg-background resize-none"
                rows={3}
              />
            </div>
          )}

          {canEdit && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Update Status</Label>
              <div className="flex flex-wrap gap-2">
                {WORK_ORDER_STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={wo.status === s ? 'default' : 'outline'}
                    disabled={updating}
                    onClick={() => handleStatusUpdate(s)}
                    className={
                      wo.status === s
                        ? s === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : s === 'in_progress' ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : s === 'pending_parts' ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                        : ''
                    }
                  >
                    {s.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Work Order Card ───────────────────────────────────────────────────────────

function WoCard({ wo, onClick }: { wo: WorkOrderWithRelations; onClick: () => void }) {
  return (
    <div
      className={cn(
        'bg-card border border-border border-l-4 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors',
        PRIORITY_STRIPE[wo.priority]
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono-display">#{wo.id}</span>
            <p className="text-sm font-medium truncate font-body">{wo.issue_type}</p>
          </div>
          {wo.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{wo.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {wo.machine?.name ?? `Machine #${wo.machine_id}`} · {formatDistanceToNow(new Date(wo.created_at))} ago
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <PriorityBadge priority={wo.priority} />
          <WoStatusBadge status={wo.status} />
        </div>
      </div>
      {wo.assignee && (
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar className="h-4 w-4">
            <AvatarImage src={wo.assignee.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">{wo.assignee.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{wo.assignee.name}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const supabase = useSupabase()
  const { isAdmin } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedWo, setSelectedWo] = useState<WorkOrderWithRelations | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [woRes, machinesRes, profilesRes] = await Promise.all([
      sb
        .from('work_orders')
        .select('*, machine:machines(id,name), creator:profiles!work_orders_created_by_fkey(id,name,avatar_url), assignee:profiles!work_orders_assigned_to_fkey(id,name,avatar_url)')
        .order('created_at', { ascending: false }),
      supabase.from('machines').select('id, name').order('name'),
      supabase.from('profiles').select('id, name, email, role, avatar_url, created_at').order('name'),
    ])
    setWorkOrders((woRes.data ?? []) as WorkOrderWithRelations[])
    setMachines(machinesRes.data ?? [])
    setProfiles(profilesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = workOrders.filter((wo) => {
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'open' ? wo.status === 'open' :
      activeTab === 'in_progress' ? wo.status === 'in_progress' :
      activeTab === 'pending_parts' ? wo.status === 'pending_parts' :
      activeTab === 'completed' ? wo.status === 'completed' : true

    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      wo.issue_type.toLowerCase().includes(q) ||
      (wo.description ?? '').toLowerCase().includes(q) ||
      (wo.machine?.name ?? '').toLowerCase().includes(q)

    return matchesTab && matchesSearch
  })

  const counts = {
    all: workOrders.length,
    open: workOrders.filter(w => w.status === 'open').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    pending_parts: workOrders.filter(w => w.status === 'pending_parts').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
  }

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle={`${counts.open} open · ${counts.in_progress} in progress`}
        action={{
          label: 'New Work Order',
          onClick: () => setCreateOpen(true),
          show: true,
          icon: Plus,
        }}
      />

      {/* Search + Tabs */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search work orders..."
            className="pl-9 bg-card"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="open" className="flex-1 text-xs">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1 text-xs">In Prog ({counts.in_progress})</TabsTrigger>
            <TabsTrigger value="pending_parts" className="flex-1 text-xs">Parts ({counts.pending_parts})</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 text-xs">Done ({counts.completed})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No results found' : 'No work orders'}
          description={searchQuery ? 'Try a different search' : (isAdmin ? 'Create the first work order' : 'No work orders assigned')}
          icon={ClipboardList}
          className="mt-12"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((wo) => (
            <WoCard key={wo.id} wo={wo} onClick={() => setSelectedWo(wo)} />
          ))}
        </div>
      )}

      <CreateWoDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchData}
        machines={machines}
        profiles={profiles}
      />
      <WoDetailDialog
        wo={selectedWo}
        onClose={() => setSelectedWo(null)}
        onUpdated={fetchData}
        profiles={profiles}
      />
    </div>
  )
}
