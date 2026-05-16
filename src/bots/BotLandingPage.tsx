import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../api'
import TopBar from '../shell/TopBar'

const BOTS = [
  {
    id: 'accounting',
    label: 'Accounting',
    subtitle: 'Books & reports',
    path: '/accounting/dashboard',
    accent: '#5DCAA5',
    gradient: 'linear-gradient(145deg, #28997A, #13654C)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="7" y1="8" x2="17" y2="8"/>
        <line x1="7" y1="12" x2="17" y2="12"/>
        <line x1="7" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'inventory',
    label: 'Inventory',
    subtitle: 'Stock & recipes',
    path: '/inventory',
    accent: '#E86B3A',
    gradient: 'linear-gradient(145deg, #EE7844, #B84D22)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'social',
    label: 'Social',
    subtitle: 'Content & posts',
    path: '/social/analytics',
    accent: '#7068D9',
    gradient: 'linear-gradient(145deg, #7068D9, #4840A3)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <circle cx="12" cy="17" r="1.5" fill="white" stroke="none"/>
        <line x1="9" y1="7" x2="15" y2="7"/>
      </svg>
    ),
  },
  {
    id: 'customers',
    label: 'Customers',
    subtitle: 'CRM & follow-ups',
    path: '/customers',
    accent: '#CF5BA0',
    gradient: 'linear-gradient(145deg, #CF5BA0, #8A3063)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'planner',
    label: 'Planner',
    subtitle: 'Tasks & goals',
    path: '/planner',
    accent: '#D4A843',
    gradient: 'linear-gradient(145deg, #D4A843, #9E7B28)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="8" cy="15" r="1" fill="white" stroke="none"/>
        <circle cx="12" cy="15" r="1" fill="white" stroke="none"/>
        <circle cx="16" cy="15" r="1" fill="white" stroke="none"/>
      </svg>
    ),
  },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function BotLandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscribedBots, setSubscribedBots] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  const firstName = user?.name?.split(' ')[0] ?? ''

  useEffect(() => {
    api<{ bot_ids: string[] }>('/api/bots/subscriptions')
      .then(res => setSubscribedBots(res.bot_ids))
      .catch(() => setSubscribedBots(['accounting']))
      .finally(() => setLoaded(true))
  }, [])

  function handleBotTap(bot: typeof BOTS[0]) {
    if (subscribedBots.includes(bot.id)) {
      navigate(bot.path)
    }
  }

  const mainBots = BOTS.slice(0, 4)
  const lastBot = BOTS[4]

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#131311' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '24px 16px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#f0f0f0', marginBottom: 6 }}>
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{ fontSize: 13, color: '#6a6a64' }}>
            Choose a bot to get started
          </div>
        </div>

        {loaded && (
          <div style={{ padding: '16px 16px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {mainBots.map(bot => {
                const subscribed = subscribedBots.includes(bot.id)
                return (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    subscribed={subscribed}
                    onTap={() => handleBotTap(bot)}
                  />
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <div style={{ width: 'calc(50% - 6px)' }}>
                <BotCard
                  bot={lastBot}
                  subscribed={subscribedBots.includes(lastBot.id)}
                  onTap={() => handleBotTap(lastBot)}
                />
              </div>
            </div>
          </div>
        )}

        {!loaded && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid #5DCAA5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
      </div>
    </div>
  )
}

function BotCard({ bot, subscribed, onTap }: {
  bot: typeof BOTS[0]
  subscribed: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        background: 'transparent',
        border: `1.5px solid ${subscribed ? bot.accent : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: subscribed ? 'pointer' : 'default',
        opacity: subscribed ? 1 : 0.4,
        fontFamily: 'var(--font-sans)',
        transition: 'opacity 0.15s',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: bot.gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        flexShrink: 0,
      }}>
        {bot.icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{bot.label}</div>
      <div style={{ fontSize: 11, color: '#f0f0f0', marginTop: 3, opacity: 0.7 }}>{bot.subtitle}</div>
    </button>
  )
}
