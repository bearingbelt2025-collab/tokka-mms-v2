import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function EmptyState({ title, description, icon: Icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-semibold font-mono-display text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 font-body max-w-[240px]">{description}</p>
      )}
    </div>
  )
}
