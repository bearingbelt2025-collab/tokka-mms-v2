'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message,
      })
      setLoading(false)
      return
    }

    // Full page reload to ensure cookies are sent to the server middleware
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-md bg-primary/10 border border-primary/20 mb-4">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-mono-display tracking-tight">
            TOKKA <span className="text-primary">MMS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">Maintenance Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-md p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-base font-semibold font-mono-display">Sign In</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-body">
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="technician@factory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-background border-border focus:border-primary font-body"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background border-border focus:border-primary font-body"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-body">
          Tokka Industries &mdash; Secure Plant Operations
        </p>
      </div>
    </div>
  )
}
