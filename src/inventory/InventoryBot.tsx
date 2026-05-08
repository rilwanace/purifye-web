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

type MainTab = 'dash' | 'stock' | 'pos' | 'more'

const MORE_ITEMS = [
  { id: 'counts', icon: '📋', label: 'Physical Counts' },
  { id: 'wastage', icon: '🗑️', label: 'Wastage Log' },
  { id: 'import', icon: '📂', label: 'Import Data' },
  { id: 'suppliers', icon: '🏭', label: 'Suppliers' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
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

function Header({ title, subtitle, left, right }: { title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: '#131311',
      borderBottom: '1px solid rgba(255,255,255,.06)',
      zIndex: 30,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {left && <div style={{ flexShrink: 0 }}>{left}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e8e7e0', fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

function TabBar({ tab, onTab }: { tab: MainTab; onTab: (t: MainTab) => void }) {
  const tabs: { id: MainTab; icon: string; label: string }[] = [
    { id: 'dash', icon: '📊', label: 'Dashboard' },
    { id: 'stock', icon: '📦', label: 'Stock' },
    { id: 'pos', icon: '📋', label: 'POs' },
    { id: 'more', icon: '⋯', label: 'More' },
  ]
  return (
    <div style={{
      position: 'fixed',
      bottom: 64,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      background: '#131311',
      borderTop: '1px solid rgba(255,255,255,.06)',
      display: 'flex',
      zIndex: 20,
      height: 52,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: tab === t.id ? INV : '#9c9b95',
          }}
        >
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function InventoryBot() {
  useAuth()

  const [view, setView] = useState<View>('dash')
  const [mainTab, setMainTab] = useState<MainTab>('dash')
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

  function goTab(t: MainTab) {
    setMainTab(t)
    if (t === 'dash') go('dash')
    else if (t === 'stock') go('stock')
    else if (t === 'pos') go('pos')
    else go('dash') // 'more' shows overlay
  }

  function openProduct(id: string) {
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
    // Auto-generate a PO or open new PO form
    setSelectedPO(null)
    go('po-detail')
  }

  async function loadMismatch() {
    const data = await inv.mismatch().catch(() => ({ mismatches: [], summary: {} }))
    setMismatchData(data)
    go('mismatch')
  }

  const viewsWithBack = ['product', 'entry', 'counts', 'po-detail', 'wastage', 'mismatch', 'import', 'suppliers', 'settings']
  const showBack = viewsWithBack.includes(view)

  function getTitle() {
    switch (view) {
      case 'dash': return 'Inventory'
      case 'stock': return 'Full Stock'
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
    if (view === 'product') go('stock')
    else if (view === 'po-detail') go('pos')
    else if (view === 'entry') {
      if (mainTab === 'dash') go('dash')
      else go('stock')
    }
    else go('dash')
  }

  // More overlay
  const [showMore, setShowMore] = useState(false)

  function goTabWithMore(t: MainTab) {
    if (t === 'more') {
      setShowMore(true)
      return
    }
    setShowMore(false)
    goTab(t)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#131311', color: '#e8e7e0' }}>
      <Header
        title={getTitle()}
        left={showBack ? <BackButton onClick={handleBack} /> : undefined}
        right={view === 'dash' ? (
          <button
            onClick={() => go('settings')}
            style={{ background: 'none', border: 'none', color: '#9c9b95', fontSize: 18, cursor: 'pointer', padding: 0 }}
          >⚙️</button>
        ) : view === 'pos' ? (
          <button
            onClick={() => openPO(null)}
            style={{ background: INV, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 10px', cursor: 'pointer' }}
          >+ New</button>
        ) : undefined}
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
              onNewEntry={() => openEntry('purchases')}
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
            <MismatchView data={mismatchData} onBack={handleBack} />
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
            <SettingsView onBack={handleBack} />
          )}
        </>
      )}

      {/* More overlay */}
      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.6)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 430,
              margin: '0 auto',
              background: '#1a1a18',
              borderRadius: '16px 16px 0 0',
              padding: '16px 16px 128px',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            <div style={{ color: '#9c9b95', fontSize: 11, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>More</div>
            {MORE_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setShowMore(false); go(item.id as View) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  color: '#e8e7e0',
                  padding: '14px 4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
                <span style={{ marginLeft: 'auto', color: '#9c9b95', fontSize: 14 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <TabBar tab={showMore ? 'more' : mainTab} onTab={goTabWithMore} />
    </div>
  )
}
