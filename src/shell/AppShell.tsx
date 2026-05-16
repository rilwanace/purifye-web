import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import BotTabBar from './BotTabBar'

export default function AppShell() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const location = useLocation()
  const isAccounting = location.pathname.startsWith('/accounting')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      if (!sessionStorage.getItem('install-dismissed')) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  function doInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    installPrompt.userChoice.then(() => { setInstallPrompt(null); setShowBanner(false) })
  }

  function dismissBanner() {
    sessionStorage.setItem('install-dismissed', '1')
    setShowBanner(false)
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {isOffline && (
        <div style={{ background: '#2a1a00', borderBottom: '1px solid #5a3a00', padding: '6px 16px', fontSize: 12, color: '#ef9f27', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span>&#9888;</span> You&#39;re offline &#8212; data may be outdated
        </div>
      )}
      {showBanner && !isOffline && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexShrink: 0 }}>
          <span style={{ flex: 1, color: 'var(--text-muted)' }}>Install Purifye for quick access</span>
          <button onClick={doInstall} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Install</button>
          <button onClick={dismissBanner} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>&#215;</button>
        </div>
      )}
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isAccounting ? 0 : 72 }}>
        <Outlet />
      </div>
      {!isAccounting && <BotTabBar />}
    </div>
  )
}
