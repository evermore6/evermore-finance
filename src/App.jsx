import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage    from '@/pages/DashboardPage'
import TransactionsPage from '@/pages/TransactionsPage'
import DebtsPage    from '@/pages/DebtsPage'
import BudgetsPage  from '@/pages/BudgetsPage'
import SavingsPage  from '@/pages/SavingsPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/debts"        element={<DebtsPage />} />
              <Route path="/budgets"      element={<BudgetsPage />} />
              <Route path="/savings"      element={<SavingsPage />} />
              <Route path="/settings"     element={<SettingsPage />} />
            </Route>

            {/* Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background:   'var(--bg-card)',
              color:        'var(--text-primary)',
              border:       '1px solid var(--border)',
              borderRadius: '12px',
              fontSize:     '13px',
              fontFamily:   "'Plus Jakarta Sans', sans-serif",
              backdropFilter: 'blur(16px)',
              boxShadow:    '0 8px 32px rgba(31,38,135,0.10)',
            },
            success: { iconTheme: { primary: '#7d9464', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#c0614a', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  )
}
