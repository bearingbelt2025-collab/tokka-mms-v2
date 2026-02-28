import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold font-mono-display">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 font-body">{subtitle}</p>}
      </div>
      {action?.show !== false && action && (
        <Button onClick={action.onClick} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {action.icon && <action.icon className="h-4 w-4 mr-1.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
