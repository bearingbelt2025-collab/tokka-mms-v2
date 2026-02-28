'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search } from 'lucide-react'
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
import { MachineCard } from '@/components/machine-card'
import { CardSkeleton } from '@/components/loading-skeleton'
import { EmptyState } from '@/components/empty-state'
import type { Machine } from '@/types/database'

const MACHINE_STATUSES = ['operational', 'maintenance', 'breakdown', 'retired'] as const

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const supabase = useSupabase()
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    model: '',
    serial_number: '',
    location: '',
    status: 'operational' as typeof MACHINE_STATUSES[number],
    purchase_date: '',
    notes: '',
  })

  const fetchMachines = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data, error } = await sb.from('machines').select('*').order('name')
    if (error) throw error
    setMachines(data || [])
  }, [supabase])

  useEffect(() => {
    fetchMachines()
      .catch((err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [fetchMachines, toast])

  const resetForm = () => {
    setForm({
      name: '',
      model: '',
      serial_number: '',
      location: '',
      status: 'operational',
      purchase_date: '',
      notes: '',
    })
    setEditingMachine(null)
  }

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine)
    setForm({
      name: machine.name,
      model: machine.model || '',
      serial_number: machine.serial_number || '',
      location: machine.location || '',
      status: machine.status as typeof MACHINE_STATUSES[number],
      purchase_date: machine.purchase_date || '',
      notes: machine.notes || '',
    })
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      const payload = {
        name: form.name,
        model: form.model || null,
        serial_number: form.serial_number || null,
        location: form.location || null,
        status: form.status,
        purchase_date: form.purchase_date || null,
        notes: form.notes || null,
      }

      if (editingMachine) {
        const { error } = await sb.from('machines').update(payload).eq('id', editingMachine.id)
        if (error) throw error
        toast({ title: 'Machine updated successfully' })
      } else {
        const { error } = await sb.from('machines').insert(payload)
        if (error) throw error
        toast({ title: 'Machine added successfully' })
      }

      setOpen(false)
      resetForm()
      await fetchMachines()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { error } = await sb.from('machines').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Machine deleted' })
      await fetchMachines()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const filteredMachines = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.location?.toLowerCase().includes(search.toLowerCase()) ||
      m.model?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground">Manage your equipment inventory</p>
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
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMachine ? 'Edit Machine' : 'Add New Machine'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., CNC Mill #1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="Model number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    value={form.serial_number}
                    onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                    placeholder="Serial #"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g., Floor A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, status: v as typeof MACHINE_STATUSES[number] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MACHINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
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
                  {submitting ? 'Saving...' : editingMachine ? 'Update Machine' : 'Add Machine'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search machines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Machine Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredMachines.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search ? 'No machines found' : 'No machines yet'}
          description={search ? 'Try a different search term' : 'Add your first machine to get started'}
          action={
            !search ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Machine
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMachines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              showActions
              onEdit={() => handleEdit(machine)}
              onDelete={() => handleDelete(machine.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
