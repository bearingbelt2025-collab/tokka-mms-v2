'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { Plus, Filter, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { PriorityBadge } from '@/components/priority-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { EmptyState } from '@/components/empty-state'
import { CardSkeleton } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Machine, WorkOrder, WorkOrderInsert } from '@/types/database'

type Priority = 'low' | 'medium' | 'high' | 'critical'
type WoStatus = 'open' | 'in_progress' | 'on_hold' | 'completed'
type IssueType = 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'software' | 'other'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']
const WO_STATUSES: WoStatus[] = ['open', 'in_progress', 'on_hold', 'completed']
const ISSUE_TYPES: IssueType[] = ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'software', 'other']

type WorkOrderWithDetails = WorkOrder & {
  machine: { name: string } | null
  creator: { name: string } | null
  assignee: { name: string } | null
}

// ─── Create / Edit WO Dialog ───────────────────────────────────────────────────

function WoDialog({
  open,
  onClose,
  onSaved,
  wo,
  machines,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  wo?: WorkOrderWithDetails
  machines: Machine[]
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const isEdit = !!wo

  const [machineId, setMachineId] = useState(wo?.machine_id ? String(wo.machine_id) : '')
  const [issueType, setIssueType] = useState<IssueType>((wo?.issue_type as IssueType) ?? 'mechanical')
  const [priority, setPriority] = useState<Priority>((wo?.priority as Priority) ?? 'medium')
  const [status, setStatus] = useState<WoStatus>((wo?.status as WoStatus) ?? 'open')
  const [description, setDescription] = useState(wo?.description ?? '')
  const [notes, setNotes] = useState(wo?.notes ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (wo) {
      setMachineId(String(wo.machine_id))
      setIssueType(wo.issue_type as IssueType)
      setPriority(wo.priority as Priority)
      setStatus(wo.status as WoStatus)
      setDescription(wo.description ?? '')
      setNotes(wo.notes ?? '')
    }
  }, [wo])

  const resetForm = () => {
    setMachineId(''); setIssueType('mechanical'); setPriority('medium'); setStatus('open')
    setDescription(''); setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    try {
      const { data: profileRaw } = await sb
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      const profileData = profileRaw as { id: string } | null
      if (!profileData) throw new Error('Profile not found')

      if (isEdit && wo) {
        const { error } = await sb
          .from('work_orders')
          .update({
            machine_id: parseInt(machineId),
            issue_type: issueType,
            priority,
            status,
            description: description || null,
            notes: notes || null,
            ...(status === 'completed' && !wo.completed_at ? { completed_at: new Date().toISOString() } : {}),
          })
          .eq('id', wo.id)
        if (error) throw error
        toast({ title: 'Work order updated' })
      } else {
        const insert: WorkOrderInsert = {
          machine_id: parseInt(machineId),
          issue_type: issueType,
          priority,
          status: 'open',
          description: description || null,
          notes: notes || null,
          created_by: profileData.id,
        }
        const { error } = await sb.from('work_orders').insert(insert)
        if (error) throw error
        toast({ title: 'Work order created' })
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
          <DialogTitle className="font-mono-display">{isEdit ? 'Edit Work Order' : 'New Work Order'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId} required>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select machine..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {machines.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Type *</Label>
              <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}><PriorityBadge priority={p} /></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WoStatus)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {WO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}><WoStatusBadge status={s} /></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="bg-background resize-none"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." className="bg-background" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create WO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── WO Detail Drawer ──────────────────────────────────────────────────────────

function WoDetailDialog({
  wo,
  onClose,
  onEdit,
  onStatusChange,
}: {
  wo: WorkOrderWithDetails | null
  onClose: () => void
  onEdit: (wo: WorkOrderWithDetails) => void
  onStatusChange: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [updatingStatus, setUpdatingStatus] = useState<WoStatus | null>(null)

  const handleStatusChange = async (newStatus: WoStatus) => {
    if (!wo) return
    setUpdatingStatus(newStatus)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      const { error } = await sb
        .from('work_orders')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', wo.id)
      if (error) throw error
      toast({ title: 'Status updated' })
      onStatusChange()
      onClose()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message })
    } finally {
      setUpdatingStatus(null)
    }
  }

  return (
    <Dialog open={!!wo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Work Order #{wo?.id}</DialogTitle>
        </DialogHeader>
        {wo && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={wo.priority} />
              <WoStatusBadge status={wo.status} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Machine</span>
                <span className="font-semibold font-mono-display">{wo.machine?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Type</span>
                <span className="capitalize">{wo.issue_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created by</span>
                <span>{wo.creator?.name ?? '—'}</span>
              </div>
              {wo.assignee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span>{wo.assignee.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">{formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}</span>
              </div>
              {wo.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-xs">{formatDistanceToNow(new Date(wo.completed_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>

            {wo.description && (
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm">{wo.description}</p>
              </div>
            )}

            {wo.notes && (
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm">{wo.notes}</p>
              </div>
            )}

            {/* Quick Status Change */}
            {wo.status !== 'completed' && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {WO_STATUSES.filter((s) => s !== wo.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={!!updatingStatus}
                      onClick={() => handleStatusChange(s)}
                      className="h-7 text-xs"
                    >
                      {updatingStatus === s ? '...' : <WoStatusBadge status={s} />}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => { onClose(); onEdit(wo) }}
              >
                Edit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const supabase = useSupabase()
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editWo, setEditWo] = useState<WorkOrderWithDetails | null>(null)
  const [detailWo, setDetailWo] = useState<WorkOrderWithDetails | null>(null)
  const [filterStatus, setFilterStatus] = useState<WoStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [woRes, machinesRes] = await Promise.all([
      sb
        .from('work_orders')
        .select('*, machine:machines(name), creator:profiles!work_orders_created_by_fkey(name), assignee:profiles!work_orders_assigned_to_fkey(name)')
        .order('created_at', { ascending: false }),
      supabase.from('machines').select('*').order('name'),
    ])
    setWorkOrders((woRes.data ?? []) as WorkOrderWithDetails[])
    setMachines(machinesRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('wo-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const filtered = workOrders.filter((wo) => {
    if (filterStatus !== 'all' && wo.status !== filterStatus) return false
    if (filterPriority !== 'all' && wo.priority !== filterPriority) return false
    return true
  })

  const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0)

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle={`${filtered.length} of ${workOrders.length}`}
        action={{ label: 'New WO', onClick: () => setAddOpen(true), icon: Plus }}
      />

      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 text-xs gap-1.5"
          >
            <Filter className="h-3 w-3" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setFilterStatus('all'); setFilterPriority('all') }}
              className="h-8 text-xs gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-3 p-3 bg-card border border-border rounded-md">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as WoStatus | 'all')}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All statuses</SelectItem>
                  {WO_STATUSES.map((s) => <SelectItem key={s} value={s}><WoStatusBadge status={s} /></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as Priority | 'all')}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}><PriorityBadge priority={p} /></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Work Orders List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={workOrders.length === 0 ? 'No work orders yet' : 'No matching work orders'}
          description={workOrders.length === 0 ? 'Create a work order to track machine issues' : 'Try adjusting your filters'}
          icon={Plus}
          action={workOrders.length === 0 ? { label: 'New Work Order', onClick: () => setAddOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => (
            <div
              key={wo.id}
              onClick={() => setDetailWo(wo)}
              className="bg-card border border-border rounded-md p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono-display text-muted-foreground">#{wo.id}</span>
                    <span className="text-sm font-semibold font-mono-display truncate">{wo.machine?.name ?? 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{wo.issue_type}</span>
                  </div>
                  {wo.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{wo.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <PriorityBadge priority={wo.priority} />
                    <WoStatusBadge status={wo.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                    </span>
                    {wo.assignee && (
                      <span className="text-xs text-muted-foreground">· {wo.assignee.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WoDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchData} machines={machines} />
      <WoDialog
        open={!!editWo}
        onClose={() => setEditWo(null)}
        onSaved={fetchData}
        wo={editWo ?? undefined}
        machines={machines}
      />
      <WoDetailDialog
        wo={detailWo}
        onClose={() => setDetailWo(null)}
        onEdit={(wo) => setEditWo(wo)}
        onStatusChange={fetchData}
      />
    </div>
  )
}
