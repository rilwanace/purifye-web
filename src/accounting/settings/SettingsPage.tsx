import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import BusinessProfile from './BusinessProfile'
import MasterData from './MasterData'
import TeamManagement from './TeamManagement'
import InvoiceSettings from './InvoiceSettings'
import { api } from '../../api'

type SectionKey = 'account' | 'briefs' | 'profile' | 'master' | 'team' | 'invoice' | 'inventory'

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'briefs', label: 'Daily Briefs' },
  { key: 'profile', label: 'Business Profile' },
  { key: 'master', label: 'Master Data' },
  { key: 'team', label: 'Team Management' },
  { key: 'invoice', label: 'Invoice Settings' },
  { key: 'inventory', label: 'Inventory & Recipes' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [open, setOpen] = useState<SectionKey | null>('account')

  const toggle = (key: SectionKey) => setOpen(prev => prev === key ? null : key)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ minHeight: '100vh', background: '#131311', color: '#f0ede6', fontFamily: 'DM Sans, sans-serif', paddingBottom: 90 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #232321' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#5DCAA5', cursor: 'pointer', padding: '6px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Mono, monospace' }}>
          ← Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Settings</span>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #3a3a38', borderRadius: 8, color: '#f0ede6', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}>
          Logout
        </button>
      </div>

      <div style={{ padding: '16px 0' }}>
        {SECTIONS.map(sec => (
          <div key={sec.key} style={{ background: '#1c1c1a', borderRadius: 12, margin: '0 16px 10px', overflow: 'hidden' }}>
            <button
              onClick={() => toggle(sec.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>{sec.label}</span>
              <span style={{ fontSize: 11, color: '#6a6a64', display: 'inline-block', transition: 'transform 0.18s', transform: open === sec.key ? 'rotate(90deg)' : 'none' }}>▸</span>
            </button>

            {open === sec.key && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {sec.key === 'account' && <AccountSection user={user} />}
                {sec.key === 'briefs' && <BriefSection />}
                {sec.key === 'profile' && <BusinessProfile />}
                {sec.key === 'master' && <MasterData />}
                {sec.key === 'team' && <TeamManagement />}
                {sec.key === 'invoice' && <InvoiceSettings />}
                {sec.key === 'inventory' && <InventorySection />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountSection({ user }: { user: any }) {
  return (
    <div style={{ padding: '16px 18px' }}>
      {user ? (
        <>
          <div style={{ fontSize: 14, marginBottom: 6 }}>{user.email || user.name || 'User'}</div>
          {user.role && <div style={{ fontSize: 12, color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>}
        </>
      ) : (
        <div style={{ fontSize: 13, color: '#6a6a64' }}>Not logged in</div>
      )}
    </div>
  )
}

function BriefSection() {
  const [cfg, setCfg] = useState<{ morning_brief_enabled: boolean; evening_focus_enabled: boolean } | null>(null)

  useEffect(() => {
    api('/api/briefs/settings')
      .then(d => { if (d.ok) setCfg(d.settings) })
      .catch(() => {})
  }, [])

  const toggle = async (key: 'morning_brief_enabled' | 'evening_focus_enabled') => {
    if (!cfg) return
    const prev = cfg[key]
    setCfg(c => c ? { ...c, [key]: !prev } : c)
    try {
      const body: any = key === 'morning_brief_enabled' ? { morning: !prev } : { evening: !prev }
      await api('/api/briefs/settings', { method: 'PUT', body: JSON.stringify(body) })
    } catch {
      setCfg(c => c ? { ...c, [key]: prev } : c)
    }
  }

  const Sw = ({ on, fn }: { on: boolean; fn: () => void }) => (
    <button onClick={fn} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? '#5DCAA5' : '#3a3a38', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  )

  if (!cfg) return <div style={{ padding: '14px 18px', fontSize: 13, color: '#6a6a64' }}>Loading…</div>

  return (
    <div style={{ padding: '14px 18px' }}>
      {(['morning_brief_enabled', 'evening_focus_enabled'] as const).map((key, i) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i === 0 ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 14, color: '#f0ede6', marginBottom: 2 }}>{key === 'morning_brief_enabled' ? 'Morning Brief' : 'Evening Focus'}</div>
            <div style={{ fontSize: 12, color: '#6a6a64' }}>{key === 'morning_brief_enabled' ? 'Sent at 7:00 AM' : 'Sent at 7:00 PM'}</div>
          </div>
          <Sw on={cfg[key]} fn={() => toggle(key)} />
        </div>
      ))}
    </div>
  )
}

function InventorySection() {
  const [trackInventory, setTrackInventory] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/settings/business')
      .then(d => { setTrackInventory(!!d.track_inventory) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = async () => {
    const next = !trackInventory
    setTrackInventory(next)
    try {
      const cur = await api('/api/settings/business')
      await api('/api/settings/business', {
        method: 'PUT',
        body: JSON.stringify({ name: cur.name || '', address: cur.address || '', phone: cur.phone || '', track_inventory: next }),
      })
    } catch {
      setTrackInventory(!next)
    }
  }

  if (loading) return <div style={{ padding: '14px 18px', fontSize: 13, color: '#6a6a64' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0ede6' }}>Track Inventory</div>
          <div style={{ fontSize: 12, color: '#6a6a64', marginTop: 2 }}>Monitor stock levels and COGS</div>
        </div>
        <button onClick={toggle} style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: trackInventory ? '#5DCAA5' : '#3a3a38', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: trackInventory ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
        </button>
      </div>
      {trackInventory && (
        <div style={{ padding: '0 18px 16px' }}>
          <a
            href="/accounting/recipes"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5DCAA5', textDecoration: 'none', padding: '8px 14px', border: '1px solid rgba(93,202,165,0.2)', borderRadius: 8 }}
          >
            Manage Recipes →
          </a>
        </div>
      )}
    </div>
  )
}
