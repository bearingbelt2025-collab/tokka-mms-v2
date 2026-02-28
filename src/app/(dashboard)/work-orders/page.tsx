'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import { WoStatusBadge } from '@/components/wo-status-badge'
import { PriorityBadge } from '@/components/priority-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ClipboardList, Plus } from 'lucide-react'
import { ISSUE_TYPES, PRIORITIES, WO_STATUSES } from '@/lib/constants'
import type { WorkOrder, Machine } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<(WorkOrder & { machines: Pick<Machine, 'name'> | null })[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    machine_id: '',
    issue_type: '',
    issue_description: '',
    priority: 'medium' as WorkOrder['priority'],
    assigned_to: '',
  })
  const supabase = createClient()
  const { toast } = useToast()

  const load = useCallback(async () => {
    const [woRes, machRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*, machines(name)')
        .order('created_at', { ascending: false }),
      supabase.from('machines').select('*').order('name'),
    ])
    if (woRes.data) setWorkOrders(woRes.data as any)
    if (machRes.data) setMachines(machRes.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('wo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('work_orders').insert([{
      ...form,
      status: 'open',
      machine_id: form.machine_id,
    }])
    if (error) {
      toast({ title: 'Error creating work order', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Work order created!' })
      setOpen(false)
      setForm({ machine_id: '', issue_type: '', issue_description: '', priority: 'medium', assigned_to: '' })
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: WorkOrder['status']) => {
    const { error } = await supabase.from('work_orders').update({ status }).eq('id', id)
    if (error) {
      toast({ title: 'Error updating status', variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Work Orders"
        description="Track and manage maintenance tasks"
        action={
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Work Order
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : workOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No work orders"
          description="Create your first work order"
          action={<Button onClick={() => setOpen(true)}>New Work Order</Button>}
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium">{wo.machines?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{wo.issue_type}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{wo.issue_description}</p>
                    </div>
                  </TableCell>
                  <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                  <TableCell><WoStatusBadge status={wo.status} /></TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Select value={wo.status} onValueChange={(v) => updateStatus(wo.id, v as WorkOrder['status'])}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WO_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Work Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Machine *</Label>
              <Select
                value={form.machine_id}
                onValueChange={(v) => setForm({ ...form, machine_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Type *</Label>
              <Select
                value={form.issue_type}
                onValueChange={(v) => setForm({ ...form, issue_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.issue_description}
                onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
                placeholder="Describe the issue..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as WorkOrder['priority'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Input
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="Technician name or email"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Work Order'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
