import { useState, useEffect, useRef } from 'react'
import { api, apiFormData } from '../api'

const ACC = '#7068D9'

const LIB_TABS = ['Templates', 'Hashtags', 'Assets', 'Drafts']

export default function SocialLibrary() {
  const [activeTab, setActiveTab] = useState('Templates')
  const [templates, setTemplates] = useState<any[]>([])
  const [hashSets, setHashSets] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api('/api/social/templates').then(d => setTemplates(d.templates || [])).catch(() => {})
    api('/api/social/hashtags').then(d => setHashSets(d.hashtag_sets || [])).catch(() => {})
    api('/api/social/assets').then(d => setAssets(d.assets || [])).catch(() => {})
    api('/api/social/posts?status=draft').then(d => setDrafts(d.posts || [])).catch(() => {})
  }, [])

  async function uploadAsset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB'); return }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { alert('Please select an image or video file'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('label', file.name)
    try {
      const res = await apiFormData<any>('/api/social/assets', fd)
      if (res.asset) setAssets(prev => [res.asset, ...prev])
    } catch (e) {}
  }

  async function deleteHashSet(id: string) {
    await api('/api/social/hashtags/' + id, { method: 'DELETE' })
    setHashSets(prev => prev.filter(h => h.id !== id))
  }

  const Badge = ({ label, color }: any) => (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: color + '1a', color, marginRight: 4 }}>{label}</span>
  )

  const platBadge = (plats: string[]) => {
    const map: Record<string, { label: string; color: string }> = {
      instagram: { label: 'IG', color: '#CF5BA0' },
      facebook: { label: 'FB', color: ACC },
      tiktok: { label: 'TK', color: '#5DCAA5' },
    }
    return (plats || []).map(p => map[p] ? <Badge key={p} label={map[p].label} color={map[p].color} /> : null)
  }

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 8px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates, hashtags, assets..."
          style={{
            flex: 1, background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#e8e7e0',
            fontFamily: 'var(--font-sans)', outline: 'none', colorScheme: 'dark', minHeight: 44,
          }}
        />
        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9c9b95' }}>
          ???
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {LIB_TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '7px 14px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: 11,
            fontWeight: 600, cursor: 'pointer', minHeight: 34, border: '1px solid transparent',
            color: activeTab === t ? ACC : '#6a6a64',
            background: activeTab === t ? 'rgba(112,104,217,0.1)' : 'transparent',
            borderColor: activeTab === t ? 'rgba(112,104,217,0.2)' : 'transparent',
          }}>{t}</button>
        ))}
      </div>

      {/* Templates tab */}
      {activeTab === 'Templates' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Post templates</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {templates.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase())).map(t => (
            <div key={t.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(112,104,217,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{t.icon || '????'}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e7e0' }}>{t.name}</div>
                  <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 2 }}>Used {t.use_count || 0} times</div>
                </div>
              </div>
              {t.structure && (
                <div style={{ fontSize: 11, color: '#9c9b95', lineHeight: 1.5, padding: '8px 10px', background: '#212120', borderRadius: 6, marginBottom: 8 }}>{t.structure}</div>
              )}
              <div>{platBadge(t.platforms || [])}</div>
            </div>
          ))}
          {templates.length === 0 && <div style={{ color: '#6a6a64', fontSize: 12, padding: '20px 0' }}>No templates yet</div>}
        </>
      )}

      {/* Hashtags tab */}
      {activeTab === 'Hashtags' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Saved hashtag sets</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {hashSets.filter(h => !search || h.name?.toLowerCase().includes(search.toLowerCase())).map(h => (
            <div key={h.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0' }}>{h.icon || '???????'} {h.name}</div>
                <button onClick={() => deleteHashSet(h.id)} style={{ background: 'none', border: 'none', color: '#6a6a64', cursor: 'pointer', fontSize: 16 }}>??</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(Array.isArray(h.tags) ? h.tags : []).map((tag: string) => (
                  <span key={tag} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: ACC, padding: '3px 8px', background: 'rgba(112,104,217,0.08)', borderRadius: 6 }}>{tag}</span>
                ))}
              </div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 6 }}>{(Array.isArray(h.tags) ? h.tags : []).length} tags</div>
            </div>
          ))}
          {hashSets.length === 0 && <div style={{ color: '#6a6a64', fontSize: 12, padding: '20px 0' }}>No hashtag sets yet</div>}
        </>
      )}

      {/* Assets tab */}
      {activeTab === 'Assets' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Brand assets</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadAsset} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {assets.map(a => (
              <div key={a.id}>
                <div style={{ aspectRatio: '1', background: '#212120', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', minHeight: 44, cursor: 'pointer' }}>
                  {a.thumbnail_url ? (
                    <img src={a.thumbnail_url} alt={a.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>???????</span>
                  )}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6a6a64', textAlign: 'center', marginTop: 4 }}>{a.label}</div>
              </div>
            ))}
            <div onClick={() => fileRef.current?.click()}>
              <div style={{ aspectRatio: '1', borderRadius: 8, border: '1px dashed rgba(112,104,217,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: ACC, cursor: 'pointer', minHeight: 44 }}>+</div>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: ACC, textAlign: 'center', marginTop: 4 }}>Upload</div>
            </div>
          </div>
        </>
      )}

      {/* Drafts tab */}
      {activeTab === 'Drafts' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Saved drafts</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {drafts.filter(d => !search || d.caption?.toLowerCase().includes(search.toLowerCase())).map(d => (
            <div key={d.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginBottom: 6, textTransform: 'capitalize' }}>{d.platform} ?? {d.post_type}</div>
              <div style={{ fontSize: 12, color: '#9c9b95', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>{d.caption}</div>
            </div>
          ))}
          {drafts.length === 0 && <div style={{ color: '#6a6a64', fontSize: 12, padding: '20px 0' }}>No drafts yet</div>}
        </>
      )}
    </div>
  )
}
