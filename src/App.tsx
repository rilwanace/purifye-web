import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ProtectedRoute } from './auth/useAuth'
import { ToastProvider } from './shared/components/Toast'
import LoginPage from './auth/LoginPage'
import SignupPage from './auth/SignupPage'
import AppShell from './shell/AppShell'
import AccountingLayout from './accounting/AccountingLayout'
import DashboardPage from './accounting/dashboard/DashboardPage'
import EntryPage from './accounting/entry/EntryPage'
import RecipesPage from './accounting/recipes/RecipesPage'
import ReportsPage from './accounting/reports/ReportsPage'
import SettingsPage from './accounting/settings/SettingsPage'
import PlannerLayout from './planner/PlannerLayout'
import CustomerBot from './customer/CustomerBot'
import InventoryBot from './inventory/InventoryBot'
import SocialLayout from './social/SocialLayout'
import SocialAnalytics from './social/SocialAnalytics'
import SocialCreate from './social/SocialCreate'
import SocialCalendar from './social/SocialCalendar'
import SocialFeed from './social/SocialFeed'
import SocialLibrary from './social/SocialLibrary'
import SocialEditor from './social/SocialEditor'
import SocialOnboarding from './social/SocialOnboarding'
import SocialSettings from './social/SocialSettings'
const EmployeePortal = lazy(() => import('./planner/EmployeePortal'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<Navigate to="/accounting/dashboard" replace />} />
            <Route path="/accounting" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route element={<AccountingLayout />}>
                <Route index element={<Navigate to="/accounting/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="entry" element={<EntryPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="/planner" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<PlannerLayout />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/customers" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<CustomerBot />} />
            </Route>
            <Route path="/inventory" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<InventoryBot />} />
            </Route>
            <Route path="/social" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<Navigate to="/social/analytics" replace />} />
              <Route path="onboarding" element={<SocialOnboarding />} />
              <Route path="editor" element={<SocialEditor />} />
              <Route element={<SocialLayout />}>
                <Route path="analytics" element={<SocialAnalytics />} />
                <Route path="create" element={<SocialCreate />} />
                <Route path="calendar" element={<SocialCalendar />} />
                <Route path="feed" element={<SocialFeed />} />
                <Route path="library" element={<SocialLibrary />} />
                <Route path="settings" element={<SocialSettings />} />
              </Route>
            </Route>
            <Route path="/t/:token" element={<Suspense fallback={null}><EmployeePortal /></Suspense>} />
            <Route path="/portal" element={<Suspense fallback={null}><EmployeePortal /></Suspense>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
