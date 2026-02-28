'use client'
import { useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, Plus, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { PriorityBadge } from '@/components/priority-badge'
import { LoadingTable } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { WorkOrder, Machine, Profile, WoStatus, Priority, WorkOrderInsert } from '@/types/database'
import { WO_STATUSES, PRIORITIES } from '@/lib/constants'

type WorkOrderWithRefs = WorkOrder & {
  machine: { name: string; location: string } | null
  creator: { name: string } | null
  assignee: { name: string } | null
}

// ─── Create Work Order Dialog ─────────────────────────────────────────────────
function CreateWoDialog({
  open,
  onClose,
  onCreated,
  machines,
  technicians,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  machines: Machine[]
  technicians: Profile[]
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    machine_id: '',
    priority: 'medium' as Priority,
    assigned_to: '' as string,
    due_date: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    const insert: WorkOrderInsert = {
      title: form.title,
      description: form.description || null,
      machine_id: form.machine_id || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      created_by: user.id,
      status: 'open',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('work_orders').insert(insert)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Work order created' })
      onCreated()
      onClose()
      setForm({ title: '', description: '', machine_id: '', priority: 'medium', assigned_to: '', due_date: '' })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display">Create Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Replace hydraulic filter" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description..." className="bg-background resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Machine</Label>
              <Select value={form.machine_id} onValueChange={(v) => setForm(p => ({ ...p, machine_id: v }))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(p => ({ ...p, priority: v as Priority }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assign To</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} className="bg-background" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Work Order Detail ────────────────────────────────────────────────────────
function WoDetailDialog({
  wo,
  onClose,
  onUpdated,
  machines,
  technicians,
}: {
  wo: WorkOrderWithRefs | null
  onClose: () => void
  onUpdated: () => void
  machines: Machine[]
  technicians: Profile[]
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ assigned_to: '', due_date: '' })

  const handleStatusChange = async (status: WoStatus) => {
    if (!wo) return
    setUpdatingStatus(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('work_orders').update({ status }).eq('id', wo.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      toast({ title: 'Status updated' })
      onUpdated()
      onClose()
    }
    setUpdatingStatus(false)
  }

  if (!wo) return null

  return (
    <Dialog open={!!wo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono-display text-base">{wo.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <WoStatusBadge status={wo.status} />
            <PriorityBadge priority={wo.priority} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Machine</p>
              <p className="font-medium">{wo.machine?.name ?? '—'}</p>
              {wo.machine?.location && <p className="text-xs text-muted-foreground">{wo.machine.location}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Assigned To</p>
              <p className="font-medium">{wo.assignee?.name ?? 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created By</p>
              <p className="font-medium">{wo.creator?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Due Date</p>
              <p className="font-medium">{wo.due_date ? format(new Date(wo.due_date), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>

          {wo.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm bg-background rounded-md border border-border p-3">{wo.description}</p>
            </div>
          )}

          {isAdmin && (
            <div>
              <p className="text-xs font-semibold font-mono-display mb-2 text-muted-foreground uppercase tracking-wide">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {WO_STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={wo.status === s.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(s.value as WoStatus)}
                    disabled={updatingStatus || wo.status === s.value}
                    className="text-xs h-7"
                  >
                    {s.label}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkOrdersClientPage() {
  const { data: workOrders, loading, refetch } = useSupabase<WorkOrderWithRefs>(
    (sb) =>
      (sb as any)
        .from('work_orders')
        .select('*, machine:machines(name,location), creator:profiles!work_orders_created_by_fkey(name), assignee:profiles!work_orders_assigned_to_fkey(name)')
        .order('created_at', { ascending: false })
  )
  const { data: machines } = useSupabase<Machine>(
    (sb) => (sb as any).from('machines').select('id,name').order('name')
  )
  const { data: technicians } = useSupabase<Profile>(
    (sb) => (sb as any).from('profiles').select('id,name').order('name')
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedWo, setSelectedWo] = useState<WorkOrderWithRefs | null>(null)
  const { isAdmin } = useAuth()

  const filtered = (workOrders ?? []).filter((wo) => {
    const matchSearch =
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      (wo.machine?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || wo.status === statusFilter
    const matchPriority = priorityFilter === 'all' || wo.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div>
      <PageHeader
        title="Work Orders"
        description={`${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
        action={
          isAdmin ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New WO
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-background h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-background">
            <Filter className="h-3 w-3 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {WO_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingTable />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first work order'}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">Title</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Machine</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Priority</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Assigned</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((wo) => (
                <TableRow
                  key={wo.id}
                  className="border-border cursor-pointer hover:bg-secondary/50"
                  onClick={() => setSelectedWo(wo)}
                >
                  <TableCell className="font-medium text-sm">{wo.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wo.machine?.name ?? '—'}</TableCell>
                  <TableCell><PriorityBadge priority={wo.priority} size="sm" /></TableCell>
                  <TableCell><WoStatusBadge status={wo.status} size="sm" /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{wo.assignee?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {wo.due_date ? format(new Date(wo.due_date), 'MMM d') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateWoDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refetch}
        machines={machines ?? []}
        technicians={technicians ?? []}
      />
      <WoDetailDialog
        wo={selectedWo}
        onClose={() => setSelectedWo(null)}
        onUpdated={refetch}
        machines={machines ?? []}
        technicians={technicians ?? []}
      />
    </div>
  )
}
