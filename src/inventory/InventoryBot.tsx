import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { inv } from './api'
import InventoryDash from './InventoryDash'
import StockList from './StockList'
import ProductDetail from './ProductDetail'
import ManualEntry from './ManualEntry'
import PhysicalCounts from './PhysicalCounts'
import POList from './POList'
import PODetail from './PODetail'
import WastageView from './WastageView'
import MismatchView from './MismatchView'
import ImportWizard from './ImportWizard'
import SuppliersView from './SuppliersView'
import SettingsView from './SettingsView'

const INV = '#E86B3A'

type View =
  | 'dash' | 'stock' | 'product'
  | 'entry' | 'counts' | 'pos' | 'po-detail'
  | 'wastage' | 'mismatch' | 'import'
  | 'suppliers' | 'settings'

const FAB_ITEMS = [
  { icon: '📷', label: 'Photo / OCR', sublabel: 'Snap a receipt or delivery note', color: '#5DCAA5', action: 'import' as const },
  { icon: '🎤', label: 'Voice', sublabel: '"Got 10kg chicken from Keells"', color: '#D4A843', action: 'entry' as const },
  { icon: '📂', label: 'Import File', sublabel: 'CSV or Excel — sales, purchases', color: '#5B8DEF', action: 'import' as const },
  { icon: '✏️', label: 'Manual Entry', sublabel: 'Purchase, sale, adjustment, wastage', color: '#E86B3A', action: 'entry' as const },
]

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: INV, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 4 }}
    >
      ‹ Back
    </button>
  )
}

function Header({
  title, left, right, showPills, activeTab, onTabChange,
}: {
  title: string
  left?: React.ReactNode
  right?: React.ReactNode
  showPills?: boolean
  activeTab?: 'dash' | 'stock'
  onTabChange?: (t: 'dash' | 'stock') => void
}) {
  return (
    <div style={{
      position: 'sticky', top: 0,
      background: '#131311',
      borderBottom: '1px solid rgba(255,255,255,.06)',
      zIndex: 30,
      padding: showPills ? '12px 16px 0' : '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: showPills ? 10 : 0 }}>
        {left && <div style={{ flexShrink: 0 }}>{left}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#e8e7e0', fontWeight: 700, fontSize: 15 }}>{title}</div>
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {showPills && (
        <div style={{ display: 'flex', gap: 6, paddingBottom: 10 }}>
          {(['dash', 'stock'] as const).map(t => {
            const active = activeTab === t
            return (
              <button
                key={t}
                onClick={() => onTabChange?.(t)}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: active ? '1px solid rgba(232,107,58,0.2)' : '1px solid transparent',
                  background: active ? 'rgba(232,107,58,0.1)' : 'transparent',
                  color: active ? INV : '#9c9b95',
                  cursor: 'pointer',
                }}
              >
                {t === 'dash' ? 'Dashboard' : 'Full Stock'}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function InventoryBot() {
  useAuth()

  const [view, setView] = useState<View>('dash')
  const [activeTab, setActiveTab] = useState<'dash' | 'stock'>('dash')
  const [prevTab, setPrevTab] = useState<'dash' | 'stock'>('dash')
  const [dashData, setDashData] = useState<any>(null)
  const [stock, setStock] = useState<any[]>([])
  const [pos, setPOs] = useState<any[]>([])
  const [wastage, setWastage] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [mismatchData, setMismatchData] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedPO, setSelectedPO] = useState<string | null>(null)
  const [entryType, setEntryType] = useState<string>('purchases')
  const [entryProductId, setEntryProductId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [showFabSheet, setShowFabSheet] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, stockRes, poRes, wastageRes, supRes] = await Promise.all([
        inv.dashboard().catch(() => null),
        inv.stock().catch(() => ({ stock: [] })),
        inv.pos().catch(() => ({ pos: [] })),
        inv.wastage().catch(() => ({ wastage: [] })),
        inv.suppliers().catch(() => ({ suppliers: [] })),
      ])
      if (dash) setDashData(dash)
      setStock(stockRes?.stock || [])
      setPOs(poRes?.pos || [])
      setWastage(wastageRes?.wastage || [])
      setSuppliers(supRes?.suppliers || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  function go(v: View) {
    setView(v)
    window.scrollTo(0, 0)
  }

  function onTabChange(t: 'dash' | 'stock') {
    setActiveTab(t)
    go(t)
  }

  function openProduct(id: string) {
    setPrevTab(activeTab)
    setSelectedProduct(id)
    go('product')
  }

  function openEntry(type: string = 'purchases', productId?: string) {
    setEntryType(type)
    setEntryProductId(productId)
    go('entry')
  }

  function openPO(id: string | null) {
    setSelectedPO(id)
    go('po-detail')
  }

  function openDraftPO(_productId?: string) {
    setSelectedPO(null)
    go('po-detail')
  }

  async function loadMismatch() {
    const data = await inv.mismatch().catch(() => ({ mismatches: [], summary: {} }))
    setMismatchData(data)
    go('mismatch')
  }

  function handleFabAction(action: 'import' | 'entry') {
    setShowFabSheet(false)
    if (action === 'import') go('import')
    else openEntry('purchases')
  }

  const isMainView = view === 'dash' || view === 'stock'

  function getTitle() {
    if (isMainView) return 'Inventory'
    switch (view) {
      case 'product': return 'Product Detail'
      case 'entry': return 'Manual Entry'
      case 'counts': return 'Physical Counts'
      case 'pos': return 'Purchase Orders'
      case 'po-detail': return selectedPO ? 'Purchase Order' : 'New PO'
      case 'wastage': return 'Wastage Log'
      case 'mismatch': return 'Stock Mismatches'
      case 'import': return 'Import Data'
      case 'suppliers': return 'Suppliers'
      case 'settings': return 'Inventory Settings'
      default: return 'Inventory'
    }
  }

  function handleBack() {
    if (view === 'product') { setActiveTab(prevTab); go(prevTab) }
    else if (view === 'po-detail') go('pos')
    else if (view === 'entry') go(activeTab)
    else if (view === 'suppliers') go('settings')
    else { setActiveTab('dash'); go('dash') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#131311', color: '#e8e7e0' }}>
      <Header
        title={getTitle()}
        left={!isMainView ? <BackButton onClick={handleBack} /> : undefined}
        right={isMainView ? (
          <button
            onClick={() => go('settings')}
            style={{ width: 36, height: 36, border: '1px solid rgba(255,255,255,.06)', borderRadius: 6, background: 'none', color: '#9c9b95', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >⚙️</button>
        ) : view === 'pos' ? (
          <button
            onClick={() => openPO(null)}
            style={{ background: INV, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 10px', cursor: 'pointer' }}
          >+ New</button>
        ) : undefined}
        showPills={isMainView}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {loading && view === 'dash' ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9c9b95' }}>Loading…</div>
      ) : (
        <>
          {view === 'dash' && (
            <InventoryDash
              data={dashData}
              onProduct={openProduct}
              onDraftPO={openDraftPO}
              onMismatch={loadMismatch}
              onWastage={() => go('wastage')}
              onPOs={() => go('pos')}
            />
          )}
          {view === 'stock' && (
            <StockList stock={stock} onProduct={openProduct} />
          )}
          {view === 'product' && selectedProduct && (
            <ProductDetail
              productId={selectedProduct}
              onBack={handleBack}
              onEntry={openEntry}
              onDraftPO={openDraftPO}
            />
          )}
          {view === 'entry' && (
            <ManualEntry
              stock={stock}
              initialType={entryType}
              initialProductId={entryProductId}
              onDone={() => { loadAll(); handleBack() }}
              onBack={handleBack}
            />
          )}
          {view === 'counts' && (
            <PhysicalCounts stock={stock} onBack={handleBack} />
          )}
          {view === 'pos' && (
            <POList pos={pos} onNew={() => openPO(null)} onPO={openPO} />
          )}
          {view === 'po-detail' && (
            <PODetail
              poId={selectedPO}
              stock={stock}
              suppliers={suppliers}
              onBack={handleBack}
              onDeleted={() => { loadAll(); go('pos') }}
            />
          )}
          {view === 'wastage' && (
            <WastageView wastage={wastage} onBack={handleBack} />
          )}
          {view === 'mismatch' && (
            <MismatchView
              data={mismatchData}
              onBack={handleBack}
              onNewCount={() => go('counts')}
            />
          )}
          {view === 'import' && (
            <ImportWizard
              stock={stock}
              onDone={() => { loadAll(); go('dash') }}
              onBack={handleBack}
            />
          )}
          {view === 'suppliers' && (
            <SuppliersView suppliers={suppliers} onBack={handleBack} />
          )}
          {view === 'settings' && (
            <SettingsView onBack={handleBack} onSuppliers={() => go('suppliers')} />
          )}
        </>
      )}

      {isMainView && (
        <button
          onClick={() => setShowFabSheet(true)}
          style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #EE7844, #B84D22)',
            border: 'none',
            color: '#fff',
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(232,107,58,0.3)',
            zIndex: 50,
          }}
        >+</button>
      )}

      {showFabSheet && (
        <div
          onClick={() => setShowFabSheet(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 60,
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430,
              margin: '0 auto',
              background: '#1a1a18',
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px 48px',
            }}
          >
            <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Add Entry
            </div>
            {FAB_ITEMS.map(opt => (
              <button
                key={opt.label}
                onClick={() => handleFabAction(opt.action)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  color: '#e8e7e0', padding: '14px 0', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: opt.color + '18',
                  border: '1px solid ' + opt.color + '30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {opt.icon}
                </div>
                <div>
                  <div style={{ color: '#e8e7e0', fontSize: 14, fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 2 }}>{opt.sublabel}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
