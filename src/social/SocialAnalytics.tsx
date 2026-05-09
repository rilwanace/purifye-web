import { useState, useEffect } from 'react'
import { api } from '../api'

const IG = '#CF5BA0', FB = '#7068D9', TK = '#5DCAA5', ACC = '#7068D9'

function Sec({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export default function SocialAnalytics() {
  const [period, setPeriod] = useState('30d')
  const [metric, setMetric] = useState('published')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api('/api/social/analytics?period=' + period)
      .then(d => setData(d))
      .catch(() => {})
  }, [period])

  const pub = data?.published || []
  const analytics = data?.analytics || []
  const top = data?.top_performer
  const streak = data?.streak || 0

  // Build chart data by day (last 7 data points for chart)
  const chartDays = (() => {
    const byDay: Record<string, { ig: number; fb: number; tk: number }> = {}
    pub.forEach((r: any) => {
      const day = r.day || r.date
      if (!byDay[day]) byDay[day] = { ig: 0, fb: 0, tk: 0 }
      if (r.platform === 'instagram') byDay[day].ig = r.cnt || 0
      if (r.platform === 'facebook') byDay[day].fb = r.cnt || 0
      if (r.platform === 'tiktok') byDay[day].tk = r.cnt || 0
    })
    if (metric === 'reach' || metric === 'engagement') {
      const byDay2: Record<string, { ig: number; fb: number; tk: number }> = {}
      analytics.forEach((r: any) => {
        const day = r.date
        if (!byDay2[day]) byDay2[day] = { ig: 0, fb: 0, tk: 0 }
        const val = metric === 'reach' ? (r.reach || 0) : (r.likes || 0)
        if (r.platform === 'instagram') byDay2[day].ig += val
        if (r.platform === 'facebook') byDay2[day].fb += val
        if (r.platform === 'tiktok') byDay2[day].tk += val
      })
      return Object.entries(byDay2).slice(-7).map(([d, v]) => ({ day: d.slice(5), ...v }))
    }
    return Object.entries(byDay).slice(-7).map(([d, v]) => ({ day: d.slice(5), ...v }))
  })()

  const maxVal = Math.max(...chartDays.map(d => d.ig + d.fb + d.tk), 1)

  // Platform totals
  const platTotals = { ig: 0, fb: 0, tk: 0 }
  pub.forEach((r: any) => {
    if (r.platform === 'instagram') platTotals.ig += r.cnt || 0
    if (r.platform === 'facebook') platTotals.fb += r.cnt || 0
    if (r.platform === 'tiktok') platTotals.tk += r.cnt || 0
  })
  const totalPub = platTotals.ig + platTotals.fb + platTotals.tk

  const reachTotal = analytics.reduce((s: number, r: any) => s + (r.reach || 0), 0)
  const engTotal = analytics.reduce((s: number, r: any) => s + (r.likes || 0) + (r.comments || 0), 0)
  const reachRate = reachTotal > 0 ? ((engTotal / reachTotal) * 100).toFixed(1) : '0.0'

  const metrics = [
    { id: 'published', label: 'Published', val: totalPub, color: ACC },
    { id: 'reach', label: 'Reach', val: reachTotal >= 1000 ? (reachTotal / 1000).toFixed(1) + 'K' : reachTotal, color: TK },
    { id: 'engagement', label: 'Engagement', val: reachRate + '%', color: IG },
  ]

  const maxPlat = Math.max(platTotals.ig, platTotals.fb, platTotals.tk, 1)

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, margin: '12px 0 10px' }}>
        {['7d', '30d', '90d'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '7px 14px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: 500, cursor: 'pointer', minHeight: 34, border: '1px solid transparent',
            color: period === p ? ACC : '#6a6a64',
            background: period === p ? 'rgba(112,104,217,0.1)' : 'transparent',
            borderColor: period === p ? 'rgba(112,104,217,0.2)' : 'transparent',
          }}>{p}</button>
        ))}
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
        {metrics.map(m => (
          <div key={m.id} onClick={() => setMetric(m.id)} style={{
            textAlign: 'center', padding: '14px 6px', background: '#1a1a18', borderRadius: 10,
            border: '1px solid ' + (metric === m.id ? 'rgba(112,104,217,0.3)' : 'rgba(255,255,255,0.06)'),
            background: metric === m.id ? 'rgba(112,104,217,0.04)' : '#1a1a18',
            cursor: 'pointer',
          } as any}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 500, color: '#9c9b95', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 10px', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', marginBottom: 10 }}>
          {metric.toUpperCase()} ??? BY DAY
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 6, marginBottom: 8 }}>
          {chartDays.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6a64', fontSize: 11 }}>No data yet</div>
          ) : chartDays.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {d.ig > 0 && <div style={{ width: '100%', height: Math.round((d.ig / maxVal) * 80), background: IG, borderRadius: '3px 3px 0 0' }} />}
                {d.fb > 0 && <div style={{ width: '100%', height: Math.round((d.fb / maxVal) * 80), background: FB }} />}
                {d.tk > 0 && <div style={{ width: '100%', height: Math.round((d.tk / maxVal) * 80), background: TK }} />}
                {d.ig === 0 && d.fb === 0 && d.tk === 0 && <div style={{ width: '100%', height: 2, background: '#212120' }} />}
              </div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 4 }}>{d.day}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          {[{ c: IG, l: 'IG' }, { c: FB, l: 'FB' }, { c: TK, l: 'TK' }].map(({ c, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64' }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      <Sec label={metric.charAt(0).toUpperCase() + metric.slice(1) + ' ??? by platform'} />
      <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px 0', marginBottom: 8 }}>
        {[{ name: 'Instagram', val: platTotals.ig, color: IG }, { name: 'Facebook', val: platTotals.fb, color: FB }, { name: 'TikTok', val: platTotals.tk, color: TK }].map(({ name, val, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', minHeight: 44 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0', width: 70 }}>{name}</div>
            <div style={{ flex: 1, height: 6, background: '#212120', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (val / maxPlat * 100) + '%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color, width: 30, textAlign: 'right' }}>{val}</div>
            <span style={{ color: '#6a6a64', fontSize: 10 }}>???</span>
          </div>
        ))}
      </div>

      {top && (
        <>
          <Sec label="Top performer" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(112,104,217,0.04)', border: '1px solid rgba(112,104,217,0.08)', borderRadius: 10, cursor: 'pointer', minHeight: 44, marginBottom: 8 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>????</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0' }}>{(top.caption || '').slice(0, 50)}...</div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 2 }}>{top.platform} ?? {top.date}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ACC, flexShrink: 0 }}>{top.total_reach} reach</div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#212120', borderRadius: 8, borderLeft: '3px solid rgba(93,202,165,0.4)' }}>
        <span style={{ fontSize: 16 }}>????</span>
        <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#9c9b95' }}>Posting streak</div>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: TK }}>{streak} days</div>
      </div>
    </div>
  )
}
