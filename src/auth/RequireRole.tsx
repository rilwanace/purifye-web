import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

interface RequireRoleProps {
  roles: string[]
  children: React.ReactNode
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}