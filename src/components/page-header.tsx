import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    show?: boolean
    icon?: LucideIcon
  }
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const Icon = action?.icon
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold font-mono-display text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 font-body">{subtitle}</p>
        )}
      </div>
      {action && action.show !== false && (
        <Button
          onClick={action.onClick}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-medium shrink-0"
          size="sm"
        >
          {Icon && <Icon className="h-4 w-4 mr-1.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
