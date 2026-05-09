import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const IG = '#CF5BA0', FB = '#7068D9', TK = '#5DCAA5'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDays7(): Date[] {
  const result: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    result.push(d)
  }
  return result
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ampm
}

export default function SocialCalendar() {
  const [posts, setPosts] = useState<any[]>([])
  const [summaryPeriod, setSummaryPeriod] = useState('7d')
  const nav = useNavigate()

  useEffect(() => {
    const today = new Date()
    const end = new Date(today)
    end.setDate(today.getDate() + 7)
    api('/api/social/posts?limit=200')
      .then(d => setPosts(d.posts || []))
      .catch(() => {})
  }, [])

  const days = getDays7()
  const today = fmtDate(new Date())

  // Group posts by day and platform
  const grouped: Record<string, Record<string, any[]>> = {}
  posts.forEach(post => {
    const day = fmtDate(new Date(post.scheduled_at || post.created_at))
    if (!grouped[day]) grouped[day] = {}
    const plat = post.platform
    if (!grouped[day][plat]) grouped[day][plat] = []
    grouped[day][plat].push(post)
  })

  // Summary counts
  const daysBack = summaryPeriod === '7d' ? 7 : 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const summaryCounts = { instagram: 0, facebook: 0, tiktok: 0 }
  posts.forEach(p => {
    const d = new Date(p.scheduled_at || p.created_at)
    if (d >= cutoff) {
      const plat = p.platform as keyof typeof summaryCounts
      if (plat in summaryCounts) summaryCounts[plat]++
    }
  })

  function PlatCell({ day, platform, color }: { day: string; platform: string; color: string }) {
    const dayPosts = grouped[day]?.[platform] || []
    if (dayPosts.length === 0) return <div style={{ borderRadius: 6, background: '#212120', minHeight: 40 }} />
    const p = dayPosts[0]
    const type = p.post_type || 'Post'
    const time = fmtTime(p.scheduled_at)
    return (
      <div onClick={() => nav('/social/feed')} style={{
        borderRadius: 6, padding: '6px 4px', textAlign: 'center', cursor: 'pointer',
        background: color + '1a', border: '1px solid ' + color + '40',
        minHeight: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {dayPosts.length > 1 && (
          <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 7, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.5)', color }}>
            {dayPosts.length}??
          </span>
        )}
        <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color, textTransform: 'capitalize' }}>{type}</div>
        {time && <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color, opacity: 0.7, marginTop: 2 }}>{time}</div>}
      </div>
    )
  }

  const month = days[0].toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 6px', padding: '8px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e7e0' }}>{month}</div>
      </div>

      <div style={{ background: '#1a1a18', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '42px repeat(3,1fr)', gap: 4, marginBottom: 8 }}>
          <div />
          {[{ color: IG, label: 'IG' }, { color: FB, label: 'FB' }, { color: TK, label: 'TK' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#e8e7e0' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Day rows */}
        {days.map((day) => {
          const dayStr = fmtDate(day)
          const isToday = dayStr === today
          return (
            <div key={dayStr} style={{ display: 'grid', gridTemplateColumns: '42px repeat(3,1fr)', gap: 4, marginBottom: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isToday ? FB : '#9c9b95' }}>
                  {DAYS[day.getDay()].toUpperCase().slice(0, 3)}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: isToday ? FB : '#6a6a64' }}>
                  {day.getDate()}
                </div>
              </div>
              <PlatCell day={dayStr} platform="instagram" color={IG} />
              <PlatCell day={dayStr} platform="facebook" color={FB} />
              <PlatCell day={dayStr} platform="tiktok" color={TK} />
            </div>
          )
        })}

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, padding: '6px 0' }}>
          {[{ c: IG, l: 'Instagram' }, { c: FB, l: 'Facebook' }, { c: TK, l: 'TikTok' }].map(({ c, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#6a6a64', textAlign: 'center', padding: '6px 0' }}>
        Tap any cell to view post details ?? {'>'}1 = multiple posts
      </div>

      {/* Summary section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>Summary</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {['7d', '30d'].map(p => (
          <button key={p} onClick={() => setSummaryPeriod(p)} style={{
            padding: '7px 14px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: 500, cursor: 'pointer', minHeight: 34, border: '1px solid transparent',
            color: summaryPeriod === p ? FB : '#6a6a64',
            background: summaryPeriod === p ? 'rgba(112,104,217,0.1)' : 'transparent',
            borderColor: summaryPeriod === p ? 'rgba(112,104,217,0.2)' : 'transparent',
          }}>Last {p === '7d' ? '7 days' : '30 days'}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {[{ val: summaryCounts.instagram, label: 'Instagram', color: IG }, { val: summaryCounts.facebook, label: 'Facebook', color: FB }, { val: summaryCounts.tiktok, label: 'TikTok', color: TK }].map(({ val, label, color }) => (
          <div key={label} onClick={() => nav('/social/feed')} style={{ textAlign: 'center', padding: '12px 6px', background: '#1a1a18', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', minHeight: 44 }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{val}</div>
            <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 3 }}>{label}</div>
            <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#9c9b95', marginTop: 2 }}>Tap to view ???</div>
          </div>
        ))}
      </div>
    </div>
  )
}
