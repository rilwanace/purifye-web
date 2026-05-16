import { Outlet } from 'react-router-dom'

export default function AccountingLayout() {
  return (
    <div style={{ position: 'relative' }}>
      <Outlet />
    </div>
  )
}
