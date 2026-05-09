import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const IG = '#CF5BA0', FB = '#7068D9', TK = '#5DCAA5'

const PLAT_COLOR: Record<string, string> = { instagram: IG, facebook: FB, tiktok: TK }
const PLAT_LABEL: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }

function fmtTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ampm
}

function fmtDay(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dd = new Date(d)
  dd.setHours(0, 0, 0, 0)
  if (dd.getTime() === today.getTime()) return 'Today'
  if (dd.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function SocialFeed() {
  const [posts, setPosts] = useState<any[]>([])
  const nav = useNavigate()

  useEffect(() => {
    api('/api/social/posts?limit=100')
      .then(d => setPosts(d.posts || []))
      .catch(() => {})
  }, [])

  async function approvePost(id: string) {
    try {
      await api('/api/social/posts/' + id, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p))
    } catch (e: any) {
      alert('Failed: ' + e.message)
    }
  }

  // Group by day label
  const grouped: Record<string, any[]> = {}
  posts.forEach(p => {
    const key = fmtDay(p.scheduled_at || p.created_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  // Today queue count
  const todayPosts = grouped['Today'] || []
  const approvedToday = todayPosts.filter(p => p.status === 'approved')

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      {/* Today strip */}
      {todayPosts.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Today</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ background: 'rgba(112,104,217,0.06)', border: '1px solid rgba(112,104,217,0.10)', borderRadius: 10, padding: '12px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7068D9', fontWeight: 500, marginBottom: 4 }}>TODAY'S QUEUE</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e7e0' }}>{todayPosts.length} post{todayPosts.length !== 1 ? 's' : ''} scheduled</div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#9c9b95', marginTop: 3 }}>
                {approvedToday.map(p => PLAT_LABEL[p.platform] + ' ' + fmtTime(p.scheduled_at)).join(' ?? ')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#7068D9' }}>{todayPosts.length}</div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64' }}>TO POST</div>
            </div>
          </div>
        </>
      )}

      {/* Posts by day */}
      {Object.entries(grouped).map(([day, dayPosts]) => (
        <div key={day}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>{day}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {dayPosts.map((post, idx) => {
            const color = PLAT_COLOR[post.platform] || '#9c9b95'
            const isApproved = post.status === 'approved' || post.status === 'scheduled'
            const isPublished = post.status === 'published'
            const tags = Array.isArray(post.hashtags) ? post.hashtags.slice(0, 5).join(' ') : ''
            return (
              <div key={post.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, flexShrink: 0, paddingTop: 2 }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 500, color: '#9c9b95' }}>{fmtTime(post.scheduled_at)}</div>
                    {idx < dayPosts.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0 0', minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0' }}>{PLAT_LABEL[post.platform]}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 6, background: color + '1a', color }}>
                        {post.post_type || 'Post'}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 6,
                        background: isPublished ? 'rgba(93,202,165,0.1)' : isApproved ? 'rgba(93,202,165,0.1)' : 'rgba(232,137,79,0.1)',
                        color: isPublished ? TK : isApproved ? TK : '#E8894F',
                      }}>
                        {isPublished ? '??? Published' : isApproved ? '??? Approved' : 'Draft'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#9c9b95', lineHeight: 1.5, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                      {post.caption}
                    </div>
                    {tags && <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginBottom: 8 }}>{tags}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isApproved && !isPublished && (
                        <button style={{ padding: '7px 14px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(112,104,217,0.20)', background: 'rgba(112,104,217,0.10)', color: FB, fontFamily: 'var(--font-sans)', minHeight: 32, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ??? Auto Publish
                        </button>
                      )}
                      {!isApproved && !isPublished && (
                        <button onClick={() => approvePost(post.id)} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,202,165,0.10)', color: TK, fontFamily: 'var(--font-sans)', minHeight: 32 }}>
                          ??? Approve
                        </button>
                      )}
                      <button onClick={() => nav('/social/editor', { state: { post } })} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.04)', color: '#9c9b95', fontFamily: 'var(--font-sans)', minHeight: 32 }}>
                        ?????? Edit
                      </button>
                      <button onClick={() => navigator.clipboard?.writeText((post.caption || '') + '\n' + tags)} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', color: '#9c9b95', fontFamily: 'var(--font-sans)', minHeight: 32 }}>
                        ???? Copy
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 500, color: '#6a6a64', marginTop: 6 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: isApproved ? TK : '#E8894F' }} />
                      {isApproved ? 'API connected ?? Auto-publishes at ' + fmtTime(post.scheduled_at) : 'No API ?? Copy caption to post manually'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6a6a64', fontSize: 13 }}>
          No posts yet ??? go to Create to generate your first post
        </div>
      )}
    </div>
  )
}
