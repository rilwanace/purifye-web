import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import BusinessProfile from './BusinessProfile'
import InventoryToggle from './InventoryToggle'
import MasterData from './MasterData'
import ImportData from './ImportData'
import TeamManagement from './TeamManagement'
import NotificationPrefs from './NotificationPrefs'
import PlannerTeamSettings from '../../planner/PlannerTeamSettings'

export default function SettingsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const isOwner = user?.role === 'owner'
  const isAccounting = location.pathname.startsWith('/accounting')
  const isPlanner = location.pathname.startsWith('/planner')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</div>
      </div>

      <BusinessProfile />

      {isAccounting && (
        <>
          <InventoryToggle />
          <MasterData />
          <ImportData />
          {isOwner && <TeamManagement />}
          <NotificationPrefs />
        </>
      )}

      {isPlanner && <PlannerTeamSettings />}
    </div>
  )
}
