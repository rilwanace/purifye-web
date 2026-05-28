import { useState, useEffect } from 'react'
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
import { AddLotForm, AddPartyForm, AddInvestmentForm, TransferForm } from './GemLedgerForms'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'

const C = {
  bg: '#0a0f0a', bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399',
}

type Drill =
  | null
  | { kind: 'stock'; status: 'rough' | 'cut' | 'wip' }
  | { kind: 'type'; id: string; name: string; color: string }
  | { kind: 'location'; loc: 'with_me' | 'on_approval' }
  | { kind: 'investments' }
  | { kind: 'investor'; id: string; name: string }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: on ? C.green : '#2a3a2a', position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.2s',
      }} />
    </button>
  )
}

function GemLedgerApp() {
  const [tab, setTab] = useState<'dashboard' | 'sold' | 'settings'>('dashboard')
  const [drill, setDrill] = useState<Drill>(null)
  const [activeLotId, setActiveLotId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionForm, setActionForm] = useState<string | null>(null)
  const [transferLot, setTransferLot] = useState<Lot | null>(null)
  const [wipEnabled, setWipEnabled] = useState(true)

  useEffect(() => {
    gemApi.getSettings()
      .then(s => { setWipEnabled(s.wip_enabled !== 'false') })
      .catch(() => {})
  }, [])

  function refresh() { setRefreshKey(k => k + 1) }

  function handleTab(t: 'dashboard' | 'sold' | 'settings') {
    setTab(t); setDrill(null); setActiveLotId(null); setShowSearch(false)
  }

  function openLot(id: string) { setActiveLotId(id) }

  function openTransfer(lot: Lot) {
    setTransferLot(lot)
  }

  function handleWipToggle(v: boolean) {
    setWipEnabled(v)
    gemApi.saveSettings({ wip_enabled: v }).catch(() => {})
  }

  const title = drill?.kind === 'stock' ? drill.status.charAt(0).toUpperCase() + drill.status.slice(1)
    : drill?.kind === 'type' ? drill.name
    : drill?.kind === 'location' ? (drill.loc === 'with_me' ? 'With Me' : 'On Approval')
    : drill?.kind === 'investments' || drill?.kind === 'investor' ? 'Investments'
    : 'GemLedger'

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: C.t3, fontSize: 18 }}>&#8592;</button>
            )}
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 18 }}>
              <span style={{ color: C.green }}>&#128142; </span>
              <span style={{ color: C.t1 }}>{title}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSearch(true)} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.t3, minWidth: 44, minHeight: 44, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>&#128269;</button>
            <button onClick={() => setShowMenu(m => !m)} style={{
              background: C.green, border: 'none', borderRadius: 8,
              color: '#0a0f0a', minWidth: 44, minHeight: 44, cursor: 'pointer', fontSize: 20, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
        </div>
      )}

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

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {tab === 'dashboard' && !drill && (
          <GemLedgerDashboard
            refreshKey={refreshKey}
            wipEnabled={wipEnabled}
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
            onTransfer={openTransfer}
          />
        )}

        {tab === 'dashboard' && drill?.kind === 'type' && (
          <GemLedgerTypeDrill
            stoneTypeId={drill.id}
            stoneTypeName={drill.name}
            color={drill.color}
            onBack={() => setDrill(null)}
            onLot={openLot}
            onTransfer={openTransfer}
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
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#9881;</div>
              <div style={{ fontSize: 16, color: '#c0ccc0', marginBottom: 4 }}>GemLedger Settings</div>
              <div style={{ fontSize: 13, color: C.t3 }}>Manage stone types, parties, and preferences.</div>
            </div>

            {/* WIP toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', background: C.bg2,
              border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12,
              minHeight: 64,
            }}>
              <div>
                <div style={{ fontSize: 15, color: C.t1, fontWeight: 600, marginBottom: 2 }}>WIP Processing</div>
                <div style={{ fontSize: 12, color: C.t3 }}>Show cutting, heating, polishing, preform stages</div>
              </div>
              <Toggle on={wipEnabled} onChange={handleWipToggle} />
            </div>

            <button
              onClick={() => setShowImport(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px', background: C.bg2,
                border: `1px solid ${C.border}`, borderRadius: 12,
                cursor: 'pointer', textAlign: 'left', minHeight: 64,
              }}
            >
              <span style={{ fontSize: 24 }}>&#128202;</span>
              <div>
                <div style={{ fontSize: 15, color: C.t1, fontWeight: 600, marginBottom: 2 }}>Import from Excel</div>
                <div style={{ fontSize: 12, color: C.t3 }}>Import lots from .xlsx, .xls, or .csv files</div>
              </div>
              <span style={{ marginLeft: 'auto', color: C.t3, fontSize: 16 }}>&#8250;</span>
            </button>
          </div>
        )}
      </div>

      {activeLotId && (
        <GemLedgerStoneDetail
          lotId={activeLotId}
          onClose={() => setActiveLotId(null)}
          onRefresh={refresh}
          wipEnabled={wipEnabled}
        />
      )}

      {showSearch && (
        <GemLedgerSearch onClose={() => setShowSearch(false)} onLot={id => { setActiveLotId(id); setShowSearch(false) }} />
      )}

      {showImport && (
        <GemLedgerImport
          onClose={() => setShowImport(false)}
          onDone={refresh}
        />
      )}

      {actionForm === 'lot' && <AddLotForm onClose={() => setActionForm(null)} onSaved={refresh} />}
      {actionForm === 'party' && <AddPartyForm onClose={() => setActionForm(null)} onSaved={refresh} />}
      {actionForm === 'investment' && <AddInvestmentForm onClose={() => setActionForm(null)} onSaved={refresh} />}

      {transferLot && (
        <TransferForm
          lot={transferLot}
          onClose={() => setTransferLot(null)}
          onSaved={refresh}
          wipEnabled={wipEnabled}
        />
      )}

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