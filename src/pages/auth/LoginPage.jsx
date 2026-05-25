import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Leaf, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message || 'Login failed. Check your credentials.')
    } else {
      toast.success('Welcome back! 🌿')
      navigate(from, { replace: true })
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sage-200/30 dark:bg-sage-900/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-peach-200/30 dark:bg-peach-900/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center mb-4">
            <Leaf size={26} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">Evermore</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Your personal finance companion</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-7 shadow-glass-md">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-5">Sign in</h2>

          {/* Google */}
          <Button
            variant="secondary"
            className="w-full mb-4 justify-center"
            onClick={handleGoogle}
            loading={googleLoading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warmgray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] placeholder:text-warmgray-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warmgray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-sage-600 dark:text-sage-300 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Your data is secured with Supabase Row Level Security
        </p>
      </motion.div>
    </div>
  )
}
