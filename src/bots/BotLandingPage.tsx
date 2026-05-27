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
    emoji: '📊',
    glow: 'rgba(93,202,165,0.3)',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    subtitle: 'Stock & recipes',
    path: '/inventory',
    accent: '#E86B3A',
    gradient: 'linear-gradient(145deg, #EE7844, #B84D22)',
    emoji: '📦',
    glow: 'rgba(232,107,58,0.3)',
  },
  {
    id: 'social',
    label: 'Social',
    subtitle: 'Content & posts',
    path: '/social/analytics',
    accent: '#7068D9',
    gradient: 'linear-gradient(145deg, #7068D9, #4840A3)',
    emoji: '📣',
    glow: 'rgba(112,104,217,0.3)',
  },
  {
    id: 'customers',
    label: 'Customers',
    subtitle: 'CRM & follow-ups',
    path: '/customers',
    accent: '#CF5BA0',
    gradient: 'linear-gradient(145deg, #CF5BA0, #8A3063)',
    emoji: '👥',
    glow: 'rgba(207,91,160,0.3)',
  },
  {
    id: 'planner',
    label: 'Planner',
    subtitle: 'Tasks & goals',
    path: '/planner',
    accent: '#D4A843',
    gradient: 'linear-gradient(145deg, #D4A843, #9E7B28)',
    emoji: '📅',
    glow: 'rgba(212,168,67,0.3)',
  },
  {
    id: 'personal',
    label: 'Personal',
    subtitle: 'Life admin',
    path: '/personal',
    accent: '#5B8DEF',
    gradient: 'linear-gradient(135deg, #5B8DEF, #3A63B8)',
    emoji: '🧠',
    glow: 'rgba(91,141,239,0.3)',
  },
  {
    id: "gemledger",
    label: "GemLedger",
    subtitle: "Gem inventory",
    path: "/gemledger",
    accent: "#34d399",
    gradient: "linear-gradient(135deg, #34d399, #059669)",
    emoji: "💎",
    glow: "rgba(52,211,153,0.3)",
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
  const bottomBots = BOTS.slice(4)

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {bottomBots.map(bot => {
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
        WebkitUserSelect: 'none' as any,
        userSelect: 'none' as any,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: bot.gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        flexShrink: 0,
        fontSize: 22,
        boxShadow: subscribed ? `0 8px 32px ${bot.glow}` : 'none',
      }}>
        {bot.emoji}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{bot.label}</div>
      <div style={{ fontSize: 11, color: '#f0f0f0', marginTop: 3, opacity: 0.7 }}>{bot.subtitle}</div>
    </button>
  )
}
