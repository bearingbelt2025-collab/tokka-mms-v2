import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon: LucideIcon
  className?: string
}

export function EmptyState({ title, description, icon: Icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12', className)}>
      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium font-body">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 font-body">{description}</p>}
    </div>
  )
}
