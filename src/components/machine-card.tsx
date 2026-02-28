'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateMachineStatus } from '@/lib/supabase/mutations'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Hash, Wrench } from 'lucide-react'
import { MACHINE_STATUSES } from '@/lib/constants'
import type { Machine } from '@/types/database'

export function MachineCard({
  machine,
  onUpdate,
}: {
  machine: Machine
  onUpdate: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  const handleStatusChange = async (status: Machine['status']) => {
    setUpdating(true)
    try {
      await updateMachineStatus(machine.id, status)
      toast({ title: 'Status updated' })
      onUpdate()
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{machine.name}</h3>
            {machine.model && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Wrench className="h-3 w-3" />
                {machine.model}
              </p>
            )}
          </div>
          <StatusBadge status={machine.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {machine.location && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {machine.location}
            </p>
          )}
          {machine.serial_number && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              {machine.serial_number}
            </p>
          )}
        </div>
        {machine.notes && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 line-clamp-2">
            {machine.notes}
          </p>
        )}
        <div className="pt-1">
          <Select
            value={machine.status}
            onValueChange={(v) => handleStatusChange(v as Machine['status'])}
            disabled={updating}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MACHINE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
