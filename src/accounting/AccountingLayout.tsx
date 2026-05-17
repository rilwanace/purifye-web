import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AccountingLayout() {
  return (
    <div style={{ position: 'relative' }}>
      <Outlet />
      <BottomNav />
    </div>
  )
}
