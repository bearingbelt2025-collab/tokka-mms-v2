'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
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
import { PriorityBadge } from '@/components/priority-badge'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { CardSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import type { Machine, WorkOrder } from '@/types/database'

const WO_STATUSES = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const
const WO_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const WO_TYPES = ['corrective', 'preventive', 'predictive', 'inspection'] as const

type WorkOrderWithRelations = WorkOrder & {
  machine: { name: string } | null
  creator: { name: string } | null
  assignee: { name: string } | null
}

type FilterStatus = typeof WO_STATUSES[number] | 'all'
type FilterPriority = typeof WO_PRIORITIES[number] | 'all'

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [users, setUsers] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [detailWo, setDetailWo] = useState<WorkOrderWithRelations | null>(null)
  const [editingWo, setEditingWo] = useState<WorkOrderWithRelations | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useSupabase()
  const { toast } = useToast()

  const [form, setForm] = useState({
    title: '',
    description: '',
    machine_id: '',
    priority: 'medium' as typeof WO_PRIORITIES[number],
    type: 'corrective' as typeof WO_TYPES[number],
    assigned_to: '',
    due_date: '',
    estimated_hours: '',
  })

  const fetchData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [woRes, machinesRes, usersRes] = await Promise.all([
      sb
        .from('work_orders')
        .select(
          '*, machine:machines(name), creator:users!work_orders_created_by_fkey(name), assignee:users!work_orders_assigned_to_fkey(name)'
        )
        .order('created_at', { ascending: false }),
      sb.from('machines').select('id, name').order('name'),
      sb.from('users').select('id, name').order('name'),
    ])
    if (woRes.error) throw woRes.error
    if (machinesRes.error) throw machinesRes.error
    if (usersRes.error) throw usersRes.error
    setWorkOrders(woRes.data || [])
    setMachines(machinesRes.data || [])
    setUsers(usersRes.data || [])
  }, [supabase])

  useEffect(() => {
    fetchData()
      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [fetchData, toast])

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      machine_id: '',
      priority: 'medium',
      type: 'corrective',
      assigned_to: '',
      due_date: '',
      estimated_hours: '',
    })
    setEditingWo(null)
  }

  const handleEdit = (wo: WorkOrderWithRelations) => {
    setEditingWo(wo)
    setForm({
      title: wo.title,
      description: wo.description || '',
      machine_id: String(wo.machine_id || ''),
      priority: wo.priority as typeof WO_PRIORITIES[number],
      type: wo.type as typeof WO_TYPES[number],
      assigned_to: String(wo.assigned_to || ''),
      due_date: wo.due_date ? wo.due_date.slice(0, 16) : '',
      estimated_hours: String(wo.estimated_hours || ''),
    })
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      const { data: userData } = await sb.auth.getUser()
      const userId = userData?.user?.id
      let creatorId = null
      if (userId) {
        const { data: userRow } = await sb.from('users').select('id').eq('auth_id', userId).single()
        creatorId = userRow?.id
      }

      const payload = {
        title: form.title,
        description: form.description || null,
        machine_id: form.machine_id ? parseInt(form.machine_id) : null,
        priority: form.priority,
        type: form.type,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        status: editingWo ? editingWo.status : 'open',
        ...(editingWo ? {} : { created_by: creatorId }),
      }

      if (editingWo) {
        const { error } = await sb.from('work_orders').update(payload).eq('id', editingWo.id)
        if (error) throw error
        toast({ title: 'Work order updated' })
      } else {
        const { error } = await sb.from('work_orders').insert(payload)
        if (error) throw error
        toast({ title: 'Work order created' })
      }

      setOpen(false)
      resetForm()
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (wo: WorkOrderWithRelations, newStatus: typeof WO_STATUSES[number]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const update: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'completed') update.completed_at = new Date().toISOString()
      const { error } = await sb.from('work_orders').update(update).eq('id', wo.id)
      if (error) throw error
      toast({ title: 'Status updated' })
      await fetchData()
      if (detailWo?.id === wo.id) {
        setDetailWo((prev) => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this work order?')) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { error } = await sb.from('work_orders').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Work order deleted' })
      if (detailWo?.id === id) setDetailWo(null)
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const handleFileUpload = async (woId: number, file: File) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const filePath = `work-orders/${woId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await sb.storage.from('attachments').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: urlData } = sb.storage.from('attachments').getPublicUrl(filePath)
      const { error: insertError } = await sb.from('wo_attachments').insert({
        work_order_id: woId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
      })
      if (insertError) throw insertError
      toast({ title: 'File uploaded' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const filteredWo = workOrders.filter((wo) => {
    const matchSearch =
      !search ||
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.wo_number?.toLowerCase().includes(search.toLowerCase()) ||
      wo.machine?.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || wo.status === filterStatus
    const matchPriority = filterPriority === 'all' || wo.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">Manage maintenance and repair tasks</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWo ? 'Edit Work Order' : 'Create Work Order'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Machine</Label>
                  <Select
                    value={form.machine_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, machine_id: v }))}
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
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v as typeof WO_TYPES[number] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof WO_PRIORITIES[number] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WO_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={form.assigned_to}
                    onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="est_hours">Est. Hours</Label>
                  <Input
                    id="est_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.estimated_hours}
                    onChange={(e) => setForm((f) => ({ ...f, estimated_hours: e.target.value }))}
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingWo ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {WO_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as FilterPriority)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {WO_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredWo.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search || filterStatus !== 'all' || filterPriority !== 'all' ? 'No matching work orders' : 'No work orders yet'}
          description={search || filterStatus !== 'all' || filterPriority !== 'all' ? 'Try adjusting your filters' : 'Create your first work order'}
          action={
            !search && filterStatus === 'all' && filterPriority === 'all' ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Work Order
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredWo.map((wo) => (
            <div
              key={wo.id}
              className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setDetailWo(wo)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-muted-foreground">{wo.wo_number}</span>
                    <PriorityBadge priority={wo.priority} />
                    <WoStatusBadge status={wo.status} />
                  </div>
                  <p className="font-medium truncate">{wo.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {wo.machine && <span>{wo.machine.name}</span>}
                    {wo.assignee && <span>Assigned: {wo.assignee.name}</span>}
                    {wo.due_date && <span>Due: {format(new Date(wo.due_date), 'MMM d')}</span>}
                    <span>{format(new Date(wo.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={wo.status}
                    onValueChange={(v) => handleStatusChange(wo, v as typeof WO_STATUSES[number])}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WO_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(wo)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(wo.id)}>Del</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {detailWo && (
        <Dialog open={!!detailWo} onOpenChange={(v) => !v && setDetailWo(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailWo.wo_number} — {detailWo.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <PriorityBadge priority={detailWo.priority} />
                <WoStatusBadge status={detailWo.status} />
              </div>
              {detailWo.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{detailWo.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detailWo.machine && (
                  <div>
                    <p className="font-medium">Machine</p>
                    <p className="text-muted-foreground">{detailWo.machine.name}</p>
                  </div>
                )}
                {detailWo.assignee && (
                  <div>
                    <p className="font-medium">Assigned To</p>
                    <p className="text-muted-foreground">{detailWo.assignee.name}</p>
                  </div>
                )}
                {detailWo.due_date && (
                  <div>
                    <p className="font-medium">Due Date</p>
                    <p className="text-muted-foreground">{format(new Date(detailWo.due_date), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                )}
                {detailWo.estimated_hours && (
                  <div>
                    <p className="font-medium">Est. Hours</p>
                    <p className="text-muted-foreground">{detailWo.estimated_hours}h</p>
                  </div>
                )}
                {detailWo.creator && (
                  <div>
                    <p className="font-medium">Created By</p>
                    <p className="text-muted-foreground">{detailWo.creator.name}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium">Created At</p>
                  <p className="text-muted-foreground">{format(new Date(detailWo.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
              {/* File Upload */}
              <div>
                <p className="text-sm font-medium mb-2">Attachments</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && detailWo) handleFileUpload(detailWo.id, file)
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload File
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
