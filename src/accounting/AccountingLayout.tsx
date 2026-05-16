import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

const BOTTOM_NAV_PATHS = ['/accounting/dashboard', '/accounting/chat', '/accounting/history']

export default function AccountingLayout() {
  const location = useLocation()
  const showBottomNav = BOTTOM_NAV_PATHS.some(p => location.pathname.startsWith(p))
  return (
    <div style={{ position: 'relative' }}>
      <Outlet />
      {showBottomNav && <BottomNav />}
    </div>
  )
}
