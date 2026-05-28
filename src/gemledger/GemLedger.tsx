import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import GemLedgerDashboard from './GemLedgerDashboard'
import GemLedgerStockDrill from './GemLedgerStockDrill'
import GemLedgerTypeDrill from './GemLedgerTypeDrill'
import GemLedgerLocationDrill from './GemLedgerLocationDrill'
import { InvestmentsList, InvestorDetail } from './GemLedgerInvestments'
import GemLedgerStoneDetail from './GemLedgerStoneDetail'
import GemLedgerSold from './GemLedgerSold'
import GemLedgerSearch from './GemLedgerSearch'
import GemLedgerBottomNav from './GemLedgerBottomNav'
import GemLedgerSharePage from './GemLedgerSharePage'
import GemLedgerImport from './GemLedgerImport'
import {
  AddLotForm, AddPartyForm, AddInvestmentForm, ReceiveFromProcessingForm,
} from './GemLedgerForms'

const C = {
  bg: '#0a0f0a', border: '#1e2e1e', t1: '#e0e8e0', t3: '#8a9a8a',
  green: '#34d399',
}

// ── Drill state ───────────────────────────────────────────────────────────────
type Drill =
  | null
  | { kind: 'stock'; status: 'rough' | 'cut' | 'wip' }
  | { kind: 'type'; id: string; name: string; color: string }
  | { kind: 'location'; loc: 'with_me' | 'on_approval' }
  | { kind: 'investments' }
  | { kind: 'investor'; id: string; name: string }

function GemLedgerApp() {
  const [tab, setTab] = useState<'dashboard' | 'sold' | 'settings'>('dashboard')
  const [drill, setDrill] = useState<Drill>(null)
  const [activeLotId, setActiveLotId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionForm, setActionForm] = useState<string | null>(null)

  function refresh() { setRefreshKey(k => k + 1) }

  function handleTab(t: 'dashboard' | 'sold' | 'settings') {
    setTab(t); setDrill(null); setActiveLotId(null); setShowSearch(false)
  }

  function openLot(id: string) { setActiveLotId(id) }

  function openReceiveProcessing(lotId: string) {
    setActiveLotId(null)
    setActionForm('receive:' + lotId)
  }

  const title = drill?.kind === 'stock' ? drill.status.charAt(0).toUpperCase() + drill.status.slice(1)
    : drill?.kind === 'type' ? drill.name
    : drill?.kind === 'location' ? (drill.loc === 'with_me' ? 'With Me' : 'On Approval')
    : drill?.kind === 'investments' || drill?.kind === 'investor' ? 'Investments'
    : 'GemLedger'

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top bar */}
      {!showSearch && !activeLotId && (
        <div style={{
          padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}`,
          background: C.bg, position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {drill && (
              <button onClick={() => {
                if (drill.kind === 'investor') setDrill({ kind: 'investments' })
                else setDrill(null)
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: C.t3, fontSize: 18 }}>←</button>
            )}
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 18 }}>
              <span style={{ color: C.green }}>💎 </span>
              <span style={{ color: C.t1 }}>{title}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSearch(true)} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.t3, minWidth: 44, minHeight: 44, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔍</button>
            <button onClick={() => setShowMenu(m => !m)} style={{
              background: C.green, border: 'none', borderRadius: 8,
              color: '#0a0f0a', minWidth: 44, minHeight: 44, cursor: 'pointer', fontSize: 20, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
        </div>
      )}

      {/* Action menu */}
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'fixed', top: 62, right: 16, zIndex: 61,
            background: '#1a2a1a', border: `1px solid ${C.border}`, borderRadius: 12,
            overflow: 'hidden', minWidth: 180,
          }}>
            {[
              ['Add stone / lot', 'lot'],
              ['Add party', 'party'],
              ['Add investment', 'investment'],
            ].map(([label, key]) => (
              <button key={key} onClick={() => { setActionForm(key); setShowMenu(false) }} style={{
                width: '100%', padding: '13px 16px', background: 'transparent', border: 'none',
                borderBottom: `1px solid ${C.border}`, color: C.t1, fontFamily: 'DM Sans',
                fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>{label}</button>
            ))}
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {tab === 'dashboard' && !drill && (
          <GemLedgerDashboard
            refreshKey={refreshKey}
            onDrill={(type, params) => {
              if (type === 'stock') setDrill({ kind: 'stock', status: params.status })
              else if (type === 'location') setDrill({ kind: 'location', loc: params.loc })
              else if (type === 'investments') setDrill({ kind: 'investments' })
            }}
            onTypeDrill={(id, name, color) => setDrill({ kind: 'type', id, name, color })}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'stock' && (
          <GemLedgerStockDrill
            status={drill.status}
            onBack={() => setDrill(null)}
            onLot={openLot}
            onReceiveProcessing={openReceiveProcessing}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'type' && (
          <GemLedgerTypeDrill
            stoneTypeId={drill.id}
            stoneTypeName={drill.name}
            color={drill.color}
            onBack={() => setDrill(null)}
            onLot={openLot}
            onReceiveProcessing={openReceiveProcessing}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'location' && (
          <GemLedgerLocationDrill
            loc={drill.loc}
            onBack={() => setDrill(null)}
            onLot={openLot}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'investments' && (
          <InvestmentsList
            onBack={() => setDrill(null)}
            onInvestorDetail={(id, name) => setDrill({ kind: 'investor', id, name })}
            refreshKey={refreshKey}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'investor' && (
          <InvestorDetail
            investmentId={drill.id}
            investmentName={drill.name}
            onBack={() => setDrill({ kind: 'investments' })}
            onLot={openLot}
          />
        )}

        {tab === 'sold' && (
          <div style={{ paddingTop: 12 }}>
            <GemLedgerSold refreshKey={refreshKey} />
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ padding: '24px 16px', fontFamily: 'DM Sans' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚙</div>
              <div style={{ fontSize: 16, color: '#c0ccc0', marginBottom: 4 }}>GemLedger Settings</div>
              <div style={{ fontSize: 13, color: C.t3 }}>Manage stone types, parties, and preferences.</div>
            </div>
            <button
              onClick={() => setShowImport(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px', background: '#111a11',
                border: `1px solid ${C.border}`, borderRadius: 12,
                cursor: 'pointer', textAlign: 'left', minHeight: 64,
              }}
            >
              <span style={{ fontSize: 24 }}>📊</span>
              <div>
                <div style={{ fontSize: 15, color: C.t1, fontWeight: 600, marginBottom: 2 }}>
                  Import from Excel
                </div>
                <div style={{ fontSize: 12, color: C.t3 }}>
                  Import lots from .xlsx, .xls, or .csv files
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: C.t3, fontSize: 16 }}>›</span>
            </button>
          </div>
        )}
      </div>

      {/* Stone detail overlay */}
      {activeLotId && (
        <GemLedgerStoneDetail
          lotId={activeLotId}
          onClose={() => setActiveLotId(null)}
          onRefresh={refresh}
        />
      )}

      {/* Search overlay */}
      {showSearch && (
        <GemLedgerSearch onClose={() => setShowSearch(false)} onLot={id => { setActiveLotId(id); setShowSearch(false) }} />
      )}

      {/* Import wizard overlay */}
      {showImport && (
        <GemLedgerImport
          onClose={() => setShowImport(false)}
          onDone={refresh}
        />
      )}

      {/* Action forms */}
      {actionForm === 'lot' && <AddLotForm onClose={() => setActionForm(null)} onSaved={refresh} />}
      {actionForm === 'party' && <AddPartyForm onClose={() => setActionForm(null)} onSaved={refresh} />}
      {actionForm === 'investment' && <AddInvestmentForm onClose={() => setActionForm(null)} onSaved={refresh} />}
      {actionForm?.startsWith('receive:') && (
        <ReceiveFromProcessingForm
          lotId={actionForm.split(':')[1]}
          onClose={() => setActionForm(null)}
          onSaved={refresh}
        />
      )}

      {/* Bottom nav */}
      <GemLedgerBottomNav tab={tab} onTab={handleTab} />
    </div>
  )
}

export default function GemLedger() {
  return (
    <Routes>
      <Route path="s/:token" element={<GemLedgerSharePage />} />
      <Route path="*" element={<GemLedgerApp />} />
    </Routes>
  )
}
